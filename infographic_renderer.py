from base64 import b64encode
from functools import lru_cache
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape
from schemas import Analysis, Design
from storytelling_engine import build_story
from visualization_engine import choose_visual, illustration

ROOT = Path(__file__).resolve().parent
PALETTES = {
    "네이비 · 블루": {"navy": "#101D38", "accent": "#2563EB", "cyan": "#16B8D5", "mint": "#32D5BC", "paper": "#F7F9FC"},
    "딥 그린": {"navy": "#102D2A", "accent": "#087965", "cyan": "#167F86", "mint": "#A5EBBD", "paper": "#F5FAF6"},
    "모노크롬": {"navy": "#18212D", "accent": "#374A64", "cyan": "#53647C", "mint": "#D6E0EA", "paper": "#FAFAF8"},
}

@lru_cache(maxsize=1)
def font_data() -> str:
    path = ROOT / "assets/fonts/NotoSansKR.ttf"
    if not path.exists():
        raise ValueError("assets/fonts/NotoSansKR.ttf 폰트가 없습니다. 저장소 자산을 복원하세요.")
    return b64encode(path.read_bytes()).decode()


def render_html(analysis: Analysis, design: Design) -> str:
    story = build_story(analysis, design)
    env = Environment(loader=FileSystemLoader(ROOT / "templates"), autoescape=select_autoescape(["html"]))
    story.update(palette=PALETTES[design.theme], font=font_data(), hero_svg=illustration("illustration"),
                 visuals=[choose_visual(s, i) for i, s in enumerate(story["sections"])])
    return env.get_template("poster.html").render(**story)
