import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import assert from 'node:assert/strict';
const origin = 'http://127.0.0.1:5173';
async function post(route, body, headers = {}) {
  const r = await fetch(origin + route, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, ...headers }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const reader = r.body.getReader(); let pending = ''; const decoder = new TextDecoder();
  try { while (true) {
    const { value, done } = await reader.read(); if (done) throw new Error('Stream ended without result');
    pending += decoder.decode(value, { stream: true }); const lines = pending.split('\n'); pending = lines.pop();
    for (const line of lines) {
      if (!line) continue; const event = JSON.parse(line);
      if (event.type === 'error') throw new Error(event.message);
      if (event.type === 'result') return event.data;
    }
  } } finally { await reader.cancel().catch(() => {}); }
}
if (process.argv.includes('--security')) {
  await assert.rejects(() => post('/api/analyze', {}, { Origin: 'https://untrusted.example' }), /HTTP 403|이 사이트/);
  await assert.rejects(() => post('/api/analyze', { documentId: 'a'.repeat(64), totalPages: 1, start: 1, pdf: Buffer.from('not a pdf').toString('base64') }), /PDF 파일/);
  await assert.rejects(() => post('/api/generate', { brief: { data: {}, signature: 'a'.repeat(64) }, style: 'editorial', emphasis: '', quality: 'medium' }), /변경되었거나/);
  console.log('PASS: cross-origin, forged analysis, and fake PDF rejected without AI calls.');
}
if (!process.argv.includes('--security')) {
const bytes = await readFile('.sites-runtime/qa/synthetic-policy-test.pdf');
const pdf = await PDFDocument.load(bytes); const totalPages = pdf.getPageCount(); const documentId = createHash('sha256').update(bytes).digest('hex');
const chunks = [];
for (let start = 0; start < totalPages; start += 4) {
  const chunk = await PDFDocument.create(); const ids = Array.from({ length: Math.min(4, totalPages - start) }, (_, i) => start + i);
  for (const page of await chunk.copyPages(pdf, ids)) chunk.addPage(page);
  const result = await post('/api/analyze', { documentId, totalPages, start: start + 1, pdf: Buffer.from(await chunk.save()).toString('base64') });
  assert.equal(result.data.pages.length, ids.length); chunks.push(result); console.log(`PASS: pages ${start + 1}-${start + ids.length} analyzed.`);
}
assert.match(JSON.stringify(chunks.at(-1).data.pages), /양자|quantum/i);
await assert.rejects(() => post('/api/brief', { documentId, totalPages, fileName: 'synthetic-policy-test.pdf', chunks: chunks.slice(0, 1) }), /모든 페이지/);
const brief = await post('/api/brief', { documentId, totalPages, fileName: 'synthetic-policy-test.pdf', chunks });
assert.equal(brief.data.brief.title, '달라지는 대한민국');
assert(brief.data.brief.pillars.some(p => p.sourcePages.includes(5)), 'Last-page appendix was not represented in the brief');
await writeFile('.sites-runtime/qa/analysis.json', JSON.stringify({ chunks, brief }, null, 2));
console.log('PASS: complete synthesis includes final-page appendix and grounded citations.');
if (process.argv.includes('--image')) {
  const result = await post('/api/generate', { brief, style: 'editorial', quality: 'high', emphasis: '검증용 가상 문서라는 사실을 눈에 잘 보이게 표시할 것.' });
  const png = Buffer.from(result.image, 'base64');
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  console.log(JSON.stringify({ image: 'PASS', width: png.readUInt32BE(16), height: png.readUInt32BE(20), bytes: png.length, model: result.model }));
  await writeFile('.sites-runtime/qa/generated.png', png);
  await writeFile('.sites-runtime/qa/result.json', JSON.stringify(result));
}
}
