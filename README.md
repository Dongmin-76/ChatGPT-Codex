# 달라지는 대한민국

**근거가 보이는 AI 정책 인포그래픽 스튜디오.** PDF를 분석해 국민·기업·연구자 관점의 변화로 구성하고, 한국어 세로 포스터를 생성하는 Streamlit 앱입니다.

PDF → 페이지·표·목차 추출 → OpenAI 구조화 분석 → 근거 대조 → 정책 선택/JSON 편집 → HTML·SVG 조판 → Chromium 타일 렌더링 → PNG·PDF·출처표.

## 빠른 시작

Python **3.12 권장** (3.10 이상), 인터넷 연결, Chromium 실행이 가능한 Windows/macOS/Linux 환경이 필요합니다. 기본 출력은 1440px이며 API 키 없이 합성 데모를 체험할 수 있습니다.

```bash
python -m venv .venv
# macOS / Linux
source .venv/bin/activate
# Windows PowerShell에서는 위 명령 대신:
# .venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python scripts/install_browser.py
streamlit run app.py
```

PowerShell의 활성화 정책 때문에 실행이 안 되면 활성화 대신 `.venv\Scripts\python.exe -m pip ...` 및 `.venv\Scripts\python.exe -m streamlit run app.py`를 사용하세요. macOS/Linux에서는 필요에 따라 `python3`를 사용하세요.

Chromium이 시스템에 있으면 재사용합니다. 없으면 Playwright가 해당 버전을 설치합니다. 브라우저 저장 경로는 기본적으로 `PLAYWRIGHT_BROWSERS_PATH=0`(패키지 내부)입니다. 다른 위치를 쓰면 설치와 실행 모두 같은 환경변수를 설정하세요. `CHROMIUM_EXECUTABLE`로 실행 파일을 지정할 수도 있습니다. Linux에서 공유 라이브러리가 없으면 시스템 관리 권한으로 `python -m playwright install-deps chromium`을 실행하세요.

## API 키

`.env.example`을 `.env`로 **복사**하고 본인의 API 키를 입력하세요. `.env`는 Git에서 제외합니다. 기존 `.env`를 덮어쓰지 마세요.

```dotenv
OPENAI_API_KEY=본인의_API_키
OPENAI_MODEL=gpt-4.1-mini
```

`OPENAI_API_KEY` 또는 클라우드용 별칭 `POLICY_OPENAI_API_KEY`를 지원합니다. 두 이름이 모두 있으면 `OPENAI_API_KEY`를 우선합니다. 키를 코드·JSON·채팅에 넣지 마세요. 클라우드에서는 환경 설정의 보안 입력을 이용하세요. Responses Structured Outputs 지원 모델과 해당 모델 사용 권한이 필요합니다.

분석에는 공식 SDK의 `client.responses.parse(..., text_format=Analysis)`를 사용하며 `store=False`, 타임아웃 및 제한된 재시도를 설정합니다. 페이지 경계를 유지한 약 26,000자 묶음으로 분석합니다. 문서 탭의 원문 추출과 데모·렌더링은 로컬 작업입니다. **실제 분석 버튼은 문서 텍스트의 OpenAI 전송 동의와 키 설정이 있어야 활성화됩니다.** OpenAI 요금이 발생하며, 분석 탭에서 예상 요청 수를 확인할 수 있습니다. 문서 내부 지시는 데이터로 취급하도록 모델에 지시합니다.

AI 분석의 성공 여부는 API 키·모델 접근 권한·네트워크에 달려 있습니다. 이 저장소의 기본 자동 테스트는 실제 유료 API를 호출하지 않고 공식 SDK의 HTTP 전송 경로를 모의 응답으로 검사합니다. 실제 주요업무 추진계획 문서와 유효한 키로 배포 전 내용 검수를 하세요.

## 사용 방법

1. **문서:** PDF 업로드 → 필요한 경우 OCR 선택 → 텍스트·표 추출. 최대 50MB/250페이지입니다. 암호화 문서는 해제 후 업로드하세요. 페이지별 추출문과 표·목차·OCR 경고를 확인합니다.
2. **분석·편집:** API 전송 동의 후 분석 실행. 원문에 근거가 있는 후보를 6개 기준으로 평가해 최대 10개를 선정합니다. 짧은 문서는 적게 선정합니다. 각 정책의 원문·수치·상태·AI 신뢰도를 확인합니다.
3. 분석 JSON 편집기로 제목·설명·기대효과·대상·분야·수치·인용을 수정하거나 저장한 JSON을 가져옵니다. **적용 시 현재 PDF에 대해 재검증**합니다. 원문 없이 분석 JSON만 단독으로 가져오지는 않습니다.
4. **디자인:** 분야·정책 선택, 제목·부제·테마·스타일·상세도·출처 표시·너비 설정. 원문 검토 확인 후 생성합니다. 분석을 다시 호출하지 않습니다.
5. 전체/섹션/확대 미리보기와 품질 검사 결과를 확인하고 PNG·인쇄 PDF·독립형 HTML·분석 JSON·UTF-8 BOM 출처표 CSV를 다운로드합니다. 설정이 바뀌면 이전 결과 경고가 표시됩니다. 다운로드는 마지막 생성 결과와 일치합니다.

