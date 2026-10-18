'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, ArrowUpRight, Check, CheckCheck, ChevronDown, ChevronRight, CircleHelp, FileText, Globe2, Layers3, LoaderCircle, Maximize2, Plus, ShieldCheck, Sparkles, Upload, X, WandSparkles, ScanText, CircleAlert } from 'lucide-react';
import { CHUNK_PAGES, IMAGE_MODEL, MAX_FILE_MB, MAX_PAGES, styles, type BriefEnvelope, type Chunk, type Signed, type StyleId } from '../lib/contracts';
import { downloadPDF, makeA4, pdfChunk, readPDF, saveBlob, streamPost } from '../lib/browser';
import SamplePoster from './components/sample-poster';
type LoadedPDF = Awaited<ReturnType<typeof readPDF>>;
type Stage = 'idle' | 'reading' | 'analyzing' | 'brief' | 'review' | 'generating' | 'done';
type Result = { image: string; model: string; nativeSize: string; createdAt: string };
function Brand({ small = false }: { small?: boolean }) {
  return <span className={`brand ${small ? 'brand-small' : ''}`}><span className="brand-symbol"><span/><span/><span/><span/></span><span>POLICY <b>CANVAS</b>{!small && <em>정책을 그리는 새로운 시선</em>}</span></span>;
}
export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loaded, setLoaded] = useState<LoadedPDF | null>(null);
  const [style, setStyle] = useState<StyleId>('editorial');
  const [quality, setQuality] = useState<'medium' | 'high'>('high');
  const [emphasis, setEmphasis] = useState('');
  const [reviewFirst, setReviewFirst] = useState(false);
  const [stage, setStage] = useState<Stage>('idle');
  const [completed, setCompleted] = useState(0);
  const [activeRange, setActiveRange] = useState('');
  const [brief, setBrief] = useState<Signed<BriefEnvelope> | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [png, setPng] = useState<Blob | null>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [connected, setConnected] = useState<boolean | null>(null);
  const [drag, setDrag] = useState(false);
  const [help, setHelp] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const chunks = useRef<Signed<Chunk>[]>([]);
  const busyRef = useRef(false);
  const selectionId = useRef(0);
  const busy = ['reading', 'analyzing', 'brief', 'generating'].includes(stage);
  useEffect(() => { fetch('/api/config').then(r => r.json() as Promise<{ connected: boolean }>).then(c => setConnected(c.connected)).catch(() => setConnected(false)); return () => controller.current?.abort(); }, []);
  useEffect(() => { if (!busy) return; const started = Date.now(); const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000); return () => clearInterval(timer); }, [busy]);
  useEffect(() => { if (!png) { setPreview(''); return; } const url = URL.createObjectURL(png); setPreview(url); return () => URL.revokeObjectURL(url); }, [png]);
  useEffect(() => { if (!help && !expanded) return; const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') { setHelp(false); setExpanded(false); } }; document.addEventListener('keydown', fn); return () => document.removeEventListener('keydown', fn); }, [help, expanded]);
  useEffect(() => { if (!help && !expanded) return; const before = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = before; }; }, [help, expanded]);
  async function selectFile(candidate?: File) {
    if (!candidate || busyRef.current) return;
    const id = ++selectionId.current;
    setError(''); setStage('reading'); setLoaded(null); setFile(null); setBrief(null); setResult(null); setPng(null); chunks.current = []; setCompleted(0);
    try { const doc = await readPDF(candidate); if (id !== selectionId.current) return; setFile(candidate); setLoaded(doc); }
    catch (e) { setError(e instanceof Error ? e.message : 'PDF 파일을 읽지 못했습니다.'); }
    finally { if (id === selectionId.current) setStage('idle'); if (inputRef.current) inputRef.current.value = ''; }
  }
  function removeFile() { if (busy) return; ++selectionId.current; setFile(null); setLoaded(null); setBrief(null); setResult(null); setPng(null); setCompleted(0); setError(''); setStage('idle'); chunks.current = []; }
  async function generateImage(plan: Signed<BriefEnvelope>, signal: AbortSignal) {
    setStage('generating');
    const generated = await streamPost<Result>('/api/generate', { brief: plan, style, quality, emphasis }, signal);
    setResult(generated); setPng(await makeA4(generated.image)); setStage('done');
  }
  async function run() {
    if (!loaded || !file || busyRef.current) return;
    busyRef.current = true; setError(''); setElapsed(0); const abort = new AbortController(); controller.current = abort;
    let operation = '이미지 생성';
    try {
      if (result && !png) { setStage('generating'); setPng(await makeA4(result.image)); setStage('done'); return; }
      let plan = brief;
      if (!plan) {
        setStage('analyzing');
        let offset = chunks.current.reduce((n, c) => n + c.data.pages.length, 0);
        while (offset < loaded.totalPages) {
          if (abort.signal.aborted) throw new DOMException('Aborted', 'AbortError');
          const part = await pdfChunk(loaded.pdf, offset, CHUNK_PAGES);
          setActiveRange(`${offset + 1}–${offset + part.count}쪽`);
          operation = `PDF ${offset + 1}–${offset + part.count}쪽 분석`;
          const analyzed = await streamPost<Signed<Chunk>>('/api/analyze', { documentId: loaded.documentId, totalPages: loaded.totalPages, start: offset + 1, pdf: part.base64 }, abort.signal);
          chunks.current.push(analyzed); offset += part.count; setCompleted(offset);
        }
        setStage('brief');
        operation = '전체 문서 종합';
        plan = await streamPost<Signed<BriefEnvelope>>('/api/brief', { documentId: loaded.documentId, totalPages: loaded.totalPages, fileName: file.name, chunks: chunks.current }, abort.signal);
        setBrief(plan);
        if (reviewFirst) { setStage('review'); return; }
      }
      operation = '이미지 생성';
      await generateImage(plan, abort.signal);
    } catch (e) {
      setError(e instanceof Error && e.name === 'AbortError' ? '작업을 중단했습니다. 완료된 페이지 분석은 유지됩니다. 처리 중이던 API 요청에는 요금이 발생할 수 있습니다.' : `${operation}: ${e instanceof Error ? e.message : '생성 중 오류가 발생했습니다.'}`);
      setStage(result ? 'done' : brief ? 'review' : 'idle');
    } finally { busyRef.current = false; controller.current = null; }
  }
  async function savePDF() { if (!png) return; setSaving(true); try { await downloadPDF(png); } catch { setError('PDF 저장에 실패했습니다. PNG 다운로드를 이용해 주세요.'); } finally { setSaving(false); } }
  const statusText = stage === 'analyzing' ? `전체 페이지 분석 중 · ${activeRange}` : stage === 'brief' ? '모든 페이지를 종합해 기획안을 구성하고 있어요' : stage === 'generating' ? 'ChatGPT 이미지 AI가 인포그래픽을 그리고 있어요' : stage === 'reading' ? 'PDF 파일을 확인하고 있어요' : stage === 'review' ? '기획안이 준비되었어요. 확인 후 이미지를 생성하세요.' : '인포그래픽이 완성되었어요';
  const progress = loaded ? Math.round(completed / loaded.totalPages * 100) : 0;
  const notes = chunks.current.flatMap(c => c.data.pages);
  return <>
    <header className="site-header"><div className="header-inner"><a href="/" aria-label="Policy Canvas 홈"><Brand/></a><nav><a className="nav-active" href="#studio">인포그래픽 만들기</a><button onClick={() => setHelp(true)}>이용 안내 <ArrowUpRight size={14}/></button></nav><span className="header-tag"><span/> AI INFOGRAPHIC STUDIO</span></div></header>
    <main>
      <section className="hero"><div><div className="eyebrow"><span/> POLICY TO POSSIBILITY</div><h1>정책의 변화를,<br className="mobile-break"/> <span>한 장에 담다.</span></h1><p>과학기술정보통신부 업무계획에서 발견하는 달라질 우리의 일상.<br/>PDF 한 권을, 전문가 수준의 인포그래픽 한 장으로.</p></div><div className="hero-note"><span>복잡한 계획에서<br/><b>명확한 변화로.</b></span><div className="hero-note-icons"><FileText/><span>···</span><Sparkles/><span>···</span><Layers3/></div><small>DOCUMENT → A4 INFOGRAPHIC</small></div></section>
      <div className="workspace-heading" id="studio"><div className="workflow"><span className={file ? 'step-complete' : 'step-current'}><b>{file ? <Check size={12}/> : '1'}</b> 문서 업로드</span><ChevronRight/><span className={brief ? 'step-complete' : stage === 'analyzing' || stage === 'brief' ? 'step-current' : ''}><b>{brief ? <Check size={12}/> : '2'}</b> 전체 내용 분석</span><ChevronRight/><span className={result ? 'step-complete' : stage === 'generating' ? 'step-current' : ''}><b>{result ? <Check size={12}/> : '3'}</b> 인포그래픽 완성</span></div><span className="private-note"><ShieldCheck size={14}/> 나만의 제작 공간</span></div>
      <div className="workspace"><aside className="controls">
        <section className="control-card upload-card"><div className="section-heading"><span className="section-number">01</span><h2>업무계획서 업로드</h2><span className="required">필수</span></div><p className="section-description">변화의 시작이 되는 문서를 올려주세요.</p><input ref={inputRef} type="file" accept=".pdf,application/pdf" id="pdf-upload" className="sr-only" disabled={busy} onChange={e => selectFile(e.target.files?.[0])}/>
        {!file ? <button className={`dropzone ${drag ? 'is-dragging' : ''}`} disabled={busy} onClick={() => inputRef.current?.click()} onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); selectFile(e.dataTransfer.files[0]); }}><span className="upload-icon">{stage === 'reading' ? <LoaderCircle className="spin"/> : <Upload/>}</span><strong>PDF 파일을 여기에 놓아주세요</strong><span>또는 클릭하여 파일 선택</span><small>최대 {MAX_FILE_MB}MB · {MAX_PAGES}쪽 · PDF</small></button> : <div className="file-selected"><div className="file-icon"><FileText/></div><div><strong title={file.name}>{file.name}</strong><span>{loaded?.totalPages}쪽 <i/> {(file.size / 1024 / 1024).toFixed(1)}MB <i/> 준비 완료</span></div><button className="icon-button" aria-label="업로드한 파일 제거" disabled={busy} onClick={removeFile}><X size={17}/></button></div>}
        <div className="subtle-note"><ScanText size={15}/><span>본문·표·이미지·별첨까지 모든 페이지를 분석합니다.</span></div></section>
        <section className="control-card design-card"><div className="section-heading"><span className="section-number">02</span><h2>인포그래픽 설정</h2></div><label className="field-label">인포그래픽 주제 <span>고정</span></label><div className="theme-field"><Sparkles size={16}/><span>달라지는 대한민국</span><Check size={16}/></div>
        <fieldset className="style-fieldset" disabled={busy}><legend className="field-label">비주얼 스타일</legend><div className="style-options">{styles.map(s => <label key={s.id} className={`style-option ${style === s.id ? 'selected' : ''}`}><input type="radio" name="visual-style" value={s.id} checked={style === s.id} onChange={() => setStyle(s.id)}/><span className="swatches">{s.colors.map(c => <i key={c} style={{ background: c }}/>)}</span><span className="style-copy"><b>{s.label}</b><small>{s.description}</small></span><span className="radio-indicator">{style === s.id && <span/>}</span></label>)}</div></fieldset>
        <div className="output-settings"><div><label htmlFor="quality" className="field-label">제작 품질</label><div className="select-wrap"><select id="quality" disabled={busy} value={quality} onChange={e => setQuality(e.target.value as 'medium' | 'high')}><option value="high">고품질 · 권장</option><option value="medium">표준 품질</option></select><ChevronDown size={14}/></div></div><div><span className="field-label">출력 규격</span><div className="size-field"><span className="paper-icon"/> A4 세로 <span>300 dpi</span></div></div></div>
        <details className="extra-settings"><summary>추가 요청 <span>선택</span><Plus size={15}/></summary><label htmlFor="emphasis" className="sr-only">디자인 추가 요청</label><textarea id="emphasis" placeholder="예: 국민의 일상 변화를 중심으로, 글자는 크게 표현해주세요." value={emphasis} onChange={e => setEmphasis(e.target.value)} maxLength={400} disabled={busy}/><small>{emphasis.length}/400 · 원문에 없는 사실은 추가하지 않습니다.</small><label className="review-checkbox"><input type="checkbox" checked={reviewFirst} disabled={busy} onChange={e => setReviewFirst(e.target.checked)}/> 이미지 생성 전에 기획안 먼저 검토하기</label></details></section>
        <div className="generate-area"><button className="primary-button" disabled={!loaded || busy || connected !== true} onClick={run}>{busy ? <><LoaderCircle size={18} className="spin"/> 제작 중</> : <><WandSparkles size={18}/>{result ? '새 이미지 생성' : brief ? '기획안으로 이미지 생성' : completed ? '이어서 인포그래픽 만들기' : '인포그래픽 만들기'}<ArrowRight size={18}/></>}</button><p><span className={`connection-dot ${connected ? 'online' : ''}`}/>{connected === null ? 'API 연결 확인 중' : connected ? 'OpenAI API 연결됨' : 'API 키 연결 필요'}<span>·</span> API 사용료 별도</p></div>
        {error && <div className="error-box" role="alert"><CircleAlert size={18}/><div><strong>작업을 확인해 주세요</strong><p>{error}</p>{completed > 0 && <p>완료된 페이지 분석 {completed} / {loaded?.totalPages}쪽을 유지하고 있습니다.</p>}{notes.some(p => p.kind === 'unreadable') && <button onClick={() => { chunks.current = []; setCompleted(0); setBrief(null); setError(''); }}>분석 결과 초기화</button>}</div></div>}
        {(busy || stage === 'review' || stage === 'done') && <div className="progress-card" role="status" aria-live="polite"><div><span>{busy ? <LoaderCircle size={17} className="spin"/> : <CheckCheck size={18}/>}</span><strong>{statusText}</strong></div>{loaded && <><div className="progress-track"><span style={{ width: `${progress}%` }}/></div><div className="progress-meta"><span>페이지 분석 {completed} / {loaded.totalPages}쪽</span>{busy && <span>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')} 경과</span>}</div></>}{busy && <button className="cancel-button" onClick={() => controller.current?.abort()}>작업 중단</button>}</div>}
        <div className="trust-note"><ShieldCheck size={16}/><p>문서는 분석을 위해 OpenAI로 전송됩니다.<br/>이 앱의 서버에는 문서와 결과를 저장하지 않습니다.</p></div>
      </aside><section className="preview-panel"><div className="preview-toolbar"><div><span className="live-dot"/><h2>{preview ? '완성된 인포그래픽' : '캔버스 미리보기'}</h2>{!preview && <span className="preview-badge">레이아웃 예시</span>}</div><button className="icon-button" aria-label="미리보기 크게 보기" title="크게 보기" onClick={() => setExpanded(true)}><Maximize2 size={17}/></button></div>
        <div className={`canvas-area ${stage === 'generating' ? 'is-generating' : ''}`}><div className="paper-top-label"><span>210 mm</span><i/></div><div className="paper-container">{preview ? <img className="result-image" src={preview} alt="업무계획서 전체를 분석해 생성한 달라지는 대한민국 인포그래픽"/> : <SamplePoster style={style}/>}</div>{busy && <div className="canvas-status"><span><LoaderCircle className="spin" size={17}/>{stage === 'generating' ? '당신의 인포그래픽을 그리고 있어요' : '문서에서 변화의 이야기를 찾고 있어요'}</span></div>}<div className="canvas-caption"><span><span className="paper-icon"/> A4 세로</span><i/><span>2480 × 3508 px</span><i/><span>300 dpi 출력</span></div>{!preview && <p className="sample-disclaimer">스타일을 보여주는 예시입니다. 실제 내용은 업로드한 PDF에서 생성됩니다.</p>}</div>
        <div className="download-bar"><div><span className="download-symbol"><ArrowDownToLine size={19}/></span><div><strong>{preview ? '당신의 변화가 한 장에 담겼습니다' : '한 장으로 전하는 대한민국의 내일'}</strong><p>{preview ? 'PNG 이미지 또는 인쇄용 PDF로 저장하세요.' : '완성된 이미지는 PNG와 A4 PDF로 다운로드할 수 있어요.'}</p></div></div><div className="download-actions"><button disabled={!png || saving} onClick={savePDF}>{saving ? <LoaderCircle size={14} className="spin"/> : 'PDF'}</button><button className="download-primary" disabled={!png} onClick={() => png && saveBlob(png, '달라지는-대한민국-A4.png')}><ArrowDownToLine size={15}/> PNG 다운로드</button></div></div>
      </section></div>
      {brief && <section className="analysis-panel"><div className="analysis-heading"><div><span className="eyebrow">THE STORY BEHIND THE IMAGE</span><h2>전체 문서에서 찾은 변화의 근거</h2><p>{brief.data.brief.documentTitle} · {brief.data.brief.period} · {brief.data.totalPages}쪽 분석</p></div><button className="secondary-button" onClick={() => saveBlob(new Blob([JSON.stringify({ brief: brief.data.brief, pages: notes, fileName: file?.name, totalPages: loaded?.totalPages, model: result?.model || IMAGE_MODEL }, null, 2)], { type: 'application/json' }), '정책-분석-근거.json')}><ArrowDownToLine size={15}/> 분석 근거 저장</button></div><div className="brief-grid">{brief.data.brief.pillars.map((p, i) => <article key={i}><span className="brief-number">0{i + 1}</span><h3>{p.title}</h3><p>{p.change}</p><small>{p.detail}</small><div>출처 {p.sourcePages.map(n => `${n}쪽`).join(' · ')}</div></article>)}</div>{brief.data.brief.caveats.length > 0 && <div className="caveats"><CircleAlert size={16}/><ul>{brief.data.brief.caveats.map((c, i) => <li key={i}>{c}</li>)}</ul></div>}<details className="page-ledger"><summary><FileText size={17}/> 페이지별 분석 원장 <span>{notes.length}쪽</span><ChevronDown size={16}/></summary><div>{notes.map(p => <article key={p.page}><b>{p.page}쪽</b><section><strong>{p.heading || p.kind}</strong><p>{p.summary}</p>{p.initiatives.map((v, i) => <p key={i}><b>{v.name}</b> — {v.change} {v.timing}</p>)}{p.figures.map((v, i) => <p key={`f-${i}`}>{v.label}: {v.value} · {v.context}</p>)}{p.caveats.map((v, i) => <p key={`c-${i}`} className="page-caveat">확인: {v}</p>)}</section></article>)}</div></details><p className="quality-note">원문 전체를 분석해 한 장에 핵심 내용을 편집합니다. AI가 생성한 한글·수치·정책 표현은 배포 전에 원문과 대조해 주세요. PNG는 생성 원본을 A4 규격으로 보정한 파일입니다.</p></section>}
      <section className="features"><div><ScanText/><div><strong>처음부터 마지막 페이지까지</strong><p>표와 그림, 별첨까지 읽어 문서 전체를 반영해요.</p></div></div><div><Globe2/><div><strong>국민의 시선으로 재구성</strong><p>정책의 나열을 넘어, 달라질 삶을 보여줘요.</p></div></div><div><Sparkles/><div><strong>ChatGPT 이미지 AI로 완성</strong><p>내용에 맞춘 시각 언어로 한 장을 디자인해요.</p></div></div></section>
    </main><footer><Brand small/><span>정책을 읽다. 변화를 발견하다. 내일을 그리다.</span><button onClick={() => setHelp(true)}>이용 안내 <CircleHelp size={14}/></button></footer>
    {(help || expanded) && <div className="modal-backdrop" onClick={() => { setHelp(false); setExpanded(false); }}><section className={`modal ${expanded ? 'preview-modal' : ''}`} role="dialog" aria-modal="true" aria-label={help ? '이용 안내' : '인포그래픽 확대 미리보기'} onClick={e => e.stopPropagation()}><button className="modal-close icon-button" onClick={() => { setHelp(false); setExpanded(false); }} aria-label="닫기" autoFocus><X/></button>{expanded ? preview ? <img src={preview} alt="완성된 인포그래픽 확대"/> : <SamplePoster style={style}/> : <><div className="eyebrow">HOW IT WORKS</div><h2>정책 문서가 한 장의 변화로</h2><ol><li><b>PDF 업로드</b><p>최대 30MB, 120쪽의 암호화되지 않은 PDF를 선택하세요. 스캔 문서와 표도 원본 페이지로 분석합니다.</p></li><li><b>전체 분석과 기획</b><p>모든 페이지를 1~4쪽씩 읽고 정책·수치·대상·시기를 정리합니다. 이를 종합해 핵심 변화와 출처 페이지를 가진 기획안을 만듭니다.</p></li><li><b>AI 이미지 생성</b><p>OpenAI의 {IMAGE_MODEL} 모델이 한 장을 디자인합니다. 품질과 문서 길이에 따라 몇 분 이상 걸릴 수 있습니다.</p></li><li><b>A4 다운로드</b><p>생성 원본은 1536 × 2176px이며, 내용을 자르지 않고 2480 × 3508px / 300 dpi PNG와 210 × 297mm PDF로 출력합니다. 확대 저장이 원본의 세부 정보를 추가하지는 않습니다.</p></li></ol><div className="help-note">PDF는 OpenAI API로 전송되며 API 사용료가 발생합니다. ChatGPT 구독료와 별도입니다. 문서와 결과는 앱 서버에 저장되지 않고, 새로고침하면 사라집니다. 작업 중단은 이미 발생한 API 비용을 취소하지 않습니다. 최종 배포 전에 한글과 수치를 확인하세요.</div><button className="primary-button" onClick={() => setHelp(false)}>시작하기 <ArrowRight size={17}/></button></>}</section></div>}
  </>;
}
