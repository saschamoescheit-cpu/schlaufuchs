// Zufall und kleine Helfer für die Aufgaben-Generatoren.

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

/** ganze Zahl von a bis b (beide eingeschlossen) */
export const ri = (r: Rng, a: number, b: number) => a + Math.floor(r() * (b - a + 1));
export const pick = <T>(r: Rng, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)];
export const chance = (r: Rng, p: number) => r() < p;

export function shuffle<T>(r: Rng, arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** n verschiedene Elemente */
export function pickN<T>(r: Rng, arr: readonly T[], n: number): T[] {
  return shuffle(r, arr).slice(0, n);
}

/** Auswahl-Antwort aus richtiger Antwort + Ablenkern bauen (doppelte fallen weg). */
export function choice(r: Rng, correct: string, distractors: readonly string[], n = 4, keepOrder = false) {
  const others = [...new Set(distractors.filter((d) => d !== correct))];
  const opts = [correct, ...shuffle(r, others).slice(0, n - 1)];
  const options = keepOrder ? opts.sort((a, b) => sortKey(a) - sortKey(b)) : shuffle(r, opts);
  return { type: 'choice' as const, options, correct: options.indexOf(correct) };
}

/** feste Reihenfolge der Optionen (z. B. <, >, =) */
export function fixedChoice(options: string[], correct: string) {
  return { type: 'choice' as const, options, correct: options.indexOf(correct) };
}

function sortKey(s: string) {
  const n = Number(s.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** plausible falsche Zahlen rund um die richtige */
export function numberDistractors(r: Rng, v: number, spread: number[] = [1, 2, 10], min = 0): string[] {
  const out = new Set<number>();
  for (const s of shuffle(r, spread)) {
    out.add(v + s);
    out.add(v - s);
  }
  return [...out].filter((x) => x >= min && x !== v).map(String);
}

/** große Zahlen in Dreiergruppen mit schmalem Leerzeichen (wie in Grundschulbüchern: 485 213) */
export const fmt = (n: number) => {
  const s = String(Math.abs(n));
  if (s.length <= 4) return (n < 0 ? '−' : '') + s;
  return (n < 0 ? '−' : '') + s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};
