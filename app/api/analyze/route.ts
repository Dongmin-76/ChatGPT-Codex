import { PDFDocument } from 'pdf-lib';
import { z } from 'zod/v4';
import { CHUNK_PAGES, MAX_PAGES, chunkSchema } from '../../../lib/contracts';
import { AppError, readJson, sign, streamTask, structured } from '../../../lib/server';
import { extractionInstructions, extractionJsonSchema } from '../../../lib/prompts';
import { parseChecked } from '../../../lib/validation';
const input = z.object({ documentId: z.string().regex(/^[a-f0-9]{64}$/), totalPages: z.number().int().min(1).max(MAX_PAGES), start: z.number().int().min(1).max(MAX_PAGES), pdf: z.string().max(17_000_000) });
export async function POST(request: Request) {
  return streamTask(request, async () => {
    const body = parseChecked(input, await readJson(request, 17_100_000), 'input');
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(body.pdf)) throw new AppError('PDF 데이터가 올바르지 않습니다.');
    const bytes = Buffer.from(body.pdf, 'base64');
    if (!bytes.subarray(0, 1024).includes(Buffer.from('%PDF-'))) throw new AppError('PDF 파일만 업로드할 수 있습니다.');
    let count: number;
    try { count = (await PDFDocument.load(bytes)).getPageCount(); } catch { throw new AppError('PDF를 열지 못했습니다. 암호화되지 않은 정상 PDF를 사용해 주세요.'); }
    if (count < 1 || count > CHUNK_PAGES || body.start + count - 1 > body.totalPages) throw new AppError('분석할 페이지 범위가 올바르지 않습니다.');
    const extracted = await structured(request, extractionInstructions, [
      { type: 'input_file', filename: `pages-${body.start}-${body.start + count - 1}.pdf`, file_data: `data:application/pdf;base64,${body.pdf}` },
      { type: 'input_text', text: `이 PDF에는 원본 ${body.totalPages}쪽 문서의 ${body.start}~${body.start + count - 1}쪽, 총 ${count}개 페이지가 들어 있다. page는 반드시 원본의 물리적 페이지 번호를 사용하라. 페이지 내 인쇄 번호를 사용하지 말라. ${count}개 결과를 순서대로 반환하라.` },
    ], extractionJsonSchema, 'page_analysis');
    const data = parseChecked(chunkSchema, { documentId: body.documentId, totalPages: body.totalPages, start: body.start, pages: extracted.pages }, 'analysis');
    if (data.pages.length !== count || data.pages.some((page, i) => page.page !== body.start + i)) throw new AppError('일부 페이지의 분석 결과가 누락되었습니다. 이 구간을 다시 시도해 주세요.', 502);
    return sign(data);
  });
}
