import { describe, expect, it } from 'vitest';
import { skillById } from './curriculum';
import { mulberry32 } from '../engine/rng';

// Nachtlauf 23.10.2026: „Ich abschreibe …“ war falsch – trennbare Vorsilben wandern im Hauptsatz ans Ende
describe('Wortbausteine (d3-wortbausteine)', () => {
  it('trennbare Vorsilben (ab, an, auf, aus, mit, vor, zu) nie direkt vor dem gebeugten Verb', () => {
    const s = skillById('d3-wortbausteine')!;
    const r = mulberry32(3);
    const seen = new Set<string>();
    for (let i = 0; i < 600; i++) {
      const t = s.generate(r, 2);
      if (t.answer.type !== 'choice' || seen.has(t.key)) continue;
      seen.add(t.key);
      const ok = t.answer.options[t.answer.correct];
      const sentence = t.prompt.split('\n')[1];
      if (!['ab', 'an', 'auf', 'aus', 'mit', 'vor', 'zu'].includes(ok)) continue;
      // erlaubt: Lücke vor Satzzeichen (… fährt ab.) oder mit Hilfs-/Modalverb davor (kannst … vorlesen, habe … abgetrocknet)
      const atEnd = /☐\s*[.,!?]/.test(sentence);
      const withHelper = /\b(kann|kannst|will|willst|möchte|muss|habe|hast|hat|haben)\b/i.test(sentence.split('☐')[0]);
      expect(atEnd || withHelper, sentence).toBe(true);
    }
    expect(seen.size).toBeGreaterThan(30);
  });
});
