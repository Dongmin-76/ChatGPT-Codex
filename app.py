"""Run with: streamlit run app.py"""
import hashlib
import io
import json
import os
from pathlib import Path
import streamlit as st
from dotenv import load_dotenv
from PIL import Image
from pydantic import ValidationError
from demo import make_demo
from export_manager import export_infographic, sources_csv
from pdf_processor import extract_pdf, page_chunks
from policy_analyzer import analyze_document
from policy_validator import validate_analysis
from schemas import Analysis, Design

load_dotenv(Path(__file__).with_name(".env"))
st.set_page_config(page_title="달라지는 대한민국 | 정책 인포그래픽 스튜디오", page_icon="🇰🇷", layout="wide")
st.markdown("""<style>
.stApp{background:#f7f9fc;color:#101d38}[data-testid="stSidebar"]{background:#edf2fa}
h1,h2,h3{letter-spacing:-.04em}div[data-testid="stMetric"]{border-top:2px solid #2563eb;padding-top:12px}
.stButton>button[kind="primary"]{background:#2563eb;border:0}.studio-kicker{font-size:12px;letter-spacing:3px;color:#2563eb;font-weight:700}
.studio-hero{padding:28px 0 30px;border-bottom:1px solid #c8d3e2;margin-bottom:26px}.studio-hero h1{font-size:48px;margin:0}.studio-hero p{color:#536477;font-size:18px;margin-top:10px}
</style>""", unsafe_allow_html=True)


def reset_outputs():
    st.session_state.pop("result", None)


def set_document(data, doc, analysis=None):
    st.session_state.document = doc
    st.session_state.pdf_bytes = data
    st.session_state.pop("analysis", None)
    reset_outputs()
    st.session_state.doc_version = st.session_state.get("doc_version", 0) + 1
    if analysis:
        st.session_state.analysis = analysis


def show_error(exc):
    if isinstance(exc, (ValueError, ValidationError)):
        st.error(str(exc))
    else:
        st.error(f"작업을 완료하지 못했습니다 ({type(exc).__name__}). 입력 파일과 실행 환경을 확인하세요.")

