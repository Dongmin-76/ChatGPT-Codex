"""Chromium typography, bounded tile captures and lossless PNG assembly."""
import csv
import io
import os
import shutil
os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", "0")
from dataclasses import dataclass
from PIL import Image, ImageFont
from playwright.sync_api import sync_playwright, Error as PlaywrightError
from schemas import Analysis, Design
from infographic_renderer import render_html, ROOT, PALETTES

@dataclass
class ExportResult:
    png: bytes
    pdf: bytes
    html: str
    width: int
    height: int
    checks: dict
    sections: dict[str, bytes]


def contrast(a: str, b: str) -> float:
    def lum(color):
        rgb = [int(color[i:i+2], 16) / 255 for i in (1, 3, 5)]
        lin = [c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in rgb]
        return sum(c*w for c, w in zip(lin, [.2126, .7152, .0722]))
    lo, hi = sorted([lum(a), lum(b)])
    return (hi + .05) / (lo + .05)


def export_infographic(analysis: Analysis, design: Design) -> ExportResult:
    html = render_html(analysis, design)
    scale = design.width / 1440
    with sync_playwright() as pw:
        try:
            browser = pw.chromium.launch(headless=True, executable_path=os.getenv("CHROMIUM_EXECUTABLE") or shutil.which("chromium") or shutil.which("chromium-browser") or None)
        except PlaywrightError as exc:
            raise ValueError("Chromium을 실행할 수 없습니다. python -m playwright install chromium 명령과 시스템 라이브러리를 확인하세요.") from exc
        try:
            page = browser.new_page(viewport={"width": design.width, "height": 1200}, device_scale_factor=1)
            page.set_content(html, wait_until="load", timeout=60000)
            page.add_style_tag(content=f".poster{{zoom:{scale}}} body{{width:{design.width}px}}")
            page.evaluate("document.fonts.ready")
            checks = page.evaluate("""() => {
                const all = [...document.querySelectorAll('h1,h2,h3,p,small,.pill,.status,.eyebrow,.ordinal')];
                const overflow = all.filter(e => e.scrollWidth > e.clientWidth+3 || e.scrollHeight > e.clientHeight+3)
                    .map(e => e.textContent.slice(0,100));
                const sections = [...document.querySelectorAll('main > section,main > footer')];
                const rects = sections.map(e => {const r=e.getBoundingClientRect();return {id:e.id,y:r.y,h:r.height}});
                const overlap = rects.filter((r,i) => i && r.y < rects[i-1].y+rects[i-1].h-2).map(r=>r.id);
                return {font_loaded:document.fonts.check('24px StudioKR'),overflow,overlap,rects,
                    width:document.querySelector('main').getBoundingClientRect().width,
                    height:Math.ceil(document.documentElement.scrollHeight)};
            }""")
            font = ImageFont.truetype(str(ROOT / "assets/fonts/NotoSansKR.ttf"), 32)
            checks["korean_glyphs"] = bytes(font.getmask("한")) != bytes(font.getmask("글"))
            palette = PALETTES[design.theme]
            checks["text_contrast"] = round(contrast(palette["navy"], palette["paper"]), 2)
            checks["accent_contrast"] = round(contrast(palette["accent"], palette["paper"]), 2)
            checks["source_contrast"] = round(contrast("#45556a", palette["paper"]), 2)
            checks["source_size_px"] = round(19 * scale, 1)
            checks["warnings"] = []
            if checks["source_size_px"] < 16:
                checks["warnings"].append("출처 글자가 16px 미만입니다. 1440px 이상 출력을 권장합니다.")
            if checks["overflow"] or checks["overlap"] or not checks["font_loaded"] or not checks["korean_glyphs"]:
                raise ValueError(f"디자인 품질 검사 실패: 글꼴/텍스트 넘침/영역 겹침을 확인하세요. {checks['overflow'][:3]}")
            width, height = design.width, checks["height"]
            if width * height > 100_000_000:
                raise ValueError("출력 이미지가 1억 픽셀을 초과합니다. 정책 수·상세도·너비를 줄여 주세요.")
            canvas = Image.new("RGB", (width, height), palette["paper"])
            for y in range(0, height, 2048):
                tile = page.screenshot(type="png", clip={"x": 0, "y": y, "width": width, "height": min(2048, height-y)},
                                       full_page=True, timeout=60000)
                with Image.open(io.BytesIO(tile)) as im:
                    canvas.paste(im.convert("RGB"), (0, y))
            result_png = io.BytesIO()
            canvas.save(result_png, format="PNG", optimize=True)
            with Image.open(io.BytesIO(result_png.getvalue())) as verified:
                verified.verify()
            checks["png_integrity"] = True
            # Preview crops reuse final pixels, so preview and download cannot diverge.
            previews = {}
            for rect in checks["rects"]:
                if rect["id"].startswith("policy-") or rect["id"] == "hero":
                    y0 = max(0, round(rect["y"]))
                    y1 = min(height, round(rect["y"] + rect["h"]))
                    buf = io.BytesIO()
                    canvas.crop((0, y0, width, y1)).save(buf, format="PNG")
                    previews[rect["id"]] = buf.getvalue()
            canvas.close()
            # The same vector HTML stays selectable/searchable in printable PDF.
            pdf = page.pdf(width=f"{width}px", height=f"{min(height, 14000)}px", print_background=True,
                           margin={"top":"0", "bottom":"0", "left":"0", "right":"0"}, prefer_css_page_size=False)
            checks["pdf_signature"] = pdf.startswith(b"%PDF")
            return ExportResult(result_png.getvalue(), pdf, html, width, height, checks, previews)
        finally:
            browser.close()


def sources_csv(analysis: Analysis) -> bytes:
    buf = io.StringIO(newline="")
    writer = csv.writer(buf)
    writer.writerow(["정책", "유형", "내용", "값", "단위", "연도", "상태", "PDF 페이지", "원문 인용", "검증"])
    def safe(s):
        text = str(s)
        return "'" + text if text.lstrip().startswith(("=", "+", "-", "@")) else text
    for section in analysis.policy_sections:
        writer.writerow([safe(x) for x in [section.policy_title, "정책", section.policy_description, "", "", "", section.policy_status,
                                           section.source_page, section.source_quote, section.verification_status]])
        for m in section.key_metrics:
            writer.writerow([safe(x) for x in [section.policy_title, "수치", m.label, m.metric_value, m.metric_unit, m.metric_year,
                                               m.metric_status, m.source_page, m.source_quote, m.verification_status]])
    return buf.getvalue().encode("utf-8-sig")
