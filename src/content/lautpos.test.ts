import { describe, expect, it } from 'vitest';
import { ALL_SKILLS } from './curriculum';
import { mulberry32 } from '../engine/rng';

// „Wo hörst du den Laut?“: der Laut steht nur an einer Stelle im Wort, und die Stelle passt zur Lösung
describe('Wo hörst du den Laut?', () => {
  it('Laut kommt genau einmal vor (Doppelbuchstaben zählen als einer) und die Position stimmt', () => {
    const skill = ALL_SKILLS.find((s) => s.id === 'd1-lautposition')!;
    const r = mulberry32(2);
    for (let i = 0; i < 1500; i++) {
      const t = skill.generate(r, 2);
      const l = t.prompt.match(/„(.)“/)![1].toLowerCase();
      const w = t.listen!.text.toLowerCase().replace(/(.)\1/g, '$1');
      const at = [...w].flatMap((c, k) => (c === l ? [k] : []));
      expect(at.length, w).toBe(1);
      const pos = at[0] === 0 ? 'am Anfang' : at[0] === w.length - 1 ? 'am Ende' : 'in der Mitte';
      expect(t.answer.type === 'choice' && t.answer.options[t.answer.correct], w).toBe(pos);
    }
  });
});
