import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
const key = process.env.OPENAI_API_KEY;
let checked = 0;
async function scan(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await scan(file);
    else {
      if (entry.name.startsWith('.env') || /qa-result|qa-test|synthetic-policy/.test(entry.name)) throw new Error(`Private or test file in build: ${file}`);
      const content = await readFile(file);
      if ((key && content.includes(Buffer.from(key))) || /sk-(?:proj-)?[A-Za-z0-9_-]{24,}/.test(content.toString('utf8'))) throw new Error(`Credential found in build: ${file}`);
      checked++;
    }
  }
}
await scan('dist');
console.log(JSON.stringify({ buildFilesChecked: checked, credentialInBuild: false, testFixturesInBuild: false }));