출력 너비: 1440 / 2160 / 사용자 지정 720~3000px. 높이는 콘텐츠에 따라 자동 확장하며, 기본 데모 6개 정책은 약 8,000px입니다. 2048px 타일 단위로 무손실 PNG를 조립하고 1억 픽셀 이상은 명확한 오류로 제한합니다. 720px 출력에는 출처 가독성 경고가 표시됩니다. PDF는 선택·검색 가능한 텍스트를 유지하며, 매우 긴 결과는 최대 14,000px 높이의 연속 페이지로 나눠 출력합니다.

데이터 없는 막대/비율 그래프를 만들지 않습니다. 검증 수치는 KPI 또는 연도별 타임라인, 그 외에는 비교/개념 연결도/벡터 일러스트로 표현합니다. 개념도는 통계가 아님을 표시합니다. 외부 이미지 생성 API와 전체 SVG 내보내기는 선택 기능으로 이번 버전에는 제공하지 않습니다. 벡터 장식은 HTML/PDF에 포함됩니다.

## API 키 없는 데모 / 일괄 출력

UI의 **합성 데모 문서 불러오기**로 분석·편집·출력을 체험하세요. 문서와 결과물 모두 가상 데이터라는 표시를 포함합니다.

```bash
python scripts/render_demo.py
python scripts/render_demo.py --width 2160 --output outputs/highres
```

`outputs/demo/`에 합성 원문 PDF, PNG, PDF, HTML, 분석 JSON, 출처표와 품질 검사 JSON을 생성합니다. `outputs/`는 Git에 포함하지 않습니다.

## 선택적 한국어 OCR

Tesseract 실행 파일이 필요합니다. macOS에서는 `brew install tesseract`, Debian/Ubuntu에서는 `apt install tesseract-ocr`, Windows에서는 Tesseract 배포판을 설치하고 실행 파일을 PATH에 추가하세요.

```bash
python scripts/install_ocr.py
```

공식 `tesseract-ocr/tessdata_fast`의 고정 커밋에서 한국어/영어 모델을 TLS로 다운로드하고 SHA-256을 검증해 `.local/tessdata/`에 설치합니다. 재실행 시 기존 파일도 검증합니다. 앱은 이 디렉터리를 자동 사용하며 `TESSDATA_PREFIX`가 있으면 우선합니다. 모델 라이선스는 Apache-2.0입니다. OCR 다운로드 주소·커밋·체크섬은 설치 스크립트에 기록되어 있습니다.

OCR은 텍스트가 적은 페이지는 전체 인식하고 나머지는 이미지 영역을 보충합니다. 실패하면 원래 추출문을 유지하며 경고를 냅니다. OCR 결과에는 신뢰할 수 있는 단어별 confidence가 없으므로 **모든 OCR 페이지를 검토 대상**으로 처리합니다. 인용/수치가 맞더라도 OCR 수치는 그래픽에서 제외합니다. 저해상도·복잡한 표는 오인식이 생기므로 원본과 대조하세요.

## 신뢰성과 검증의 범위

- 모든 정책·수치는 1 기반 **PDF 파일 페이지**와 연속된 원문 인용을 보관합니다. 인쇄 페이지 번호와 다를 수 있습니다.
- Pydantic이 자료형·길이·상태·페이지 범위를 검사합니다. 페이지 수 초과는 근거 불일치로 처리합니다.
- 인용문이 지정 페이지에 실제 존재하는지 공백·유니코드 정규화 후 대조합니다.
- 수치+단위의 연속 조합, 연도, 목표/성과 등의 근거 표현을 검사합니다. 숫자 부분 일치(예: 200을 1,200의 근거로 인정)는 거부합니다.
- 불일치 정책은 포스터에서 제외합니다. 불일치 또는 OCR 검토 수치는 KPI/타임라인/포스터 출처 수치 목록에서 제외합니다. 분석 JSON/CSV에는 검토용으로 남깁니다.
- 본문에 정책 인용문에 없는 숫자가 추가되면 해당 정책을 제외합니다. 일부 과장 표현도 표시합니다.
- 모든 기대 변화는 **목표/기대효과**로 표시하고 정책 자체의 상태와 분리합니다. AI 자체 신뢰도는 검증 확률이 아닙니다.
- **원문 대조는 의미적 사실 검증이 아닙니다.** 같은 페이지의 다른 대상·분모·기간·지표를 혼동하거나 목표를 성과로 잘못 해석하는 오류를 규칙만으로 완전히 걸러낼 수 없습니다. 인용과 정책 해석·예상 효과·수치의 연결은 사람이 검토해야 합니다. 자동으로 정확성을 보증한다고 주장하지 않습니다.
- 레이아웃 검사는 한국어 글리프/웹폰트 로드, DOM 넘침, 섹션 겹침, 주요 본문·출처 색상 대비, 출처 크기, PNG 무결성을 확인합니다. 모든 단어의 렌더링이나 미적 품질을 판정하는 검사는 아닙니다.

