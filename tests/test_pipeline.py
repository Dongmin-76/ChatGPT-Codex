import io
from types import SimpleNamespace
import pymupdf
import pytest
from PIL import Image
from pydantic import ValidationError
from demo import make_demo
from schemas import Analysis, ChunkAnalysis, Design
from pdf_processor import extract_pdf, page_chunks
from policy_validator import validate_analysis
from policy_analyzer import analyze_document
from infographic_renderer import render_html
from export_manager import export_infographic, sources_csv
from visualization_engine import choose_visual

@pytest.fixture
def fixture():
    return make_demo()


def test_real_pdf_roundtrip_and_grounding(fixture):
    data, doc, analysis = fixture
    assert data.startswith(b'%PDF') and doc.page_count == 6
    assert all(s.verification_status == '원문 대조' for s in analysis.policy_sections)
    assert all(m.verification_status == '원문 대조' for s in analysis.policy_sections for m in s.key_metrics)
    assert all(s.source_quote.replace(' ', '') in doc.pages[s.source_page-1].text.replace(' ', '').replace('\n','') for s in analysis.policy_sections)

@pytest.mark.parametrize('field,value', [('metric_value','200'), ('metric_unit','억원'), ('metric_year','2029년'), ('metric_status','성과'), ('source_page',99), ('source_quote','없는 인용문')])
def test_wrong_metric_excluded(fixture, field, value):
    _, doc, a = fixture
    setattr(a.policy_sections[0].key_metrics[0], field, value)
    checked = validate_analysis(a, doc)
    assert checked.policy_sections[0].key_metrics[0].verification_status == '근거 불일치'
    assert not choose_visual(checked.policy_sections[0],0)['metrics']


def test_numeric_substring_cannot_verify(fixture):
    _,doc,a=fixture
    a.policy_sections[1].key_metrics[0].metric_value='0'
    assert validate_analysis(a,doc).policy_sections[1].key_metrics[0].verification_status=='근거 불일치'


def test_ungrounded_policy_excluded(fixture):
    _, doc, a = fixture
    a.policy_sections[0].source_page = 2
    checked = validate_analysis(a, doc)
    assert checked.policy_sections[0].verification_status == '근거 불일치'
    assert a.policy_sections[0].headline not in render_html(checked, Design())


def test_invented_prose_number_excluded(fixture):
    _,doc,a=fixture
    a.policy_sections[0].expected_change='999만 명의 삶을 바꾼다.'
    assert validate_analysis(a,doc).policy_sections[0].verification_status=='근거 불일치'


def test_ocr_numbers_require_review(fixture):
    _,doc,a=fixture
    doc.pages[0].needs_review=True
    doc.pages[0].ocr_used=True
    checked=validate_analysis(a,doc)
    assert checked.policy_sections[0].verification_status=='검토 필요'
    assert not choose_visual(checked.policy_sections[0],0)['metrics']


def test_corrupt_and_encrypted_pdf():
    with pytest.raises(ValueError,match='PDF를 열 수'):
        extract_pdf(b'invalid')
    doc=pymupdf.open(); doc.new_page()
    data=doc.tobytes(encryption=pymupdf.PDF_ENCRYPT_AES_256,owner_pw='owner',user_pw='password')
    doc.close()
    with pytest.raises(ValueError,match='암호화'):
        extract_pdf(data)


def test_empty_pdf_and_ocr_failure(monkeypatch):
    pdf=pymupdf.open();pdf.new_page();data=pdf.tobytes();pdf.close()
    def unavailable(*a,**kw): raise RuntimeError('no tessdata')
    monkeypatch.setattr(pymupdf.Page,'get_textpage_ocr',unavailable)
    doc=extract_pdf(data,ocr=True)
    assert doc.pages[0].needs_review
    assert any('OCR 실패' in w for w in doc.pages[0].warnings)
    with pytest.raises(ValueError,match='텍스트가 없습니다'):
        analyze_document(doc, client=object())


def test_chunking_keeps_every_page(fixture):
    _,doc,_=fixture
    doc.pages[0].text *= 20
    chunks=page_chunks(doc, max_chars=1024)
    assert len(chunks)>1
    assert all(len(c)<=1024 for c in chunks)
    for i in range(1,7):
        assert f'PDF 페이지 {i};' in ''.join(chunks)


