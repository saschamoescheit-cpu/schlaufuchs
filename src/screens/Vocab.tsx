// Vokabeltrainer (Englisch): Wortfelder auswählen und nur Vokabeln üben – gemischt (Bild, Hören, Übersetzen, Schreiben),
// mit Vokabelkarten (Karteikasten mit Wiederholung in wachsenden Abständen) oder als Buchstabier-Diktat.
import { useMemo, useState } from 'react';
import { isVocab, levelsFor, skillsOf } from '../content/curriculum';
import { cardsOf, dictatable, WORDS } from '../content/words';
import { boxCounts, cardStates, nextDue, pickCards } from '../engine/cards';
import { level, LEVEL_NAMES, type Progress } from '../engine/learning';
import type { Grade, Skill } from '../engine/types';
import { LevelDots, Sheet } from '../ui/common';

/** Vokabel-Themen bis einschließlich Lernjahr lv (Wiederholung aus dem 1. Lernjahr bleibt wählbar) */
export const vocabUpTo = (lv: Grade): { label: string; skills: Skill[] }[] =>
  levelsFor('englisch')
    .filter((l) => l.grade <= lv)
    .map((l) => ({ label: l.label, skills: skillsOf('englisch', l.grade).filter(isVocab) }))
    .filter((g) => g.skills.length);

export type VocabKind = 'mix' | 'karten' | 'diktat';
export type CardDir = 'de-en' | 'en-de';
export interface VocabStart {
  skills: Skill[];
  n: number;
  kind: VocabKind;
  dir: CardDir;
}

const KINDS: { id: VocabKind; label: string; info: string }[] = [
  { id: 'mix', label: '🔀 Gemischt', info: 'Bild, Hören, Übersetzen und Schreiben.' },
  { id: 'karten', label: '🗂️ Karteikarten', info: 'Karte umdrehen und selbst sagen, ob du das Wort wusstest. Gewusste Karten kommen erst nach 1, 3, 7, 14 und 30 Tagen wieder.' },
  { id: 'diktat', label: '🎧 Diktat', info: 'Du hörst ein englisches Wort und schreibst es auf.' },
];

const fmtDay = (t: number) => {
  const d = new Date(t);
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'heute';
  if (d.toDateString() === tomorrow.toDateString()) return 'morgen';
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
};

/** Karteikasten: neue Karten und Fach 1–5 */
export function CardBoxes({ counts }: { counts: number[] }) {
  return (
    <div className="card-boxes" aria-label={`Karteikasten: ${counts[0]} neu, ${counts.slice(1).map((n, i) => `Fach ${i + 1}: ${n}`).join(', ')}`}>
      {counts.map((n, i) => (
        <div key={i} className={`card-box ${i === 0 ? 'new' : ''}`} aria-hidden>
          <b>{n}</b>
          <span>{i === 0 ? 'neu' : `Fach ${i}`}</span>
        </div>
      ))}
    </div>
  );
}

