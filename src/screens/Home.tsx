// Startseite und Fächer.
import { useState } from 'react';
import { dayKey, dueReviews, level, openReviews, streakDays, weaknesses, type Progress } from '../engine/learning';
import type { Grade, Skill, Subject } from '../engine/types';
import { currentLevel, currentSkills, englishYear, levelsFor, skillsOf, SUBJECTS, subjectInfo } from '../content/curriculum';
import type { Profile } from '../data/store';
import { Fox, LevelDots, TopBar } from '../ui/common';
import { ExplainSheet } from '../ui/Explain';
import { BadgeWatcher, DailyGoal } from '../ui/Badges';
import { countdownText, daysUntil, nextPlanned, PlannedCard } from './Planner';
import type { TestSpec } from './Tests';

function greeting(name: string) {
  const h = new Date().getHours();
  return h < 11 ? `Guten Morgen, ${name}!` : h < 17 ? `Hallo ${name}!` : `Guten Abend, ${name}!`;
}

/** Was soll das Kind als Nächstes üben? */
export function suggestion(profile: Profile, p: Progress): Skill | undefined {
  const cur = SUBJECTS.flatMap((s) => (s.id === 'englisch' && englishYear(profile) === 0 ? [] : currentSkills(s.id, profile)));
  const weak = weaknesses(p, cur, 1)[0];
  if (weak) return weak.skill;
  const started = cur.filter((s) => level(p, s.id) > 0 && level(p, s.id) < 3).sort((a, b) => (p.skills[b.id]?.last ?? 0) - (p.skills[a.id]?.last ?? 0));
  return started[0] ?? cur.find((s) => level(p, s.id) === 0);
}

export function Home({ profile, progress, onSubject, onReview, onPractice, onProfile, onMix, onStartTest }: { profile: Profile; progress: Progress; onSubject: (s: Subject) => void; onReview: () => void; onPractice: (skill: Skill) => void; onProfile: () => void; onMix: (skills: Skill[], title: string) => void; onStartTest: (spec: TestSpec) => void }) {
  const planned = nextPlanned(profile);
  const now = Date.now();
  const due = dueReviews(progress, now).length;
  const streak = streakDays(progress, now);
  const next = suggestion(profile, progress);
  const today = progress.days[dayKey(now)] ?? 0;
  const soon = planned && daysUntil(planned.date) <= 7 ? planned : undefined;
  const msg = soon
    ? `${countdownText(daysUntil(soon.date))[0].toUpperCase() + countdownText(daysUntil(soon.date)).slice(1)} ist dein ${subjectInfo(soon.subject).name}-Test. Lass uns gezielt dafür üben!`
    : due
    ? `In deiner Fehler-Kiste ${due === 1 ? 'wartet 1 Aufgabe' : `warten ${due} Aufgaben`} auf dich. Wollen wir sie knacken?`
    : next
      ? `Wie wär's mit „${next.title}“? ${today ? 'Du warst heute schon fleißig!' : 'Los geht\'s!'}`
      : 'Du hast alle Lernziele geschafft. Wow!';

  return (
    <div className="stack">
      <div className="topbar">
        <button className="row" onClick={onProfile} style={{ border: 0, background: 'none', cursor: 'pointer', padding: 0, gap: 8 }} aria-label="Profil und Einstellungen">
          <span style={{ fontSize: '2.2rem', lineHeight: 1 }}>{profile.avatar}</span>
          <span style={{ textAlign: 'left' }}>
            <b style={{ fontFamily: 'var(--head)', fontSize: '1.2rem' }}>{profile.name}</b>
            <div className="small muted">Klasse {profile.grade} ⚙️</div>
          </span>
        </button>
        <div className="grow" />
        <span className="pill" title="Tage in Folge geübt">🔥 {streak}</span>
        <span className="pill" title="Sterne">⭐ {progress.stars}</span>
      </div>

      <div className="hello">
        <Fox size={72} />
        <div className="bubble">
          <b>{greeting(profile.name)}</b> {msg}
        </div>
      </div>

      {planned && <PlannedCard t={planned} progress={progress} onPractice={onMix} onStart={onStartTest} />}
      <DailyGoal profile={profile} progress={progress} />
      <BadgeWatcher profile={profile} progress={progress} />

      {due > 0 && (
        <button className="callout fox" onClick={onReview}>
          <span className="ci">🧰</span>
          <span className="grow">
            <b style={{ fontFamily: 'var(--head)', fontSize: '1.1rem' }}>Fehler-Kiste</b>
            <div className="small">
              {due} {due === 1 ? 'Aufgabe wartet' : 'Aufgaben warten'} – üben, bis es sitzt!
            </div>
          </span>
          <span className="btn small">Los</span>
        </button>
      )}

      <div className="home-subjects stack">
      {SUBJECTS.map((s) => {
        const noEnglish = s.id === 'englisch' && englishYear(profile) === 0;
        const cur = currentSkills(s.id, profile);
        const sure = cur.filter((k) => level(progress, k.id) === 3).length;
        const lbl = s.id === 'englisch' ? (noEnglish ? `ab Klasse ${profile.englishFrom} – schon mal reinschnuppern?` : `${englishYear(profile) >= 2 ? 2 : 1}. Lernjahr`) : `Klasse ${profile.grade}`;
        return (
          <button key={s.id} className="subject-card" style={{ background: s.color, ['--d' as string]: `var(--${s.id}-dark)` }} onClick={() => onSubject(s.id)}>
            <span className="si">{s.icon}</span>
            <span className="grow">
              <h2>{s.name}</h2>
              <div className="small" style={{ opacity: 0.92 }}>
                {lbl}
                {!noEnglish && ` · ${sure} von ${cur.length} Lernzielen sicher`}
              </div>
              {!noEnglish && (
                <div className="bar">
                  <i style={{ width: `${(sure / Math.max(1, cur.length)) * 100}%` }} />
                </div>
              )}
            </span>
          </button>
        );
      })}
      </div>

      {next && !due && (
        <button className="callout fox" onClick={() => onPractice(next)}>
          <span className="ci">{next.icon}</span>
          <span className="grow">
            <div className="small muted">Fuchs-Tipp: Weiterüben</div>
            <b style={{ fontFamily: 'var(--head)', fontSize: '1.1rem' }}>{next.title}</b>
          </span>
          <span className="btn small ok">Üben</span>
        </button>
      )}
    </div>
  );
}

