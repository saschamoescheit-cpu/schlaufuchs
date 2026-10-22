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
  // Hör-Aufgaben (Diktat, Zuhören, englische Wörter): Auf Papier liest ein Erwachsener vor. Die Texte stehen auf einem
  // eigenen Vorlese-Blatt – neben der Aufgabe würden sie die Lösung verraten.
  // (Steht der Hörtext schon in der Aufgabe – „Was heißt „January“ auf Deutsch?“ –, braucht es keinen Vorleser.)
  const mustRead = (t: (typeof spec.tasks)[number]) => !!t.listen && !t.prompt.includes(t.listen.text);
  const reads = spec.tasks.flatMap((t, i) => (mustRead(t) ? [{ nr: i + 1, text: t.listen!.text, lang: t.listen!.lang }] : []));
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
              {info.name} – {spec.kind === 'vokabeln' ? 'Vokabeltest' : 'Lernzielkontrolle'}
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
                  <Rich text={mustRead(t) ? `${t.prompt}\n(🔊 Ein Erwachsener liest vor – Vorlese-Blatt, Nr. ${i + 1})` : t.prompt} />
                </div>
                {t.visual && t.visual.kind !== 'text' && (
                  <div className="paper-visual">
                    <Visual v={t.visual} />
                  </div>
                )}
                {t.visual && t.visual.kind === 'text' && <div className="paper-reading">{t.visual.text}</div>}
                {a.type === 'choice' ? (
                  <div className={`paper-options ${a.big ? 'big' : ''}`}>
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

      {reads.length > 0 && (
        <div className="sheet-paper page-break">
          <div className="paper-head">
            <b>🔊 Vorlese-Blatt – für Erwachsene</b>
            <div className="small">Lies bei diesen Aufgaben den Text deutlich vor, gern zweimal. Das Kind sieht dieses Blatt nicht.</div>
          </div>
          <ol className="paper-solutions">
            {reads.map((x) => (
              <li key={x.nr} value={x.nr}>
                <span lang={x.lang}>{x.text}</span>
                {x.lang === 'en' && <span className="muted"> (Englisch)</span>}
              </li>
            ))}
          </ol>
        </div>
      )}

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
