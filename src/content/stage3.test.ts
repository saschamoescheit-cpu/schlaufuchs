import { describe, expect, it } from 'vitest';
import { skillById } from './curriculum';
import { mulberry32 } from '../engine/rng';

// Nachtlauf 23./24.10.2026: Stufe 3 ist die schwerste – keine Aufgaben wie „8 − 8“, „7 : 7“ oder „8 = 8 + ☐“
const gen = (id: string) => {
  const s = skillById(id)!;
  const r = mulberry32(21);
  return Array.from({ length: 400 }, () => s.generate(r, 3));
};
describe('Stufe 3 ohne Babyaufgaben', () => {
  it('Zahlen zerlegen: kein Teil ist 0', () => {
    for (const t of gen('m1-zerlegen')) expect(t.prompt, t.prompt).not.toMatch(/^(\d+) = \1 \+ ☐$|= 0 \+/);
    for (const t of gen('m1-zerlegen')) if (t.answer.type === 'number') expect(t.answer.value, t.prompt).toBeGreaterThan(0);
  });
  it('Minus bis 10: kein x − x und kein − 1', () => {
    for (const t of gen('m1-minus10')) {
      const [a, b] = t.prompt.split(' = ')[0].split(' − ').map(Number);
      expect(b, t.prompt).toBeGreaterThan(1);
      expect(b, t.prompt).toBeLessThan(a);
    }
  });
  it('Geteilt: Ergebnis mindestens 2', () => {
    for (const t of gen('m2-geteilt')) if (t.answer.type === 'number') expect(t.answer.value, t.prompt).toBeGreaterThanOrEqual(2);
  });
  it('Vergleichen: kein „0 ☐ 0“, selten gleich', () => {
    const all = gen('m1-vergleichen');
    const eq = all.filter((t) => /(^|\n)(\d+) ☐ \2$/.test(t.prompt));
    expect(all.some((t) => /\n0 ☐ 0$/.test(t.prompt))).toBe(false);
    expect(eq.length / all.length).toBeLessThan(0.15);
  });
});
