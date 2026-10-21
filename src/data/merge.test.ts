import { describe, expect, it } from 'vitest';
import { mergeCore } from './merge';
import type { SkillStat } from '../engine/learning';

const stat = (last: number, stage?: 1 | 2 | 3): SkillStat => ({ n: 5, ok: 4, recent: [1, 1, 0, 1, 1], last, tags: {}, ...(stage ? { stage, run: [1] } : {}) });
const core = (s: SkillStat) => ({ skills: { x: s }, review: [], solved: 0, stars: 0, days: {} });

describe('Stufe im Abgleich', () => {
  it('die zuletzt geübte Seite bestimmt die Stufe', () => {
    expect(mergeCore(null, core(stat(10, 3)), core(stat(5, 1))).skills.x.stage).toBe(3);
    expect(mergeCore(null, core(stat(5, 3)), core(stat(10, 2))).skills.x.stage).toBe(2);
  });
  it('ohne Stufe auf einer Seite bleibt die andere erhalten', () => {
    expect(mergeCore(null, core(stat(10)), core(stat(5, 2))).skills.x.stage).toBe(2);
  });
});
