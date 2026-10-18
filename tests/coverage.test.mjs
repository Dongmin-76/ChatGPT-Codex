import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCoverage, validateCitations, briefSchema } from '../lib/contracts.ts';
const id = 'a'.repeat(64);
const page = n => ({ page: n, kind: 'content', heading: `page ${n}`, summary: 'policy', initiatives: [], figures: [], caveats: [] });
const chunk = (start, numbers) => ({ documentId: id, totalPages: 5, start, pages: numbers.map(page) });
test('all pages including the last appendix are preserved and sorted', () => assert.deepEqual(validateCoverage([chunk(5, [5]), chunk(1, [1, 2, 3, 4])], 5, id).map(x => x.page), [1, 2, 3, 4, 5]));
test('missing final page is rejected', () => assert.throws(() => validateCoverage([chunk(1, [1, 2, 3, 4])], 5, id), /모든 페이지/));
test('duplicate pages are rejected even when count matches', () => assert.throws(() => validateCoverage([chunk(1, [1, 2, 3, 4]), chunk(4, [4])], 5, id), /모든 페이지/));
test('different document cannot contaminate analysis', () => assert.throws(() => validateCoverage([{ ...chunk(1, [1, 2, 3, 4]), documentId: 'b'.repeat(64) }, chunk(5, [5])], 5, id), /다른 문서/));
test('unreadable page blocks full-document synthesis', () => { const c = chunk(1, [1, 2, 3, 4, 5]); c.pages[4].kind = 'unreadable'; assert.throws(() => validateCoverage([c], 5, id), /5쪽/); });
test('out-of-order page numbers within a chunk are rejected', () => assert.throws(() => validateCoverage([chunk(1, [1, 2, 4, 3, 5])], 5, id), /순서/));
test('citations must point to content, not cover or missing pages', () => {
  const data = { title: '달라지는 대한민국', documentTitle: 'QA', period: '2026', subtitle: 'Test', lead: 'Test', pillars: [{ title: 'Change', change: 'Policy', detail: '', beneficiary: '', sourcePages: [5] }], keyFigures: [], caveats: [] };
  const brief = briefSchema.parse(data); const pages = [page(1), { ...page(5), kind: 'cover' }];
  assert.throws(() => validateCitations(brief, pages), /출처/); assert.doesNotThrow(() => validateCitations(brief, [page(5)]));
});
