// Eltern-Bereich: PIN, Überblick über alle Kinder, Lernstand im Detail, Wochenbericht, Einstellungen je Kind.
import { useMemo, useState } from 'react';
import type { Grade } from '../engine/types';
import { addDays, dayKey, minutesByDay, openReviews, patterns, periodStats, weaknesses, type Progress } from '../engine/learning';
import { GRADE_NAMES } from '../engine/grading';
import { PACES } from '../engine/session';
import { DEFAULT_KEY } from '../engine/grading';
import { ALL_SKILLS, currentSkills, skillById, englishYear, STATES, stateInfo, SUBJECTS, subjectInfo } from '../content/curriculum';
import { level } from '../engine/learning';
import { deleteProfile, saveProfile, type AppData, type Profile } from '../data/store';
import { emptyProgress } from '../engine/learning';
import { checkPin, hasPin, lock, setPin, unlock } from '../data/parent';
import { Confirm, TopBar } from '../ui/common';
import { GradeKeyEditor } from './Tests';
import { SubjectStats } from './Stats';
import { countdownText, daysUntil, fmtDay, nextPlanned, readiness } from './Planner';

const DAY = 86400000;
const fmtDate = (t: number) => new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

/** PIN eingeben oder festlegen */
export function PinGate({ onOk, onCancel }: { onOk: () => void; onCancel: () => void }) {
  const exists = hasPin();
  const [mode, setMode] = useState<'enter' | 'new' | 'repeat' | 'forgot'>(exists ? 'enter' : 'new');
  const [pin, setPinVal] = useState('');
  const [first, setFirst] = useState('');
  const [err, setErr] = useState('');
  const [q] = useState(() => [23 + Math.floor(Math.random() * 60), 13 + Math.floor(Math.random() * 30)]);
  const [ans, setAns] = useState('');

  const press = (d: string) => {
    setErr('');
    const next = d === '⌫' ? pin.slice(0, -1) : (pin + d).slice(0, 4);
    setPinVal(next);
    if (next.length < 4) return;
    setTimeout(() => {
      if (mode === 'enter') {
        if (checkPin(next)) {
          unlock();
          onOk();
        } else {
          setErr('Die PIN stimmt nicht.');
          setPinVal('');
        }
      } else if (mode === 'new') {
        setFirst(next);
        setMode('repeat');
        setPinVal('');
      } else if (mode === 'repeat') {
        if (next === first) {
          setPin(next);
          unlock();
          onOk();
        } else {
          setErr('Die beiden PINs sind verschieden. Bitte noch einmal.');
          setMode('new');
          setPinVal('');
        }
      }
    }, 150);
  };

  return (
    <div className="app full">
      <TopBar title="👨‍👩‍👧 Eltern-Bereich" onBack={onCancel} />
      <div className="stack center" style={{ paddingTop: 12 }}>
        {mode === 'forgot' ? (
          <>
            <h2>Frage für Erwachsene</h2>
            <p className="muted">
              Wie viel ist {q[0]} × {q[1]}?
            </p>
            <input
              className="input"
              inputMode="numeric"
              value={ans}
              onChange={(e) => setAns(e.target.value.replace(/\D/g, ''))}
              style={{ textAlign: 'center', fontSize: '1.4rem' }}
              aria-label="Antwort"
            />
            <button
              className="btn block"
              onClick={() => {
                if (Number(ans) === q[0] * q[1]) {
                  setMode('new');
                  setPinVal('');
                } else setErr('Das stimmt leider nicht.');
              }}
            >
              Neue PIN festlegen
            </button>
          </>
        ) : (
          <>
            <h2>{mode === 'enter' ? 'PIN eingeben' : mode === 'new' ? 'PIN für Eltern festlegen' : 'PIN wiederholen'}</h2>
            <p className="muted small">
              {mode === 'enter' ? 'Dieser Bereich ist für Eltern.' : 'Vier Ziffern, die die Kinder nicht kennen. Damit sind Lernstand, Klasse und Einstellungen geschützt.'}
            </p>
            <div className="pin-dots" aria-label={`${pin.length} von 4 Ziffern`}>
              {[0, 1, 2, 3].map((i) => (
                <i key={i} className={i < pin.length ? 'on' : ''} />
              ))}
            </div>
            <div className="numpad" style={{ maxWidth: 320, margin: '0 auto', width: '100%' }}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((d, i) =>
                d ? (
                  <button key={i} onClick={() => press(d)} aria-label={d === '⌫' ? 'Löschen' : d}>
                    {d}
                  </button>
                ) : (
                  <span key={i} />
                ),
              )}
            </div>
            {mode === 'enter' && (
              <button className="btn ghost small" onClick={() => setMode('forgot')}>
                PIN vergessen?
              </button>
            )}
            {mode !== 'enter' && !exists && (
              <button
                className="btn ghost small"
                onClick={() => {
                  unlock();
                  onOk();
                }}
              >
                Ohne PIN weiter
              </button>
            )}
          </>
        )}
        {err && <p style={{ color: 'var(--bad)' }}>{err}</p>}
      </div>
    </div>
  );
}

