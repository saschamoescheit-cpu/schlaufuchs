// Lernzielkontrollen: auswählen, unter Zeitdruck schreiben, Note/Bewertung, Auswertung mit Erklärungen.
import { useEffect, useMemo, useRef, useState } from 'react';
import { check, correctText, answerText } from '../engine/check';
import { GRADE_NAMES, gradeFor, verbalFor } from '../engine/grading';
import { record, type TestItem, type TestResult } from '../engine/learning';
import { buildTest, PACES, type Pace } from '../engine/session';
import type { Grade, Skill, Subject, Task } from '../engine/types';
import { currentLevel, levelsFor, skillById, skillsOf, SUBJECTS, subjectInfo } from '../content/curriculum';
import { updateProgress, type Profile } from '../data/store';
import type { Progress } from '../engine/learning';
import { Confetti, Confirm, Rich, Sheet, Speak, Toast, TopBar } from '../ui/common';
import { ExplainBody } from '../ui/Explain';
import { daysUntil, nextPlanned, Planner } from './Planner';
import { TaskView } from '../ui/TaskView';
import { Visual } from '../ui/Visual';
import { SpellDiff } from '../ui/SpellDiff';
import { sounds } from '../ui/sound';

const GRADE_COLORS = ['', '#2FA868', '#5BB450', '#E3B505', '#F08A24', '#E0533D', '#B4232A'];
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const fmtDate = (t: number) => new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });

export interface TestSpec {
  subject: Subject;
  skills: string[];
  tasks: Task[];
  limit: number;
  pace: Pace;
}