def test_api_orchestration_mock(fixture):
    _,doc,a=fixture
    calls=[]
    def parse(**kwargs):
        calls.append(kwargs)
        return SimpleNamespace(output_parsed=a)
    client=SimpleNamespace(responses=SimpleNamespace(parse=parse))
    checked=analyze_document(doc,client=client)
    assert len(checked.policy_sections)==6
    assert not checked.is_demo
    assert calls[0]['text_format'] is ChunkAnalysis
    assert calls[0]['store'] is False
    assert 'PDF 페이지 1' in calls[0]['input'][1]['content']


def test_api_missing_key(fixture,monkeypatch):
    monkeypatch.delenv('OPENAI_API_KEY',raising=False)
    monkeypatch.delenv('POLICY_OPENAI_API_KEY',raising=False)
    with pytest.raises(ValueError,match='OPENAI_API_KEY'):
        analyze_document(fixture[1])


def test_schema_and_escape(fixture):
    _,_,a=fixture
    with pytest.raises(ValidationError):
        Analysis.model_validate({'document_title':'x'})
    a.policy_sections[0].headline='<script>alert(1)</script>'
    html=render_html(a,Design())
    assert '<script>alert' not in html
    assert '&lt;script&gt;' in html
    assert Analysis.model_validate_json(a.model_dump_json())==a


def test_csv_formula_injection(fixture):
    a=fixture[2];a.policy_sections[0].policy_title='=WEBSERVICE("bad")'
    text=sources_csv(a).decode('utf-8-sig')
    assert "'=WEBSERVICE" in text


@pytest.mark.parametrize('width,theme,style', [(1440,'네이비 · 블루','프리미엄 매거진'),(2160,'딥 그린','미래기술 포스터'),(720,'모노크롬','정책 브리핑')])
def test_browser_export(fixture,width,theme,style):
    _,_,a=fixture
    r=export_infographic(a,Design(width=width,theme=theme,style=style))
    with Image.open(io.BytesIO(r.png)) as im:
        assert im.size==(width,r.height)
        assert im.height>im.width*3
    assert r.checks['font_loaded'] and r.checks['korean_glyphs']
    assert not r.checks['overflow'] and not r.checks['overlap']
    assert r.checks['text_contrast']>=4.5 and r.checks['source_contrast']>=4.5
    assert r.pdf.startswith(b'%PDF') and len(r.sections)==7
    with pymupdf.open(stream=r.pdf,filetype='pdf') as pdf:
        text=''.join(p.get_text() for p in pdf)
        assert '달라지는 대한민국' in text
        assert '미래 인재' in text
        assert '1,200' in text


def test_official_sdk_structured_output_transport(fixture):
    import json
    import httpx2
    from openai import OpenAI
    _,doc,a=fixture
    requests=[]
    def handler(request):
        payload=json.loads(request.content)
        requests.append(payload)
        return httpx2.Response(200,json={
            'id':'resp_test','object':'response','created_at':1,'status':'completed','model':'gpt-4.1-mini',
            'output':[{'type':'message','id':'msg_test','role':'assistant','status':'completed',
                       'content':[{'type':'output_text','text':a.model_dump_json(),'annotations':[]}]}],
            'parallel_tool_calls':True,'tools':[], 'tool_choice':'auto', 'metadata':{}, 'temperature':1, 'top_p':1,
        })
    with OpenAI(api_key='test-placeholder-not-a-real-key',http_client=httpx2.Client(transport=httpx2.MockTransport(handler))) as client:
        checked=analyze_document(doc,client=client)
    assert len(checked.policy_sections)==6
    assert requests[0]['text']['format']['type']=='json_schema'
    assert requests[0]['text']['format']['strict'] is True


def test_korean_scan_ocr_when_installed(fixture):
    from pathlib import Path
    import shutil
    if not shutil.which('tesseract') or not Path('.local/tessdata/kor.traineddata').exists():
        pytest.skip('Optional OCR data not installed: python scripts/install_ocr.py')
    with pymupdf.open(stream=fixture[0],filetype='pdf') as source:
        image=source[0].get_pixmap(dpi=150).tobytes('png')
    scan=pymupdf.open();p=scan.new_page();p.insert_image(p.rect,stream=image)
    result=extract_pdf(scan.tobytes(),ocr=True);scan.close()
    assert result.pages[0].ocr_used and result.pages[0].needs_review
    assert '교육' in result.pages[0].text
