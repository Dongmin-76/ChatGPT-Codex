import { z } from 'zod/v4';
import { briefSchema, chunkSchema, MAX_PAGES, validateCitations, validateCoverage, type Signed, type Chunk } from '../../../lib/contracts';
import { readJson, verify, sign, streamTask, structured } from '../../../lib/server';
import { briefJsonSchema, synthesisInstructions } from '../../../lib/prompts';
import { parseChecked } from '../../../lib/validation';
const input = z.object({ fileName: z.string().max(250), documentId: z.string().regex(/^[a-f0-9]{64}$/), totalPages: z.number().int().min(1).max(MAX_PAGES), chunks: z.array(z.object({ data: z.unknown(), signature: z.string() })).min(1).max(MAX_PAGES) });
export async function POST(request: Request) {
  return streamTask(request, async () => {
    const body = parseChecked(input, await readJson(request, 12_000_000), 'input');
    const chunks = body.chunks.map(c => parseChecked(chunkSchema, verify(c as Signed<Chunk>), 'saved_analysis'));
    const pages = validateCoverage(chunks, body.totalPages, body.documentId);
    const raw = await structured(request, synthesisInstructions, [{ type: 'input_text', text: JSON.stringify({ fileName: body.fileName, totalPages: body.totalPages, pages }) }], briefJsonSchema, 'infographic_brief');
    const brief = parseChecked(briefSchema, raw, 'brief'); validateCitations(brief, pages);
    return sign({ brief, fileName: body.fileName, totalPages: body.totalPages, documentId: body.documentId });
  });
}
