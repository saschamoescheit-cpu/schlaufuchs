// Übungsrunden und Lernzielkontrollen zusammenstellen.
import { mulberry32, pick, randomSeed, shuffle, type Rng } from './rng';
import { difficulty, dueReviews, level, type Progress } from './learning';
import type { Skill, Task } from './types';

export const SESSION_LEN = 10;

function fresh(skill: Skill, r: Rng, used: Set<string>): Task {
  let t = skill.generate(r);
  for (let i = 0; i < 8 && used.has(t.key); i++) t = skill.generate(r);
  used.add(t.key);
  return t;
}

/** Fehler-Aufgaben gleichmäßig zwischen neue Aufgaben streuen */
function interleave(news: Task[], reviews: Task[]): Task[] {
  const out = [...news];
  reviews.forEach((t, i) => out.splice(Math.min(out.length, 1 + i * 3), 0, t));
  return out;
}

/** Übung eines Themas: neue Aufgaben + fällige Fehler-Aufgaben dieses Themas */
export function buildPractice(skill: Skill, p: Progress, now = Date.now(), seed = randomSeed()): Task[] {
  const r = mulberry32(seed);
  const due = dueReviews(p, now, (id) => id === skill.id).slice(0, 4).map((x) => x.task);
  const used = new Set(due.map((t) => t.key));
  const news = Array.from({ length: SESSION_LEN - due.length }, () => fresh(skill, r, used));
  return interleave(news, due);
}

/** Fuchs-Mix: Themen gewichtet – was schwerfällt oder noch nicht sicher ist, kommt öfter */
export function buildMix(skills: Skill[], p: Progress, now = Date.now(), seed = randomSeed()): Task[] {
  const r = mulberry32(seed);
  const ids = new Set(skills.map((s) => s.id));
  const due = dueReviews(p, now, (id) => ids.has(id)).slice(0, 4).map((x) => x.task);
  const weight = (s: Skill) => 1 + 3 * difficulty(p, s.id) + (level(p, s.id) < 3 ? 1 : 0) + (level(p, s.id) === 0 ? 0.5 : 0);
  const total = skills.reduce((a, s) => a + weight(s), 0);
  const used = new Set(due.map((t) => t.key));
  const news: Task[] = [];
  while (news.length < SESSION_LEN - due.length) {
    let x = r() * total;
    const s = skills.find((k) => (x -= weight(k)) <= 0) ?? pick(r, skills);
    news.push(fresh(s, r, used));
  }
  return interleave(news, due);
}

/** Fehler-Training: alle fälligen Fehler-Aufgaben, aufgefüllt mit ähnlichen Aufgaben der schwierigsten Themen */
export function buildReview(skills: Skill[], p: Progress, now = Date.now(), seed = randomSeed(), n = 12): Task[] {
  const r = mulberry32(seed);
  const ids = new Set(skills.map((s) => s.id));
  const due = dueReviews(p, now, (id) => ids.has(id)).slice(0, n).map((x) => x.task);
  const hard = skills.filter((s) => difficulty(p, s.id) > 0.1).sort((a, b) => difficulty(p, b.id) - difficulty(p, a.id)).slice(0, 4);
  const used = new Set(due.map((t) => t.key));
  const extra: Task[] = [];
  for (let i = 0; due.length + extra.length < Math.min(n, Math.max(6, due.length)) && hard.length; i++) extra.push(fresh(hard[i % hard.length], r, used));
  return shuffle(r, [...due, ...extra]);
}

export type Pace = 'entspannt' | 'schule' | 'turbo';
export const PACES: { id: Pace; label: string; factor: number; info: string }[] = [
  { id: 'entspannt', label: 'Entspannt', factor: 1.5, info: 'mehr Zeit als in der Schule' },
  { id: 'schule', label: 'Wie in der Schule', factor: 1, info: 'übliche Zeit für eine Lernzielkontrolle' },
  { id: 'turbo', label: 'Turbo', factor: 0.75, info: 'weniger Zeit – für Profis' },
];

/** Lernzielkontrolle: Aufgaben reihum aus den gewählten Themen, Zeit nach Schultempo */
export function buildTest(skills: Skill[], n: number, pace: Pace, seed = randomSeed()) {
  const r = mulberry32(seed);
  const used = new Set<string>();
  const order = shuffle(r, skills);
  const tasks = Array.from({ length: n }, (_, i) => fresh(order[i % order.length], r, used));
  const secs = tasks.reduce((a, t) => a + (skills.find((s) => s.id === t.skillId)?.testSeconds ?? 30), 0);
  const factor = PACES.find((x) => x.id === pace)!.factor;
  const limit = Math.max(60, Math.ceil((secs * factor) / 60) * 60);
  return { tasks: shuffle(r, tasks), limit };
}
