// Blitzrunde: 60 Sekunden, so viele Aufgaben wie möglich – Rekord je Thema (Kopfrechnen automatisieren).
import { useEffect, useRef, useState } from 'react';
import { check, correctText } from '../engine/check';
import { record, stageOf, type Progress } from '../engine/learning';
import type { Skill, Task } from '../engine/types';
import { saveProfile, updateProgress, type Profile } from '../data/store';
import { byArea } from '../content/curriculum';
import { CloseIcon, Confetti, Fox, Rich, Sheet, Speak } from '../ui/common';
import { Visual } from '../ui/Visual';
import { sounds } from '../ui/sound';
import { speak, stopSpeaking } from '../ui/speech';

export const BLITZ_SECONDS = 60;

/** Themen, die sich für die Blitzrunde eignen: schnelle Aufgaben ohne Kästchen und ohne Hören/Schreiben */
export function blitzable(s: Skill): boolean {
  if ((s.testSeconds ?? 30) > 30) return false;
  for (let i = 0; i < 6; i++) {
    const t = s.generate(Math.random, 2);
    if (t.work || t.listen || t.answer.type === 'text' || t.prompt.length > 90) return false;
    if (t.answer.type === 'choice' && t.answer.options.some((o) => o.length > 14)) return false;
  }
  return true;
}

export function BlitzPicker({ skills, profile, onPick, onClose }: { skills: Skill[]; profile: Profile; onPick: (s: Skill) => void; onClose: () => void }) {
  const list = skills.filter(blitzable);
  return (
    <Sheet onClose={onClose} label="Blitzrunde">
      <div className="stack">
        <h2>⚡ Blitzrunde</h2>
        <p className="muted" style={{ marginTop: -6 }}>
          {BLITZ_SECONDS} Sekunden – wie viele Aufgaben schaffst du? Schlag deinen Rekord!
        </p>
        {list.length === 0 && <div className="empty card">In dieser Klasse gibt es keine Blitz-Themen.</div>}
        {list.length > 0 &&
          byArea(list[0].subject, list).flatMap((g, _, groups) => [
            groups.length > 1 ? (
              <div key={`a-${g.name}`} className="area-label">
                {g.name}
              </div>
            ) : null,
            ...g.skills.map((s) => (
              <button key={s.id} className="topic" style={{ border: 0, cursor: 'pointer', font: 'inherit', textAlign: 'left' }} onClick={() => onPick(s)}>
                <span className="ti" style={{ background: 'var(--fox-soft)' }}>
                  {s.icon}
                </span>
                <span className="grow">
                  <h3>{s.title}</h3>
                  <span className="small muted">{profile.blitz?.[s.id] ? `Rekord: ${profile.blitz[s.id]}` : 'noch kein Rekord'}</span>
                </span>
                <span style={{ fontSize: '1.4rem' }}>⚡</span>
              </button>
            )),
          ])}
      </div>
    </Sheet>
  );
}

