// Vokabeltrainer (Englisch): Wortfelder auswählen und nur Vokabeln üben – Bild, Hören, Übersetzen, Schreiben.
import { useState } from 'react';
import { isVocab, levelsFor, skillsOf } from '../content/curriculum';
import { level, LEVEL_NAMES, type Progress } from '../engine/learning';
import type { Grade, Skill } from '../engine/types';
import { LevelDots, Sheet } from '../ui/common';

/** Vokabel-Themen bis einschließlich Lernjahr lv (Wiederholung aus dem 1. Lernjahr bleibt wählbar) */
export const vocabUpTo = (lv: Grade): { label: string; skills: Skill[] }[] =>
  levelsFor('englisch')
    .filter((l) => l.grade <= lv)
    .map((l) => ({ label: l.label, skills: skillsOf('englisch', l.grade).filter(isVocab) }))
    .filter((g) => g.skills.length);

export function VocabPicker({ lv, progress, onClose, onStart }: { lv: Grade; progress: Progress; onClose: () => void; onStart: (skills: Skill[], n: number) => void }) {
  const groups = vocabUpTo(lv);
  const all = groups.flatMap((g) => g.skills);
  // vorausgewählt: die Wortfelder des aktuellen Lernjahrs
  const [sel, setSel] = useState<Set<string>>(() => new Set((groups[groups.length - 1]?.skills ?? []).map((s) => s.id)));
  const [n, setN] = useState(10);
  const chosen = all.filter((s) => sel.has(s.id));
  const toggle = (id: string) =>
    setSel((s) => {
      const x = new Set(s);
      if (x.has(id)) x.delete(id);
      else x.add(id);
      return x;
    });
  return (
    <Sheet onClose={onClose} label="Vokabeln lernen">
      <div className="stack">
        <h2>📚 Vokabeln lernen</h2>
        <p className="muted" style={{ marginTop: -6 }}>
          Wähle die Wortfelder – geübt werden nur Vokabeln: Bild, Hören, Übersetzen und Schreiben.
        </p>
        {groups.map((g) => (
          <div key={g.label}>
            <div className="area-label">{g.label}</div>
            <div className="card" style={{ padding: '4px 14px' }}>
              {g.skills.map((s) => {
                const lvS = level(progress, s.id);
                return (
                  <label key={s.id} className="list-row" style={{ cursor: 'pointer' }}>
                    <input type="checkbox" checked={sel.has(s.id)} onChange={() => toggle(s.id)} style={{ width: 22, height: 22, accentColor: 'var(--ok)' }} />
                    <span style={{ fontSize: '1.3rem' }}>{s.icon}</span>
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
        <div className="field">
          <span className="label">Wie viele Vokabeln?</span>
          <div className="chips">
            {[10, 20, 30].map((x) => (
              <button key={x} className={`chip ${n === x ? 'on' : ''}`} onClick={() => setN(x)}>
                {x}
              </button>
            ))}
          </div>
        </div>
        <button className="btn block englisch" disabled={!chosen.length} onClick={() => onStart(chosen, n)}>
          Los geht's{chosen.length ? ` – ${chosen.length} ${chosen.length === 1 ? 'Wortfeld' : 'Wortfelder'}` : ''}
        </button>
        <button className="btn ghost block" onClick={onClose}>
          Schließen
        </button>
      </div>
    </Sheet>
  );
}
