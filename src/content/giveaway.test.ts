import { describe, expect, it } from 'vitest';
import { ALL_SKILLS } from './curriculum';
import { mulberry32 } from '../engine/rng';

// Aufgaben dürfen die Lösung nicht schon im Text verraten
const gen = (id: string, stage: 1 | 2 | 3, n: number) => {
  const skill = ALL_SKILLS.find((s) => s.id === id)!;
  const r = mulberry32(5);
  return Array.from({ length: n }, () => skill.generate(r, stage));
};

describe('Keine Lösung im Aufgabentext', () => {
  it('Fehlerdetektiv: das richtige Wort steht nicht noch einmal korrekt im Satz', () => {
    const bad: string[] = [];
    for (const t of gen('d3-fehlerdetektiv', 3, 600)) {
      if (t.answer.type !== 'text') continue;
      const shown = t.prompt.split('\n')[1];
      if (shown.replace(/[.,!?]/g, '').split(' ').includes(String(t.answer.value))) bad.push(shown);
    }
    expect([...new Set(bad)]).toEqual([]);
  });
  it('Sätze bauen: die Wörter stehen nie schon in der richtigen Reihenfolge', () => {
    for (const t of gen('e2-wordorder', 2, 800)) {
      if (t.answer.type !== 'choice') continue;
      const shown = t.prompt.split('\n').pop()!.split(' · ').join(' ').toLowerCase();
      const ok = t.answer.options[t.answer.correct].slice(0, -1).toLowerCase();
      expect(shown, t.prompt).not.toBe(ok);
    }
  });
  it('Zahlen ordnen: die Zahlen stehen nie schon sortiert da', () => {
    for (const t of gen('m1-ordnen', 3, 800)) {
      if (!t.prompt.startsWith('Welche Reihe')) continue;
      const nums = t.prompt.split('\n')[1].split(', ').map(Number);
      expect(nums.join(), t.prompt).not.toBe([...nums].sort((a, b) => a - b).join());
    }
  });
});
