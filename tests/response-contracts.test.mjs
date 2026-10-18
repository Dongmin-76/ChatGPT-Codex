import test from 'node:test';
import assert from 'node:assert/strict';
import { pageSchema, chunkSchema, briefSchema, extractionSchema, validateCoverage } from '../lib/contracts.ts';
import { structuredSchema } from '../lib/structured-schema.ts';
import { parseChecked, ValidationError } from '../lib/validation.ts';

const densePage = {
  page: 1, kind: 'content', heading: '여러 수치가 담긴 표', summary: '정책과 수치를 생략하지 않음',
  initiatives: Array.from({ length: 45 }, (_, i) => ({ name: `과제 ${i}`, change: '계획', beneficiaries: '국민', timing: '2027년' })),
  figures: Array.from({ length: 65 }, (_, i) => ({ label: `지표 ${i}`, value: `${i}개`, context: '2027년 목표' })),
  caveats: Array.from({ length: 25 }, (_, i) => `각주 ${i}`),
};
test('dense page preserves all 65 figures, 45 initiatives and 25 caveats', () => {
  const chunk = chunkSchema.parse({ documentId: 'a'.repeat(64), start: 1, totalPages: 1, pages: [densePage] });
  assert.deepEqual(validateCoverage([chunk], 1, 'a'.repeat(64)), [densePage]);
});
test('evidence is not truncated by poster text limits', () => {
  const page = { ...densePage, summary: '가'.repeat(6500) };
  assert.deepEqual(pageSchema.parse(page), page);
});
test('provider extraction contract has no arbitrary evidence count caps', () => {
  const schema = structuredSchema(extractionSchema);
  const page = schema.properties.pages.items;
  for (const key of ['initiatives', 'figures', 'caveats']) assert.equal(page.properties[key].maxItems, undefined);
  assert.equal(schema.properties.pages.maxItems, 4);
  assert.equal(page.properties.page.minimum, 1);
  assert.equal(page.additionalProperties, false);
});
test('provider poster limits match local validation, including multiline Korean copy', () => {
  const schema = structuredSchema(briefSchema);
  const title = schema.properties.pillars.items.properties.title;
  const pattern = new RegExp(title.pattern);
  for (const text of ['', '가'.repeat(32), '가'.repeat(33), '가\n나']) {
    assert.equal(pattern.test(text), briefSchema.shape.pillars.element.shape.title.safeParse(text).success);
  }
  assert.equal(schema.properties.pillars.maxItems, 6);
  assert.equal(schema.properties.keyFigures.maxItems, 3);
});
test('real structural errors still fail, with stage-specific diagnostics and no source values', () => {
  try {
    parseChecked(pageSchema, { ...densePage, figures: [{ label: 'private-source', value: 123, context: '' }] }, 'analysis');
    assert.fail('expected validation failure');
  } catch (error) {
    assert(error instanceof ValidationError);
    assert.equal(error.code, 'analysis_format');
    assert.match(error.message, /PDF 분석/);
    assert.deepEqual(error.issues, [{ path: 'figures.0.value', code: 'invalid_type' }]);
    assert(!JSON.stringify(error).includes('private-source'));
  }
});
