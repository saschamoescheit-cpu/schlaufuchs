// Wiederholen (Fehler-Kiste) und Lernstand.
import { accuracy, dayKey, dueReviews, level, LEVEL_NAMES, openReviews, patterns, REVIEW_STREAK, streakDays, weaknesses, type Progress } from '../engine/learning';
import type { Skill, Subject } from '../engine/types';
import { ALL_SKILLS, currentSkills, englishYear, levelsFor, skillById, skillsOf, SUBJECTS, subjectInfo } from '../content/curriculum';
import type { Profile } from '../data/store';
import { Fox, LevelDots, TopBar } from '../ui/common';
import { GRADE_NAMES } from '../engine/grading';
import { BadgeGrid, BadgeWatcher } from '../ui/Badges';

/** Themen, die für das Kind relevant sind: aktuelle Stufe und alles darunter + alles, was schon geübt wurde */
function relevantSkills(profile: Profile, p: Progress): Skill[] {
  return ALL_SKILLS.filter((s) => {
    if (p.skills[s.id]) return true;
    if (s.subject === 'englisch') return englishYear(profile) >= (s.grade === 3 ? 1 : 2);
    return s.grade <= profile.grade;
  });
}

export function ReviewScreen({ profile, progress, onReviewAll, onPractice }: { profile: Profile; progress: Progress; onReviewAll: (subject?: Subject) => void; onPractice: (skill: Skill) => void }) {
  const now = Date.now();
  const due = dueReviews(progress, now);
  const waiting = progress.review.length - due.length;
  const weak = weaknesses(progress, relevantSkills(profile, progress), 6);
  const pats = patterns(progress, relevantSkills(profile, progress), 6);
  return (
    <div className="stack">
      <TopBar title="🧰 Wiederholen" />
      <div className="hello">
        <Fox size={64} mood={due.length ? 'think' : 'happy'} />
        <div className="bubble">
          {due.length
            ? `Hier sammle ich alle Aufgaben, die noch nicht geklappt haben. Jede kommt so lange wieder, bis du sie ${REVIEW_STREAK}-mal hintereinander richtig hast.`
            : progress.review.length
              ? `Gerade ist nichts fällig. ${waiting} ${waiting === 1 ? 'Aufgabe kommt' : 'Aufgaben kommen'} später zur Kontrolle wieder.`
              : 'Deine Fehler-Kiste ist leer. Super!'}
        </div>
      </div>

      {due.length > 0 && (
        <>
          <button className="btn block ok" onClick={() => onReviewAll()}>
            Alle Fehler üben ({due.length})
          </button>
          <div className="chips">
            {SUBJECTS.map((s) => {
              const n = due.filter((r) => skillById(r.task.skillId)?.subject === s.id).length;
              return n ? (
                <button key={s.id} className="chip" onClick={() => onReviewAll(s.id)}>
                  {s.icon} {s.name}: {n}
                </button>
              ) : null;
            })}
          </div>
        </>
      )}
      <div className="small muted">
        Schon geschafft: {progress.solved} {progress.solved === 1 ? 'Aufgabe' : 'Aufgaben'} aus der Fehler-Kiste 🎉
      </div>
      {progress.review.length > 0 && <BoxList progress={progress} />}

      <h2 className="section-title">🧩 Hier knobelst du noch</h2>
      {weak.length === 0 ? (
        <div className="empty card">Noch keine Knobel-Themen – übe ein paar Runden, dann sehe ich, was dir schwerfällt.</div>
      ) : (
        weak.map((w) => <WeakRow key={w.skill.id} skill={w.skill} acc={w.acc} open={w.open} onPractice={onPractice} />)
      )}

      {pats.length > 0 && (
        <>
          <h2 className="section-title">🔎 Typische Fehler</h2>
          <div className="card" style={{ padding: '4px 14px' }}>
            {pats.map((p) => (
              <div key={p.skill.id + p.tag} className="list-row">
                <span style={{ fontSize: '1.3rem' }}>{p.skill.icon}</span>
                <span className="grow">
                  <b>{p.label}</b>
                  <div className="small muted">
                    {p.skill.title} · {p.wrong} von {p.seen} falsch
                  </div>
                </span>
                <button className="btn small ghost" onClick={() => onPractice(p.skill)}>
                  Üben
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function WeakRow({ skill, acc, open, onPractice }: { skill: Skill; acc: number; open: number; onPractice: (s: Skill) => void }) {
  const info = subjectInfo(skill.subject);
  return (
    <div className="topic">
      <span className="ti" style={{ background: info.soft }}>
        {skill.icon}
      </span>
      <span className="grow">
        <h3>{skill.title}</h3>
        <span className="small muted">
          {info.name} · {Math.round(acc * 100)} % richtig{open ? ` · ${open} in der Fehler-Kiste` : ''}
        </span>
      </span>
      <button className={`btn small ${skill.subject}`} onClick={() => onPractice(skill)}>
        Üben
      </button>
    </div>
  );
}

export function StatsScreen({ profile, progress, onPractice, onOpenTest }: { profile: Profile; progress: Progress; onPractice: (skill: Skill) => void; onOpenTest: (id: string) => void }) {
  const now = Date.now();
  const total = Object.values(progress.skills).reduce((a, s) => a + s.n, 0);
  const allCur = SUBJECTS.flatMap((s) => (s.id === 'englisch' && englishYear(profile) === 0 ? [] : currentSkills(s.id, profile)));
  const sure = allCur.filter((s) => level(progress, s.id) === 3).length;
  const days = Array.from({ length: 14 }, (_, i) => {
    const t = now - (13 - i) * 86400000;
    return { d: new Date(t), n: progress.days[dayKey(t)] ?? 0 };
  });
  const maxDay = Math.max(1, ...days.map((d) => d.n));
  const tests = progress.tests.slice(-10);
  return (
    <div className="stack">
      <TopBar title="📊 Mein Lernstand" />
      <div className="tiles">
        <div className="tile">
          <b>⭐ {progress.stars}</b>
          <span>Sterne</span>
        </div>
        <div className="tile">
          <b>🔥 {streakDays(progress, now)}</b>
          <span>Tage in Folge</span>
        </div>
        <div className="tile">
          <b>{total}</b>
          <span>Aufgaben gelöst</span>
        </div>
        <div className="tile">
          <b>
            {sure}/{allCur.length}
          </b>
          <span>Lernziele sicher</span>
        </div>
      </div>

      <div className="card">
        <h3>Die letzten 14 Tage</h3>
        <div className="mini-bars" style={{ marginTop: 10 }} aria-label="Aufgaben pro Tag">
          {days.map((d, i) => (
            <i key={i} title={`${d.d.toLocaleDateString('de-DE')}: ${d.n} Aufgaben`} style={{ height: `${(d.n / maxDay) * 100}%`, background: d.n ? 'var(--fox)' : 'var(--line)' }} />
          ))}
        </div>
        <div className="row small muted" style={{ justifyContent: 'space-between', marginTop: 4 }}>
          <span>{days[0].d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
          <span>heute</span>
        </div>
      </div>

      <h2 className="section-title">🏅 Abzeichen</h2>
      <BadgeGrid profile={profile} progress={progress} />
      <BadgeWatcher profile={profile} progress={progress} />

      {tests.length > 0 && (
        <div className="card">
          <h3>Lernzielkontrollen</h3>
          <div className="mini-bars" style={{ marginTop: 10, height: 90 }}>
            {tests.map((t) => (
              <i key={t.id} title={`${subjectInfo(t.subject).name}: ${t.percent} %${t.grade ? ` – Note ${t.grade}` : ''}`} style={{ height: `${Math.max(4, t.percent)}%`, background: subjectInfo(t.subject).color }} onClick={() => onOpenTest(t.id)} />
            ))}
          </div>
          <div className="small muted" style={{ marginTop: 6 }}>
            Letzter Test: {subjectInfo(tests[tests.length - 1].subject).name}, {tests[tests.length - 1].percent} %{tests[tests.length - 1].grade ? ` – Note ${tests[tests.length - 1].grade} (${GRADE_NAMES[tests[tests.length - 1].grade!]})` : ''}
          </div>
        </div>
      )}

      {SUBJECTS.map((s) => (
        <SubjectStats key={s.id} subject={s.id} profile={profile} progress={progress} onPractice={onPractice} />
      ))}

      <div className="card small muted">
        <b>So rechnet Schlaufuchs den Lernstand:</b> Ein Thema ist <b>„Sicher“</b> (Lernziel erreicht), wenn von den letzten Aufgaben mindestens 8 gelöst und 90 % richtig sind und keine Fehler-Aufgabe mehr offen ist. <b>„Geübt“</b> heißt: mindestens 5 Aufgaben mit 70 % richtig.
      </div>
    </div>
  );
}

export function SubjectStats({ subject, profile, progress, onPractice }: { subject: Subject; profile: Profile; progress: Progress; onPractice?: (s: Skill) => void }) {
  const info = subjectInfo(subject);
  const levels = levelsFor(subject).filter((l) => (subject === 'englisch' ? true : l.grade <= profile.grade) || skillsOf(subject, l.grade).some((s) => progress.skills[s.id]));
  const shown = levels.filter((l) => skillsOf(subject, l.grade).some((s) => progress.skills[s.id]) || (subject !== 'englisch' && l.grade === profile.grade) || (subject === 'englisch' && englishYear(profile) > 0 && l.grade === (englishYear(profile) >= 2 ? 4 : 3)));
  if (!shown.length) return null;
  return (
    <div className="card">
      <h2 style={{ color: info.color }}>
        {info.icon} {info.name}
      </h2>
      {shown.map((l) => {
        const skills = skillsOf(subject, l.grade);
        const sure = skills.filter((s) => level(progress, s.id) === 3).length;
        return (
          <div key={l.grade} style={{ marginTop: 12 }}>
            <div className="row small">
              <b className="grow">{l.label}</b>
              <span className="muted">
                {sure} von {skills.length} sicher
              </span>
            </div>
            <div className="bar on-light">
              <i style={{ width: `${(sure / skills.length) * 100}%` }} />
            </div>
            {skills.map((s) => {
              const lv = level(progress, s.id);
              const acc = accuracy(progress.skills[s.id]);
              const open = openReviews(progress, s.id).length;
              return (
                <button key={s.id} className="list-row" style={{ width: '100%', border: 0, background: 'none', textAlign: 'left', cursor: onPractice ? 'pointer' : 'default', font: 'inherit' }} onClick={() => onPractice?.(s)}>
                  <span>{s.icon}</span>
                  <span className="grow small">{s.title}</span>
                  {open > 0 && <span className="tag">{open}</span>}
                  {acc !== undefined && <span className="small muted">{Math.round(acc * 100)} %</span>}
                  <LevelDots level={lv} />
                  <span className="small muted" style={{ minWidth: 74, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {LEVEL_NAMES[lv]}
                    {s.staged && progress.skills[s.id]?.stage ? ` · St. ${progress.skills[s.id]!.stage}` : ''}
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/** Was liegt in der Fehler-Kiste? (nach Thema, mit Serie richtiger Antworten) */
function BoxList({ progress }: { progress: Progress }) {
  const now = Date.now();
  const groups = new Map<string, typeof progress.review>();
  for (const r of progress.review) groups.set(r.task.skillId, [...(groups.get(r.task.skillId) ?? []), r]);
  return (
    <details className="more">
      <summary>Was liegt in der Fehler-Kiste? ({progress.review.length})</summary>
      <div className="inner">
        {[...groups].map(([id, items]) => {
          const s = skillById(id);
          return (
            <div key={id}>
              <b>
                {s?.icon} {s?.title ?? id}
              </b>
              {items.map((it) => (
                <div key={it.task.key} className="list-row small">
                  <span className="grow" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {it.task.prompt.replace(/\*\*/g, '').split('\n').slice(-1)[0]}
                  </span>
                  <span className="muted">{it.streak ? '✓ 1×' : it.due <= now ? 'jetzt dran' : 'später'}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </details>
  );
}
