import { useEffect, useState, type ReactNode } from 'react';
import type { Lang } from '../engine/types';
import { speak, stopSpeaking } from './speech';

/** Der Schlaufuchs – Maskottchen und Logo */
export function Fox({ size = 64, mood = 'normal', className }: { size?: number; mood?: 'normal' | 'happy' | 'think'; className?: string }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={className} aria-hidden="true">
      <path d="M30 104 L34 22 Q36 14 44 19 L96 58 Z" fill="#E8661A" stroke="#E8661A" strokeWidth="6" strokeLinejoin="round" />
      <path d="M170 104 L166 22 Q164 14 156 19 L104 58 Z" fill="#E8661A" stroke="#E8661A" strokeWidth="6" strokeLinejoin="round" />
      <path d="M44 80 L46 36 L80 62 Z" fill="#5A3322" stroke="#5A3322" strokeWidth="5" strokeLinejoin="round" />
      <path d="M156 80 L154 36 L120 62 Z" fill="#5A3322" stroke="#5A3322" strokeWidth="5" strokeLinejoin="round" />
      <path d="M100 46 C140 46 168 66 182 106 C160 140 128 166 100 180 C72 166 40 140 18 106 C32 66 60 46 100 46 Z" fill="#F7862A" />
      <path d="M18 106 C48 104 78 116 100 138 C122 116 152 104 182 106 C160 140 128 166 100 180 C72 166 40 140 18 106 Z" fill="#FFF6EC" />
      <ellipse cx="52" cy="128" rx="10" ry="6" fill="#FFB8A0" opacity="0.8" />
      <ellipse cx="148" cy="128" rx="10" ry="6" fill="#FFB8A0" opacity="0.8" />
      <circle cx="70" cy="100" r="21" fill="#FFFFFF" fillOpacity="0.6" stroke="#2B2340" strokeWidth="7" />
      <circle cx="130" cy="100" r="21" fill="#FFFFFF" fillOpacity="0.6" stroke="#2B2340" strokeWidth="7" />
      <path d="M90 96 Q100 88 110 96" fill="none" stroke="#2B2340" strokeWidth="6" strokeLinecap="round" />
      {mood === 'happy' ? (
        <>
          <path d="M62 104 Q71 92 80 104" fill="none" stroke="#2B2340" strokeWidth="6" strokeLinecap="round" />
          <path d="M122 104 Q131 92 140 104" fill="none" stroke="#2B2340" strokeWidth="6" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx={mood === 'think' ? 75 : 73} cy={mood === 'think' ? 96 : 102} r="8" fill="#2B2340" />
          <circle cx={mood === 'think' ? 135 : 133} cy={mood === 'think' ? 96 : 102} r="8" fill="#2B2340" />
          <circle cx={mood === 'think' ? 78 : 76} cy={mood === 'think' ? 93 : 99} r="2.8" fill="#FFFFFF" />
          <circle cx={mood === 'think' ? 138 : 136} cy={mood === 'think' ? 93 : 99} r="2.8" fill="#FFFFFF" />
        </>
      )}
      <ellipse cx="100" cy="155" rx="10" ry="7" fill="#2B2340" />
      {mood === 'happy' ? (
        <path d="M86 164 Q100 180 114 164 Z" fill="#2B2340" />
      ) : mood === 'think' ? (
        <path d="M92 168 Q100 165 108 168" fill="none" stroke="#2B2340" strokeWidth="3.5" strokeLinecap="round" />
      ) : (
        <path d="M90 166 Q95 172 100 166 Q105 172 110 166" fill="none" stroke="#2B2340" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export function Wordmark({ size = 1 }: { size?: number }) {
  return (
    <div className="row" style={{ gap: 10 * size, justifyContent: 'center' }}>
      <Fox size={56 * size} />
      <span style={{ fontFamily: 'var(--head)', fontWeight: 600, fontSize: `${2 * size}rem`, letterSpacing: '-0.5px' }}>
        <span style={{ color: 'var(--fox-dark)' }}>Schlau</span>
        <span style={{ color: 'var(--ink)' }}>fuchs</span>
      </span>
    </div>
  );
}

export const SpeakerIcon = ({ size = 24 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
    <path d="M16.5 8.5a5 5 0 0 1 0 7" />
    <path d="M19 6a8.5 8.5 0 0 1 0 12" />
  </svg>
);
export const BackIcon = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 5l-7 7 7 7" />
  </svg>
);
export const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

/** Lautsprecher-Knopf: liest Text vor (nochmal tippen = stopp) */
export function Speak({ text, lang = 'de', big, label = 'Vorlesen', className = '' }: { text: string; lang?: Lang; big?: boolean; label?: string; className?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => () => stopSpeaking(), []);
  return (
    <button
      type="button"
      className={`speak-btn ${big ? 'big' : ''} ${on ? 'on' : ''} ${className}`}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        if (on) {
          stopSpeaking();
          setOn(false);
          return;
        }
        setOn(true);
        speak(text, lang, () => setOn(false));
        setTimeout(() => setOn(false), Math.max(3000, text.length * 120));
      }}
    >
      <SpeakerIcon size={big ? 48 : 24} />
    </button>
  );
}

/** Text mit **Markierung** und Zeilenumbrüchen */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|☐)/g);
  return <>{parts.map((p, i) => (p === '☐' ? <span key={i} className="blank" aria-label="Lücke" /> : p.startsWith('**') ? <b key={i}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>))}</>;
}

