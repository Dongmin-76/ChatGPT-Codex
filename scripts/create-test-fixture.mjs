import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { mkdir, writeFile } from 'node:fs/promises';
const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
const pages = [
  ['SYNTHETIC QA DOCUMENT', 'Policy Canvas integration test - NOT a real government plan', '2026 Example Science and Technology Work Plan', 'All policies and figures are fictional and for software testing only.'],
  ['1. Accessible AI learning', 'A fictional plan aims to provide AI learning to 100 residents in 2026.', 'The target is 100 participants; this is NOT an achieved result.', 'Participants: local adult residents. Start: December 2026.', 'There is no prior-year baseline. Do not invent an increase percentage.'],
  ['2. Research infrastructure', 'The fictional plan proposes shared laboratory access for 12 research teams.', 'The number 12 is a planned target in 2026, not a current achievement.', 'Beneficiaries: early-career researchers. Equipment sharing starts in 2027.', 'This is a simulated document, not an actual ministry announcement.'],
  ['3. Digital access', 'The fictional plan proposes accessible digital guidance at public libraries.', 'There is no numerical target or budget for this initiative in this document.', 'Beneficiaries: senior citizens and people with disabilities.', 'Implementation remains under review; do not present it as completed.'],
  ['APPENDIX - MUST BE INCLUDED', 'The last page adds a fictional quantum research training initiative.', 'Planned training budget: KRW 20 million for 2027.', 'This is a budget proposal, not approved spending.', 'Beneficiaries: graduate researchers. Do not omit this final-page policy.', 'ALL CONTENT IS SYNTHETIC QA DATA, NOT A REAL GOVERNMENT PLAN.'],
];
for (const [index, lines] of pages.entries()) {
  const page = pdf.addPage([595.28, 841.89]);
  page.drawRectangle({ x: 0, y: 0, width: 595.28, height: 841.89, color: rgb(.98, .98, .95) });
  lines.forEach((line, i) => page.drawText(line, { x: 40, y: 760 - i * 45, size: i === 0 ? 20 : 12, font: i === 0 ? bold : font, color: rgb(.1, .25, .18) }));
  page.drawText(`Physical page ${index + 1} of 5 - QA ONLY`, { x: 40, y: 45, size: 10, font });
}
await mkdir('.sites-runtime/qa', { recursive: true });
await writeFile('.sites-runtime/qa/synthetic-policy-test.pdf', await pdf.save());
console.log('Created 5-page synthetic QA PDF. Final-page policy must survive analysis.');
