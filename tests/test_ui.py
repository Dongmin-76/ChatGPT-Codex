import json
from pathlib import Path
from streamlit.testing.v1 import AppTest


def test_demo_edit_render_download():
    app=AppTest.from_file(str(Path(__file__).resolve().parents[1] / 'app.py'),default_timeout=90).run()
    assert not app.exception
    next(b for b in app.button if b.label=='합성 데모 문서 불러오기').click().run()
    assert not app.exception
    assert len(app.session_state['analysis'].policy_sections)==6
    edited=app.session_state['analysis'].model_dump()
    edited['policy_sections'][0]['headline']='AI로 여는 배움의 기회'
    next(t for t in app.text_area if t.label=='분석 JSON').set_value(json.dumps(edited,ensure_ascii=False)).run()
    next(b for b in app.button if b.label=='편집 적용 및 근거 재검증').click().run()
    assert app.session_state['analysis'].policy_sections[0].headline=='AI로 여는 배움의 기회'
    review=next(c for c in app.checkbox if c.label.startswith('선택한 정책'))
    review.check().run()
    next(b for b in app.button if b.label=='인포그래픽 생성').click().run(timeout=90)
    assert not app.exception
    assert not app.error
    assert app.session_state['result'].png.startswith(b'\x89PNG')
    next(s for s in app.selectbox if s.label=='컬러 테마').select('딥 그린').run()
    assert any('이전 결과' in w.value for w in app.warning)
    assert app.session_state['result'].png