업로드 파일·분석·키는 앱이 별도 DB에 저장하지 않으며 현재 Streamlit 세션 메모리에서 처리합니다. 세션 종료 전 필요한 결과를 다운로드하세요. UI는 서버 로컬 임시 저장을 하지 않습니다. CLI 출력은 지정 폴더에 남습니다. 민감한 문서의 외부 API 전송 여부는 사용자가 결정해야 합니다.

## 테스트

```bash
python -m pytest -q
```

합성 한국어 PDF의 실제 추출, 변조된 수치/단위/연도/상태/페이지 거부, 가짜 인용·본문 수치 제외, 암호/손상 PDF, OCR 오류 처리, 실제 한국어 스캔 OCR(선택 모델 설치 시), 페이지 분할, 공식 OpenAI SDK 구조화 출력 모의 전송, HTML 이스케이프·CSV 수식 방지, 3개 출력 크기·테마·스타일의 Chromium PNG/PDF, 한글 PDF 텍스트 보존, Streamlit 데모 생성·설정 변경 흐름을 검증합니다. OCR 모델 미설치 시 해당 선택 테스트만 건너뜁니다.

## 구조

| 파일 | 역할 |
|---|---|
| `app.py` | 한국어 Streamlit UI, 세션·업로드·편집·다운로드 |
| `schemas.py` | 분석/원문/디자인 Pydantic 모델 |
| `pdf_processor.py` | PyMuPDF 추출·OCR·페이지 분할 |
| `policy_analyzer.py` | OpenAI 구조화 분석, 중요도 선정 |
| `policy_validator.py` | 원문·수치·상태 검증 |
| `storytelling_engine.py` | 정책별 편집 구조 |
| `visualization_engine.py` | KPI/타임라인/비교/벡터 개념도 |
| `infographic_renderer.py`, `templates/` | 자동 이스케이프 HTML/CSS/SVG 조판 |
| `export_manager.py` | Chromium·Pillow PNG/PDF·품질 검사·CSV |
| `demo.py`, `scripts/`, `tests/` | 합성 자료·재현 명령·테스트 |
| `assets/fonts/` | OFL 라이선스 Noto Sans KR 및 라이선스 사본 |

## 문제 해결

- **AI 버튼 비활성화:** `.env` 키 설정 후 Streamlit을 재시작하고 전송 동의를 체크하세요. 새로고침만으로 프로세스 환경변수 변경이 반영되지 않을 수 있습니다.
- **401/429/모델 오류:** 키, OpenAI 결제/사용 한도, 모델 접근 권한 및 `api.openai.com` 통신을 확인하세요. 오류 화면에 키나 원문을 출력하지 않습니다.
- **브라우저 다운로드 403:** 네트워크 설정에서 Playwright 배포 서버(`cdn.playwright.dev`와 다운로드가 안내하는 리디렉션 대상)를 허용하거나 설치된 Chromium을 사용하세요. TLS/체크섬 검증을 끄지 마세요.
- **브라우저 없음:** `python scripts/install_browser.py`. `PLAYWRIGHT_BROWSERS_PATH`가 설치 시와 같은지 확인하세요.
- **OCR 실패:** Tesseract PATH, `python scripts/install_ocr.py`, `TESSDATA_PREFIX`를 확인하세요. 텍스트 PDF는 OCR 없이 사용할 수 있습니다.
- **출력 가능한 정책 없음:** 인용문을 실제 PDF 페이지의 연속된 텍스트로 수정하세요. PDF 뷰어의 눈에 보이는 문자와 추출문이 다를 수 있습니다. OCR 결과는 원본 확인이 필요합니다.
- **메모리/크기 오류:** 선택 정책 수·상세도·출력 너비를 줄이세요. 문서 한도 내라도 OCR은 페이지 이미지에 따라 시간이 오래 걸립니다.
- **폰트/레이아웃 검사 실패:** 포함된 폰트를 복구하고 지나치게 긴 제목·수치·단위를 줄이세요. 오류를 무시하고 깨진 이미지를 내려주지 않습니다.

클라우드 작업은 이미 격리되어 있으므로 기존 `/workspace/ChatGPT-Codex` 체크아웃을 사용합니다. 사용자가 명시하지 않은 별도 Git worktree는 만들지 않습니다. 스냅샷은 실행 중인 서버를 유지하지 않으므로 새 작업에서는 앱 시작 명령을 다시 실행하세요.
