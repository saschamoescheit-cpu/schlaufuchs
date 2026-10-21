import { describe, expect, it } from 'vitest';
import { skillById } from '../content/curriculum';
import { check } from '../engine/check';
import { mulberry32 } from '../engine/rng';
import { divSteps, layoutOf, resultValue, valsFromValue, wrongCells } from './columnLayout';

const SKILLS = ['m3-schriftlich-plus', 'm3-schriftlich-minus', 'm4-schriftlich-mal', 'm4-schriftlich-geteilt'];

describe('Rechenkästchen', () => {
  for (const id of SKILLS) {
    it(`${id}: richtig ausgefüllte Kästchen ergeben die richtige Antwort`, () => {
      const r = mulberry32(99);
      for (let i = 0; i < 300; i++) {
        const t = skillById(id)!.generate(r);
        expect(t.work, id).toBeTruthy();
        const l = layoutOf(t.work!);
        const vals: Record<string, string> = {};
        for (const row of l.rows) for (const c of row.cells ?? []) if (c.expect) vals[c.key] = c.expect;
        const v = resultValue(l, vals);
        expect(check(t, v).ok, `${t.prompt} → ${v}`).toBe(true);
        expect(wrongCells(l, vals).size, t.prompt).toBe(0);
        expect(resultValue(l, valsFromValue(l, v)), 'wiederherstellen').toBe(v);
        // jede Ergebnis-Ziffer ist in der Schreibreihenfolge
        for (const k of l.resultKeys) expect(l.order).toContain(k);
      }
    });
  }
  it('markiert die falsche Spalte', () => {
    const l = layoutOf({ op: '+', rows: [358, 276], result: 634 });
    const vals = { r0: '4', r1: '2', r2: '6', c1: '1', c2: '1' };
    expect([...wrongCells(l, vals)]).toEqual(['r1']);
    expect(resultValue(l, vals)).toBe('624');
  });
  it('Teilen: Zwischenschritte zeigen zu großen Rest', () => {
    const l = layoutOf({ op: ':', rows: [852, 4], result: 213 });
    const s = divSteps(l.division!, ['1']);
    expect(s[0]).toMatchObject({ cur: 8, q: 1, prod: 4, rest: 4, problem: 'rest-zu-gross' });
    const ok = divSteps(l.division!, ['2', '1', '3']);
    expect(ok.map((x) => x.rest)).toEqual([0, 1, 0]);
  });
});
