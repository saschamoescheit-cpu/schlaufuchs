import { describe, expect, it } from 'vitest';
import { ALL_SKILLS } from './curriculum';
import { mulberry32 } from '../engine/rng';

// Fehlerdetektiv: das richtige Wort darf nicht noch einmal korrekt im Satz stehen – sonst verrät der Satz die Lösung
describe('Fehlerdetektiv', () => {
  it('der Satz verrät die richtige Schreibung nicht', () => {
    const skill = ALL_SKILLS.find((s) => s.id === 'd3-fehlerdetektiv')!;
    const r = mulberry32(5);
    const bad: string[] = [];
    for (let i = 0; i < 600; i++) {
      const t = skill.generate(r, 3);
      if (t.answer.type !== 'text') continue;
      const right = String(t.answer.value);
      const shown = t.prompt.split('\n')[1];
      if (shown.replace(/[.,!?]/g, '').split(' ').includes(right)) bad.push(shown);
    }
    expect([...new Set(bad)]).toEqual([]);
  });
});
