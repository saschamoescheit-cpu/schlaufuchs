// Lernfortschritt: Statistik je Thema, Fehlermuster, Wiederholungs-Kiste (bis es sitzt), Tagesverlauf.
import type { Skill, Subject, Task } from './types';

export type Mode = 'übung' | 'wiederholung' | 'test';

export interface SkillStat {
  n: number;
  ok: number;
  /** letzte Antworten (1 richtig, 0 falsch), neueste hinten */
  recent: number[];
  last: number;
  /** Fehlermuster: [gesehen, falsch] */
  tags: Record<string, [number, number]>;
}

/** Eine falsch gelöste Aufgabe – kommt so lange wieder, bis sie zweimal hintereinander richtig ist. */
export interface ReviewItem {
  task: Task;
  added: number;
  wrong: number;
  streak: number;
  due: number;
}

export interface Attempt {
  t: number;
  s: string;
  ok: 0 | 1;
  m: Mode;
  tag?: string;
}

export interface TestItem {
  task: Task;
  given: string | null;
  ok: boolean;
}

export interface TestResult {
  id: string;
  t: number;
  subject: Subject;
  skills: string[];
  correct: number;
  total: number;
  points: number;
  maxPoints: number;
  percent: number;
  /** Ziffernnote (nur ab der eingestellten Klasse) */
  grade?: number;
  seconds: number;
  limit: number;
  timeUp: boolean;
  pace: string;
  items: TestItem[];
}

export interface Progress {
  skills: Record<string, SkillStat>;
  review: ReviewItem[];
  /** Aufgaben, die aus der Wiederholung „geschafft“ wurden */
  solved: number;
  log: Attempt[];
  tests: TestResult[];
  stars: number;
  /** Datum (JJJJ-MM-TT) → Anzahl Aufgaben */
  days: Record<string, number>;
}

export const emptyProgress = (): Progress => ({ skills: {}, review: [], solved: 0, log: [], tests: [], stars: 0, days: {} });

const RECENT = 12;
export const LOG_MAX = 6000;
/** Nach dem ersten Richtig wartet eine Fehler-Aufgabe so lange, bevor sie zur Kontrolle wiederkommt. */
export const REVIEW_GAP_MS = 30 * 60 * 1000;
export const REVIEW_STREAK = 2;

export const dayKey = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function record(p: Progress, task: Task, ok: boolean, mode: Mode, now: number, trapTag?: string): { reviewSolved: boolean; reviewAdded: boolean } {
  const st = (p.skills[task.skillId] ??= { n: 0, ok: 0, recent: [], last: 0, tags: {} });
  st.n++;
  if (ok) st.ok++;
  st.recent = [...st.recent, ok ? 1 : 0].slice(-RECENT);
  st.last = now;
  for (const tag of task.tags ?? []) {
    const c = (st.tags[tag] ??= [0, 0]);
    c[0]++;
    if (!ok) c[1]++;
  }
  if (!ok && trapTag) {
    const c = (st.tags[trapTag] ??= [0, 0]);
    c[0]++;
    c[1]++;
  }
  if (ok) p.stars++;
  const dk = dayKey(now);
  p.days[dk] = (p.days[dk] ?? 0) + 1;
  p.log.push({ t: now, s: task.skillId, ok: ok ? 1 : 0, m: mode, ...(trapTag ? { tag: trapTag } : {}) });
  if (p.log.length > LOG_MAX) p.log.splice(0, p.log.length - LOG_MAX);

  const i = p.review.findIndex((r) => r.task.key === task.key && r.task.skillId === task.skillId);
  if (!ok) {
    if (i >= 0) Object.assign(p.review[i], { wrong: p.review[i].wrong + 1, streak: 0, due: now });
    else p.review.push({ task, added: now, wrong: 1, streak: 0, due: now });
    return { reviewSolved: false, reviewAdded: i < 0 };
  }
  if (i >= 0) {
    const it = p.review[i];
    it.streak++;
    if (it.streak >= REVIEW_STREAK) {
      p.review.splice(i, 1);
      p.solved++;
      return { reviewSolved: true, reviewAdded: false };
    }
    it.due = now + REVIEW_GAP_MS;
  }
  return { reviewSolved: false, reviewAdded: false };
}

const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

export type Level = 0 | 1 | 2 | 3;
export const LEVEL_NAMES = ['Neu', 'Angefangen', 'Geübt', 'Sicher'] as const;

/**
 * Lernstand eines Themas:
 * 0 Neu – noch nicht geübt · 1 Angefangen · 2 Geübt (≥ 5 der letzten Aufgaben, ≥ 70 % richtig)
 * 3 Sicher = Lernziel erreicht (≥ 8 der letzten Aufgaben, ≥ 90 % richtig, keine offenen Fehler-Aufgaben)
 */
export function level(p: Progress, skillId: string): Level {
  const st = p.skills[skillId];
  if (!st || st.n === 0) return 0;
  const open = p.review.filter((r) => r.task.skillId === skillId).length;
  const acc = avg(st.recent);
  if (st.recent.length >= 8 && acc >= 0.9 && open === 0) return 3;
  if (st.recent.length >= 5 && acc >= 0.7) return 2;
  return 1;
}

export const accuracy = (st?: SkillStat) => (st && st.recent.length ? avg(st.recent) : undefined);
export const openReviews = (p: Progress, skillId?: string) => p.review.filter((r) => !skillId || r.task.skillId === skillId);
export const dueReviews = (p: Progress, now: number, filter?: (skillId: string) => boolean) => p.review.filter((r) => r.due <= now && (!filter || filter(r.task.skillId))).sort((a, b) => a.due - b.due);

/** Wie schwer fällt ein Thema? 0 = gar nicht, ~1 = sehr */
export function difficulty(p: Progress, skillId: string): number {
  const st = p.skills[skillId];
  if (!st || st.recent.length < 3) return 0;
  const err = 1 - avg(st.recent);
  const open = openReviews(p, skillId).length;
  return Math.min(1.5, err * Math.min(1, st.recent.length / 8) + open * 0.08);
}

export interface Weakness {
  skill: Skill;
  score: number;
  acc: number;
  open: number;
}
export function weaknesses(p: Progress, skills: Skill[], limit = 5): Weakness[] {
  return skills
    .map((s) => ({ skill: s, score: difficulty(p, s.id), acc: accuracy(p.skills[s.id]) ?? 1, open: openReviews(p, s.id).length }))
    .filter((w) => w.score >= 0.15)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export interface Pattern {
  skill: Skill;
  tag: string;
  label: string;
  wrong: number;
  seen: number;
}
/** Fehlermuster über alle Themen: wo passieren die meisten Fehler? */
export function patterns(p: Progress, skills: Skill[], limit = 6): Pattern[] {
  const out: Pattern[] = [];
  for (const s of skills) {
    const st = p.skills[s.id];
    if (!st) continue;
    for (const [tag, [seen, wrong]] of Object.entries(st.tags)) {
      const label = s.tagLabels?.[tag];
      if (!label || wrong < 2 || wrong / seen < 0.3) continue;
      out.push({ skill: s, tag, label, wrong, seen });
    }
  }
  return out.sort((a, b) => b.wrong / b.seen - a.wrong / a.seen || b.wrong - a.wrong).slice(0, limit);
}

/** Tage in Folge mit mindestens einer Aufgabe (bis heute oder gestern) */
export function streakDays(p: Progress, now: number): number {
  let n = 0;
  let t = now;
  if (!p.days[dayKey(t)]) t -= 86400000;
  while (p.days[dayKey(t)]) {
    n++;
    t -= 86400000;
  }
  return n;
}