with st.sidebar:
    st.markdown("### POLICY STUDIO")
    st.caption("문서에서 근거를, 정책에서 변화를.")
    st.divider()
    st.markdown("**작업 순서**\n\n01 PDF 불러오기\n\n02 정책 분석·검토\n\n03 디자인·출력")
    st.divider()
    key_ready = bool(os.getenv("OPENAI_API_KEY") or os.getenv("POLICY_OPENAI_API_KEY"))
    if key_ready:
        st.success("OpenAI 키 설정됨")
    else:
        st.info("실제 AI 분석에는 OPENAI_API_KEY가 필요합니다.")
    model = st.text_input("분석 모델", value=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"), help="Responses Structured Outputs 지원 모델")
    st.caption("문서 추출·이미지 렌더링은 로컬에서 처리합니다. AI 분석 시 추출 텍스트가 OpenAI로 전송됩니다.")
    st.caption("업로드와 결과는 현재 세션 메모리에 보관됩니다. 새로고침·세션 종료 전에 다운로드하세요.")

st.markdown('<div class="studio-hero"><div class="studio-kicker">EVIDENCE → CHANGE → DESIGN</div><h1>달라지는 대한민국</h1><p>정책 원문을 국민의 언어로. 근거가 보이는 인포그래픽 스튜디오.</p></div>', unsafe_allow_html=True)

upload_tab, analysis_tab, design_tab = st.tabs(["01  문서", "02  분석·편집", "03  디자인·다운로드"])

with upload_tab:
    left, right = st.columns([1.6, 1], gap="large")
    with left:
        st.subheader("정책의 시작은 원문입니다")
        uploaded = st.file_uploader("주요업무 추진계획 PDF", type=["pdf"], help="최대 50MB · 250페이지 · 암호화 해제 필요")
        use_ocr = st.checkbox("OCR 사용 (스캔/이미지 포함 PDF)", help="Tesseract 및 kor/eng 언어팩이 필요합니다. OCR 수치는 자동 그래픽에서 제외됩니다.")
        if st.button("PDF 텍스트·표 추출", type="primary", disabled=uploaded is None):
            try:
                with st.spinner("페이지와 표를 추출하고 있습니다…"):
                    data = uploaded.getvalue()
                    set_document(data, extract_pdf(data, uploaded.name, use_ocr))
                st.success("추출 완료. 분석·편집 탭에서 정책 분석을 진행하세요.")
            except Exception as exc:
                show_error(exc)
    with right:
        st.markdown("#### 먼저 체험하기")
        st.write("가상의 정책 6개로 업로드 이후의 편집·디자인·다운로드 흐름을 확인할 수 있습니다.")
        if st.button("합성 데모 문서 불러오기"):
            try:
                data, doc, demo = make_demo()
                set_document(data, doc, demo)
                st.success("데모가 준비되었습니다. 분석·편집 또는 디자인 탭으로 이동하세요.")
            except Exception as exc:
                show_error(exc)
        st.caption("데모에는 실제 정부 정책·예산·성과가 들어 있지 않습니다. OpenAI 호출 없이 작동합니다.")
    if "document" in st.session_state:
        doc = st.session_state.document
        st.divider()
        st.markdown(f"**현재 문서:** {doc.filename}")
        a, b, c = st.columns(3)
        a.metric("PDF 페이지", doc.page_count)
        b.metric("추출 문자", f"{sum(len(p.text) for p in doc.pages):,}")
        c.metric("검토 대상 페이지", sum(p.needs_review for p in doc.pages))
        st.download_button("현재 원문 PDF 다운로드", st.session_state.pdf_bytes, doc.filename, "application/pdf")
        with st.expander("페이지 텍스트·표·목차 확인"):
            if doc.outline:
                st.text("\n".join(doc.outline))
            pn = st.number_input("확인할 PDF 페이지", 1, doc.page_count, 1, key=f"page-{doc.sha256}")
            page = doc.pages[int(pn)-1]
            for w in page.warnings:
                st.warning(w)
            st.caption(f"OCR 적용: {'예' if page.ocr_used else '아니오'}")
            st.text(page.text or "텍스트가 없습니다.")
            for table in page.tables:
                st.dataframe(table)
            st.download_button("추출 결과 JSON", doc.model_dump_json(indent=2), "extracted_document.json", "application/json")

with analysis_tab:
    st.subheader("정책을 읽고, 근거를 확인하세요")
    st.caption("중요도는 국민 영향·국가 경쟁력·미래 변화·실행 가능성·정량 근거·시각화 적합성을 각 5점으로 평가합니다.")
    doc = st.session_state.get("document")
    if doc:
        st.info(f"현재 문서: {doc.filename} · 분석 요청 {len(page_chunks(doc))}회 예상 · 실제 API 사용 요금이 발생할 수 있습니다.")
        consent = st.checkbox("추출 텍스트를 OpenAI API로 전송하는 데 동의합니다.")
        if st.button("AI 정책 분석 실행", type="primary", disabled=not key_ready or not consent):
            progress = st.progress(0, text="분석 준비 중…")
            try:
                result = analyze_document(doc, model, lambda i, n: progress.progress(i/n, text=f"문서 분석 {i}/{n}"))
                st.session_state.analysis = result
                st.session_state.doc_version = st.session_state.get("doc_version", 0)+1
                reset_outputs()
                st.success("분석 완료. 인용·수치·정책 해석을 검토하세요.")
            except Exception as exc:
                show_error(exc)
            finally:
                progress.empty()
    else:
        st.info("문서 탭에서 PDF를 추출하거나 데모를 불러오세요.")
    analysis = st.session_state.get("analysis")
    if analysis:
        if analysis.is_demo:
            st.warning("합성 데모 분석입니다. 실제 정책 정보가 아닙니다.")
        st.markdown(f"### {analysis.document_title}")
        st.write(analysis.document_summary)
        st.caption("원문 대조 = 지정 페이지에 인용문이 존재함. AI 해석의 의미적 정확성은 사람의 검토가 필요합니다.")
        for i, s in enumerate(analysis.policy_sections):
            with st.expander(f"{i+1:02d} · {s.headline} · {s.importance.total}/30 · {s.verification_status}"):
                st.markdown(f"**정책:** {s.policy_description}")
                st.write(f"기존 상황: {s.previous_situation}")
                st.write(f"변화: {s.expected_change}")
                st.write(f"대상: {s.target_group} · 상태: {s.policy_status} · AI 신뢰도: {s.confidence:.0%}")
                st.json(s.importance.model_dump(), expanded=False)
                st.markdown(f"**원문 PDF p.{s.source_page}**")
                st.text(s.source_quote)
                for note in s.verification_notes:
                    st.caption(note)
                if s.key_metrics:
                    st.dataframe([{"수치": m.label, "값": m.metric_value, "단위": m.metric_unit, "연도": m.metric_year,
                                   "상태": m.metric_status, "PDF 페이지": m.source_page, "검증": m.verification_status,
                                   "인용": m.source_quote, "메모": " / ".join(m.verification_notes)} for m in s.key_metrics], hide_index=True)
        with st.expander("분석 JSON 직접 편집 / 가져오기"):
            st.caption("정책 문구·분야·수치·인용·중요도를 편집할 수 있습니다. 적용 시 원문으로 다시 검증하며 API는 호출하지 않습니다.")
            edited = st.text_area("분석 JSON", analysis.model_dump_json(indent=2), height=430,
                                  key=f"editor-{st.session_state.doc_version}")
            imported = st.file_uploader("저장한 분석 JSON 가져오기", type="json")
            if st.button("편집 적용 및 근거 재검증"):
                try:
                    candidate = Analysis.model_validate_json(imported.getvalue() if imported else edited)
                    if candidate.source_document_sha256 and candidate.source_document_sha256 != doc.sha256:
                        raise ValueError("이 JSON의 원문 PDF가 현재 문서와 다릅니다. 분석에 사용한 원문을 불러오세요.")
                    # Demo identity belongs to the source PDF, cannot be removed by editing.
                    candidate.is_demo = analysis.is_demo
                    st.session_state.analysis = validate_analysis(candidate, doc)
                    st.session_state.doc_version += 1
                    reset_outputs()
                    st.rerun()
                except (ValueError, ValidationError) as exc:
                    show_error(exc)
        st.download_button("전체 분석 JSON 다운로드", analysis.model_dump_json(indent=2), "policy_analysis.json", "application/json")
        st.download_button("전체 정책 출처표 CSV", sources_csv(analysis), "policy_sources.csv", "text/csv")

with design_tab:
    analysis = st.session_state.get("analysis")
    if not analysis:
        st.info("먼저 분석을 실행하거나 합성 데모를 불러오세요.")
    else:
        controls, preview = st.columns([1, 2.2], gap="large")
        version = st.session_state.doc_version
        with controls:
            st.subheader("편집과 디자인")
            title = st.text_input("제목", "달라지는 대한민국", key=f"title-{version}")
            subtitle = st.text_area("부제", " · ".join(dict.fromkeys(s.field for s in analysis.policy_sections)), key=f"sub-{version}")
            fields = list(dict.fromkeys(s.field for s in analysis.policy_sections))
            chosen_fields = st.multiselect("포함할 정책 분야", fields, default=fields, key=f"fields-{version}")
            candidates = [i for i, s in enumerate(analysis.policy_sections) if s.field in chosen_fields]
            chosen = st.multiselect("포함할 정책", candidates, default=candidates, format_func=lambda i: f"{i+1}. {analysis.policy_sections[i].policy_title}", key=f"policies-{version}-{'-'.join(map(str,candidates))}")
            theme = st.selectbox("컬러 테마", ["네이비 · 블루", "딥 그린", "모노크롬"])
            style = st.selectbox("디자인 스타일", ["프리미엄 매거진", "정책 브리핑", "미래기술 포스터"])
            detail = st.select_slider("콘텐츠 상세도", options=["간결", "표준", "상세"], value="표준")
            width_option = st.selectbox("출력 너비", ["1440px", "2160px", "사용자 지정"])
            width = st.number_input("너비 (px)", 720, 3000, 1440, 120) if width_option == "사용자 지정" else int(width_option[:-2])
            source_style = st.selectbox("출처 표시", ["페이지와 인용", "페이지", "하단 출처표"])
            st.caption("SVG 벡터 장식을 사용합니다. 외부 이미지 생성 서비스는 호출하지 않습니다.")
            reviewed = st.checkbox("선택한 정책의 인용·목표/성과·기대효과를 검토했습니다.", key=f"reviewed-{version}")
            try:
                selected = analysis.model_copy(deep=True)
                selected.policy_sections = [analysis.policy_sections[i] for i in chosen]
                design = Design(title=title, subtitle=subtitle, theme=theme, width=int(width), detail=detail, style=style, sources=source_style)
                fingerprint = hashlib.sha256((selected.model_dump_json()+design.model_dump_json()).encode()).hexdigest()
            except ValidationError as exc:
                st.error("제목과 출력 너비를 확인하세요.")
                fingerprint = None
            if st.button("인포그래픽 생성", type="primary", disabled=not chosen or not reviewed or not fingerprint):
                try:
                    with st.spinner("한국어 조판 · 타일 렌더링 · 출력 품질 검사 중…"):
                        result = export_infographic(selected, design)
                    st.session_state.result = result
                    st.session_state.render_fingerprint = fingerprint
                    st.session_state.render_analysis = selected
                    st.success(f"생성 완료 · {result.width:,} × {result.height:,}px")
                except Exception as exc:
                    show_error(exc)
        with preview:
            st.subheader("변화의 이야기를 한 장으로")
            result = st.session_state.get("result")
            if result:
                if st.session_state.render_fingerprint != fingerprint:
                    st.warning("설정이 변경되었습니다. 아래는 이전 결과입니다. 생성 버튼으로 갱신하세요.")
                st.caption(f"마지막 생성 결과 · {result.width:,} × {result.height:,}px · PNG {len(result.png)/1024/1024:.1f}MB")
                full_tab, section_tab, zoom_tab = st.tabs(["전체 미리보기", "섹션별", "확대"])
                with full_tab:
                    with Image.open(io.BytesIO(result.png)) as im:
                        im.thumbnail((900, 20000))
                        st.image(im.copy(), width="stretch")
                with section_tab:
                    part = st.selectbox("섹션", list(result.sections), format_func=lambda s: "첫 화면" if s=="hero" else f"정책 {int(s.split('-')[1])+1}")
                    st.image(result.sections[part], width="stretch")
                with zoom_tab:
                    with Image.open(io.BytesIO(result.png)) as im:
                        top = st.slider("위치 (픽셀)", 0, max(1, result.height-1000), 0, step=100)
                        st.image(im.crop((0, top, result.width, min(result.height, top+1400))), width=result.width)
                st.divider()
                st.download_button("고해상도 PNG", result.png, "달라지는_대한민국.png", "image/png")
                st.download_button("인쇄용 PDF", result.pdf, "달라지는_대한민국.pdf", "application/pdf")
                st.download_button("편집용 HTML", result.html, "달라지는_대한민국.html", "text/html")
                rendered = st.session_state.render_analysis
                st.download_button("출력에 사용한 JSON", rendered.model_dump_json(indent=2), "rendered_analysis.json", "application/json")
                st.download_button("출력 정책 출처표", sources_csv(rendered), "rendered_sources.csv", "text/csv")
                with st.expander("자동 품질 검사 결과"):
                    st.json({k:v for k,v in result.checks.items() if k != "rects"})
                    st.caption("검사는 글꼴·DOM 넘침·섹션 겹침·대비·파일 무결성을 확인합니다. 정책 의미와 미적 완성도를 보증하지 않습니다.")
            else:
                st.markdown("""**원문의 신뢰감에, 편집디자인의 힘을 더합니다.**

대담한 제목과 검증된 수치, 정책별 개념도를 연결한 세로 포스터를 생성합니다.

왼쪽에서 정책과 디자인을 선택하고 검토를 완료한 뒤 생성하세요.""")
