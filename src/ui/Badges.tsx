// Abzeichen-Übersicht, Feier bei neuen Abzeichen, Tagesziel.
import { useEffect, useState } from 'react';
import { BADGES, earnedKeys, TIER_COLORS, TIER_NAMES, tierOf } from '../engine/badges';
import { addDays, dayKey, type Progress } from '../engine/learning';
import type { Profile } from '../data/store';
import { Confetti, Fox, Sheet } from './common';

const seenKey = (pid: string) => `schlaufuchs:badges-seen:${pid}`;
const readSeen = (pid: string): Set<string> | null => {
  try {
    const raw = localStorage.getItem(seenKey(pid));
    return raw ? new Set(JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
};
const writeSeen = (pid: string, keys: string[]) => {
  try {
    localStorage.setItem(seenKey(pid), JSON.stringify(keys));
  } catch {
    /* egal */
  }
};

export function BadgeGrid({ profile, progress }: { profile: Profile; progress: Progress }) {
  return (
    <div className="badges">
      {BADGES.map((b) => {
        const { tier, value, next } = tierOf(b, progress, profile);
        return (
          <div key={b.id} className={`badge-tile ${tier ? 'got' : ''}`} style={tier ? { ['--bc' as string]: TIER_COLORS[tier - 1] } : undefined}>
            <div className="b-icon">{b.icon}</div>
            <b>{b.title}</b>
            <span className="small">{tier ? TIER_NAMES[tier - 1] : 'noch gesperrt'}</span>
            <span className="small muted">{next ? `${b.text.replace('{n}', String(next))} (${Math.min(value, next)}/${next})` : 'Alles geschafft!'}</span>
          </div>
        );
      })}
    </div>
  );
}

/** zeigt neu erreichte Abzeichen einmal an (pro Gerät gemerkt) */
export function BadgeWatcher({ profile, progress }: { profile: Profile; progress: Progress }) {
  const [fresh, setFresh] = useState<string[]>([]);
  const earned = earnedKeys(progress, profile).join('|');
  useEffect(() => {
    const keys = earned ? earned.split('|') : [];
    const seen = readSeen(profile.id);
    const neu = keys.filter((k) => !seen?.has(k));
    if (neu.length) setFresh(neu);
    else if (!seen) writeSeen(profile.id, keys);
  }, [earned, profile.id]);
  if (!fresh.length) return null;
  const close = () => {
    writeSeen(profile.id, earned.split('|'));
    setFresh([]);
  };
  // je Abzeichen nur die höchste neue Stufe
  const best = new Map<string, number>();
  for (const k of fresh) {
    const [id, t] = k.split(':');
    best.set(id, Math.max(best.get(id) ?? 0, Number(t)));
  }
  return (
    <>
      <Confetti />
      <Sheet onClose={close} label="Neues Abzeichen">
        <div className="stack center">
          <div>
            <Fox size={90} mood="happy" className="fox-wiggle" outfit={profile.outfit} />
          </div>
          <h2>{best.size === 1 ? 'Neues Abzeichen!' : `${best.size} neue Abzeichen!`}</h2>
          {[...best].map(([id, t]) => {
            const b = BADGES.find((x) => x.id === id)!;
            return (
              <div key={id} className="card row" style={{ textAlign: 'left' }}>
                <span className="b-icon big" style={{ ['--bc' as string]: TIER_COLORS[t - 1] }}>
                  {b.icon}
                </span>
                <span className="grow">
                  <b>
                    {b.title} · {TIER_NAMES[t - 1]}
                  </b>
                  <div className="small muted">{b.text.replace('{n}', String(b.tiers[t - 1]))}</div>
                </span>
              </div>
            );
          })}
          <button className="btn block" onClick={close}>
            Juhu!
          </button>
        </div>
      </Sheet>
    </>
  );
}

/** Tagesziel-Anzeige (mit Feier beim ersten Erreichen am Tag) */
export function DailyGoal({ profile, progress }: { profile: Profile; progress: Progress }) {
  const goal = profile.dailyGoal ?? 20;
  const today = progress.days[dayKey(Date.now())] ?? 0;
  const done = goal > 0 && today >= goal;
  const [party, setParty] = useState(false);
  useEffect(() => {
    if (!done) return;
    const k = `schlaufuchs:goal:${profile.id}`;
    try {
      if (localStorage.getItem(k) !== dayKey(Date.now())) {
        localStorage.setItem(k, dayKey(Date.now()));
        setParty(true);
      }
    } catch {
      /* egal */
    }
  }, [done, profile.id]);
  if (!goal) return null;
  return (
    <div className="card goal-card">
      {party && <Confetti />}
      <div className="row">
        <span style={{ fontSize: '1.6rem' }}>{done ? '🏅' : '🎯'}</span>
        <span className="grow">
          <b>{done ? 'Tagesziel geschafft!' : 'Tagesziel'}</b>
          <div className="small muted">
            {Math.min(today, goal)} von {goal} Aufgaben{done && today > goal ? ` · heute schon ${today}` : ''}
          </div>
        </span>
      </div>
      <div className="bar on-light" style={{ marginTop: 8 }}>
        <i style={{ width: `${Math.min(1, today / goal) * 100}%`, background: done ? 'var(--ok)' : 'var(--fox)' }} />
      </div>
      <WeekDots progress={progress} goal={goal} />
    </div>
  );
}

/** Diese Woche (Mo–So): geübt • · Ziel geschafft ★ · heute umrandet */
function WeekDots({ progress, goal }: { progress: Progress; goal: number }) {
  const now = Date.now();
  const wd = (new Date(now).getDay() + 6) % 7; // Montag = 0
  const todayKey = dayKey(now);
  const names = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  return (
    <div className="week-dots" aria-label="Diese Woche">
      {names.map((n, i) => {
        const k = dayKey(addDays(now, i - wd));
        const c = progress.days[k] ?? 0;
        const state = c >= goal ? 'goal' : c > 0 ? 'some' : i > wd ? 'future' : 'none';
        return (
          <span key={n} className={`wd ${state} ${k === todayKey ? 'today' : ''}`} title={c ? `${c} Aufgaben` : 'nicht geübt'}>
            <i>{state === 'goal' ? '★' : state === 'some' ? '•' : ''}</i>
            {n}
          </span>
        );
      })}
    </div>
  );
}
