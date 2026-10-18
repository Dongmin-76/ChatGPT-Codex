import { z } from 'zod/v4';

export const MAX_FILE_MB = 30;
export const MAX_PAGES = 120;
export const CHUNK_PAGES = 4;
export const TEXT_MODEL = 'gpt-5.4';
export const IMAGE_MODEL = 'gpt-image-2.5-sunburst';
export const pageSchema = z.object({
  page: z.number().int().min(1).max(MAX_PAGES),
  kind: z.enum(['content', 'cover', 'contents', 'blank', 'unreadable']),
  // Page notes are evidence, not poster copy. Dense tables must not lose rows to layout limits.
  // Request byte limits and the model output budget bound the overall payload instead.
  heading: z.string(),
  summary: z.string(),
  initiatives: z.array(z.object({ name: z.string(), change: z.string(), beneficiaries: z.string(), timing: z.string() })),
  figures: z.array(z.object({ label: z.string(), value: z.string(), context: z.string() })),
  caveats: z.array(z.string()),
});
export type PageNote = z.infer<typeof pageSchema>;
export const extractionSchema = z.object({ pages: z.array(pageSchema).min(1).max(CHUNK_PAGES) });
export const chunkSchema = z.object({
  documentId: z.string().regex(/^[a-f0-9]{64}$/),
  totalPages: z.number().int().min(1).max(MAX_PAGES),
  start: z.number().int().min(1).max(MAX_PAGES),
  pages: extractionSchema.shape.pages,
});
export type Chunk = z.infer<typeof chunkSchema>;
export const briefSchema = z.object({
  title: z.literal('달라지는 대한민국'),
  documentTitle: z.string().min(1).max(160),
  period: z.string().max(80),
  subtitle: z.string().min(1).max(100),
  lead: z.string().min(1).max(180),
  pillars: z.array(z.object({
    title: z.string().min(1).max(32),
    change: z.string().min(1).max(130),
    detail: z.string().max(180),
    beneficiary: z.string().max(60),
    sourcePages: z.array(z.number().int().min(1).max(MAX_PAGES)).min(1).max(MAX_PAGES),
  })).min(1).max(6),
  keyFigures: z.array(z.object({ value: z.string().max(25), label: z.string().max(60), context: z.string().max(100), sourcePages: z.array(z.number().int().min(1).max(MAX_PAGES)).min(1) })).max(3),
  caveats: z.array(z.string().max(300)).max(12),
});
export type Brief = z.infer<typeof briefSchema>;
export type Signed<T> = { data: T; signature: string };
export type BriefEnvelope = { brief: Brief; documentId: string; totalPages: number; fileName: string };
export const styles = [
  { id: 'editorial', label: '정책 에디토리얼', description: '정제된 타이포 · 신뢰감 있는 구성', colors: ['#113c33', '#d4e5ca', '#f2efe5'] },
  { id: 'blueprint', label: '퓨처 블루', description: '선명한 블루 · 기술과 혁신', colors: ['#1748b8', '#aecbff', '#e7f0fa'] },
  { id: 'warm', label: '라이프 스토리', description: '따뜻한 일러스트 · 국민의 일상', colors: ['#ad5638', '#e9c880', '#f4ecdb'] },
] as const;
export type StyleId = typeof styles[number]['id'];

// Every accepted page must be accounted for; a partial analysis is never complete.
export function validateCoverage(chunks: Chunk[], totalPages: number, documentId: string) {
  if (!Number.isInteger(totalPages) || totalPages < 1 || totalPages > MAX_PAGES) throw new Error('페이지 수가 올바르지 않습니다.');
  const pages = chunks.flatMap(c => {
    if (c.documentId !== documentId || c.totalPages !== totalPages) throw new Error('다른 문서의 분석 결과가 포함되어 있습니다.');
    c.pages.forEach((p, i) => { if (p.page !== c.start + i) throw new Error('분석 페이지 순서가 일치하지 않습니다.'); });
    return c.pages;
  }).sort((a, b) => a.page - b.page);
  if (pages.length !== totalPages || pages.some((p, i) => p.page !== i + 1)) throw new Error('모든 페이지의 분석이 완료되어야 합니다. 누락되거나 중복된 페이지가 있습니다.');
  const unreadable = pages.filter(p => p.kind === 'unreadable');
  if (unreadable.length) throw new Error(`판독할 수 없는 페이지가 있습니다: ${unreadable.map(p => p.page).join(', ')}쪽. 더 선명한 PDF를 업로드해 주세요.`);
  if (!pages.some(p => p.kind === 'content')) throw new Error('분석할 정책 본문을 찾지 못했습니다.');
  return pages;
}

export function validateCitations(brief: Brief, pages: PageNote[]) {
  const valid = new Set(pages.filter(p => p.kind === 'content').map(p => p.page));
  for (const item of [...brief.pillars, ...brief.keyFigures]) {
    if (!item.sourcePages.length || item.sourcePages.some(p => !valid.has(p))) throw new Error('AI가 반환한 출처 페이지가 본문과 일치하지 않습니다. 기획안을 다시 생성해 주세요.');
  }
}
