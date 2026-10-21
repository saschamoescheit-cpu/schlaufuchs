// „Sprich nach“: Spracherkennung des Browsers hört zu und sagt, ob das Wort verstanden wurde.
// Nur wenn die Eltern es erlaubt haben (Profil.micPractice) – die Stimme geht dabei an Apple bzw. Google.
// Keine Wertung im Lernstand: reine Übung.
import { useEffect, useRef, useState } from 'react';
import type { Lang } from '../engine/types';
import { stopSpeaking } from './speech';

type Rec = { lang: string; interimResults: boolean; maxAlternatives: number; start(): void; abort(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null };
const SR = (): (new () => Rec) | undefined => (typeof window === 'undefined' ? undefined : ((window as never)['SpeechRecognition'] ?? (window as never)['webkitSpeechRecognition']));
export const canListen = () => !!SR();

// Spracherkennung schreibt oft amerikanisch – britische Schreibweisen vorher angleichen
const UK_US: [RegExp, string][] = [[/colour/g, 'color'], [/favourite/g, 'favorite'], [/\bgrey\b/g, 'gray'], [/mum\b/g, 'mom']];
const norm = (s: string) => UK_US.reduce((t, [re, x]) => t.replace(re, x), s.toLowerCase().replace(/[’']/g, '').replace(/[^a-zäöüß0-9 ]/g, ' ').replace(/\s+/g, ' ').trim());
function dist(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
/** gilt als richtig, wenn die Erkennung (fast) dasselbe gehört hat */
export function sameSpoken(heard: string, target: string): boolean {
  const h = norm(heard);
  const t = norm(target);
  if (!h) return false;
  if (h === t || h.includes(t)) return true;
  // kurze Wörter müssen genau stimmen (sonst ginge „hat“ als „cat“ durch)
  return t.length > 5 && dist(h, t) <= Math.floor(t.length * 0.2);
}

export function SayIt({ text, lang }: { text: string; lang: Lang }) {
  const [state, setState] = useState<'idle' | 'listen' | 'ok' | 'again'>('idle');
  const [heard, setHeard] = useState('');
  const rec = useRef<Rec | null>(null);
  useEffect(() => () => rec.current?.abort(), []);
  const Ctor = SR();
  if (!Ctor) return null;
  const start = () => {
    stopSpeaking();
    const r = new Ctor();
    rec.current = r;
    r.lang = lang === 'en' ? 'en-GB' : 'de-DE';
    r.interimResults = false;
    r.maxAlternatives = 5;
    r.onresult = (e) => {
      const alts = Array.from(e.results[0] ?? []).map((a) => a.transcript);
      setHeard(alts[0] ?? '');
      setState(alts.some((a) => sameSpoken(a, text)) ? 'ok' : 'again');
    };
    r.onerror = () => setState('idle');
    r.onend = () => setState((s) => (s === 'listen' ? 'idle' : s));
    setState('listen');
    r.start();
  };
  return (
    <div className="sayit">
      <button className="btn ghost small" onClick={start} disabled={state === 'listen'}>
        {state === 'listen' ? '🎤 Ich höre zu …' : '🎤 Sprich nach'}
      </button>
      {state === 'ok' && <span className="sayit-ok">Super ausgesprochen! ✓</span>}
      {state === 'again' && <span className="small">Ich habe „{heard}“ verstanden – versuch es noch einmal!</span>}
    </div>
  );
}
