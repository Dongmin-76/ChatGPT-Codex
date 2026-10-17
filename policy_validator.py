"""Conservative lexical evidence checks, not a semantic truth oracle."""
import re
import unicodedata
from schemas import Analysis, Document


def normalized(text: str) -> str:
    return re.sub(r"\s+", "", unicodedata.normalize("NFKC", text)).lower()


def numbers(text: str) -> set[str]:
    return set(re.findall(r"(?<![\d.])\d[\d,]*(?:\.\d+)?", text))


def validate_analysis(analysis: Analysis, document: Document) -> Analysis:
    result = analysis.model_copy(deep=True)
    result.source_document_sha256 = document.sha256
    pages = {p.number: p for p in document.pages}
    for section in result.policy_sections:
        section.verification_notes = []
        p = pages.get(section.source_page)
        quote = normalized(section.source_quote)
        grounded = bool(p and quote and quote in normalized(p.text))
        section.verification_status = "원문 대조" if grounded else "근거 불일치"
        if not grounded:
            section.verification_notes.append("인용문이 지정 PDF 페이지와 일치하지 않습니다. 출력에서 제외됩니다.")
        if p and p.needs_review:
            section.verification_status = "검토 필요" if grounded else "근거 불일치"
            section.verification_notes.append("OCR 또는 추출 품질 검토가 필요합니다.")
        # Numeric claims may only be introduced through verified metric objects.
        prose = " ".join([section.headline, section.policy_title, section.field, section.policy_description,
                          section.previous_situation, section.expected_change, section.target_group, section.timing])
        if numbers(prose) - numbers(section.source_quote):
            section.verification_status = "근거 불일치"
            section.verification_notes.append("본문 수치가 정책 인용문에 없습니다. 출력에서 제외됩니다.")
        if re.search(r"반드시|무조건|완벽한|세계\s*최초|세계\s*최고|보장", prose):
            section.verification_notes.append("단정적·과장 표현을 원문과 대조하세요.")
            if grounded and section.verification_status != "근거 불일치":
                section.verification_status = "검토 필요"
        section.verification_notes.append("원문 대조는 인용 일치 확인입니다. 해석·기대효과의 타당성은 사람이 검토해야 합니다.")
        for m in section.key_metrics:
            m.verification_notes = []
            mp = pages.get(m.source_page)
            mq = normalized(m.source_quote)
            ok = bool(mp and mq and mq in normalized(mp.text))
            # Value+unit must occur together; 20 and 200 must never match.
            token = normalized(m.metric_value + m.metric_unit)
            pattern = r"(?<![\d.,])" + re.escape(token) + r"(?![\d])"
            if not re.search(pattern, mq):
                ok = False
                m.verification_notes.append("수치와 단위 조합이 인용문에 없습니다.")
            if m.metric_year and normalized(m.metric_year) not in mq:
                ok = False
                m.verification_notes.append("기준연도가 인용문에 없습니다.")
            cues = {"목표": r"목표|계획|예정|까지|추진", "성과": r"달성|완료|실적|성과|기록|지원했다",
                    "추진 중": r"추진|진행|시행|운영|중", "기대효과": r"기대|예상|전망"}
            if not re.search(cues[m.metric_status], m.source_quote):
                ok = False
                m.verification_notes.append("성과·목표 등 상태를 뒷받침하는 표현이 없습니다.")
            if not mq or not mp:
                ok = False
            m.verification_status = "원문 대조" if ok else "근거 불일치"
            if ok and mp.needs_review:
                m.verification_status = "검토 필요"
                m.verification_notes.append("OCR/추출 품질 검토 수치는 시각화에서 제외합니다.")
            if not ok:
                m.verification_notes.append("검증되지 않은 수치는 시각화에서 제외합니다.")
    result.review_notes = ["AI 해석은 편집 초안입니다. 인용 일치는 정책 효과의 실현이나 의미적 정확성을 보증하지 않습니다."]
    return result
