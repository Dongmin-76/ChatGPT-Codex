import type { StyleId } from '../../lib/contracts';
import { Cpu, Sprout, Orbit } from 'lucide-react';
export default function SamplePoster({ style }: { style: StyleId }) {
  return <div className={`sample-poster poster-${style}`} aria-label="레이아웃 예시. 실제 정책 분석 결과가 아닙니다.">
    <div className="poster-eyebrow"><span>SCIENCE · TECHNOLOGY · TOMORROW</span><span>POLICY REPORT</span></div>
    <div className="poster-kicker">과학기술이 만드는 우리 일상의 변화</div>
    <h2>달라지는<br/><span>대한민국</span><span className="poster-star">✳</span></h2>
    <div className="poster-intro">더 나은 내일을 향한 변화,<br/>국민의 삶에서 시작됩니다.</div>
    <div className="poster-visual">
      <svg viewBox="0 0 500 310" role="img" aria-label="연결된 도시와 기술을 표현한 일러스트">
        <defs><pattern id="dots" width="15" height="15" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="currentColor" opacity=".12"/></pattern></defs>
        <rect width="500" height="310" fill="url(#dots)"/>
        <ellipse cx="255" cy="160" rx="190" ry="105" fill="none" stroke="currentColor" strokeWidth="1" opacity=".28" transform="rotate(-20 255 160)"/>
        <ellipse cx="255" cy="160" rx="130" ry="140" fill="none" stroke="currentColor" strokeWidth="1" opacity=".22" transform="rotate(35 255 160)"/>
        <path d="M256 30 L275 42 278 61 297 83 296 102 316 123 326 146 324 171 345 199 336 218 315 215 302 235 278 226 262 243 244 226 225 230 207 211 218 190 201 175 220 155 212 136 235 117 229 100 244 82 237 64Z" fill="var(--poster-map)" stroke="var(--poster-dark)" strokeWidth="1.4"/>
        <ellipse cx="210" cy="266" rx="17" ry="7" fill="var(--poster-map)" transform="rotate(-15 210 266)"/>
        <path d="M130 155L263 108L391 132M263 108L283 200L138 240M283 200L400 250" fill="none" stroke="var(--poster-dark)" strokeWidth="1.5" strokeDasharray="4 5"/>
        <g transform="translate(60 103)"><rect width="86" height="68" rx="12" fill="var(--poster-dark)"/><rect x="16" y="14" width="53" height="36" rx="4" fill="none" stroke="var(--poster-paper)" strokeWidth="2"/><path d="M32 59h22m-11-9v9" stroke="var(--poster-paper)" strokeWidth="2"/><text x="43" y="39" textAnchor="middle" fill="var(--poster-paper)" fontSize="21" fontWeight="bold">AI</text></g>
        <g transform="translate(362 72)"><circle cx="33" cy="33" r="39" fill="var(--poster-accent)"/><path d="M22 13v20L10 52h46L44 33V13M19 13h28M17 42h32" stroke="var(--poster-dark)" fill="none" strokeWidth="2.4"/><circle cx="33" cy="35" r="3" fill="var(--poster-dark)"/></g>
        <g transform="translate(82 222)"><path d="M0 42V0h38v42M41 42V13h29v29" fill="var(--poster-map)" stroke="var(--poster-dark)" strokeWidth="2"/><path d="M10 10h7m7 0h7M10 21h7m7 0h7M10 32h7m7 0h7M50 23h10m-10 10h10" stroke="var(--poster-dark)" strokeWidth="3"/></g>
        <g transform="translate(363 217)"><rect width="70" height="58" rx="29" fill="var(--poster-dark)"/><circle cx="25" cy="22" r="7" fill="var(--poster-paper)"/><circle cx="47" cy="22" r="7" fill="var(--poster-map)"/><path d="M12 43c0-16 26-16 26 0" fill="var(--poster-paper)"/><path d="M34 43c0-16 26-16 26 0" fill="var(--poster-map)"/></g>
        <circle cx="263" cy="108" r="7" fill="var(--poster-dark)" stroke="var(--poster-paper)" strokeWidth="3"/><circle cx="283" cy="200" r="7" fill="var(--poster-dark)" stroke="var(--poster-paper)" strokeWidth="3"/>
        <path d="M174 50v22m-11-11h22M435 181v18m-9-9h18" stroke="var(--poster-dark)" strokeWidth="1.7"/>
      </svg>
      <span className="visual-label label-one">가능성을 연결하고</span><span className="visual-label label-two">일상의 변화를 만들다</span>
    </div>
    <div className="poster-points"><div><span>01 / 일상</span><Cpu/><strong>더 가까운 기술</strong><p>국민이 체감하는 변화</p></div><div><span>02 / 성장</span><Sprout/><strong>더 넓어진 기회</strong><p>미래를 여는 혁신</p></div><div><span>03 / 미래</span><Orbit/><strong>더 단단한 내일</strong><p>함께 도약하는 대한민국</p></div></div>
    <div className="poster-foot"><span>문서 전체를 읽고, 변화의 핵심을 한 장에.</span><span>POLICY CANVAS ↗</span></div>
  </div>;
}
