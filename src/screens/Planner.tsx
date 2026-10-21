// Test-Termine: Schultest eintragen → Countdown, Vorbereitungsstand, täglich üben, Probetest.
import { useState } from 'react';
import type { Grade, Skill, Subject } from '../engine/types';
import { addDays, level, type Progress } from '../engine/learning';
import { buildTest } from '../engine/session';
import { byArea, currentLevel, levelsFor, skillById, skillsOf, SUBJECTS, subjectInfo } from '../content/curriculum';
import { saveProfile, type PlannedTest, type Profile } from '../data/store';
import { Confirm } from '../ui/common';
import type { TestSpec } from './Tests';

const DAY = 86400000;
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
/** Tage bis zum Termin (0 = heute) */
export const daysUntil = (date: string) => Math.round((new Date(date + 'T12:00:00').getTime() - new Date(todayKey() + 'T12:00:00').getTime()) / DAY);
const fmtDay = (date: string) => new Date(date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
export const countdownText = (d: number) => (d === 0 ? 'heute' : d === 1 ? 'morgen' : d === 2 ? 'übermorgen' : `in ${d} Tagen`);

/** Wie gut vorbereitet? Anteil der Themen, die mindestens „geübt“ sind */
export function readiness(p: Progress, t: PlannedTest): number {
  if (!t.skills.length) return 0;
  return t.skills.filter((id) => level(p, id) >= 2).length / t.skills.length;
}

/** nächster anstehender Test (heute oder später), höchstens `within` Tage entfernt */
export function nextPlanned(profile: Profile, within = 14): PlannedTest | undefined {
  return (profile.plannedTests ?? []).filter((t) => daysUntil(t.date) >= 0 && daysUntil(t.date) <= within).sort((a, b) => a.date.localeCompare(b.date))[0];
}

export function PlannedCard({ t, progress, onPractice, onStart, onDelete }: { t: PlannedTest; progress: Progress; onPractice: (skills: Skill[], title: string) => void; onStart: (spec: TestSpec) => void; onDelete?: () => void }) {
  const info = subjectInfo(t.subject);
  const d = daysUntil(t.date);
  const ready = readiness(progress, t);
  const skills = t.skills.map(skillById).filter((s): s is Skill => !!s);
  return (
    <div className="card planned" style={{ borderLeft: `6px solid ${info.color}` }}>
      <div className="row">
        <span style={{ fontSize: '1.8rem' }}>{info.icon}</span>
        <span className="grow">
          <b style={{ fontFamily: 'var(--head)', fontSize: '1.1rem' }}>
            {info.name}-Test {countdownText(d)}
          </b>
          <div className="small muted">
            {fmtDay(t.date)}
            {t.note ? ` · ${t.note}` : ''}
          </div>
        </span>
        {onDelete && (
          <button className="icon-btn" aria-label="Termin löschen" onClick={onDelete}>
            🗑️
          </button>
        )}
      </div>
      <div className="small" style={{ marginTop: 8 }}>
        {skills.map((s) => (
          <span key={s.id} className="chip-mini">
            {s.icon} {s.title}
          </span>
        ))}
      </div>
      <div className="row small" style={{ marginTop: 8 }}>
        <span className="grow">Vorbereitet: {Math.round(ready * 100)} %</span>
        <span className="muted">{ready >= 0.8 ? 'Du bist gut vorbereitet! 💪' : ready >= 0.4 ? 'Weiter so!' : 'Jetzt fleißig üben!'}</span>
      </div>
      <div className="bar on-light">
        <i style={{ width: `${ready * 100}%` }} />
      </div>
      <div className="row" style={{ marginTop: 10, flexWrap: 'wrap', gap: 8 }}>
        <button className={`btn small ${t.subject}`} disabled={!skills.length} onClick={() => onPractice(skills, `Üben für den ${info.name}-Test`)}>
          Heute üben
        </button>
        <button
          className="btn small ghost"
          disabled={!skills.length}
          onClick={() => {
            const b = buildTest(skills, Math.min(16, Math.max(8, skills.length * 3)), 'schule');
            onStart({ subject: t.subject, skills: skills.map((s) => s.id), tasks: b.tasks, limit: b.limit, pace: 'schule' });
          }}
        >
          ⏱️ Probetest
        </button>
      </div>
    </div>
  );
}

export function Planner({ profile, progress, onPractice, onStart }: { profile: Profile; progress: Progress; onPractice: (skills: Skill[], title: string) => void; onStart: (spec: TestSpec) => void }) {
  const [adding, setAdding] = useState(false);
  const [del, setDel] = useState<PlannedTest | null>(null);
  const [showPast, setShowPast] = useState(false);
  const all = [...(profile.plannedTests ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = all.filter((t) => daysUntil(t.date) >= 0);
  const past = all.filter((t) => daysUntil(t.date) < 0).reverse();
  const remove = (t: PlannedTest) => saveProfile({ ...profile, plannedTests: (profile.plannedTests ?? []).filter((x) => x.id !== t.id) }, false);

  return (
    <div className="stack">
      {upcoming.length === 0 && !adding && <div className="empty card">Kein Test eingetragen. Wenn in der Schule ein Test ansteht, trag ihn hier ein – dann übst du gezielt dafür.</div>}
      {upcoming.map((t) => (
        <PlannedCard key={t.id} t={t} progress={progress} onPractice={onPractice} onStart={onStart} onDelete={() => setDel(t)} />
      ))}
      {adding ? (
        <PlanForm
          profile={profile}
          onCancel={() => setAdding(false)}
          onSave={(t) => {
            saveProfile({ ...profile, plannedTests: [...(profile.plannedTests ?? []), t] }, false);
            setAdding(false);
          }}
        />
      ) : (
        <button className="btn block" onClick={() => setAdding(true)}>
          ➕ Test-Termin eintragen
        </button>
      )}
      {past.length > 0 && (
        <button className="btn ghost small" onClick={() => setShowPast(!showPast)}>
          {showPast ? 'Vergangene ausblenden' : `Vergangene Termine (${past.length})`}
        </button>
      )}
      {showPast && past.map((t) => <PlannedCard key={t.id} t={t} progress={progress} onPractice={onPractice} onStart={onStart} onDelete={() => setDel(t)} />)}
      {del && (
        <Confirm
          title="Termin löschen?"
          text={`${subjectInfo(del.subject).name}-Test am ${fmtDay(del.date)}`}
          yes="Löschen"
          danger
          onYes={() => {
            remove(del);
            setDel(null);
          }}
          onNo={() => setDel(null)}
        />
      )}
    </div>
  );
}

function PlanForm({ profile, onSave, onCancel }: { profile: Profile; onSave: (t: PlannedTest) => void; onCancel: () => void }) {
  const [subject, setSubject] = useState<Subject>('mathe');
  const [lv, setLv] = useState<Grade>(currentLevel('mathe', profile));
  const [date, setDate] = useState(() => {
    const d = new Date(addDays(Date.now(), 7));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [note, setNote] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const skills = skillsOf(subject, lv);
  const toggle = (id: string) =>
    setSel((s) => {
      const x = new Set(s);
      if (x.has(id)) x.delete(id);
      else x.add(id);
      return x;
    });
  return (
    <div className="card stack">
      <h3>Neuer Test-Termin</h3>
      <div className="field">
        <span className="label">Fach</span>
        <div className="chips">
          {SUBJECTS.map((s) => (
            <button
              key={s.id}
              className={`chip ${subject === s.id ? 'on' : ''}`}
              onClick={() => {
                setSubject(s.id);
                setLv(currentLevel(s.id, profile));
                setSel(new Set());
              }}
            >
              {s.icon} {s.name}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label className="label" htmlFor="pdate">
          Wann ist der Test?
        </label>
        <input id="pdate" className="input" type="date" value={date} min={todayKey()} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="field">
        <span className="label">Welche Themen kommen dran?</span>
        <div className="chips">
          {levelsFor(subject).map((l) => (
            <button key={l.grade} className={`chip ${lv === l.grade ? 'on' : ''}`} onClick={() => setLv(l.grade)}>
              {l.label}
            </button>
          ))}
        </div>
        <div style={{ padding: '0 4px' }}>
          {byArea(subject, skills).flatMap((g, _, groups) => [
            groups.length > 1 ? (
              <div key={`a-${g.name}`} className="area-label">
                {g.name}
              </div>
            ) : null,
            ...g.skills.map((s) => (
              <label key={s.id} className="list-row" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={sel.has(s.id)} onChange={() => toggle(s.id)} style={{ width: 22, height: 22, accentColor: 'var(--ok)' }} />
                <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
                <span className="grow">{s.title}</span>
              </label>
            )),
          ])}
        </div>
      </div>
      <div className="field">
        <label className="label" htmlFor="pnote">
          Notiz (freiwillig)
        </label>
        <input id="pnote" className="input" value={note} maxLength={60} placeholder="z. B. Kapitel 4 im Buch" onChange={(e) => setNote(e.target.value)} />
      </div>
      <button className="btn ok block" disabled={!sel.size || !date} onClick={() => onSave({ id: Math.random().toString(36).slice(2, 10), subject, date, note: note.trim() || undefined, skills: [...sel] })}>
        Termin speichern
      </button>
      <button className="btn ghost block" onClick={onCancel}>
        Abbrechen
      </button>
    </div>
  );
}