export function SubjectScreen({ profile, progress, subject, onBack, onPractice, onMix }: { profile: Profile; progress: Progress; subject: Subject; onBack: () => void; onPractice: (skill: Skill) => void; onMix: (skills: Skill[], label: string) => void }) {
  const info = subjectInfo(subject);
  const [lv, setLv] = useState<Grade>(currentLevel(subject, profile));
  const [explain, setExplain] = useState<Skill | null>(null);
  const skills = skillsOf(subject, lv);
  const levels = levelsFor(subject);
  const lvLabel = levels.find((l) => l.grade === lv)!.label;
  const sure = skills.filter((k) => level(progress, k.id) === 3).length;
  const noEnglish = subject === 'englisch' && englishYear(profile) === 0;
  return (
    <div className="stack">
      <div className="subject-head" style={{ background: info.color }}>
        <TopBar title={`${info.icon} ${info.name}`} onBack={onBack} />
        {noEnglish && <p className="small" style={{ marginTop: 0 }}>Englisch beginnt bei dir in Klasse {profile.englishFrom}. Du kannst aber schon jetzt reinschnuppern!</p>}
        <div className="tabs-seg" role="tablist">
          {levels.map((l) => (
            <button key={l.grade} role="tab" aria-selected={lv === l.grade} className={lv === l.grade ? 'on' : ''} onClick={() => setLv(l.grade)}>
              {l.label}
              {l.grade === currentLevel(subject, profile) && !noEnglish ? ' ★' : ''}
            </button>
          ))}
        </div>
      </div>

      <button className={`btn block ${subject}`} onClick={() => onMix(skills, `Fuchs-Mix ${info.name} · ${lvLabel}`)}>
        🦊 Fuchs-Mix – alles gemischt
      </button>
      <div className="small muted center" style={{ marginTop: -6 }}>
        {sure} von {skills.length} Lernzielen sicher · Was dir schwerfällt, kommt öfter dran.
      </div>

      {skills.map((s) => {
        const lvl = level(progress, s.id);
        const st = progress.skills[s.id];
        const open = openReviews(progress, s.id).length;
        return (
          <div key={s.id} className="topic">
            <button className="topic-main" onClick={() => onPractice(s)}>
              <span className="ti" style={{ background: info.soft }}>
                {s.icon}
              </span>
              <span className="grow">
                <h3>{s.title}</h3>
                <span className="row small" style={{ gap: 8, marginTop: 2 }}>
                  <LevelDots level={lvl} />
                  <span className="muted">{['Neu', 'Angefangen', 'Geübt', 'Sicher ✓'][lvl]}</span>
                  {st && st.recent.length > 0 && <span className="muted">· {Math.round((st.recent.reduce((a, b) => a + b, 0) / st.recent.length) * 100)} %</span>}
                  {open > 0 && <span className="tag">{open} Fehler</span>}
                </span>
              </span>
            </button>
            <button className="icon-btn" aria-label={`Erklärung zu ${s.title}`} onClick={() => setExplain(s)}>
              💡
            </button>
          </div>
        );
      })}

      {explain && (
        <ExplainSheet
          skill={explain}
          onClose={() => setExplain(null)}
          onPractice={() => {
            const s = explain;
            setExplain(null);
            onPractice(s);
          }}
        />
      )}
    </div>
  );
}

