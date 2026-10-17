"""Explicitly fictional fixture, generated locally, never labelled government data."""
import pymupdf
from schemas import Analysis, Document, Importance, Metric, PolicySection
from pdf_processor import extract_pdf
from policy_validator import validate_analysis

FIXTURES = [
    ("AI 활용", "일상 가까이, AI 배움의 기회", "생활 속 AI 활용 교육을 운영한다.", "AI 활용 교육 기회를 넓힐 것으로 기대된다.", "일반 시민", "2027년까지 AI 교육 1,200명 지원을 목표로 한다.", "1,200", "명", "AI 교육 지원", "kpi"),
    ("연구 환경", "연구자가 연구에 집중할 수 있도록", "공동 연구 장비를 공유하는 체계를 추진한다.", "연구 장비 접근성 개선이 기대된다.", "연구자", "2027년 공동 연구 장비 30대 공유를 목표로 추진한다.", "30", "대", "공유 연구 장비", "timeline"),
    ("성장 기회", "작은 기업의 다음 도약을 연결하다", "기업의 기술 실증을 지원한다.", "기업의 기술 실증 기회 확대가 기대된다.", "중소기업", "2027년 기술 실증 80개사 지원을 목표로 추진한다.", "80", "개사", "기술 실증 지원", "kpi"),
    ("디지털 접근", "디지털 서비스를 더 가까이", "지역 디지털 이용 상담을 운영한다.", "디지털 서비스 이용의 접근성 향상이 기대된다.", "지역 주민", "2027년 디지털 이용 상담 20개소 운영을 목표로 추진한다.", "20", "개소", "이용 상담 거점", "process"),
    ("안전한 연결", "함께 만드는 디지털 신뢰", "디지털 안전 교육과 피해 상담 연계를 추진한다.", "안전한 디지털 이용에 도움이 될 것으로 기대된다.", "디지털 서비스 이용자", "디지털 안전 교육과 피해 상담 연계를 추진한다.", "", "", "", "network"),
    ("미래 인재", "새로운 기술을 배우는 출발선", "지역 청년에게 기술 교육과 멘토링을 제공한다.", "지역 청년의 기술 학습 기회 확대가 기대된다.", "지역 청년", "지역 청년에게 기술 교육과 멘토링을 제공한다.", "", "", "", "illustration"),
]


def make_demo() -> tuple[bytes, Document, Analysis]:
    pdf = pymupdf.open()
    sections = []
    score = Importance(public_impact=4, competitiveness=3, future_change=4, feasibility=4, evidence=4, visual_potential=5)
    for i, (field, headline, desc, change, target, quote, value, unit, label, visual) in enumerate(FIXTURES):
        page = pdf.new_page(width=595, height=842)
        text = f"합성 데모 정책 계획 · 실제 정부 정책 아님\n가상 정책 스튜디오 / 2027년\n\n{field}\n{desc}\n{quote}\n대상: {target}\n{change}"
        page.insert_textbox(pymupdf.Rect(45, 55, 550, 780), text, fontname="korea", fontsize=14)
        metrics = [Metric(label=label, metric_value=value, metric_unit=unit, metric_year="2027년",
                          metric_status="목표", source_page=i+1, source_quote=quote)] if value else []
        sections.append(PolicySection(policy_title=desc.rstrip("."), field=field, headline=headline,
            policy_description=desc, previous_situation="원문 미확인", expected_change=change, target_group=target,
            timing="2027년" if value else "원문 미확인", policy_status="목표" if value else "추진 중", key_metrics=metrics,
            source_page=i+1, source_quote=quote if value else desc, visualization_type=visual, confidence=.95, importance=score))
    data = pdf.tobytes()
    pdf.close()
    doc = extract_pdf(data, "합성_데모_정책계획.pdf")
    analysis = Analysis(document_title="합성 데모 정책 계획", organization="가상 정책 스튜디오 (실제 기관 아님)",
                        document_year="2027년 (가상)", document_summary="전체 흐름 검증을 위한 합성 정책 문서입니다.",
                        policy_vision="배움과 연결을 넓히는 가상 정책", main_messages=[x[0] for x in FIXTURES[:5]],
                        policy_sections=sections, is_demo=True)
    return data, doc, validate_analysis(analysis, doc)
