"""Visual forms are editorial, with no fabricated scales or denominators."""
from html import escape
from schemas import PolicySection


def illustration(kind: str = "network") -> str:
    # Symbolic technology/civic infrastructure, never a quantitative chart.
    variants = {
        "illustration": '<path d="M80 260V150l70-40 70 40v110M150 110V60l80-35 80 35v200M240 260V150l70-40 70 40v110"/><path d="M105 165h30m-30 30h30m-30 30h30m45-130h30m-30 30h30m-30 30h30m55 15h30m-30 30h30m-30 30h30"/>',
        "network": '<path d="M100 80l130 65 110-75M100 80l-25 155 155-90 120 90M75 235l155 55 120-55M230 145v145"/><circle cx="100" cy="80" r="24"/><circle cx="230" cy="145" r="38"/><circle cx="340" cy="70" r="23"/><circle cx="75" cy="235" r="22"/><circle cx="230" cy="290" r="18"/><circle cx="350" cy="235" r="26"/>',
        "process": '<path d="M65 230l110-120 95 110 95-130"/><circle cx="65" cy="230" r="25"/><circle cx="175" cy="110" r="25"/><circle cx="270" cy="220" r="25"/><circle cx="365" cy="90" r="25"/>',
        "timeline": '<path d="M50 160h320"/><circle cx="80" cy="160" r="24"/><circle cx="210" cy="160" r="24"/><circle cx="340" cy="160" r="24"/><path d="M80 135V65m130 120v75m130-125V65"/>',
    }
    body = variants.get(kind, variants["network"])
    return '<svg viewBox="0 0 440 340" aria-label="정책 연결을 상징하는 장식 일러스트" xmlns="http://www.w3.org/2000/svg"><g fill="var(--paper)" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round">' + body + '</g></svg>'


def choose_visual(section: PolicySection, index: int) -> dict:
    metrics = [m for m in section.key_metrics if m.verification_status == "원문 대조"]
    requested = section.visualization_type
    if metrics:
        kind = "timeline" if requested == "timeline" and all(m.metric_year for m in metrics) else "kpi"
    elif requested == "comparison" and section.previous_situation != "원문 미확인":
        kind = "comparison"
    else:
        kind = requested if requested in {"process", "network", "illustration", "timeline"} else ["network", "illustration", "process"][index % 3]
    return {"kind": kind, "metrics": metrics, "svg": illustration(kind)}