export function Sheet({ onClose, children, label }: { onClose: () => void; children: ReactNode; label?: string }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="sheet-back" onClick={onClose} role="dialog" aria-modal="true" aria-label={label}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        {children}
      </div>
    </div>
  );
}

export function Confirm({ title, text, yes, no = 'Abbrechen', danger, onYes, onNo }: { title: string; text?: string; yes: string; no?: string; danger?: boolean; onYes: () => void; onNo: () => void }) {
  return (
    <Sheet onClose={onNo} label={title}>
      <div className="stack" style={{ paddingTop: 8 }}>
        <h2>{title}</h2>
        {text && <p className="muted">{text}</p>}
        <button className={`btn block ${danger ? 'deutsch' : ''}`} onClick={onYes}>
          {yes}
        </button>
        <button className="btn ghost block" onClick={onNo}>
          {no}
        </button>
      </div>
    </Sheet>
  );
}

export function Toast({ text, onDone, ms = 2600 }: { text: string; onDone: () => void; ms?: number }) {
  useEffect(() => {
    const t = setTimeout(onDone, ms);
    return () => clearTimeout(t);
  }, [onDone, ms]);
  return (
    <div className="toast" role="status">
      {text}
    </div>
  );
}

const CONF_COLORS = ['#F7862A', '#3D7BF7', '#E5484D', '#8E5BE8', '#2FA868', '#F5C518'];
export function Confetti() {
  const [pieces] = useState(() => Array.from({ length: 60 }, (_, i) => ({ left: Math.random() * 100, delay: Math.random() * 0.8, color: CONF_COLORS[i % CONF_COLORS.length], dur: 1.8 + Math.random() * 1.4 })));
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <i key={i} style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }} />
      ))}
    </div>
  );
}

export function LevelDots({ level }: { level: number }) {
  return (
    <span className={`lvl ${level === 3 ? 'done' : ''}`} aria-label={`Stufe ${level} von 3`}>
      {[1, 2, 3].map((i) => (
        <i key={i} className={i <= level ? 'on' : ''} />
      ))}
    </span>
  );
}

export function TopBar({ title, onBack, right }: { title: ReactNode; onBack?: () => void; right?: ReactNode }) {
  return (
    <div className="topbar">
      {onBack && (
        <button className="icon-btn" onClick={onBack} aria-label="Zurück">
          <BackIcon />
        </button>
      )}
      <h1 style={{ fontSize: '1.45rem', paddingLeft: onBack ? 0 : 4 }}>{title}</h1>
      {right}
    </div>
  );
}
