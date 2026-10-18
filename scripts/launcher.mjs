import { spawn } from 'node:child_process';
import { existsSync, copyFileSync, constants, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const mode = process.argv[2] || 'check';
const envFile = path.join(root, '.env.local');
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 13)) {
  console.error('Node.js 24 LTS를 설치한 뒤 다시 실행하세요: https://nodejs.org/en/download');
  process.exit(1);
}

function ensureEnv() {
  try { copyFileSync(path.join(root, '.env.example'), envFile, constants.COPYFILE_EXCL); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
}
function keyPresent() {
  const key = process.env.OPENAI_API_KEY || (existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')).OPENAI_API_KEY : '');
  return Boolean(key?.trim());
}
function run(executable, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { cwd: root, stdio: 'inherit', windowsHide: true });
    child.once('error', reject);
    child.once('exit', code => resolve(code ?? 1));
  });
}
function findNpm() {
  const nodeDir = path.dirname(process.execPath);
  const candidates = [process.env.npm_execpath,
    path.join(nodeDir, 'node_modules/npm/bin/npm-cli.js'),
    path.resolve(nodeDir, '../lib/node_modules/npm/bin/npm-cli.js')];
  const cli = candidates.find(file => file && existsSync(file));
  if (!cli) throw new Error('npm을 찾지 못했습니다. Node.js 공식 설치 프로그램으로 다시 설치하세요.');
  return cli;
}
function openBrowser(url) {
  const command = process.platform === 'win32' ? ['rundll32.exe', 'url.dll,FileProtocolHandler', url]
    : process.platform === 'darwin' ? ['open', url] : ['xdg-open', url];
  const child = spawn(command[0], command.slice(1), { detached: true, stdio: 'ignore', windowsHide: true });
  child.on('error', () => console.log(`브라우저에서 직접 열어 주세요: ${url}`));
  child.unref();
}

try {
  if (mode === 'install') {
    ensureEnv();
    console.log('필요한 프로그램을 설치합니다. 이 과정에는 API 키나 Codex가 필요하지 않습니다.');
    const code = await run(process.execPath, [findNpm(), 'ci', '--include=dev', '--include=optional', '--no-audit', '--no-fund']);
    if (code) process.exit(code);
    console.log('설치 완료. 다음은 2-api-key.cmd로 본인의 키를 설정하고, 3-start.cmd를 실행하세요.');
  } else if (mode === 'configure') {
    ensureEnv();
    console.log('OPENAI_API_KEY= 오른쪽에 본인의 키를 붙여넣고 저장하세요. 키를 채팅이나 GitHub에 올리지 마세요.');
    if (process.platform === 'win32') {
      await run('notepad.exe', [envFile]);
      console.log(keyPresent() ? '키가 설정되어 있습니다. 유효성·사용 권한은 생성 요청 시 확인됩니다.' : '아직 키가 비어 있습니다. README의 API 키 설정 안내를 확인하세요.');
    } else console.log(`텍스트 편집기로 다음 파일을 여세요: ${envFile}`);
  } else if (mode === 'check') {
    console.log(`Node.js: ${process.versions.node}`);
    console.log(`필수 프로그램: ${existsSync('node_modules/vinext/dist/cli.js') ? '설치됨' : '미설치 — npm run setup 실행'}`);
    console.log(`API 키: ${keyPresent() ? '설정됨 (값은 표시하지 않음)' : '미설정 — .env.local에 본인의 키 설정'}`);
  } else if (mode === 'start') {
    if (!existsSync('node_modules/vinext/dist/cli.js')) throw new Error('먼저 1-install.cmd 또는 npm run setup을 실행하세요.');
    ensureEnv();
    if (!keyPresent()) console.log('API 키가 비어 있습니다. 화면은 열리지만 생성은 키 설정 후 사용할 수 있습니다.');
    const url = 'http://127.0.0.1:5173';
    console.log(`실행 중에는 이 창을 열어두세요. 종료: Ctrl+C\n주소: ${url}`);
    const child = spawn(process.execPath, ['scripts/run-framework.mjs', 'dev', '--hostname', '127.0.0.1'], { cwd: root, stdio: 'inherit', windowsHide: true });
    let finished = false;
    child.on('error', error => { finished = true; console.error(error.message); process.exitCode = 1; });
    child.on('exit', code => { finished = true; process.exitCode = code ?? 0; });
    process.once('SIGINT', () => { finished = true; child.kill('SIGINT'); });
    // Only the page/config endpoint is requested; readiness does not call OpenAI.
    for (let attempt = 0; attempt < 90 && !finished; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (finished) break;
      try {
        const response = await fetch(url + '/api/config', { signal: AbortSignal.timeout(1000) });
        if (response.ok) {
          if (!process.argv.includes('--no-open')) openBrowser(url);
          break;
        }
      } catch { /* Wait until the local server is ready. */ }
    }
  } else throw new Error('지원 명령: install, configure, start, check');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
