"""Local PDF extraction. OCR never silently substitutes invented content."""
import hashlib
import os
from pathlib import Path
import pymupdf
from schemas import Document, PageText

MAX_BYTES = 50 * 1024 * 1024
MAX_PAGES = 250


def extract_pdf(data: bytes, filename: str = "document.pdf", ocr: bool = False) -> Document:
    if len(data) > MAX_BYTES:
        raise ValueError("PDF는 50MB 이하로 업로드해 주세요.")
    try:
        pdf = pymupdf.open(stream=data, filetype="pdf")
    except Exception as exc:
        raise ValueError("PDF를 열 수 없습니다. 손상되었거나 PDF 형식이 아닙니다.") from exc
    with pdf:
        if pdf.needs_pass:
            raise ValueError("암호화된 PDF입니다. 암호를 해제한 파일을 업로드해 주세요.")
        if not 1 <= len(pdf) <= MAX_PAGES:
            raise ValueError(f"1~{MAX_PAGES}페이지 문서를 지원합니다. 문서를 분할해 주세요.")
        pages = []
        for i, page in enumerate(pdf):
            text = page.get_text(sort=True)
            sparse = len(text.strip()) < 40
            used = False
            warnings = []
            if ocr:
                try:
                    # Full OCR only for sparse pages, supplement image regions otherwise.
                    local_data = Path(__file__).resolve().parent / ".local/tessdata"
                    tessdata = os.getenv("TESSDATA_PREFIX") or (str(local_data) if local_data.exists() else None)
                    tp = page.get_textpage_ocr(language="kor+eng", dpi=180, full=sparse, tessdata=tessdata)
                    text = page.get_text(textpage=tp, sort=True)
                    used = True
                    warnings.append("OCR 결과입니다. 수치·단위·인용을 원본 이미지와 대조하세요.")
                except Exception as exc:
                    warnings.append(f"OCR 실패 ({type(exc).__name__}): Tesseract 및 kor/eng 언어팩을 확인하세요.")
            elif sparse:
                warnings.append("텍스트가 적습니다. 스캔 또는 이미지 포함 페이지라면 OCR을 선택하세요.")
            tables = []
            try:
                for table in page.find_tables().tables:
                    tables.append(table.extract())
            except Exception:
                warnings.append("표 구조 추출 실패: 페이지 텍스트와 원본을 직접 확인하세요.")
            if '\ufffd' in text:
                warnings.append("인코딩 손상 문자가 있습니다.")
            pages.append(PageText(number=i + 1, text=text, tables=tables, ocr_used=used,
                                  needs_review=sparse or used or bool(warnings), warnings=warnings))
        return Document(filename=filename, sha256=hashlib.sha256(data).hexdigest(), page_count=len(pdf),
                        metadata={k: str(v or "") for k, v in (pdf.metadata or {}).items()},
                        outline=[f"{level} | {title} | PDF p.{p}" for level, title, p in pdf.get_toc()], pages=pages)


def page_chunks(document: Document, max_chars: int = 26000) -> list[str]:
    """Bound API calls, retain complete text using overlapping parts for long pages."""
    if max_chars < 1024:
        raise ValueError("max_chars는 1024 이상이어야 합니다.")
    payload = max_chars - 128
    chunks, current = [], ""
    for page in document.pages:
        text = page.text
        for start in range(0, max(1, len(text)), payload - 128):
            part = f"\n[PDF 페이지 {page.number}; OCR={page.ocr_used}]\n" + text[start:start + payload]
            if len(current) + len(part) > max_chars and current:
                chunks.append(current)
                current = ""
            current += part
    if current:
        chunks.append(current)
    return chunks
