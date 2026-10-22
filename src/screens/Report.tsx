// Lernstand zum Ausdrucken (z. B. für den Elternsprechtag): Lernziele je Bereich, Tests, typische Fehler.
import { ALL_SKILLS, byArea, currentSkills, englishYear, stateInfo, SUBJECTS } from '../content/curriculum';
import { accuracy, addDays, LEVEL_NAMES, level, openReviews, patterns, periodStats, weaknesses, type Progress } from '../engine/learning';
import { GRADE_NAMES } from '../engine/grading';
import type { Profile } from '../data/store';
import { useEffect } from 'react';
import { Fox, TopBar } from '../ui/common';
import type { Subject } from '../engine/types';

const fmt = (t: number) => new Date(t).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric', year: 'numeric' });

export function ProgressReport({ profile: p, progress: pr, onBack }: { profile: Profile; progress: Progress; onBack: () => void }) {
  const now = Date.now();
  const total = Object.values(pr.skills).reduce((a, s) => a + s.n, 0);
  const four = periodStats(pr, addDays(now, -28), now + 1);
  const rel = ALL_SKILLS.filter((s) => pr.skills[s.id]);
  const weak = weaknesses(pr, rel, 6);
  const pats = patterns(pr, rel, 8);
  const tests = pr.tests.slice(-10).reverse();
  const subjects = SUBJECTS.filter((s) => s.id !== 'englisch' || englishYear(p) > 0);
  useEffect(() => window.scrollTo(0, 0), []);
  return (
    <div className="print-page">
      <div className="no-print">
        <TopBar title="🖨️ Lernstand drucken" onBack={onBack} />
        <div className="row" style={{ gap: 8, marginBottom: 16 }}>
          <button className="btn" onClick={() => window.print()}>
            Drucken
          </button>
          <button className="btn ghost" onClick={onBack}>
            Zurück
          </button>
        </div>
      </div>
      <div className="sheet-paper report">
        <div className="paper-head">
          <div>
            <b>Lernstand von {p.name}</b>
            <div className="small">
              Klasse {p.grade} · {stateInfo(p.state).name} · Stand {fmt(now)} · Schlaufuchs
            </div>
          </div>
        </div>

        <p className="small">
          Insgesamt {total} Aufgaben geübt, {pr.stars} Sterne. Letzte 4 Wochen: an {four.days} Tagen, ca. {four.minutes} Minuten, {four.tasks} Aufgaben
          {four.tasks ? ` (${Math.round((four.right / four.tasks) * 100)} % richtig)` : ''}. In der Fehler-Kiste: {pr.review.length}.
        </p>

        {subjects.map((s) => {
          const skills = currentSkills(s.id, p);
          const sure = skills.filter((k) => level(pr, k.id) === 3).length;
          return (
            <section key={s.id} className="report-subject">
              <h3>
                {s.name} <span className="small muted">· {sure} von {skills.length} Lernzielen sicher</span>
              </h3>
              <table className="report-table">
                <tbody>
                  {byArea(s.id, skills).flatMap((g) => [
                    <tr key={`a-${g.name}`} className="report-area">
                      <td colSpan={3}>{g.name}</td>
                    </tr>,
                    ...g.skills.map((k) => {
                      const st = pr.skills[k.id];
                      const acc = accuracy(st);
                      const open = openReviews(pr, k.id).length;
                      return (
                        <tr key={k.id}>
                          <td>{k.title}</td>
                          <td className="nowrap">{LEVEL_NAMES[level(pr, k.id)]}</td>
                          <td className="nowrap right">
                            {acc !== undefined ? `${Math.round(acc * 100)} %` : '–'}
                            {open ? ` · ${open} offen` : ''}
                          </td>
                        </tr>
                      );
                    }),
                  ])}
                </tbody>
              </table>
            </section>
          );
        })}

        {tests.length > 0 && (
          <section className="report-subject">
            <h3>Lernzielkontrollen (zuletzt)</h3>
            <table className="report-table">
              <tbody>
                {tests.map((t) => (
                  <tr key={t.id}>
                    <td className="nowrap">{fmt(t.t)}</td>
                    <td>{SUBJECTS.find((x) => x.id === t.subject)?.name}{t.kind === 'vokabeln' ? ' – Vokabeltest' : ''}</td>
                    <td className="nowrap right">
                      {t.percent} %{t.grade ? ` · Note ${t.grade} (${GRADE_NAMES[t.grade]})` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {(weak.length > 0 || pats.length > 0) && (
          <section className="report-subject">
            <h3>Hier lohnt sich Üben</h3>
            <ul className="small">
              {weak.map((w) => (
                <li key={w.skill.id}>
                  {w.skill.title} – {Math.round(w.acc * 100)} % richtig
                </li>
              ))}
              {pats.map((x) => (
                <li key={x.skill.id + x.tag}>
                  Typischer Fehler: {x.label} ({x.skill.title}, {x.wrong} von {x.seen} falsch)
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

/** Urkunde zum Ausdrucken: Lernziele eines Fachs, die das Kind sicher kann */
export function Certificate({ profile: p, progress: pr, subject, onBack }: { profile: Profile; progress: Progress; subject: Subject; onBack: () => void }) {
  const info = SUBJECTS.find((s) => s.id === subject)!;
  const sure = ALL_SKILLS.filter((s) => s.subject === subject && level(pr, s.id) === 3);
  // aus dem Lernstand kommend: oben anfangen (Drucken-Knopf sichtbar)
  useEffect(() => window.scrollTo(0, 0), []);
  return (
    <div className="print-page">
      <div className="no-print">
        <TopBar title="🏅 Urkunde" onBack={onBack} />
        <div className="row" style={{ gap: 8, marginBottom: 16 }}>
          <button className="btn" onClick={() => window.print()}>
            Drucken
          </button>
          <button className="btn ghost" onClick={onBack}>
            Zurück
          </button>
        </div>
      </div>
      <div className="sheet-paper certificate">
        <div className="cert-title">Urkunde</div>
        <Fox size={120} mood="happy" outfit={p.outfit} />
        <p className="cert-for">
          <b>{p.name}</b> kann in {info.name} schon richtig gut:
        </p>
        <ul className="cert-list">
          {sure.map((s) => (
            <li key={s.id}>
              {s.icon} {s.title}
            </li>
          ))}
        </ul>
        <p className="cert-end">Weiter so! – dein Schlaufuchs 🦊</p>
        <div className="small muted">{fmt(Date.now())}</div>
      </div>
    </div>
  );
}
