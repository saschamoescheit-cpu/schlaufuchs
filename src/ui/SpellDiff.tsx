// Geschriebenes Wort/Satz neben der richtigen Schreibung – Unterschiede Buchstabe für Buchstabe markiert.
import { align, SPELL_TAG_LABELS } from '../engine/spelling';

export function SpellDiff({ correct, given, tags, caseSensitive = true }: { correct: string; given: string; tags?: string[]; caseSensitive?: boolean }) {
  const strip = (s: string) => s.trim().replace(/\s+/g, ' ').replace(/[.!?]$/, '');
  const c = strip(correct);
  const g = strip(given);
  const segs = caseSensitive ? align(c, g) : align(c.toLowerCase(), g.toLowerCase());
  // bei Kleinschreibung-egal die Originalbuchstaben anzeigen
  let ci = 0;
  let gi = 0;
  const shown = segs.map((s) => {
    const cc = s.c ? c[ci++] : '';
    const gg = s.g ? g[gi++] : '';
    return { ...s, c: cc, g: gg };
  });
  // sehr verschieden: einfach beide Fassungen zeigen (Buchstaben-Markierung wäre unlesbar)
  const changes = segs.filter((s) => s.t !== 'ok').length;
  const plain = changes > Math.max(3, c.length * 0.45);
  if (plain)
    return (
      <div className="spell-diff">
        <div className="sd-row">
          <span className="sd-label">Du:</span>
          <span className="sd-text sd-bad-plain">{g}</span>
        </div>
        <div className="sd-row">
          <span className="sd-label">Richtig:</span>
          <span className="sd-text">{c}</span>
        </div>
      </div>
    );
  return (
    <div className="spell-diff">
      <div className="sd-row">
        <span className="sd-label">Du:</span>
        <span className="sd-text">
          {shown.map((s, i) => (s.t === 'del' ? <span key={i} className="sd-gap">_</span> : <span key={i} className={s.t === 'ok' ? '' : 'sd-bad'}>{s.g === ' ' ? ' ' : s.g}</span>))}
        </span>
      </div>
      <div className="sd-row">
        <span className="sd-label">Richtig:</span>
        <span className="sd-text">
          {shown.map((s, i) => (s.t === 'ins' ? null : <span key={i} className={s.t === 'ok' ? '' : 'sd-good'}>{s.c === ' ' ? ' ' : s.c}</span>))}
        </span>
      </div>
      {tags && tags.length > 0 && (
        <div className="chips" style={{ marginTop: 8 }}>
          {tags.map((t) => (
            <span key={t} className="tag">
              {SPELL_TAG_LABELS[t] ?? t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
