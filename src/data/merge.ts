// Lernstand zweier Geräte zusammenführen (Sascha 21.10.2026: „Sync zwischen iPad, iPhone und PC inkl. der
// Lernfortschritte“). Übt ein Kind auf dem iPad und auf dem iPhone, ohne dass die beiden dazwischen abgleichen, darf
// keine Aufgabe verloren gehen: Zähler werden addiert (was seit dem letzten gemeinsamen Stand dazukam), die
// Fehler-Kiste wird vereinigt, Tests und Aufgaben-Verlauf sowieso.
import type { Attempt, Progress, ReviewItem, SkillStat } from '../engine/learning';

/** Der Teil des Lernstands, der als eine Zeile abgeglichen wird (Tests und Verlauf haben eigene Zeilen). */
export type Core = Pick<Progress, 'skills' | 'review' | 'solved' | 'stars' | 'days'>;
/** Was beim letzten Abgleich auf beiden Seiten stand – klein gehalten (ohne die Aufgaben der Fehler-Kiste). */
export interface Base {
  skills: Record<string, SkillStat>;
  review: { k: string; wrong: number; streak: number }[];
  solved: number;
  stars: number;
  days: Record<string, number>;
}

const RECENT = 12;

export const coreOf = (p: Progress): Core => ({ skills: p.skills, review: p.review, solved: p.solved, stars: p.stars, days: p.days });
export const reviewKey = (r: ReviewItem) => `${r.task.skillId}|${r.task.key}`;
export const baseOf = (c: Core): Base => ({
  skills: c.skills,
  review: c.review.map((r) => ({ k: reviewKey(r), wrong: r.wrong, streak: r.streak })),
  solved: c.solved,
  stars: c.stars,
  days: c.days,
});
/** Zwei getrennt geführte Lernstände (z. B. dasselbe Kind auf zwei Geräten angelegt): alles zählt doppelt dazu. */
export const EMPTY_BASE: Base = { skills: {}, review: [], solved: 0, stars: 0, days: {} };

/** Was seit dem gemeinsamen Stand auf diesem Gerät dazukam, kommt zum anderen dazu. Ohne gemeinsamen Stand: das Größere. */
const count = (b: number | undefined, l: number | undefined, r: number | undefined, known: boolean): number => {
  const lv = l ?? 0;
  const rv = r ?? 0;
  if (!known) return Math.max(lv, rv);
  return rv + Math.max(0, lv - (b ?? 0));
};

function mergeSkill(b: SkillStat | undefined, l: SkillStat | undefined, r: SkillStat | undefined, known: boolean): SkillStat {
  if (!l) return r!;
  if (!r) return l;
  const tags: Record<string, [number, number]> = {};
  for (const t of new Set([...Object.keys(l.tags), ...Object.keys(r.tags)])) {
    tags[t] = [count(b?.tags[t]?.[0], l.tags[t]?.[0], r.tags[t]?.[0], known), count(b?.tags[t]?.[1], l.tags[t]?.[1], r.tags[t]?.[1], known)];
  }
  // die letzten Antworten: der gemeinsame Teil, dann was jede Seite dazu hatte – die zuletzt geübte Seite zuletzt
  const fresh = (x: SkillStat) => (known ? x.recent.slice(-Math.min(RECENT, Math.max(0, x.n - (b?.n ?? 0)))) : x.recent);
  const [older, newer] = l.last <= r.last ? [l, r] : [r, l];
  const shared = known ? (b?.recent ?? []) : [];
  const recent = [...shared, ...fresh(older), ...fresh(newer)].slice(-RECENT);
  // Stufe: die zuletzt geübte Seite gilt
  const stage = newer.stage ?? older.stage;
  const run = newer.stage !== undefined ? newer.run : older.run;
  return { n: count(b?.n, l.n, r.n, known), ok: count(b?.ok, l.ok, r.ok, known), recent, last: Math.max(l.last, r.last), tags, ...(stage ? { stage, run: run ?? [] } : {}) };
}

/**
 * Drei-Wege-Zusammenführung: `base` ist der Stand beim letzten Abgleich dieses Geräts (null = nie abgeglichen),
 * `local` der Stand hier, `remote` der vom Server.
 */
export function mergeCore(base: Base | null, local: Core, remote: Core): Core {
  const known = base != null;
  const b = base ?? EMPTY_BASE;
  const skills: Record<string, SkillStat> = {};
  for (const id of new Set([...Object.keys(local.skills), ...Object.keys(remote.skills)])) skills[id] = mergeSkill(b.skills[id], local.skills[id], remote.skills[id], known);

  // Fehler-Kiste: neu hinzugekommene Aufgaben bleiben, eine auf einem Gerät gelöste fliegt auch hier raus;
  // steht sie auf beiden Seiten, gilt die vorsichtigere (kürzere Serie richtiger Antworten)
  const inBase = new Set(b.review.map((x) => x.k));
  const L = new Map(local.review.map((x) => [reviewKey(x), x]));
  const R = new Map(remote.review.map((x) => [reviewKey(x), x]));
  const review: ReviewItem[] = [];
  for (const k of new Set([...L.keys(), ...R.keys()])) {
    const l = L.get(k);
    const r = R.get(k);
    if (l && r) {
      const pick = l.streak < r.streak || (l.streak === r.streak && l.due <= r.due) ? l : r;
      review.push({ ...pick, added: Math.min(l.added, r.added), wrong: Math.max(l.wrong, r.wrong) });
    } else if (!(known && inBase.has(k))) review.push((l ?? r)!); // neu auf einer Seite (sonst: dort gelöst)
  }
  review.sort((x, y) => x.added - y.added);

  const days: Record<string, number> = {};
  for (const d of new Set([...Object.keys(local.days), ...Object.keys(remote.days)])) days[d] = count(b.days[d], local.days[d], remote.days[d], known);

  return { skills, review, solved: count(b.solved, local.solved, remote.solved, known), stars: count(b.stars, local.stars, remote.stars, known), days };
}

/** Aufgaben-Verlauf: alle Einträge beider Seiten, jeder nur einmal, nach Zeit. */
export const attemptKey = (a: Attempt) => `${a.t}|${a.s}|${a.ok}|${a.m}|${a.tag ?? ''}`;
export function unionLog(a: Attempt[], b: Attempt[]): Attempt[] {
  const seen = new Map<string, Attempt>();
  for (const x of [...a, ...b]) seen.set(attemptKey(x), x);
  return [...seen.values()].sort((x, y) => x.t - y.t);
}

/** Eine aufgehobene Kopie zurückholen (Rettung, 24.10.2026): Kopie und Stand jetzt können sich überschneiden – Zähler
 *  daher das Größere (nie doppelt), Verlauf und Tests vereint, Fehler-Kiste vereint. */
export function mergeRescue(a: Progress, b: Progress): Progress {
  const core = mergeCore(null, coreOf(a), coreOf(b));
  const tests = new Map([...a.tests, ...b.tests].map((t) => [t.id, t]));
  return { ...core, log: unionLog(a.log, b.log), tests: [...tests.values()].sort((x, y) => x.t - y.t) };
}

/** Zwei Profile desselben Kindes (auf zwei Geräten getrennt angelegt) zu einem Lernstand vereinen. */
export function mergeTwo(a: Progress, b: Progress): Progress {
  const core = mergeCore(EMPTY_BASE, coreOf(a), coreOf(b));
  const tests = new Map([...a.tests, ...b.tests].map((t) => [t.id, t]));
  return { ...core, log: unionLog(a.log, b.log), tests: [...tests.values()].sort((x, y) => x.t - y.t) };
}
