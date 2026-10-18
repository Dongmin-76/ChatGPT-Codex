import { apiKey } from '../../../lib/server';
import { IMAGE_MODEL, TEXT_MODEL, MAX_FILE_MB, MAX_PAGES } from '../../../lib/contracts';
export async function GET() {
  let connected = false; try { connected = Boolean(apiKey()); } catch { /* No secret data leaves this route. */ }
  return Response.json({ connected, imageModel: IMAGE_MODEL, textModel: TEXT_MODEL, maxFileMB: MAX_FILE_MB, maxPages: MAX_PAGES }, { headers: { 'Cache-Control': 'no-store' } });
}
