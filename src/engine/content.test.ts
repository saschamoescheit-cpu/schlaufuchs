import { describe, expect, it } from 'vitest';
import { ALL_SKILLS, areaOf } from '../content/curriculum';
import { check, correctText } from './check';
import { mulberry32 } from './rng';

const BAD = /NaN|undefined|null|\[object|Infinity/;

describe('Inhalte', () => {
  it('Themen-IDs sind eindeutig', () => {
    const ids = ALL_SKILLS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const skill of ALL_SKILLS) {
    it(`${skill.id}: je Stufe 150 Aufgaben sind lösbar und sauber`, () => {
      const r = mulberry32(skill.id.length * 7919 + 17);
      for (let i = 0; i < 450; i++) {
        const t = skill.generate(r, ((i % 3) + 1) as 1 | 2 | 3);
        expect(t.stage).toBe((i % 3) + 1);
        const ctx = `${skill.id} #${i}: ${t.prompt}`;
        expect(t.skillId, ctx).toBe(skill.id);
        expect(t.key, ctx).toBeTruthy();
        expect(t.solution.length, ctx).toBeGreaterThan(0);
        const texts = [t.prompt, t.speak ?? '', ...t.solution, ...(t.answer.type === 'choice' ? t.answer.options : [])];
        for (const s of texts) expect(s, ctx).not.toMatch(BAD);
        const a = t.answer;
        if (a.type === 'choice') {
          expect(a.options.length, ctx).toBeGreaterThanOrEqual(2);
          expect(new Set(a.options).size, ctx + ' | ' + a.options.join(' / ')).toBe(a.options.length);
          expect(a.correct, ctx).toBeGreaterThanOrEqual(0);
          expect(check(t, String(a.correct)).ok, ctx).toBe(true);
        } else if (a.type === 'number') {
          expect(Number.isFinite(a.value), ctx).toBe(true);
          expect(a.value, ctx).toBeGreaterThanOrEqual(0);
          expect(check(t, String(a.value)).ok, ctx).toBe(true);
        } else {
          expect(check(t, a.value).ok, ctx).toBe(true);
          expect(check(t, a.value.toUpperCase()).ok, ctx).toBe(!a.caseSensitive);
        }
        for (const trap of t.traps ?? []) expect(trap.answer, `${ctx} trap`).not.toBe(correctText(a).replace(/ .*$/, ''));
      }
    });
  }
});

describe('Gliederung', () => {
  it('jedes Thema gehört zu einem Bereich (keins unter „Weitere“)', () => {
    const rest = ALL_SKILLS.filter((s) => areaOf(s) === 'Weitere').map((s) => s.id);
    expect(rest).toEqual([]);
  });
});
