"""Reproducible offline pipeline: synthetic PDF → validation → PNG/PDF/CSV."""
import argparse
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from demo import make_demo
from schemas import Design
from export_manager import export_infographic, sources_csv


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', default='outputs/demo')
    parser.add_argument('--width', type=int, default=1440)
    args = parser.parse_args()
    folder = Path(args.output)
    folder.mkdir(parents=True, exist_ok=True)
    pdf, document, analysis = make_demo()
    result = export_infographic(analysis, Design(width=args.width))
    for name, content in {'poster.png':result.png, 'poster.pdf':result.pdf,
                          'source.pdf':pdf, 'sources.csv':sources_csv(analysis)}.items():
        (folder/name).write_bytes(content)
    (folder/'analysis.json').write_text(analysis.model_dump_json(indent=2), encoding='utf-8')
    (folder/'quality.json').write_text(json.dumps(result.checks, ensure_ascii=False, indent=2), encoding='utf-8')
    (folder/'poster.html').write_text(result.html, encoding='utf-8')
    print(f'Generated {result.width} × {result.height}px → {folder.resolve()}')

if __name__ == '__main__':
    main()
