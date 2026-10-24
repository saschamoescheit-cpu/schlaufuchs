import { describe, expect, it } from 'vitest';
import { skillById } from './curriculum';
import { mulberry32 } from '../engine/rng';

// Nachtlauf 24.10.2026: Ablenker wie „Zugn“ oder „Turmn“ waren auf den ersten Blick falsch, „Eis“ (von Ei) ist ein echtes Wort
describe('Einzahl und Mehrzahl (d2-mehrzahl)', () => {
  const s = skillById('d2-mehrzahl')!;
  const r = mulberry32(11);
  const options: string[] = [];
  for (let i = 0; i < 1500; i++) {
    const t = s.generate(r, (1 + (i % 3)) as 1 | 2 | 3);
    if (t.answer.type !== 'choice') continue;
    options.push(...t.answer.options.filter((_, k) => k !== (t.answer.type === 'choice' ? t.answer.correct : -1)));
  }

  it('-n als Ablenker nur nach Selbstlaut, -el oder -er', () => {
    expect([...new Set(options.filter((o) => /[^aeiouäöü]n$/.test(o) && !/(el|er)n$/.test(o)))]).toEqual([]);
  });

  it('keine echten fremden Wörter als Ablenker', () => {
    expect(options.filter((o) => ['Hass', 'Eis', 'Töpfer', 'Hause'].includes(o))).toEqual([]);
  });
});
