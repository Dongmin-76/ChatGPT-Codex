import { PDFDocument } from 'pdf-lib';
import { CHUNK_PAGES, MAX_FILE_MB, MAX_PAGES } from './contracts';
import { png300dpi } from './png';

export async function readPDF(file: File) {
  if (!file.name.toLowerCase().endsWith('.pdf')) throw new Error('PDF 파일을 선택해 주세요.');
  if (file.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`PDF는 최대 ${MAX_FILE_MB}MB까지 업로드할 수 있습니다.`);
  const buffer = await file.arrayBuffer();
  if (!new TextDecoder().decode(buffer.slice(0, 1024)).includes('%PDF-')) throw new Error('정상적인 PDF 파일이 아닙니다.');
  let pdf: PDFDocument;
  try { pdf = await PDFDocument.load(buffer); } catch { throw new Error('PDF를 열 수 없습니다. 암호를 해제한 PDF 또는 정상 파일을 사용해 주세요.'); }
  const totalPages = pdf.getPageCount();
  if (!totalPages || totalPages > MAX_PAGES) throw new Error(`PDF는 1~${MAX_PAGES}쪽까지 지원합니다. 페이지가 생략되지 않도록 범위 내 문서를 사용해 주세요.`);
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  const documentId = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  return { pdf, totalPages, documentId };
}
export async function pdfChunk(pdf: PDFDocument, start: number, count = CHUNK_PAGES): Promise<{ base64: string; count: number }> {
  const subset = await PDFDocument.create();
  const indices = Array.from({ length: Math.min(count, pdf.getPageCount() - start) }, (_, i) => start + i);
  (await subset.copyPages(pdf, indices)).forEach(p => subset.addPage(p));
  const bytes = await subset.save();
  if (bytes.length > 12 * 1024 * 1024) {
    if (count > 1) return pdfChunk(pdf, start, 1);
    throw new Error(`${start + 1}쪽의 용량이 너무 큽니다. PDF 이미지 해상도를 낮춰 다시 업로드해 주세요.`);
  }
  let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return { base64: btoa(binary), count: indices.length };
}
export async function streamPost<T>(path: string, body: unknown, signal: AbortSignal): Promise<T> {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  if (!response.ok || !response.body) throw new Error(response.status === 413 ? '파일 용량이 너무 큽니다.' : `서버 요청에 실패했습니다 (${response.status}).`);
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let pending = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += done ? decoder.decode() : decoder.decode(value, { stream: true });
      const lines = pending.split('\n'); pending = lines.pop() || '';
      if (done && pending.trim()) lines.push(pending);
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.type === 'error') throw new Error(`${event.message}${event.reference ? ` (오류 번호: ${event.reference})` : ''}`);
        if (event.type === 'result') return event.data as T;
      }
      if (done) break;
    }
    throw new Error('연결이 종료되었습니다. 완료된 분석부터 이어서 시도해 주세요.');
  } finally { await reader.cancel().catch(() => {}); }
}
export function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
export async function makeA4(base64: string) {
  const binary = atob(base64); const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const source = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
  const image = new Image(); image.src = source;
  try { await image.decode(); } finally { URL.revokeObjectURL(source); }
  const canvas = document.createElement('canvas'); canvas.width = 2480; canvas.height = 3508;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('이 브라우저에서 이미지 저장을 지원하지 않습니다.');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.imageSmoothingQuality = 'high';
  const ratio = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
  const width = image.naturalWidth * ratio, height = image.naturalHeight * ratio;
  ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('이미지 변환에 실패했습니다.')), 'image/png'));
  return new Blob([png300dpi(new Uint8Array(await blob.arrayBuffer())).buffer as ArrayBuffer], { type: 'image/png' });
}
export async function downloadPDF(png: Blob) {
  const pdf = await PDFDocument.create(); const page = pdf.addPage([595.2756, 841.8898]);
  const image = await pdf.embedPng(await png.arrayBuffer());
  page.drawImage(image, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
  pdf.setTitle('Changing Korea - A4 Infographic'); pdf.setCreator('Policy Canvas');
  saveBlob(new Blob([await pdf.save() as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }), '달라지는-대한민국-A4.pdf');
}