function weekOf(p: Progress, now: number) {
  return periodStats(p, now - 7 * DAY, now + 1);
}

export function ParentHome({ data, onChild, onBack }: { data: AppData; onChild: (id: string) => void; onBack: () => void }) {
  const now = Date.now();
  const [changePin, setChangePin] = useState(false);
  if (changePin) return <PinSetter onDone={() => setChangePin(false)} />;
  return (
    <div className="app full">
      <TopBar
        title="👨‍👩‍👧 Eltern-Bereich"
        onBack={() => {
          lock();
          onBack();
        }}
      />
      <div className="stack">
        {data.profiles.length === 0 && <div className="empty card">Noch kein Kind angelegt.</div>}
        {data.profiles.map((p) => {
          const pr = data.progress[p.id] ?? emptyProgress();
          const w = weekOf(pr, now);
          const lastTest = pr.tests[pr.tests.length - 1];
          return (
            <button key={p.id} className="card parent-card" onClick={() => onChild(p.id)}>
              <div className="row">
                <span style={{ fontSize: '2.4rem' }}>{p.avatar}</span>
                <span className="grow" style={{ textAlign: 'left' }}>
                  <b style={{ fontFamily: 'var(--head)', fontSize: '1.2rem' }}>{p.name}</b>
                  <div className="small muted">
                    Klasse {p.grade} · {p.age} Jahre · {stateInfo(p.state).name}
                  </div>
                </span>
                <span className="muted">›</span>
              </div>
              <div className="tiles" style={{ marginTop: 10 }}>
                <Tile v={`${w.minutes} min`} l="Lernzeit (7 Tage)" />
                <Tile v={`${w.days}/7`} l="Tage geübt" />
                <Tile v={w.tasks ? `${Math.round((w.right / w.tasks) * 100)} %` : '–'} l={`richtig (${w.tasks} Aufg.)`} />
                <Tile
                  v={lastTest ? (lastTest.grade ? `Note ${lastTest.grade}` : `${lastTest.percent} %`) : '–'}
                  l={lastTest ? `letzter Test ${subjectInfo(lastTest.subject).name}` : 'noch kein Test'}
                />
              </div>
              <div className="small" style={{ marginTop: 10, textAlign: 'left' }}>
                {SUBJECTS.filter((s) => s.id !== 'englisch' || englishYear(p) > 0).map((s) => {
                  const cur = currentSkills(s.id, p);
                  const sure = cur.filter((k) => level(pr, k.id) === 3).length;
                  return (
                    <span key={s.id} style={{ marginRight: 12 }}>
                      {s.icon} {sure}/{cur.length}
                    </span>
                  );
                })}
                <span className="muted">Lernziele sicher · 🧰 {pr.review.length} offene Fehler</span>
              </div>
            </button>
          );
        })}
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          <button className="btn ghost small" onClick={() => setChangePin(true)}>
            {hasPin() ? 'PIN ändern' : 'PIN festlegen'}
          </button>
          {hasPin() && (
            <button className="btn ghost small" onClick={() => setPin(null)}>
              PIN entfernen
            </button>
          )}
          <button
            className="btn ghost small"
            onClick={() => {
              lock();
              onBack();
            }}
          >
            🔒 Sperren
          </button>
        </div>
        <p className="small muted">Die Lernzeit wird aus den gelösten Aufgaben geschätzt (Pausen über 2 Minuten zählen nicht).</p>
      </div>
    </div>
  );
}

