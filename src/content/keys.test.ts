import { describe, expect, it } from 'vitest';
import { ALL_SKILLS } from './curriculum';
import { mulberry32 } from '../engine/rng';
import { correctText } from '../engine/check';

// Gleicher Aufgaben-Schlüssel = gleiche Aufgabe: Die Fehler-Kiste und „schon gesehen“ erkennen Aufgaben am Schlüssel.
// Hätten zwei verschiedene Aufgaben denselben Schlüssel (z. B. gleiche Geschichte, andere Frage), käme das durcheinander.
describe('Aufgaben-Schlüssel', () => {
  it('derselbe Schlüssel hat immer dieselbe richtige Antwort', () => {
    const r = mulberry32(21);
    const bad: string[] = [];
    for (const s of ALL_SKILLS) {
      const m = new Map<string, string>();
      for (const st of [1, 2, 3] as const)
        for (let i = 0; i < 80; i++) {
          const t = s.generate(r, st);
          const a = correctText(t.answer);
          const prev = m.get(t.key);
          if (prev !== undefined && prev !== a) bad.push(`${s.id}: ${t.key} → ${prev} | ${a}`);
          m.set(t.key, a);
        }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });
});