export function TestSetup({ profile, progress, onStart, onOpenResult, onPractice, onPrint }: { profile: Profile; progress: Progress; onStart: (t: TestSpec) => void; onOpenResult: (id: string) => void; onPractice: (skills: Skill[], title: string) => void; onPrint: (t: TestSpec) => void }) {
  const [tab, setTab] = useState<'probe' | 'termine' | 'ergebnisse'>(() => (nextPlanned(profile, 60) ? 'termine' : 'probe'));
  const [subject, setSubject] = useState<Subject>('mathe');
  const [level, setLevel] = useState<Grade>(currentLevel('mathe', profile));
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [n, setN] = useState(12);
  const [pace, setPace] = useState<Pace>(profile.pace);
  const skills = skillsOf(subject, level);

  useEffect(() => {
    const lv = currentLevel(subject, profile);
    setLevel(lv);
  }, [subject, profile]);
  useEffect(() => setSel(new Set(skillsOf(subject, level).map((s) => s.id))), [subject, level]);

  const chosen = skills.filter((s) => sel.has(s.id));
  const estimate = useMemo(() => {
    if (!chosen.length) return 0;
    const avg = chosen.reduce((a, s) => a + (s.testSeconds ?? 30), 0) / chosen.length;
    const f = PACES.find((p) => p.id === pace)!.factor;
    return Math.max(1, Math.ceil((avg * n * f) / 60));
  }, [chosen, n, pace]);
  const withGrades = profile.grade >= profile.gradesFrom;
  const info = subjectInfo(subject);
  const toggle = (id: string) => setSel((s) => {
    const x = new Set(s);
    if (x.has(id)) x.delete(id);
    else x.add(id);
    return x;
  });

  return (
    <div className="stack">
      <TopBar title="⏱️ Lernzielkontrolle" />
      <div className="seg-light" role="tablist">
        {([['probe', 'Probetest'], ['termine', `Termine${(profile.plannedTests ?? []).filter((t) => daysUntil(t.date) >= 0).length ? ` (${(profile.plannedTests ?? []).filter((t) => daysUntil(t.date) >= 0).length})` : ''}`], ['ergebnisse', 'Ergebnisse']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      <p className="muted" style={{ marginTop: -6 }}>
        Übe für deinen nächsten Test – mit Zeit wie in der Schule{withGrades ? ' und mit Note' : ''}.
      </p>

      {tab === 'probe' && (<>
      <div className="field">
        <span className="label">Fach</span>
        <div className="chips">
          {SUBJECTS.map((s) => (
            <button key={s.id} className={`chip ${subject === s.id ? 'on' : ''}`} onClick={() => setSubject(s.id)}>
              {s.icon} {s.name}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="label">Stoff</span>
        <div className="chips">
          {levelsFor(subject).map((l) => (
            <button key={l.grade} className={`chip ${level === l.grade ? 'on' : ''}`} onClick={() => setLevel(l.grade)}>
              {l.label}
            </button>
          ))}
        </div>
        <div className="card" style={{ padding: '4px 14px' }}>
          {skills.map((s) => (
            <label key={s.id} className="list-row" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={sel.has(s.id)} onChange={() => toggle(s.id)} style={{ width: 22, height: 22, accentColor: 'var(--ok)' }} />
              <span style={{ fontSize: '1.3rem' }}>{s.icon}</span>
              <span className="grow">{s.title}</span>
            </label>
          ))}
        </div>
        <div className="row small">
          <button className="btn ghost small" onClick={() => setSel(new Set(skills.map((s) => s.id)))}>
            Alle
          </button>
          <button className="btn ghost small" onClick={() => setSel(new Set())}>
            Keins
          </button>
        </div>
      </div>

      <div className="field">
        <span className="label">Wie viele Aufgaben?</span>
        <div className="chips">
          {[8, 12, 16, 20].map((x) => (
            <button key={x} className={`chip ${n === x ? 'on' : ''}`} onClick={() => setN(x)}>
              {x}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="label">Zeit</span>
        <div className="stack" style={{ gap: 8 }}>
          {PACES.map((p) => (
            <button key={p.id} className={`chip ${pace === p.id ? 'on' : ''}`} style={{ textAlign: 'left', borderRadius: 16 }} onClick={() => setPace(p.id)}>
              <b>{p.label}</b> <span className="muted small">– {p.info}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card tint" style={{ background: info.soft }}>
        <b>
          {n} Aufgaben · {estimate} Minuten
        </b>
        <div className="small">{withGrades ? `Du bekommst eine Note (1–6) wie in der Schule.` : `Statt einer Note bekommst du Sterne (Noten gibt es bei dir ab Klasse ${profile.gradesFrom}).`}</div>
        <div className="small muted">Tipp: Mach zuerst die Aufgaben, die du gut kannst. Schwierige überspringst du und kommst später zurück.</div>
      </div>

      <button
        className={`btn block ${subject}`}
        disabled={!chosen.length}
        onClick={() => {
          const t = buildTest(chosen, n, pace);
          onStart({ subject, skills: chosen.map((s) => s.id), tasks: t.tasks, limit: t.limit, pace });
        }}
      >
        Test starten
      </button>
      <button
        className="btn ghost block small"
        disabled={!chosen.length}
        onClick={() => {
          const t = buildTest(chosen, n, pace);
          onPrint({ subject, skills: chosen.map((s) => s.id), tasks: t.tasks, limit: t.limit, pace });
        }}
      >
        🖨️ Als Arbeitsblatt drucken
      </button>

      </>)}
      {tab === 'termine' && <Planner profile={profile} progress={progress} onPractice={onPractice} onStart={onStart} />}
      {tab === 'ergebnisse' && (<>
      {progress.tests.length === 0 ? (
        <div className="empty card">Noch keine Lernzielkontrolle geschrieben.</div>
      ) : (
        <div className="card" style={{ padding: '4px 14px' }}>
          {[...progress.tests].reverse().slice(0, 20).map((t) => (
            <button key={t.id} className="list-row" style={{ width: '100%', border: 0, background: 'none', textAlign: 'left', cursor: 'pointer', font: 'inherit' }} onClick={() => onOpenResult(t.id)}>
              <span style={{ fontSize: '1.4rem' }}>{subjectInfo(t.subject).icon}</span>
              <span className="grow">
                <b>{subjectInfo(t.subject).name}</b> <span className="muted small">· {fmtDate(t.t)}</span>
                <div className="small muted">
                  {t.points} von {t.maxPoints} Punkten · {t.percent} %
                </div>
              </span>
              {t.grade ? <GradeChip g={t.grade} /> : <span>{'⭐'.repeat(verbalFor(t.percent).stars) || '💪'}</span>}
            </button>
          ))}
        </div>
      )}
      </>)}
    </div>
  );
}

const GradeChip = ({ g }: { g: number }) => (
  <span style={{ background: GRADE_COLORS[g], color: '#fff', borderRadius: 12, padding: '4px 12px', fontFamily: 'var(--head)', fontWeight: 600, fontSize: '1.2rem' }}>{g}</span>
);

export function TestRun({ profile, spec, onDone, onCancel }: { profile: Profile; spec: TestSpec; onDone: (id: string) => void; onCancel: () => void }) {
  const [answers, setAnswers] = useState<string[]>(() => spec.tasks.map(() => ''));
  const [idx, setIdx] = useState(0);
  const [start] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  const [toast, setToast] = useState<string | null>(null);
  const [ask, setAsk] = useState<'submit' | 'cancel' | null>(null);
  const [timeUp, setTimeUp] = useState(false);
  const warned = useRef(new Set<number>());
  const finished = useRef(false);

  const elapsed = (now - start) / 1000;
  const left = Math.max(0, spec.limit - elapsed);
  const frac = left / spec.limit;
  const state = left <= 60 || frac < 0.1 ? 'alarm' : frac < 0.25 ? 'warn' : '';

  const finish = (up: boolean) => {
    if (finished.current) return;
    finished.current = true;
    const t = Date.now();
    const items: TestItem[] = spec.tasks.map((task, i) => ({ task, given: answers[i] || null, ok: answers[i] ? check(task, answers[i]).ok : false }));
    const pts = (task: Task) => ((skillById(task.skillId)?.testSeconds ?? 30) >= 60 ? 2 : 1);
    const maxPoints = spec.tasks.reduce((a, task) => a + pts(task), 0);
    const points = items.reduce((a, it) => a + (it.ok ? pts(it.task) : 0), 0);
    const percent = Math.round((points / maxPoints) * 100);
    const result: TestResult = {
      id: Math.random().toString(36).slice(2, 10),
      t,
      subject: spec.subject,
      skills: spec.skills,
      correct: items.filter((x) => x.ok).length,
      total: items.length,
      points,
      maxPoints,
      percent,
      grade: profile.grade >= profile.gradesFrom ? gradeFor(percent, profile.gradeKey) : undefined,
      seconds: Math.min(spec.limit, Math.round((t - start) / 1000)),
      limit: spec.limit,
      timeUp: up,
      pace: spec.pace,
      items,
    };
    updateProgress(profile.id, (p) => {
      // nur Beantwortetes zählt für Lernstand und Fehler-Kiste (Ausgelassenes wurde nicht versucht)
      for (const it of items) if (it.given) { const c = check(it.task, it.given); record(p, it.task, it.ok, 'test', t, c.tags ?? c.trap?.tag); };
      p.tests.push(result);
    });
    onDone(result.id);
  };

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => {
    for (const m of [300, 60]) {
      if (spec.limit > m * 2 && left <= m && !warned.current.has(m)) {
        warned.current.add(m);
        setToast(m === 300 ? '⏰ Noch 5 Minuten!' : '⏰ Noch 1 Minute!');
        if (profile.sound) sounds.tick();
      }
    }
    if (left <= 0 && !timeUp && !finished.current) {
      setTimeUp(true);
      if (profile.sound) sounds.wrong();
    }
  }, [left, spec.limit, timeUp, profile.sound]);

  const task = spec.tasks[idx];
  const answered = answers.filter(Boolean).length;
  const setAnswer = (v: string) => setAnswers((a) => a.map((x, i) => (i === idx ? v : x)));

  return (
    <div className="app full">
      <div className="session-top" style={{ flexWrap: 'wrap', rowGap: 8 }}>
        <button className="btn ghost small" onClick={() => setAsk('cancel')}>
          Abbrechen
        </button>
        <div className="grow" />
        <span className={`timer ${state}`} role="timer" aria-label={`Noch ${mmss(left)} Minuten`}>
          ⏱️ {mmss(left)}
        </span>
        <button className="btn ok small" onClick={() => setAsk('submit')}>
          Abgeben
        </button>
        <div className={`timebar ${state}`} style={{ flexBasis: '100%' }}>
          <i style={{ width: `${frac * 100}%` }} />
        </div>
      </div>

      <div className="stack">
        <div className="dots" aria-label="Aufgaben">
          {spec.tasks.map((_, i) => (
            <button key={i} className={`${answers[i] ? 'done' : ''} ${i === idx ? 'cur' : ''}`} onClick={() => setIdx(i)} aria-label={`Aufgabe ${i + 1}${answers[i] ? ', beantwortet' : ''}`}>
              {i + 1}
            </button>
          ))}
        </div>
        <div className="small muted">
          Aufgabe {idx + 1} von {spec.tasks.length} · {answered} beantwortet
        </div>
        <TaskView key={idx} task={task} value={answers[idx]} onChange={setAnswer} autoRead={profile.autoRead} />
        <div className="row">
          <button className="btn ghost grow" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
            ← Zurück
          </button>
          {idx < spec.tasks.length - 1 ? (
            <button className="btn grow" onClick={() => setIdx(idx + 1)}>
              {answers[idx] ? 'Weiter →' : 'Überspringen →'}
            </button>
          ) : (
            <button className="btn ok grow" onClick={() => setAsk('submit')}>
              Abgeben
            </button>
          )}
        </div>
      </div>

      {toast && <Toast text={toast} onDone={() => setToast(null)} />}
      {ask === 'submit' && (
        <Confirm
          title="Test abgeben?"
          text={answered < spec.tasks.length ? `Du hast ${spec.tasks.length - answered} ${spec.tasks.length - answered === 1 ? 'Aufgabe' : 'Aufgaben'} noch nicht beantwortet.` : 'Alle Aufgaben sind beantwortet. Prima!'}
          yes="Ja, abgeben"
          no="Weiterarbeiten"
          onYes={() => finish(false)}
          onNo={() => setAsk(null)}
        />
      )}
      {ask === 'cancel' && <Confirm title="Test abbrechen?" text="Der Test wird nicht gewertet." yes="Ja, abbrechen" no="Weiterarbeiten" danger onYes={onCancel} onNo={() => setAsk(null)} />}
      {timeUp && (
        <Sheet onClose={() => finish(true)} label="Die Zeit ist um">
          <div className="stack center" style={{ paddingTop: 8 }}>
            <div style={{ fontSize: '3rem' }}>⏰</div>
            <h2>Die Zeit ist um!</h2>
            <p className="muted">Stifte weg – genau wie in der Schule. Mal sehen, wie es gelaufen ist.</p>
            <button className="btn block" onClick={() => finish(true)}>
              Ergebnis ansehen
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

export function TestResultView({ profile, result, onBack, onPractice }: { profile: Profile; result: TestResult; onBack: () => void; onPractice: (tasks: Task[]) => void }) {
  const [open, setOpen] = useState<TestItem | null>(null);
  const v = verbalFor(result.percent);
  const wrong = result.items.filter((x) => !x.ok);
  const info = subjectInfo(result.subject);
  const good = result.grade ? result.grade <= 2 : v.stars >= 2;
  return (
    <div className="app full">
      {good && <Confetti />}
      <TopBar title="Ergebnis" onBack={onBack} />
      <div className="stack">
        <div className="card center stack" style={{ gap: 10 }}>
          <div className="muted">
            {info.icon} {info.name} · {fmtDate(result.t)}
          </div>
          {result.grade ? (
            <>
              <div className="grade-badge" style={{ background: GRADE_COLORS[result.grade] }}>
                <span className="small">Note</span>
                <b>{result.grade}</b>
              </div>
              <h2>{GRADE_NAMES[result.grade]}</h2>
            </>
          ) : (
            <>
              <div style={{ fontSize: '2.6rem' }}>{v.stars ? '⭐'.repeat(v.stars) : '💪'}</div>
              <h2>{v.text}</h2>
            </>
          )}
          <div>
            <b>
              {result.points} von {result.maxPoints} Punkten
            </b>{' '}
            ({result.percent} %)
          </div>
          <div className="small muted">
            {result.timeUp ? `Die Zeit (${mmss(result.limit)} Min.) war um.` : `Fertig nach ${mmss(result.seconds)} von ${mmss(result.limit)} Minuten.`}
          </div>
          {result.grade && (
            <div className="small muted">
              Notenschlüssel: 1 ab {profile.gradeKey[0]} %, 2 ab {profile.gradeKey[1]} %, 3 ab {profile.gradeKey[2]} %, 4 ab {profile.gradeKey[3]} %, 5 ab {profile.gradeKey[4]} %
            </div>
          )}
        </div>

        {wrong.length > 0 && (
          <button className="btn ok block" onClick={() => onPractice(wrong.map((x) => x.task))}>
            🔁 Fehler jetzt üben ({wrong.length})
          </button>
        )}

        <h2 className="section-title">Deine Aufgaben</h2>
        <div className="card" style={{ padding: '4px 14px' }}>
          {result.items.map((it, i) => (
            <button key={i} className="list-row" style={{ width: '100%', border: 0, background: 'none', textAlign: 'left', cursor: 'pointer', font: 'inherit' }} onClick={() => setOpen(it)}>
              <span style={{ fontSize: '1.3rem' }}>{it.ok ? '✅' : '❌'}</span>
              <span className="grow">
                <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <Rich text={it.task.prompt.split('\n').slice(-1)[0]} />
                </div>
                {!it.ok && (
                  <div className="small muted">
                    {it.given ? `Deine Antwort: ${answerText(it.task.answer, it.given)}` : 'nicht beantwortet'} · richtig: {correctText(it.task.answer)}
                  </div>
                )}
              </span>
              <span className="muted">›</span>
            </button>
          ))}
        </div>
        <button className="btn ghost block" onClick={onBack}>
          Zur Übersicht
        </button>
      </div>

      {open && <TestItemSheet item={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function TestItemSheet({ item, onClose }: { item: TestItem; onClose: () => void }) {
  const skill: Skill | undefined = skillById(item.task.skillId);
  const [more, setMore] = useState(false);
  return (
    <Sheet onClose={onClose}>
      <div className="stack">
        <div className="prompt" style={{ fontSize: '1.2rem' }}>
          <Rich text={item.task.prompt} />
        </div>
        {item.task.visual && (
          <div className="visual-box">
            <Visual v={item.task.visual} />
          </div>
        )}
        <div className={`feedback ${item.ok ? 'right' : 'wrong'}`}>
          <div>
            {item.ok ? '✅ Richtig!' : item.given ? `❌ Deine Antwort: ${answerText(item.task.answer, item.given)}` : '❌ Nicht beantwortet'}
          </div>
          <div>
            Richtig ist: <b>{correctText(item.task.answer)}</b>
          </div>
          {!item.ok && item.given && item.task.answer.type === 'text' && !item.task.work && <SpellDiff correct={item.task.answer.value} given={item.given} tags={check(item.task, item.given).tags} caseSensitive={item.task.answer.caseSensitive} />}
          <div className="row" style={{ marginTop: 10 }}>
            <h3 className="grow">So geht&apos;s:</h3>
            <Speak text={item.task.solution.join(' ')} />
          </div>
          <ol className="steps">
            {item.task.solution.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
          {item.task.solutionVisual && (
            <div className="visual-box">
              <Visual v={item.task.solutionVisual} />
            </div>
          )}
        </div>
        {skill && !more && (
          <button className="btn ghost block small" onClick={() => setMore(true)}>
            💡 Mehr erklären (mit Video)
          </button>
        )}
        {skill && more && <ExplainBody skill={skill} />}
        <button className="btn block" onClick={onClose}>
          Schließen
        </button>
      </div>
    </Sheet>
  );
}

export function GradeKeyEditor({ value, onChange }: { value: number[]; onChange: (k: number[]) => void }) {
  return (
    <div className="stack" style={{ gap: 6 }}>
      {value.map((v, i) => (
        <label key={i} className="row">
          <GradeChip g={i + 1} />
          <span className="grow">ab</span>
          <input className="input" style={{ width: 90 }} type="number" min={0} max={100} value={v} onChange={(e) => onChange(value.map((x, k) => (k === i ? Math.max(0, Math.min(100, Number(e.target.value) || 0)) : x)))} />
          <span>%</span>
        </label>
      ))}
      <div className="small muted">Darunter: Note 6. Frag die Lehrerin oder den Lehrer, welcher Schlüssel in der Klasse gilt.</div>
    </div>
  );
}

