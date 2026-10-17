"""Source-preserving editorial structure; design changes never call the model."""
from schemas import Analysis, Design


def build_story(analysis: Analysis, design: Design) -> dict:
    sections = [s for s in analysis.policy_sections if s.verification_status != "근거 불일치"]
    if not sections:
        raise ValueError("출력 가능한 정책이 없습니다. 인용 근거를 확인해 주세요.")
    fields = list(dict.fromkeys(s.field for s in sections))
    return {"analysis": analysis, "design": design, "sections": sections,
            "directions": fields[:5], "subtitle": design.subtitle or " · ".join(fields[:3]),
            "closing": "서로 연결된 정책, 앞으로의 변화를 읽다",
            "closing_text": "각 정책의 추진 내용과 대상, 시기를 함께 살펴보세요. 기대효과는 실현된 성과와 구분하며, 시행 내용은 원문과 후속 발표를 확인해야 합니다."}
