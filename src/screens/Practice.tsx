// Übungsrunde: Aufgabe → sofortige Rückmeldung → bei Fehlern Erklärung, Wiederholung in der Runde und in der Fehler-Kiste.
import { useMemo, useState } from 'react';
import { check, correctText, type CheckResult } from '../engine/check';
import { level, record, stageOf, type Mode } from '../engine/learning';
import type { Stage, Task } from '../engine/types';
import { skillById } from '../content/curriculum';
import { updateProgress, type Profile } from '../data/store';
import { CloseIcon, Confetti, Confirm, Fox, Speak, Toast } from '../ui/common';
import { ExplainBody, ExplainSheet } from '../ui/Explain';
import { TaskView } from '../ui/TaskView';
import { Visual } from '../ui/Visual';
import { SpellDiff } from '../ui/SpellDiff';
import { BadgeWatcher, DailyGoal } from '../ui/Badges';
import { useData } from '../data/store';
import { sounds } from '../ui/sound';
import { stopSpeaking } from '../ui/speech';
import { OUTFITS } from '../ui/outfitArt';
import { SayIt } from '../ui/SayIt';

const PRAISE = ['Super!', 'Klasse!', 'Richtig!', 'Toll gemacht!', 'Spitze!', 'Genau!', 'Prima!', 'Stark!'];

interface Item {
  task: Task;
  again?: boolean;
}

