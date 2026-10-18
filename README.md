# Policy Canvas · 달라지는 대한민국

과학기술정보통신부 업무계획 PDF를 읽어 **「달라지는 대한민국」을 주제로 A4 세로 인포그래픽 한 장**을 만드는 웹프로그램입니다. 한국어 화면에서 파일을 올리고 스타일을 고르면 OpenAI 이미지 생성 모델이 결과를 만듭니다.

**API 키는 포함되어 있지 않습니다.** 실행하는 사람이 자신의 OpenAI API 키를 설정해야 합니다. 설치와 화면 확인에는 키가 필요하지 않으며, 실제 분석·이미지 생성에는 API 사용료가 발생합니다. 기존 Python/Streamlit 버전 대신 현재의 React/TypeScript 웹앱을 담고 있습니다.

## 처음 사용하는 분: Windows에서 시작하기

1. [Node.js 공식 다운로드](https://nodejs.org/en/download)에서 **24 LTS / Windows Installer**를 설치합니다. Python, Git, Codex는 필요하지 않습니다.
2. 이 저장소 위쪽 **Code → Download ZIP**을 눌러 내려받고, **압축을 모두 풉니다**. `C:\PolicyCanvas`처럼 찾기 쉬운 폴더를 권장합니다.
3. 압축을 푼 폴더에서 아래 파일을 순서대로 더블클릭합니다.

| 순서 | 파일 | 하는 일 |
| --- | --- | --- |
| 1 | `1-install.cmd` | 필요한 프로그램 설치. 처음 한 번 실행합니다. |
| 2 | `2-api-key.cmd` | 메모장으로 `.env.local`을 엽니다. `OPENAI_API_KEY=` 오른쪽에 본인의 키를 붙여넣고 저장합니다. |
| 3 | `3-start.cmd` | 프로그램을 실행하고 브라우저를 엽니다. 이후에는 이 파일만 실행합니다. |

브라우저가 자동으로 열리지 않으면 **<http://127.0.0.1:5173>**에 접속하세요. 실행 창은 사용하는 동안 열어두고, 종료하려면 창에서 **Ctrl+C**를 누릅니다.

→ **[자세한 설치·사용 안내와 문제 해결](docs/설치와-사용법.md)**

## 무엇을 만들 수 있나요?

- 최대 **30MB, 120쪽**의 PDF. 스캔 이미지, 표, 본문, 각주, 별첨까지 페이지별로 분석합니다.
- 전체 페이지 분석을 바탕으로 국민·산업·연구 현장의 주요 변화를 한 장으로 편집합니다.
- **정책 에디토리얼 / 퓨처 블루 / 라이프 스토리**의 세 가지 스타일을 제공합니다.
- 이미지 생성 전에 기획안을 검토할 수 있고, 페이지별 근거를 JSON 파일로 저장할 수 있습니다.
- **PNG 2480×3508px, 300dpi** 또는 **210×297mm A4 PDF 1쪽**으로 저장합니다.
- 실패 후 다시 실행하면 현재 탭에서 완료된 페이지 분석을 이어서 사용합니다. 새로고침하거나 창을 닫으면 작업은 사라집니다.

문서 전체를 읽는 것과 모든 문장을 한 장에 인쇄하는 것은 다릅니다. 인포그래픽에는 전체 내용을 근거로 핵심 변화를 편집해 담습니다. 이미지의 한글·숫자·정책 표현은 최종 사용 전에 원문과 대조하세요. 이미지 생성 원본은 1536×2176px이며, A4 저장 시 자르지 않고 크기를 맞춥니다. 확대 저장이 원본의 세부 묘사를 늘리지는 않습니다.

## macOS·Linux 또는 터미널 사용

Node.js 24 LTS를 설치하고, 압축을 푼 폴더에서 터미널을 여세요.

```sh
npm run setup
npm run configure
```

출력된 `.env.local` 파일을 텍스트 편집기로 열어 `OPENAI_API_KEY=`에 본인의 키를 입력하고 저장한 다음 실행합니다.

```sh
npm start
```

Windows PowerShell에서 `npm.ps1` 실행 정책 오류가 나면 명령어의 `npm`을 `npm.cmd`로 바꾸거나 위의 `.cmd` 파일을 사용하세요.

## API 키와 비용

키는 [OpenAI Platform](https://platform.openai.com/api-keys)에서 준비합니다. ChatGPT 로그인/구독과 OpenAI API 사용 권한·결제는 별개이므로 해당 프로젝트의 모델 사용 권한과 결제 설정을 확인하세요.

- 실제 키는 이 폴더의 **`.env.local`**에만 입력합니다. `.env.example`은 비어 있는 공유용 예시입니다.
- API 키는 서버에서만 사용합니다. `VITE_`나 `NEXT_PUBLIC_` 접두사를 붙이지 마세요.
- `.env.local`, `.dev.vars`, 업로드 PDF, 결과물, 실행 캐시와 설치 폴더는 Git에서 제외합니다. 실제 키가 든 파일을 강제로 커밋하지 마세요.
- 이 배포본은 상위 폴더의 `.env.local`을 읽지 않습니다. 운영체제의 `OPENAI_API_KEY` 환경변수가 있으면 그것을 우선 사용합니다.
- PDF는 분석을 위해 OpenAI API에 전송됩니다. 이 앱 서버에는 문서와 결과를 영구 저장하지 않으며, 분석 요청에 `store: false`를 사용합니다. OpenAI의 데이터 처리 정책은 별도로 적용됩니다.
- 키를 파일에서 지우는 것과 OpenAI에서 키를 폐기하는 것은 다릅니다. 사용을 완전히 중단하려는 키는 Platform의 API 키 관리 화면에서도 폐기하세요.

공식 안내: [OpenAI 시작하기](https://developers.openai.com/api/docs/quickstart), [인증과 API 키 보호](https://developers.openai.com/api/reference/overview).

## 개발자용 안내

React 19, TypeScript, Vinext, Vite, Cloudflare Worker 런타임을 사용합니다. 로컬 개발 서버는 본인 컴퓨터의 `127.0.0.1`에만 연결됩니다.

```sh
npm run check       # 설치 및 키 설정 여부만 확인 — 키 값이나 API 호출 없음
npm test            # 페이지 누락·출처·응답 규격·PNG 검사, API 호출 없음
npm run typecheck   # TypeScript 검사
npm run build       # 배포용 빌드
node scripts/verify-build.mjs
npm run dev        # 개발 서버 (브라우저 자동 열기 없음)
```

분석 모델 기본값은 `gpt-5.4`, 이미지 모델 기본값은 `gpt-image-2.5-sunburst`입니다. `lib/contracts.ts`에서 확인할 수 있습니다. 계정마다 사용 가능한 모델이 다를 수 있으며, 모델을 바꿀 때는 해당 모델의 PDF 입력·구조화 출력·이미지 크기 지원을 확인해야 합니다.

| 위치 | 내용 |
| --- | --- |
| `app/page.tsx`, `app/globals.css` | 한국어 화면·디자인 |
| `app/api/` | PDF 분석, 전체 종합, 이미지 생성 API |
| `lib/contracts.ts`, `lib/structured-schema.ts` | 앱과 AI가 공유하는 응답 규격 |
| `lib/prompts.ts` | 정책 분석·인포그래픽 제작 지시 |
| `scripts/launcher.mjs` | 설치·설정·실행 도우미 |
| `tests/` | 비용이 발생하지 않는 자동 검사 |

수치가 많은 표를 페이지당 40개 등의 임의 제한으로 잘라내거나 거부하지 않습니다. 페이지 누락, 중복, 판독 불가, 잘못된 출처는 성공으로 처리하지 않습니다.

서버 기능이 필요하므로 **GitHub Pages에서는 동작하지 않습니다.** ZIP 다운로드 후 로컬 실행이 가장 간단합니다. 인터넷 공개 서버를 운영하려면 서버 환경변수로 키를 관리하고 로그인·사용량 제한을 별도로 마련하세요. `.openai/hosting.json`에는 개인 사이트 ID나 비밀값을 포함하지 않았습니다.

이전 Sites 개발 환경에 특화된 빌드·연결 도우미는 소스 호환성을 위해 포함되어 있으나 일반 로컬 실행에 Codex나 Sites 계정은 필요하지 않습니다. 포함된 외부 코드의 라이선스는 `vendor/`와 `build/sites-vite-plugin.LICENSE`를 참조하세요.