export function Blitz({ profile, progress, skill, onExit }: { profile: Profile; progress: Progress; skill: Skill; onExit: () => void }) {
  const [phase, setPhase] = useState<'count' | 'run' | 'done'>('count');
  const [count, setCount] = useState(3);
  const [end, setEnd] = useState(0);
  const [now, setNow] = useState(Date.now());
  const stage = useRef(Math.max(2, stageOf(progress, skill.id)) as 1 | 2 | 3);
  const make = () => skill.generate(Math.random, stage.current);
  const [task, setTask] = useState<Task>(make);
  const [value, setValue] = useState('');
  const [flash, setFlash] = useState<null | { ok: boolean; text?: string; pick?: string }>(null);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [record0, setRecord0] = useState(profile.blitz?.[skill.id] ?? 0);
  const busy = useRef(false);

  useEffect(() => {
    if (phase !== 'count') return;
    if (count === 0) {
      setPhase('run');
      setEnd(Date.now() + BLITZ_SECONDS * 1000);
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 700);
    return () => clearTimeout(t);
  }, [phase, count]);
  useEffect(() => {
    if (phase !== 'run') return;
    const iv = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(iv);
  }, [phase]);
  const left = Math.max(0, Math.ceil((end - now) / 1000));
  useEffect(() => {
    if (phase === 'run' && end && now >= end) setPhase('done');
  }, [now, end, phase]);
  // Rekord genau einmal je Runde speichern (das Speichern rendert neu – darf das Ende nicht nochmal auslösen)
  const saved = useRef(false);
  useEffect(() => {
    if (phase !== 'done') {
      saved.current = false;
      return;
    }
    if (saved.current) return;
    saved.current = true;
    if (profile.sound) sounds.done();
    if (score > record0) saveProfile({ ...profile, blitz: { ...(profile.blitz ?? {}), [skill.id]: score } }, false);
  }, [phase, score, record0, profile, skill.id]);

  // Leseanfänger: jede Aufgabe vorlesen (wie beim Üben)
  useEffect(() => {
    if (phase === 'run' && profile.autoRead) speak(task.speak ?? task.prompt, 'de');
  }, [task, phase, profile.autoRead]);
  useEffect(() => () => stopSpeaking(), []);

  const answer = (v: string) => {
    if (busy.current || phase !== 'run') return;
    const res = check(task, v);
    updateProgress(profile.id, (p) => void record(p, task, res.ok, 'übung', Date.now(), res.trap?.tag));
    busy.current = true;
    if (res.ok) {
      setScore((s) => s + 1);
      if (profile.sound) sounds.right();
      setFlash({ ok: true, pick: v });
    } else {
      setWrong((w) => w + 1);
      if (profile.sound) sounds.wrong();
      setFlash({ ok: false, text: correctText(task.answer), pick: v });
    }
    setTimeout(
      () => {
        setFlash(null);
        setValue('');
        setTask(make());
        busy.current = false;
      },
      res.ok ? 250 : 900,
    );
  };

  // Zahlen: Antwort wird automatisch geprüft, sobald sie so lang ist wie die richtige
  const typed = (d: string) => {
    if (task.answer.type !== 'number' || busy.current) return;
    const next = d === '⌫' ? value.slice(0, -1) : value + d;
    setValue(next);
    if (next.length >= String(task.answer.value).length) answer(next);
  };
  const ref = useRef({ typed });
  ref.current = { typed };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) ref.current.typed(e.key);
      else if (e.key === 'Backspace') ref.current.typed('⌫');
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  if (phase === 'count')
    return (
      <div className="app full narrow">
        <div className="stack center" style={{ paddingTop: 120 }}>
          <div className="muted">
            {skill.icon} {skill.title}
          </div>
          <div key={count} className="blitz-count">{count || 'Los!'}</div>
        </div>
      </div>
    );

  if (phase === 'done') {
    const best = score > record0;
    return (
      <div className="app full narrow">
        {best && score > 0 && <Confetti />}
        <div className="stack center" style={{ paddingTop: 40 }}>
          <div>
            <Fox size={120} mood="happy" className="fox-wiggle" outfit={profile.outfit} />
          </div>
          <h1>{best && score > 0 ? 'Neuer Rekord!' : 'Zeit ist um!'}</h1>
          <div className="tiles" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="tile">
              <b>⚡ {score}</b>
              <span>richtig in {BLITZ_SECONDS} Sekunden</span>
            </div>
            <div className="tile">
              <b>🏆 {Math.max(score, record0)}</b>
              <span>dein Rekord</span>
            </div>
          </div>
          {wrong > 0 && <p className="small muted">{wrong} {wrong === 1 ? 'Fehler kommt' : 'Fehler kommen'} in deine Fehler-Kiste.</p>}
          <button
            className="btn ok block"
            onClick={() => {
              setRecord0(Math.max(score, record0));
              setScore(0);
              setWrong(0);
              setCount(3);
              setTask(make());
              setPhase('count');
            }}
          >
            Nochmal!
          </button>
          <button className="btn ghost block" onClick={onExit}>
            Fertig
          </button>
        </div>
      </div>
    );
  }

  const a = task.answer;
  return (
    <div className="app full narrow">
      <div className="session-top">
        <button className="icon-btn" aria-label="Blitzrunde beenden" onClick={onExit}>
          <CloseIcon />
        </button>
        <div className={`timebar grow ${left <= 10 ? 'alarm' : left <= 20 ? 'warn' : ''}`}>
          <i style={{ width: `${(left / BLITZ_SECONDS) * 100}%` }} />
        </div>
        <span className="pill">⚡ {score}</span>
      </div>
      <div className="stack">
        <div className={`blitz-task ${flash ? (flash.ok ? 'ok' : 'bad') : ''}`}>
          <div className="prompt-row">
            <div className="prompt center grow" style={{ fontSize: task.prompt.length < 16 ? '2.2rem' : undefined }}>
              <Rich text={task.prompt} />
            </div>
            {profile.autoRead && <Speak text={task.speak ?? task.prompt} label="Aufgabe vorlesen" />}
          </div>
          {task.visual && <Visual v={task.visual} />}
          {flash && !flash.ok && task.answer.type !== 'choice' && <div className="center" style={{ fontWeight: 700, color: 'var(--bad)' }}>Richtig: {flash.text}</div>}
        </div>
        {a.type === 'number' && (
          <>
            <div className={`answer-field ${flash ? (flash.ok ? 'right' : 'wrong') : 'focus'}`}>{value || <span className="ph">?</span>}</div>
            <div className="numpad">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0'].map((d) => (
                <button key={d} onClick={() => typed(d)}>
                  {d}
                </button>
              ))}
            </div>
          </>
        )}
        {a.type === 'choice' && (
          <div className={`choices ${a.options.length === 3 ? 'three' : ''}`}>
            {a.options.map((o, i) => (
              <button key={i} className={`choice ${a.big ? 'big' : ''} ${flash ? (i === a.correct ? 'right' : flash.pick === String(i) ? 'wrong' : '') : ''}`} onClick={() => answer(String(i))}>
                {o}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
