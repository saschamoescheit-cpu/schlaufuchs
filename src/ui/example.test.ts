import { describe, expect, it } from 'vitest';
import { ALL_SKILLS } from '../content/curriculum';

// Das Beispiel in der Erklärung zeigt eine Aufgabe der Stufe 1 mit Lösungsweg – jedes Thema braucht dafür Schritte.
describe('Beispiel in der Erklärung', () => {
  for (const s of ALL_SKILLS) {
    it(s.id, () => {
      for (let i = 0; i < 30; i++) {
        const t = s.generate(Math.random, 1);
        expect(t.solution.length, `${s.id}: Lösungsweg fehlt`).toBeGreaterThan(0);
        expect(t.prompt.trim().length, `${s.id}: Aufgabe leer`).toBeGreaterThan(0);
      }
    });
  }
});
