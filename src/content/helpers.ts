import type { Explanation, Grade, Skill, Subject, Task } from '../engine/types';
import type { Rng } from '../engine/rng';

export type Gen = Omit<Task, 'skillId'>;

export function skill(
  subject: Subject,
  grade: Grade,
  id: string,
  title: string,
  icon: string,
  explain: Explanation,
  gen: (r: Rng) => Gen,
  extra: Partial<Pick<Skill, 'tagLabels' | 'testSeconds'>> = {},
): Skill {
  return { id, subject, grade, title, icon, explain, generate: (r) => cleanTraps({ ...gen(r), skillId: id }), ...extra };
}

/** Fallen, die zufällig der richtigen Antwort entsprechen, fallen weg */
function cleanTraps(t: Task): Task {
  if (!t.traps?.length) return t;
  const a = t.answer;
  const right = a.type === 'choice' ? a.options[a.correct] : a.type === 'number' ? String(a.value) : a.value;
  const traps = t.traps.filter((x) => (a.type === 'number' ? Number(x.answer) !== a.value : x.answer !== right));
  return { ...t, traps };
}

export const NAMES = ['Lea', 'Tim', 'Mia', 'Ben', 'Emma', 'Noah', 'Ali', 'Sofia', 'Paul', 'Mila', 'Finn', 'Hanna', 'Elif', 'Luca', 'Ida', 'Jonas', 'Lina', 'Emil'];

/** Stellen von rechts: Einer, Zehner, … */
export const PLACE = ['Einer', 'Zehner', 'Hunderter', 'Tausender', 'Zehntausender', 'Hunderttausender'];
export const PLACE_SHORT = ['E', 'Z', 'H', 'T', 'ZT', 'HT'];

export const digitsOf = (n: number) => String(n).split('').map(Number);

/** schriftliche Addition: Schritte + Überträge (Index 0 = Einer) */
export function columnAdd(nums: number[]) {
  const len = Math.max(...nums.map((n) => String(n).length));
  const carries: number[] = [];
  const steps: string[] = [];
  let carry = 0;
  for (let i = 0; i < len; i++) {
    const ds = nums.map((n) => Math.floor(n / 10 ** i) % 10).filter((d, k) => d > 0 || 10 ** i <= nums[k]);
    const s = ds.reduce((a, b) => a + b, 0) + carry;
    const parts = [...ds.map(String), ...(carry ? [`${carry} (Übertrag)`] : [])].join(' + ');
    carries[i] = carry;
    carry = Math.floor(s / 10);
    steps.push(`${PLACE[i]}: ${parts} = ${s}${s >= 10 ? ` → schreibe ${s % 10}, merke ${carry}` : ` → schreibe ${s}`}`);
  }
  if (carry) steps.push(`Den letzten Übertrag ${carry} schreibst du ganz vorne hin.`);
  return { steps, carries };
}

/** schriftliche Subtraktion (Abziehen mit Entbündeln) */
export function columnSub(a: number, b: number) {
  const da = digitsOf(a).reverse();
  const db = digitsOf(b).reverse();
  const steps: string[] = [];
  const carries: number[] = [];
  for (let i = 0; i < da.length; i++) {
    const y = db[i] ?? 0;
    if (i >= db.length && da.slice(i).every((d) => d === 0)) break;
    if (da[i] < y) {
      let j = i + 1;
      while (da[j] === 0) j++;
      da[j]--;
      for (let k = j - 1; k > i; k--) da[k] = 9;
      carries[i] = 1;
      steps.push(`${PLACE[i]}: ${da[i]} − ${y} geht nicht. Hole dir 1 von der nächsten Stelle (entbündeln): ${da[i] + 10} − ${y} = ${da[i] + 10 - y}`);
      da[i] += 10;
    } else {
      steps.push(`${PLACE[i]}: ${da[i]} − ${y} = ${da[i] - y}`);
    }
  }
  return { steps, carries };
}

/** schriftliche Multiplikation mit einstelligem Faktor */
export function columnMul1(a: number, d: number) {
  const da = digitsOf(a).reverse();
  const steps: string[] = [];
  let carry = 0;
  da.forEach((x, i) => {
    const p = x * d + carry;
    steps.push(`${x} · ${d}${carry ? ` + ${carry}` : ''} = ${p}${p >= 10 && i < da.length - 1 ? ` → schreibe ${p % 10}, merke ${Math.floor(p / 10)}` : ' → schreibe ' + p}`);
    carry = Math.floor(p / 10);
  });
  return steps;
}

/** schriftliche Division durch einstellige Zahl */
export function columnDiv(n: number, d: number) {
  const ds = digitsOf(n);
  const steps: string[] = [];
  let rest = 0;
  let started = false;
  ds.forEach((x, i) => {
    const cur = rest * 10 + x;
    const q = Math.floor(cur / d);
    if (!started && q === 0 && i < ds.length - 1) {
      rest = cur;
      return;
    }
    started = true;
    rest = cur - q * d;
    steps.push(`${cur} : ${d} = ${q}, denn ${q} · ${d} = ${q * d}. Rest ${rest}${i < ds.length - 1 ? ` → hole die nächste Ziffer ${ds[i + 1]} herunter` : ''}`);
  });
  return { steps, rest };
}

/** Text mit **Markierung** → Wörter (für das Vorlesen ohne Sternchen) */
export const plain = (s: string) => s.replace(/\*\*/g, '');
