import { describe, expect, it } from 'vitest';
import { ALL_SKILLS } from './curriculum';
import { mulberry32 } from '../engine/rng';
import { WORDS } from './words';

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
  // Die Aufgabe liest die App mit deutscher Stimme vor: englische Fragezeilen brauchen einen deutschen Vorlesetext (speak)
  it('englische Aufgabenzeilen haben einen deutschen Vorlesetext', () => {
    const r = mulberry32(12);
    const bad = new Set<string>();
    for (const s of ALL_SKILLS.filter((x) => x.subject === 'englisch'))
      for (const st of [1, 2, 3] as const)
        for (let i = 0; i < 40; i++) {
          const t = s.generate(r, st);
          if (!t.speak && /^(\S+ )?(What|Where|Write|Who|How|Is|Are|Can|Do|I|The)\b/.test(t.prompt)) bad.add(`${s.id}: ${t.prompt.split('\n')[0]}`);
        }
    expect([...bad]).toEqual([]);
  });
  it('englische Vokabeln in „…“ gehen nicht an die deutsche Stimme (z. B. Welche Zahl ist „nine“?)', () => {
    const en = new Set(Object.values(WORDS).flat().map((w) => w.en.toLowerCase()));
    for (const x of ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']) en.add(x);
    const r = mulberry32(15);
    const bad = new Set<string>();
    for (const s of ALL_SKILLS.filter((x) => x.subject === 'englisch'))
      for (const st of [1, 2, 3] as const)
        for (let i = 0; i < 60; i++) {
          const t = s.generate(r, st);
          for (const m of (t.speak ?? t.prompt).matchAll(/„([^“]+)“/g)) if (en.has(m[1].toLowerCase()) && !/^[A-ZÄÖÜ]/.test(m[1])) bad.add(`${s.id}: ${m[0]}`);
        }
    expect([...bad]).toEqual([]);
  });
});
