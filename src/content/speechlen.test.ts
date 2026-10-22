import { describe, expect, it } from 'vitest';
import { ALL_SKILLS } from './curriculum';
import { mulberry32 } from '../engine/rng';

// Die Cloud-Stimme (Supabase-Funktion „tts“) nimmt höchstens 400 Zeichen – längere Texte fielen auf die Gerätestimme
// zurück, die auf iPhone/iPad im Stummmodus nicht zu hören ist.
describe('Vorlesetexte', () => {
  it('Hör- und Vorlesetexte sind höchstens 400 Zeichen lang', () => {
    const r = mulberry32(11);
    const long: string[] = [];
    for (const s of ALL_SKILLS)
      for (const st of [1, 2, 3] as const)
        for (let i = 0; i < 25; i++) {
          const t = s.generate(r, st);
          for (const x of [t.listen?.text, t.speak ?? t.prompt]) if (x && x.length > 400) long.push(`${s.id}: ${x.length}`);
        }
    expect([...new Set(long)]).toEqual([]);
  });
});
