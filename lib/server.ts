import { env } from 'cloudflare:workers';
import { createHmac, timingSafeEqual, createHash } from 'node:crypto';
import type { Signed } from './contracts';
import { TEXT_MODEL } from './contracts';
import { ValidationError } from './validation';

export class AppError extends Error {
  constructor(message: string, public status = 400, public code = 'invalid_request') { super(message); }
}
export function apiKey() {
  const key = (env as unknown as Record<string, string>).OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) throw new AppError('서버에 OpenAI API 키가 연결되지 않았습니다. 서버 설정을 확인해 주세요.', 503, 'missing_key');
  return key;
}
export function secureRequest(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new AppError('이 사이트에서 시작한 요청만 허용됩니다.', 403);
  if (request.headers.get('sec-fetch-site') === 'cross-site') throw new AppError('외부 사이트의 요청은 허용되지 않습니다.', 403);
  // Hosted access is enforced by the owner-private Sites boundary. Local preview binds loopback.
}
export async function readJson(request: Request, limit = 1_500_000) {
  secureRequest(request);
  if (!request.headers.get('content-type')?.includes('application/json')) throw new AppError('JSON 요청이 필요합니다.', 415);
  const reader = request.body?.getReader();
  if (!reader) throw new AppError('요청이 비어 있습니다.');
  const parts: Uint8Array[] = []; let length = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    length += value.byteLength;
    if (length > limit) { await reader.cancel(); throw new AppError('요청 용량이 제한을 초과했습니다. 더 작은 PDF를 사용해 주세요.', 413); }
    parts.push(value);
  }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new AppError('요청 형식이 올바르지 않습니다.'); }
}
export function sign<T>(data: T): Signed<T> {
  return { data, signature: createHmac('sha256', apiKey()).update(JSON.stringify(data)).digest('hex') };
}
export function verify<T>(value: Signed<T>): T {
  if (!value || typeof value.signature !== 'string' || !/^[a-f0-9]{64}$/.test(value.signature)) throw new AppError('분석 결과 인증에 실패했습니다. 문서를 다시 분석해 주세요.');
  const actual = sign(value.data).signature;
  if (!timingSafeEqual(Buffer.from(actual), Buffer.from(value.signature))) throw new AppError('분석 결과가 변경되었거나 API 키가 갱신되었습니다. 다시 분석해 주세요.');
  return value.data;
}
export function errorInfo(error: unknown) {
  if (error instanceof ValidationError) return { message: error.message, code: error.code };
  if (error instanceof AppError) return { message: error.message, code: error.code };
  if (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name)) return { message: '요청이 중단되었거나 시간이 초과되었습니다. 완료된 페이지는 유지됩니다. 다시 시도해 주세요.', code: 'timeout' };
  if (error instanceof Error && error.name === 'ZodError') return { message: '요청 정보를 확인하지 못했습니다. 파일과 제작 설정을 확인해 주세요.', code: 'invalid_format' };
  return { message: error instanceof Error && !/fetch|network|socket|token|api[_-]?key/i.test(error.message) ? error.message.slice(0, 350) : '연결 중 문제가 발생했습니다. 네트워크 상태를 확인하고 다시 시도해 주세요.', code: 'request_failed' };
}

export function streamTask(request: Request, work: () => Promise<unknown>) {
  const encoder = new TextEncoder();
  let closed = false;
  let heartbeat: ReturnType<typeof setInterval>;
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => { if (!closed) { try { controller.enqueue(encoder.encode(JSON.stringify(data) + '\n')); } catch { closed = true; } } };
      send({ type: 'started' });
      heartbeat = setInterval(() => send({ type: 'heartbeat' }), 12_000);
      work().then(data => send({ type: 'result', data })).catch(error => {
        const info = errorInfo(error);
        const reference = crypto.randomUUID().slice(0, 8);
        console.error(JSON.stringify({ event: 'task_failed', route: new URL(request.url).pathname, reference, code: info.code,
          ...(error instanceof ValidationError ? { stage: error.stage, issues: error.issues } : {}) }));
        send({ type: 'error', ...info, reference });
      }).finally(() => {
        clearInterval(heartbeat);
        if (!closed) { closed = true; controller.close(); }
      });
    },
    cancel() { closed = true; clearInterval(heartbeat); },
  });
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

export async function openai(path: string, body: unknown, request: Request, timeout = 240_000) {
  const key = apiKey();
  const response = await fetch(`https://api.openai.com/v1/${path}`, {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.any([request.signal, AbortSignal.timeout(timeout)]),
  });
  const json = await response.json() as Record<string, any>;
  if (!response.ok) {
    const code = json.error?.code || 'api_error';
    const message = response.status === 401 ? 'API 키가 만료되었거나 유효하지 않습니다. 서버의 키를 갱신해 주세요.'
      : code === 'insufficient_quota' ? 'OpenAI API 사용 한도 또는 크레딧이 부족합니다. API 결제 설정을 확인해 주세요.'
      : response.status === 429 ? 'API 요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.'
      : response.status === 403 ? '이 모델의 사용 권한이 없습니다. OpenAI 프로젝트 권한과 조직 인증 상태를 확인해 주세요.'
      : code === 'content_policy_violation' ? '이미지 생성 요청을 처리할 수 없습니다. 문서와 제작 지시를 확인해 주세요.'
      : response.status === 400 ? 'AI 요청을 처리하지 못했습니다. PDF 파일 또는 선택한 모델의 지원 형식을 확인해 주세요.'
      : 'OpenAI 서비스에서 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
    throw new AppError(message, response.status, code);
  }
  return json;
}
export async function structured(request: Request, instructions: string, content: unknown[], schema: unknown, name: string) {
  const result = await openai('responses', {
    model: TEXT_MODEL, instructions, input: [{ role: 'user', content }], store: false,
    reasoning: { effort: 'low' }, max_output_tokens: 16000,
    text: { format: { type: 'json_schema', name, strict: true, schema } },
  }, request);
  if (result.status !== 'completed') throw new AppError('문서 분석 응답이 완성되지 않았습니다. 해당 단계를 다시 시도해 주세요.', 502, 'incomplete_response');
  const text = result.output?.flatMap((item: any) => item.content || []).filter((item: any) => item.type === 'output_text').map((item: any) => item.text).join('');
  if (!text) throw new AppError('AI가 분석 결과를 반환하지 않았습니다. 문서 내용을 확인해 주세요.', 502);
  try { return JSON.parse(text); } catch { throw new AppError('AI 응답을 읽지 못했습니다. 다시 시도해 주세요.', 502); }
}
export function safetyId(request: Request) {
  return createHash('sha256').update(request.headers.get('oai-authenticated-user-id') || 'msit-studio-owner').digest('hex');
}
