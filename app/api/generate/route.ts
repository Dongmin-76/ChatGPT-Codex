import { z } from 'zod/v4';
import { IMAGE_MODEL, briefSchema, type BriefEnvelope, type Signed } from '../../../lib/contracts';
import { imagePrompt } from '../../../lib/prompts';
import { AppError, openai, readJson, safetyId, streamTask, verify } from '../../../lib/server';
import { parseChecked } from '../../../lib/validation';
const input = z.object({ brief: z.object({ data: z.unknown(), signature: z.string() }), style: z.enum(['editorial', 'blueprint', 'warm']), emphasis: z.string().max(400), quality: z.enum(['medium', 'high']) });
export async function POST(request: Request) {
  return streamTask(request, async () => {
    const body = parseChecked(input, await readJson(request, 80_000), 'input');
    const envelope = verify(body.brief as Signed<BriefEnvelope>);
    const brief = parseChecked(briefSchema, envelope.brief, 'saved_analysis');
    const result = await openai('images/generations', {
      model: IMAGE_MODEL, prompt: imagePrompt(brief, body.style, body.emphasis), n: 1,
      size: '1536x2176', quality: body.quality, output_format: 'png', background: 'opaque', safety_identifier: safetyId(request),
    }, request, 600_000);
    const image = result.data?.[0]?.b64_json;
    if (typeof image !== 'string' || !image) throw new AppError('이미지가 반환되지 않았습니다. 다시 생성해 주세요.', 502);
    return { image, model: IMAGE_MODEL, nativeSize: '1536 × 2176', createdAt: new Date().toISOString() };
  });
}
