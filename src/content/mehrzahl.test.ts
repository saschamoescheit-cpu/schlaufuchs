import { describe, expect, it } from 'vitest';
import { ALL_SKILLS, skillById } from './curriculum';
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

// Nachtlauf 24.10.2026: „Tasss“, „Schlosss“, „essst“ – drei gleiche Buchstaben sind nie ein glaubhafter Fehler
describe('Auswahl-Antworten aller Themen', () => {
  it('nie drei gleiche Buchstaben hintereinander', () => {
    const r = mulberry32(21);
    const odd: string[] = [];
    for (const s of ALL_SKILLS)
      for (let i = 0; i < 150; i++) {
        const t = s.generate(r, (1 + (i % 3)) as 1 | 2 | 3);
        if (t.answer.type === 'choice') for (const o of t.answer.options) if (/([a-zäöüß])\1\1/i.test(o)) odd.push(`${s.id}: ${o}`);
      }
    expect([...new Set(odd)]).toEqual([]);
  });
});

// Nachtlauf 24.10.2026: „catss“, „dresss“, „applees“, „leavess“ waren keine glaubhaften Fehler
describe('a / an and plurals (e2-a-an-plural)', () => {
  const s = skillById('e2-a-an-plural')!;
  const r = mulberry32(12);
  const tasks = Array.from({ length: 3000 }, (_, i) => s.generate(r, (1 + (i % 3)) as 1 | 2 | 3)).filter((t) => t.key.startsWith('p-'));

  it('keine Ablenker mit -ss + s, -s + s oder -e + es', () => {
    const odd = new Set<string>();
    for (const t of tasks) if (t.answer.type === 'choice') for (const o of t.answer.options) if (o !== t.key.slice(2) && /(sss|[^s]ss$|ees$)/.test(o)) odd.add(o);
    // erlaubt: „buss“ (bus + s) – häufiger Anfängerfehler
    expect([...odd].filter((o) => o !== 'buss')).toEqual([]);
  });

  it('immer mindestens drei Antworten (Stufe 2 und 3)', () => {
    for (const t of tasks) if (t.answer.type === 'choice' && t.answer.options.length < 3) throw new Error(t.prompt);
  });
});