function PinSetter({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<'new' | 'repeat'>('new');
  const [pin, setP] = useState('');
  const [first, setFirst] = useState('');
  const [err, setErr] = useState('');
  const press = (d: string) => {
    setErr('');
    const next = d === '⌫' ? pin.slice(0, -1) : (pin + d).slice(0, 4);
    setP(next);
    if (next.length < 4) return;
    setTimeout(() => {
      if (step === 'new') {
        setFirst(next);
        setStep('repeat');
        setP('');
      } else if (next === first) {
        setPin(next);
        unlock();
        onDone();
      } else {
        setErr('Die beiden PINs sind verschieden.');
        setStep('new');
        setP('');
      }
    }, 150);
  };
  return (
    <div className="app full">
      <TopBar title="Neue PIN" onBack={onDone} />
      <div className="stack center">
        <h2>{step === 'new' ? 'Neue PIN eingeben' : 'PIN wiederholen'}</h2>
        <div className="pin-dots">
          {[0, 1, 2, 3].map((i) => (
            <i key={i} className={i < pin.length ? 'on' : ''} />
          ))}
        </div>
        <div className="numpad" style={{ maxWidth: 320, margin: '0 auto', width: '100%' }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((d, i) =>
            d ? (
              <button key={i} onClick={() => press(d)}>
                {d}
              </button>
            ) : (
              <span key={i} />
            ),
          )}
        </div>
        {err && <p style={{ color: 'var(--bad)' }}>{err}</p>}
      </div>
    </div>
  );
}

const Tile = ({ v, l }: { v: string; l: string }) => (
  <div className="tile">
    <b style={{ fontSize: '1.25rem' }}>{v}</b>
    <span>{l}</span>
  </div>
);

/** Wochenbericht als Text (zum Teilen oder Kopieren) */
export function weekReport(p: Profile, pr: Progress, now = Date.now()): string {
  const w = weekOf(pr, now);
  const rel = ALL_SKILLS.filter((s) => pr.skills[s.id]);
  const weak = weaknesses(pr, rel, 3);
  const pats = patterns(pr, rel, 3);
  const lines = [
    `Schlaufuchs – Wochenbericht für ${p.name} (Klasse ${p.grade})`,
    `${fmtDate(addDays(now, -7))} bis ${fmtDate(now)}`,
    '',
    `Geübt an ${w.days} von 7 Tagen, ca. ${w.minutes} Minuten, ${w.tasks} Aufgaben (${w.tasks ? Math.round((w.right / w.tasks) * 100) : 0} % richtig).`,
  ];
  for (const s of SUBJECTS) {
    if (s.id === 'englisch' && englishYear(p) === 0) continue;
    const cur = currentSkills(s.id, p);
    lines.push(`${s.name}: ${cur.filter((k) => level(pr, k.id) === 3).length} von ${cur.length} Lernzielen sicher.`);
  }
  const plan = nextPlanned(p, 30);
  if (plan) lines.push('', `Nächster Test: ${subjectInfo(plan.subject).name} am ${fmtDay(plan.date)} (${countdownText(daysUntil(plan.date))})${plan.note ? ` – ${plan.note}` : ''}, vorbereitet: ${Math.round(readiness(pr, plan) * 100)} %`);
  if (w.tests.length) lines.push('', 'Lernzielkontrollen:', ...w.tests.map((t) => `- ${subjectInfo(t.subject).name}: ${t.percent} %${t.grade ? `, Note ${t.grade} (${GRADE_NAMES[t.grade]})` : ''}`));
  if (weak.length) lines.push('', 'Hier hakt es noch:', ...weak.map((x) => `- ${x.skill.title} (${Math.round(x.acc * 100)} % richtig)`));
  if (pats.length) lines.push('', 'Typische Fehler:', ...pats.map((x) => `- ${x.label} (${x.skill.title})`));
  lines.push('', `Offene Aufgaben in der Fehler-Kiste: ${pr.review.length}`);
  return lines.join('\n');
}

export function ParentChild({ data, id, onBack }: { data: AppData; id: string; onBack: () => void }) {
  const p = data.profiles.find((x) => x.id === id);
  const pr = data.progress[id] ?? emptyProgress();
  const [del, setDel] = useState(false);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState<'uebersicht' | 'ziele' | 'tests' | 'einst'>('uebersicht');
  const now = Date.now();
  const mins = useMemo(() => minutesByDay(pr), [pr]);
  if (!p) return null;
  const set = (patch: Partial<Profile>) => saveProfile({ ...p, ...patch }, false);
  const days = Array.from({ length: 14 }, (_, i) => {
    const t = addDays(now, i - 13);
    return { t, n: pr.days[dayKey(t)] ?? 0, m: mins[dayKey(t)] ?? 0 };
  });
  const maxM = Math.max(5, ...days.map((d) => d.m));
  const rel = ALL_SKILLS.filter((s) => pr.skills[s.id]);
  const weak = weaknesses(pr, rel, 6);
  const pats = patterns(pr, rel, 8);
  const bySubj = SUBJECTS.map((s) => {
    const ts = pr.tests.filter((t) => t.subject === s.id && t.grade);
    return { s, n: ts.length, avg: ts.length ? ts.reduce((a, t) => a + t.grade!, 0) / ts.length : 0 };
  }).filter((x) => x.n);
  const share = async () => {
    const text = weekReport(p, pr, now);
    try {
      if (navigator.share) await navigator.share({ title: `Wochenbericht ${p.name}`, text });
      else {
        await navigator.clipboard.writeText(text);
        setMsg('Wochenbericht kopiert.');
      }
    } catch {
      /* abgebrochen */
    }
  };
  return (
    <div className="app full">
      <TopBar title={`${p.avatar} ${p.name}`} onBack={onBack} />
      <div className="seg-light" role="tablist">
        {(
          [
            ['uebersicht', 'Überblick'],
            ['ziele', 'Lernziele'],
            ['tests', 'Tests'],
            ['einst', 'Einstellungen'],
          ] as const
        ).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      <div className="stack">
        {tab === 'uebersicht' && (
          <>
            <div className="card">
              <h3>Lernzeit der letzten 14 Tage</h3>
              <div className="mini-bars" style={{ marginTop: 10, height: 90 }}>
                {days.map((d) => (
                  <i key={d.t} title={`${fmtDate(d.t)}: ${d.m} min, ${d.n} Aufgaben`} style={{ height: `${(d.m / maxM) * 100}%`, background: d.m ? 'var(--fox)' : 'var(--line)' }} />
                ))}
              </div>
              <div className="row small muted" style={{ justifyContent: 'space-between' }}>
                <span>{fmtDate(days[0].t)}</span>
                <span>
                  Woche: {weekOf(pr, now).minutes} min · {weekOf(pr, now).tasks} Aufgaben
                </span>
                <span>heute</span>
              </div>
            </div>

            <button className="btn ok block" onClick={share}>
              📤 Wochenbericht teilen
            </button>
            {msg && <p className="small center">{msg}</p>}

            <h2 className="section-title">Wo es hakt</h2>
            {weak.length === 0 ? (
              <div className="empty card">Noch keine Schwächen erkennbar – dafür braucht es ein paar geübte Runden.</div>
            ) : (
              <div className="card" style={{ padding: '4px 14px' }}>
                {weak.map((w) => (
                  <div key={w.skill.id} className="list-row">
                    <span>{w.skill.icon}</span>
                    <span className="grow">
                      <b>{w.skill.title}</b>
                      <div className="small muted">
                        {subjectInfo(w.skill.subject).name} · Kl. {w.skill.subject === 'englisch' ? `${w.skill.grade - 2}. Lernjahr` : w.skill.grade} · {Math.round(w.acc * 100)} % richtig · {w.open}{' '}
                        offen
                      </div>
                    </span>
                  </div>
                ))}
              </div>
            )}
            {pats.length > 0 && (
              <div className="card" style={{ padding: '4px 14px' }}>
                <h3 style={{ padding: '10px 0 4px' }}>Typische Fehler</h3>
                {pats.map((x) => (
                  <div key={x.skill.id + x.tag} className="list-row small">
                    <span className="grow">
                      <b>{x.label}</b> <span className="muted">· {x.skill.title}</span>
                    </span>
                    <span className="tag">
                      {x.wrong}/{x.seen} falsch
                    </span>
                  </div>
                ))}
              </div>
            )}
            {Object.keys(p.blitz ?? {}).length > 0 && (
              <div className="card" style={{ padding: '4px 14px' }}>
                <h3 style={{ padding: '10px 0 4px' }}>⚡ Blitzrunde – Rekorde</h3>
                {Object.entries(p.blitz!)
                  .sort((a, b) => b[1] - a[1])
                  .map(([id, n]) => (
                    <div key={id} className="list-row small">
                      <span>{skillById(id)?.icon}</span>
                      <span className="grow">
                        <b>{skillById(id)?.title ?? id}</b>
                      </span>
                      <span className="tag">{n} in 60 s</span>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
        {tab === 'tests' && (
          <>
            {pr.tests.length === 0 ? (
              <div className="empty card">Noch kein Test geschrieben.</div>
            ) : (
              <div className="card" style={{ padding: '4px 14px' }}>
                {bySubj.map((x) => (
                  <div key={x.s.id} className="list-row">
                    <span>{x.s.icon}</span>
                    <span className="grow">{x.s.name}</span>
                    <span className="small muted">
                      Ø Note {x.avg.toFixed(1).replace('.', ',')} ({x.n} Tests)
                    </span>
                  </div>
                ))}
                {[...pr.tests]
                  .reverse()
                  .slice(0, 10)
                  .map((t) => (
                    <div key={t.id} className="list-row small">
                      <span>{subjectInfo(t.subject).icon}</span>
                      <span className="grow">
                        {fmtDate(t.t)} · {t.points}/{t.maxPoints} Punkte ({t.percent} %){t.timeUp ? ' · Zeit war um' : ''}
                      </span>
                      <b>{t.grade ? `Note ${t.grade}` : '⭐'.repeat(t.percent >= 90 ? 3 : t.percent >= 70 ? 2 : t.percent >= 50 ? 1 : 0)}</b>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
        {tab === 'ziele' && (
          <>
            {SUBJECTS.map((s) => (
              <SubjectStats key={s.id} subject={s.id} profile={p} progress={pr} />
            ))}
            <div className="small muted">
              Offene Aufgaben in der Fehler-Kiste: {openReviews(pr).length} · geschafft: {pr.solved}
            </div>
          </>
        )}
        {tab === 'einst' && (
          <>
            <div className="card stack">
              <div className="field">
                <span className="label">Klasse</span>
                <div className="chips">
                  {[1, 2, 3, 4].map((g) => (
                    <button key={g} className={`chip ${p.grade === g ? 'on' : ''}`} onClick={() => set({ grade: g as Grade })}>
                      {g}.
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <span className="label">Alter</span>
                <div className="chips">
                  {[5, 6, 7, 8, 9, 10, 11].map((a) => (
                    <button key={a} className={`chip ${p.age === a ? 'on' : ''}`} onClick={() => set({ age: a })}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <span className="label">Tagesziel</span>
                <div className="chips">
                  {[0, 10, 20, 30, 50].map((g) => (
                    <button key={g} className={`chip ${(p.dailyGoal ?? 20) === g ? 'on' : ''}`} onClick={() => set({ dailyGoal: g })}>
                      {g ? `${g} Aufgaben` : 'kein Ziel'}
                    </button>
                  ))}
                </div>
              </div>
              <label className="switch">
                <input type="checkbox" checked={!!p.micPractice} onChange={(e) => set({ micPractice: e.target.checked })} />
                <span>
                  <b>Englisch: Nachsprechen mit Mikrofon</b>
                  <div className="small muted">Nach englischen Aufgaben erscheint „🎤 Sprich nach“. Die Spracherkennung des Geräts schickt die Stimme dazu an Apple bzw. Google. Nicht in jedem Browser verfügbar.</div>
                </span>
              </label>
              <div className="field">
                <label htmlFor="pstate" className="label">
                  Bundesland
                </label>
                <select
                  id="pstate"
                  className="input"
                  value={p.state}
                  onChange={(e) => {
                    const s = stateInfo(e.target.value);
                    set({ state: s.code, englishFrom: s.englishFrom, gradesFrom: s.gradesFrom });
                  }}
                >
                  {STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <span className="label">Englisch beginnt in Klasse</span>
                <div className="chips">
                  {[1, 2, 3].map((g) => (
                    <button key={g} className={`chip ${p.englishFrom === g ? 'on' : ''}`} onClick={() => set({ englishFrom: g as Grade })}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <span className="label">Noten in Lernzielkontrollen ab Klasse</span>
                <div className="chips">
                  {[2, 3, 4].map((g) => (
                    <button key={g} className={`chip ${p.gradesFrom === g ? 'on' : ''}`} onClick={() => set({ gradesFrom: g as Grade })}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <span className="label">Notenschlüssel</span>
                <GradeKeyEditor value={p.gradeKey} onChange={(k) => set({ gradeKey: k })} />
                <button className="btn ghost small" onClick={() => set({ gradeKey: [...DEFAULT_KEY] })}>
                  Standard wiederherstellen
                </button>
              </div>
              <div className="field">
                <span className="label">Zeit bei Lernzielkontrollen</span>
                <div className="chips">
                  {PACES.map((x) => (
                    <button key={x.id} className={`chip ${p.pace === x.id ? 'on' : ''}`} onClick={() => set({ pace: x.id })}>
                      {x.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button className="btn ghost block small" style={{ color: 'var(--bad)' }} onClick={() => setDel(true)}>
              {p.name} löschen
            </button>
          </>
        )}
      </div>
      {del && (
        <Confirm
          title={`${p.name} wirklich löschen?`}
          text="Der ganze Lernstand dieses Kindes wird gelöscht – mit Google-Anmeldung auf allen Geräten."
          yes="Ja, endgültig löschen"
          danger
          onYes={() => {
            deleteProfile(p.id);
            setDel(false);
            onBack();
          }}
          onNo={() => setDel(false)}
        />
      )}
    </div>
  );
}