export function Practice({ profile, title, tasks, mode, onExit, onRestart, onPracticePattern }: { profile: Profile; title: string; tasks: Task[]; mode: Mode; onExit: () => void; onRestart?: () => void; onPracticePattern?: (skillId: string, tag: string, label: string) => void }) {
  const [queue, setQueue] = useState<Item[]>(() => tasks.map((task) => ({ task })));
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState('');
  const [result, setResult] = useState<(CheckResult & { solved?: boolean }) | null>(null);
  const [firstTry, setFirstTry] = useState({ right: 0, total: 0 });
  const [stars, setStars] = useState(0);
  const [newInBox, setNewInBox] = useState(0);
  const [solvedInBox, setSolvedInBox] = useState(0);
  const [askQuit, setAskQuit] = useState(false);
  const [more, setMore] = useState(false);
  const [stageMsg, setStageMsg] = useState<string | null>(null);
  const [achieved, setAchieved] = useState<string[]>([]);
  const [help, setHelp] = useState(false);
  /** Fehlerarten dieser Runde: „Thema|Fehlerart“ → Anzahl */
  const [misses, setMisses] = useState<Record<string, number>>({});
  const live = useData().progress[profile.id];

  const item = queue[idx];
  const done = idx >= queue.length;
  const skill = item ? skillById(item.task.skillId) : undefined;

  const submit = (v: string) => {
    if (!item || result) return;
    setValue(v);
    const res = check(item.task, v);
    let solved = false;
    let change: 'up' | 'down' | undefined;
    let newStage: Stage = 1;
    let inBox = new Set<string>();
    updateProgress(profile.id, (p) => {
      const before = level(p, item.task.skillId);
      const r = record(p, item.task, res.ok, mode, Date.now(), res.tags ?? res.trap?.tag);
      if (before < 3 && level(p, item.task.skillId) === 3) setAchieved((a) => (a.includes(item.task.skillId) ? a : [...a, item.task.skillId]));
      solved = r.reviewSolved;
      change = r.stageChange;
      newStage = stageOf(p, item.task.skillId);
      inBox = new Set(p.review.map((x) => x.task.key));
      if (r.reviewAdded) setNewInBox((n) => n + 1);
    });
    if (change && skill?.staged) {
      setStageMsg(change === 'up' ? `Stark! ${skill.title}: Stufe ${newStage} – jetzt wird's kniffliger! 🚀` : `Wir machen es ein bisschen leichter: Stufe ${newStage}.`);
      // kommende neue Aufgaben dieses Themas passend zur neuen Stufe
      setQueue((q) => q.map((it, k) => (k > idx && !it.again && it.task.skillId === item.task.skillId && !inBox.has(it.task.key) ? { task: skill.generate(Math.random, newStage) } : it)));
    }
    if (solved) setSolvedInBox((n) => n + 1);
    if (!item.again) setFirstTry((f) => ({ right: f.right + (res.ok ? 1 : 0), total: f.total + 1 }));
    if (res.ok) {
      setStars((s) => s + 1);
      if (profile.sound) sounds.right();
    } else {
      if (profile.sound) sounds.wrong();
      const tags = [...new Set([...(item.task.tags ?? []), ...(res.tags ?? (res.trap ? [res.trap.tag] : []))])];
      const labeled = tags.filter((t) => skill?.tagLabels?.[t] && t !== 'gross-klein');
      if (labeled.length) setMisses((m) => ({ ...m, ...Object.fromEntries(labeled.map((t) => [`${item.task.skillId}|${t}`, (m[`${item.task.skillId}|${t}`] ?? 0) + 1])) }));
      // gleiche Aufgabe kommt in dieser Runde noch einmal (höchstens einmal extra)
      if (!item.again) setQueue((q) => [...q.slice(0, idx + 1), ...q.slice(idx + 1, idx + 4), { task: item.task, again: true }, ...q.slice(idx + 4)]);
    }
    setResult({ ...res, solved });
  };

  const next = () => {
    stopSpeaking();
    setResult(null);
    setValue('');
    setMore(false);
    const n = idx + 1;
    setIdx(n);
    if (n >= queue.length && profile.sound) sounds.done();
  };

  const progress = Math.min(1, idx / Math.max(1, queue.length));
  const praise = useMemo(() => PRAISE[Math.floor(Math.random() * PRAISE.length)], [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  if (done) {
    const pct = firstTry.total ? firstTry.right / firstTry.total : 0;
    const newOutfits = live ? OUTFITS.filter((o) => o.stars > live.stars - stars && o.stars <= live.stars) : [];
    // derselbe Fehler mehrmals in dieser Runde → gezielt üben anbieten
    const top = Object.entries(misses).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1])[0];
    const topSkill = top ? skillById(top[0].split('|')[0]) : undefined;
    const topTag = top?.[0].split('|')[1];
    const topLabel = topSkill && topTag ? topSkill.tagLabels?.[topTag] : undefined;
    return (
      <div className="app full">
        {pct >= 0.7 && <Confetti />}
        <div className="stack center" style={{ paddingTop: 40 }}>
          <div>
            <Fox size={130} mood="happy" className="fox-wiggle" outfit={profile.outfit} />
          </div>
          <h1>{pct >= 0.9 ? 'Fantastisch!' : pct >= 0.7 ? 'Super gemacht!' : 'Gut durchgehalten!'}</h1>
          <p className="muted">{title}</p>
          <div className="tiles" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="tile">
              <b>
                {firstTry.right} / {firstTry.total}
              </b>
              <span>beim ersten Versuch richtig</span>
            </div>
            <div className="tile">
              <b>⭐ {stars}</b>
              <span>Sterne gesammelt</span>
            </div>
          </div>
          {achieved.map((id) => (
            <div key={id} className="card tint" style={{ background: 'var(--ok-soft)', textAlign: 'left' }}>
              🎯 <b>Lernziel geschafft:</b> {skillById(id)?.icon} {skillById(id)?.title} sitzt jetzt sicher!
            </div>
          ))}
          {onPracticePattern && topSkill && topTag && topLabel && (
            <div className="card tint" style={{ background: 'var(--fox-soft)', textAlign: 'left' }}>
              🎯 <b>{topLabel}</b> ist dir in dieser Runde {top![1]}-mal passiert.
              <button className="btn block small" style={{ marginTop: 8 }} onClick={() => onPracticePattern(topSkill.id, topTag, topLabel)}>
                Genau das jetzt üben
              </button>
            </div>
          )}
          {newOutfits.length > 0 && (
            <div className="card tint" style={{ background: 'var(--ok-soft)', textAlign: 'left' }}>
              👕 <b>Neu für deinen Fuchs:</b> {newOutfits.map((o) => o.name).join(', ')}! Tippe auf der Startseite auf den Fuchs – dann kannst du ihn verkleiden.
            </div>
          )}
          {live && <DailyGoal profile={profile} progress={live} />}
          {live && <BadgeWatcher profile={profile} progress={live} />}
          {newInBox > 0 && (
            <div className="card tint" style={{ background: 'var(--fox-soft)', textAlign: 'left' }}>
              🔁 <b>{newInBox}</b> {newInBox === 1 ? 'Aufgabe ist' : 'Aufgaben sind'} in deiner Fehler-Kiste. Sie kommen wieder, bis du sie zweimal hintereinander richtig hast.
            </div>
          )}
          {solvedInBox > 0 && (
            <div className="card tint" style={{ background: 'var(--ok-soft)', textAlign: 'left' }}>
              🎉 <b>{solvedInBox}</b> {solvedInBox === 1 ? 'Fehler-Aufgabe sitzt' : 'Fehler-Aufgaben sitzen'} jetzt – raus aus der Kiste!
            </div>
          )}
          {onRestart && (
            <button className="btn ok block" onClick={onRestart}>
              Noch eine Runde
            </button>
          )}
          <button className="btn ghost block" onClick={onExit}>
            Fertig
          </button>
        </div>
      </div>
    );
  }

  const a = item.task.answer;
  return (
    <div className="app full">
      <div className="session-top">
        <button className="icon-btn" aria-label="Übung beenden" onClick={() => (idx === 0 && !result ? onExit() : setAskQuit(true))}>
          <CloseIcon />
        </button>
        <div className="progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <i style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="pill">⭐ {stars}</span>
      </div>

      <div className="stack">
        <div className="row small muted" style={{ justifyContent: 'space-between' }}>
          <span>
            {skill?.icon} {skill?.title}
            {skill && !result && (
              <button className="help-link" onClick={() => setHelp(true)}>
                💡 Hilfe
              </button>
            )}
          </span>
          {skill?.staged && item.task.stage && (
            <span className="stage-pill" title="Schwierigkeit">
              Stufe {[1, 2, 3].map((x) => (x <= item.task.stage! ? '●' : '○')).join('')}
            </span>
          )}
          {item.again && <span className="tag">Nochmal!</span>}
        </div>

        <div className="practice-layout">
          <div className="pl-task">
            <TaskView key={`${idx}-${item.task.key}`} task={item.task} value={value} onChange={setValue} onSubmit={submit} reveal={!!result} autoRead={profile.autoRead} />
          </div>
          <div className="pl-side">
            {result?.ok && (
              <div className="feedback right row">
                <Fox size={56} mood="happy" outfit={profile.outfit} />
                <div className="grow">
                  <h2>{praise} ⭐</h2>
                  {result.solved && <div className="small">Diese Fehler-Aufgabe sitzt jetzt! 🎉</div>}
                  {profile.micPractice && item.task.pronounce && <SayIt key={item.task.key} text={item.task.pronounce.text} lang={item.task.pronounce.lang} />}
                </div>
                <button className="btn ok" onClick={next} autoFocus>
                  Weiter
                </button>
              </div>
            )}

            {result && !result.ok && (
              <div className="feedback wrong">
                <div className="row">
                  <Fox size={52} mood="think" outfit={profile.outfit} />
                  <div className="grow">
                    <h2>Nicht ganz!</h2>
                    <div>
                      Richtig ist: <b style={{ fontSize: '1.15rem' }}>{correctText(a)}</b>
                    </div>
                  </div>
                </div>
                {a.type === 'text' && value && !item.task.work && <SpellDiff correct={a.value} given={value} tags={result.tags} caseSensitive={a.caseSensitive} />}
                {result.trap && (
                  <div className="hint">
                    <span>💡</span>
                    <span>{result.trap.hint}</span>
                  </div>
                )}
                <div className="row" style={{ marginTop: 12 }}>
                  <h3 className="grow">So geht&apos;s:</h3>
                  <Speak text={[result.trap?.hint, ...item.task.solution].filter(Boolean).join(' ')} label="Lösungsweg vorlesen" />
                </div>
                <ol className="steps">
                  {item.task.solution.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
                {item.task.solutionVisual && (
                  <div className="visual-box" style={{ marginTop: 10 }}>
                    <Visual v={item.task.solutionVisual} />
                  </div>
                )}
                {item.task.pronounce && (
                  <div className="row" style={{ marginTop: 10 }}>
                    <Speak text={item.task.pronounce.text} lang={item.task.pronounce.lang} label="Aussprache anhören" />
                    <span>
                      Hör dir die Aussprache an: <b>{item.task.pronounce.text}</b>
                    </span>
                  </div>
                )}
                {profile.micPractice && item.task.pronounce && <SayIt key={item.task.key} text={item.task.pronounce.text} lang={item.task.pronounce.lang} />}
                <div className="again-note">
                  <span>🔁</span>
                  <span>
                    {item.again ? 'Diese Aufgabe bleibt in deiner Fehler-Kiste, bis sie sitzt.' : 'Diese Aufgabe kommt gleich noch einmal – und später aus deiner Fehler-Kiste, bis sie sitzt.'}
                  </span>
                </div>
                {skill && !more && (
                  <button className="btn ghost block small" style={{ marginTop: 12 }} onClick={() => setMore(true)}>
                    💡 Mehr erklären (mit Video)
                  </button>
                )}
                {skill && more && (
                  <div className="card" style={{ marginTop: 12 }}>
                    <ExplainBody skill={skill} />
                  </div>
                )}
                <button className="btn block" style={{ marginTop: 14 }} onClick={next}>
                  Weiter
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {help && skill && <ExplainSheet skill={skill} onClose={() => setHelp(false)} />}
      {stageMsg && <Toast text={stageMsg} onDone={() => setStageMsg(null)} ms={3200} />}
      {askQuit && (
        <Confirm
          title="Übung beenden?"
          text="Alles, was du schon geübt hast, ist gespeichert."
          yes="Ja, beenden"
          no="Weiter üben"
          onYes={() => {
            stopSpeaking();
            onExit();
          }}
          onNo={() => setAskQuit(false)}
        />
      )}
    </div>
  );
}
