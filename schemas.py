"""Analysis is independent of design; all page numbers are 1-based PDF pages."""
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

class Model(BaseModel):
    model_config = ConfigDict(extra="forbid")

Status = Literal["성과", "추진 중", "목표", "기대효과"]
Verification = Literal["검토 필요", "원문 대조", "근거 불일치"]

class Metric(Model):
    label: str = Field(max_length=100)
    metric_value: str = Field(min_length=1, max_length=40)
    metric_unit: str = Field(min_length=1, max_length=30)
    metric_year: str = Field(max_length=30)
    metric_status: Status
    source_page: int = Field(ge=1)
    source_quote: str = Field(min_length=1, max_length=1500)
    verification_status: Verification = "검토 필요"
    verification_notes: list[str] = Field(default_factory=list)

class Importance(Model):
    public_impact: int = Field(ge=0, le=5)
    competitiveness: int = Field(ge=0, le=5)
    future_change: int = Field(ge=0, le=5)
    feasibility: int = Field(ge=0, le=5)
    evidence: int = Field(ge=0, le=5)
    visual_potential: int = Field(ge=0, le=5)

    @property
    def total(self) -> int:
        return sum(self.model_dump().values())

class PolicySection(Model):
    policy_title: str = Field(min_length=1, max_length=120)
    field: str = Field(min_length=1, max_length=70)
    headline: str = Field(min_length=1, max_length=150)
    policy_description: str = Field(max_length=1800)
    previous_situation: str = Field(max_length=1000)
    expected_change: str = Field(max_length=1500)
    target_group: str = Field(max_length=300)
    timing: str = Field(max_length=200)
    policy_status: Status
    key_metrics: list[Metric] = Field(max_length=12)
    source_page: int = Field(ge=1)
    source_quote: str = Field(min_length=1, max_length=2200)
    visualization_type: Literal["kpi", "timeline", "comparison", "process", "network", "illustration"]
    confidence: float = Field(ge=0, le=1)
    importance: Importance
    verification_status: Verification = "검토 필요"
    verification_notes: list[str] = Field(default_factory=list)

class Analysis(Model):
    document_title: str = Field(min_length=1, max_length=250)
    organization: str = Field(max_length=200)
    document_year: str = Field(max_length=40)
    document_summary: str = Field(max_length=2000)
    policy_vision: str = Field(max_length=600)
    main_messages: list[str] = Field(max_length=5)
    policy_sections: list[PolicySection] = Field(min_length=1, max_length=40)
    source_document_sha256: str = ""
    is_demo: bool = False
    review_notes: list[str] = Field(default_factory=list)

class ChunkAnalysis(Analysis):
    policy_sections: list[PolicySection] = Field(default_factory=list, max_length=12)

class PageText(Model):
    number: int
    text: str
    tables: list[list[list[str | None]]]
    ocr_used: bool
    needs_review: bool
    warnings: list[str]

class Document(Model):
    filename: str
    sha256: str
    page_count: int
    metadata: dict[str, str]
    outline: list[str]
    pages: list[PageText]

class Design(Model):
    title: str = Field(default="달라지는 대한민국", min_length=1, max_length=100)
    subtitle: str = Field(default="", max_length=300)
    theme: Literal["네이비 · 블루", "딥 그린", "모노크롬"] = "네이비 · 블루"
    width: int = Field(default=1440, ge=720, le=3000)
    detail: Literal["간결", "표준", "상세"] = "표준"
    style: Literal["정책 브리핑", "프리미엄 매거진", "미래기술 포스터"] = "프리미엄 매거진"
    sources: Literal["페이지와 인용", "페이지", "하단 출처표"] = "페이지와 인용"
