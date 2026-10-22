// Probetest als Arbeitsblatt zum Ausdrucken (mit Lösungsseite).
import { correctText } from '../engine/check';
import { GRADE_NAMES } from '../engine/grading';
import { subjectInfo } from '../content/curriculum';
import type { Profile } from '../data/store';
import { Rich, TopBar } from '../ui/common';
import { Visual } from '../ui/Visual';
import type { TestSpec } from './Tests';

const strip = (s: string) => s.replace(/\*\*/g, '');

export function PrintView({ profile, spec, onBack }: { profile: Profile; spec: TestSpec; onBack: () => void }) {
  const info = subjectInfo(spec.subject);
  const withGrades = profile.grade >= profile.gradesFrom;
  return (
    <div className="print-page">
      <div className="no-print">
        <TopBar title="🖨️ Arbeitsblatt" onBack={onBack} />
        <div className="row" style={{ gap: 8, marginBottom: 16 }}>
          <button className="btn" onClick={() => window.print()}>
            Drucken
          </button>
          <button className="btn ghost" onClick={onBack}>
            Zurück
          </button>
        </div>
      </div>

      <div className="sheet-paper">
        <div className="paper-head">
          <div>
            <b>
              {info.name} – Lernzielkontrolle
            </b>
            <div className="small">Schlaufuchs · {spec.tasks.length} Aufgaben · Zeit: {Math.round(spec.limit / 60)} Minuten</div>
          </div>
          <div className="paper-fields">
            <span>Name: ______________________</span>
            <span>Datum: ____________</span>
          </div>
        </div>
        <ol className="paper-tasks">
          {spec.tasks.map((t, i) => {
            const a = t.answer;
            return (
              <li key={i}>
                <div className="paper-prompt">
                  <Rich text={t.listen && t.listen.lang === 'en' ? `${t.prompt}\n(Wort zum Vorlesen: „${t.listen.text}“)` : t.prompt} />
                </div>
                {t.visual && t.visual.kind !== 'text' && (
                  <div className="paper-visual">
                    <Visual v={t.visual} />
                  </div>
                )}
                {t.visual && t.visual.kind === 'text' && <div className="paper-reading">{t.visual.text}</div>}
                {a.type === 'choice' ? (
                  <div className="paper-options">
                    {a.options.map((o, k) => (
                      <span key={k}>○ {o}</span>
                    ))}
                  </div>
                ) : a.type === 'trace' ? (
                  <div className="paper-trace">{`${a.value} `.repeat(5)}</div>
                ) : t.work ? (
                  <div className="paper-grid" />
                ) : t.prompt.includes('☐') ? null : (
                  <div className="paper-line">
                    Antwort: ________________________{a.type === 'number' && a.unit ? ` ${a.unit}` : ''}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        {withGrades && (
          <div className="small paper-key">
            Notenschlüssel: {profile.gradeKey.map((p, i) => `${i + 1} ab ${p} %`).join(' · ')} · darunter 6
          </div>
        )}
      </div>

      <div className="sheet-paper page-break">
        <div className="paper-head">
          <b>Lösungen – {info.name}</b>
        </div>
        <ol className="paper-solutions">
          {spec.tasks.map((t, i) => (
            <li key={i}>
              <span className="muted">{strip(t.prompt.split('\n').filter((l) => !l.startsWith('(')).slice(-1)[0] ?? '')}</span> → <b>{correctText(t.answer)}</b>
            </li>
          ))}
        </ol>
        {withGrades && <div className="small">{GRADE_NAMES.slice(1).map((g, i) => `${i + 1} = ${g}`).join(' · ')}</div>}
      </div>
    </div>
  );
}