export function VocabPicker({ lv, progress, onClose, onStart }: { lv: Grade; progress: Progress; onClose: () => void; onStart: (s: VocabStart) => void }) {
  const groups = vocabUpTo(lv);
  const states = useMemo(() => cardStates(progress.log), [progress.log]);
  // fällige Karten: gleich mit den Karteikarten starten und ihre Wortfelder mit auswählen
  const [dueIds] = useState(() => new Set(pickCards(cardsOf(groups.flatMap((g) => g.skills.map((s) => s.id))), states, 999).due.map((c) => c.skillId)));
  const [kind, setKind] = useState<VocabKind>(dueIds.size ? 'karten' : 'mix');
  const [dir, setDir] = useState<CardDir>('en-de');
  // Karten und Diktat brauchen eine Wortliste (Zahlen, Formen usw. üben nur „gemischt“)
  const usable = (s: Skill) => kind === 'mix' || (WORDS[s.id] ?? []).some((w) => kind === 'karten' || dictatable(w));
  const shown = groups.map((g) => ({ ...g, skills: g.skills.filter(usable) })).filter((g) => g.skills.length);
  const all = shown.flatMap((g) => g.skills);
  // vorausgewählt: die Wortfelder des aktuellen Lernjahrs
  const [sel, setSel] = useState<Set<string>>(() => new Set([...(groups[groups.length - 1]?.skills ?? []).map((s) => s.id), ...dueIds]));
  const [n, setN] = useState(10);
  const chosen = all.filter((s) => sel.has(s.id));
  const toggle = (id: string) =>
    setSel((s) => {
      const x = new Set(s);
      if (x.has(id)) x.delete(id);
      else x.add(id);
      return x;
    });
  const cards = kind === 'karten' ? cardsOf(chosen.map((s) => s.id)) : [];
  const plan = kind === 'karten' ? pickCards(cards, states, n) : null;
  const next = plan && !plan.cards.length ? nextDue(cards, states) : null;
  const info = KINDS.find((k) => k.id === kind)!.info;
  return (
    <Sheet onClose={onClose} label="Vokabeln lernen">
      <div className="stack">
        <h2>📚 Vokabeln lernen</h2>
        <div className="field">
          <span className="label">Wie möchtest du üben?</span>
          <div className="chips" role="radiogroup" aria-label="Übungsart">
            {KINDS.map((k) => (
              <button key={k.id} role="radio" aria-checked={kind === k.id} className={`chip ${kind === k.id ? 'on' : ''}`} onClick={() => setKind(k.id)}>
                {k.label}
              </button>
            ))}
          </div>
          <p className="small muted" style={{ margin: '6px 0 0' }}>
            {info}
          </p>
        </div>
        {groups.length > 0 && (
          <div className="field" style={{ marginBottom: -8 }}>
            <span className="label">Welche Wortfelder?</span>
          </div>
        )}
        {shown.map((g) => (
          <div key={g.label}>
            <div className="area-label">{g.label}</div>
            <div className="card" style={{ padding: '4px 14px' }}>
              {g.skills.map((s) => {
                const lvS = level(progress, s.id);
                return (
                  <label key={s.id} className="list-row" style={{ cursor: 'pointer' }}>
                    <input type="checkbox" checked={sel.has(s.id)} onChange={() => toggle(s.id)} style={{ width: 22, height: 22, accentColor: 'var(--ok)' }} />
                    <span style={{ fontSize: '1.3rem' }} aria-hidden>
                      {s.icon}
                    </span>
                    <span className="grow">{s.title}</span>
                    <LevelDots level={lvS} />
                    <span className="small muted" style={{ minWidth: 60, textAlign: 'right' }}>
                      {LEVEL_NAMES[lvS]}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
        <div className="row small">
          <button className="btn ghost small" onClick={() => setSel(new Set(all.map((s) => s.id)))}>
            Alle
          </button>
          <button className="btn ghost small" onClick={() => setSel(new Set())}>
            Keins
          </button>
        </div>
        {kind === 'karten' && (
          <div className="field">
            <span className="label">Was steht vorne auf der Karte?</span>
            <div className="chips" role="radiogroup" aria-label="Vorderseite">
              <button role="radio" aria-checked={dir === 'en-de'} className={`chip ${dir === 'en-de' ? 'on' : ''}`} onClick={() => setDir('en-de')}>
                Englisch → Deutsch
              </button>
              <button role="radio" aria-checked={dir === 'de-en'} className={`chip ${dir === 'de-en' ? 'on' : ''}`} onClick={() => setDir('de-en')}>
                Deutsch → Englisch
              </button>
            </div>
          </div>
        )}
        <div className="field">
          <span className="label">{kind === 'karten' ? 'Wie viele Karten?' : 'Wie viele Vokabeln?'}</span>
          <div className="chips">
            {[10, 20, 30].map((x) => (
              <button key={x} className={`chip ${n === x ? 'on' : ''}`} onClick={() => setN(x)}>
                {x}
              </button>
            ))}
          </div>
        </div>
        {plan && chosen.length > 0 && (
          <div className="card" style={{ display: 'grid', gap: 10 }}>
            <CardBoxes counts={boxCounts(cards, states)} />
            <div className="small">
              {plan.cards.length ? (
                <>
                  Diese Runde: <b>{Math.min(n, plan.due.length)}</b> zum Wiederholen, <b>{plan.cards.length - Math.min(n, plan.due.length)}</b> neue Karten.
                  {plan.due.length > n && ` Insgesamt warten ${plan.due.length} Karten auf ihre Wiederholung.`}
                </>
              ) : (
                <>🎉 Alles wiederholt! {next ? `Die nächsten Karten kommen ${fmtDay(next)} wieder.` : ''}</>
              )}
            </div>
          </div>
        )}
        <button className="btn block englisch" disabled={!chosen.length} onClick={() => onStart({ skills: chosen, n, kind, dir })}>
          {kind === 'karten' && plan && !plan.cards.length ? 'Trotzdem üben' : "Los geht's"}
          {chosen.length ? ` – ${chosen.length} ${chosen.length === 1 ? 'Wortfeld' : 'Wortfelder'}` : ''}
        </button>
        <button className="btn ghost block" onClick={onClose}>
          Schließen
        </button>
      </div>
    </Sheet>
  );
}
