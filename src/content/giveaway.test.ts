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

// Auswahlaufgaben: Die Lösung darf nicht auffällig oft die längste oder kürzeste Antwort sein (sonst rät man ohne zu lesen)
describe('Länge verrät die Lösung nicht', () => {
  it('in keinem Thema ist die Lösung in mehr als 55 % der Fälle die längste oder kürzeste Antwort', () => {
    const r = mulberry32(8);
    const bad: string[] = [];
    for (const s of ALL_SKILLS) {
      let n = 0, longest = 0, shortest = 0;
      for (let i = 0; i < 160; i++) {
        const t = s.generate(r, i % 2 ? 2 : 3);
        const a = t.answer;
        if (a.type !== 'choice' || a.options.length < 3) continue;
        const len = a.options.map((o) => o.length);
        const others = len.filter((_, k) => k !== a.correct);
        n++;
        if (len[a.correct] > Math.max(...others)) longest++;
        if (len[a.correct] < Math.min(...others)) shortest++;
      }
      if (n >= 40 && Math.max(longest, shortest) / n > 0.55) bad.push(`${s.id}: ${Math.round((100 * Math.max(longest, shortest)) / n)} %`);
    }
    expect(bad).toEqual([]);
  });
});

// Ablenker dürfen keine unpassenden Wörter ergeben (z. B. Mehrzahl-Fehlform „busen“)
describe('Keine unpassenden Ablenker', () => {
  it('kein „busen“ bei one bus – two ☐', () => {
    const skill = ALL_SKILLS.find((s) => s.id === 'e2-a-an-plural')!;
    const r = mulberry32(3);
    for (let i = 0; i < 1500; i++) {
      const t = skill.generate(r, 2);
      if (t.answer.type === 'choice') expect(t.answer.options.map((o) => o.toLowerCase())).not.toContain('busen');
    }
  });
});

describe('Mehrzahl-Ablenker (Deutsch)', () => {
  it('höchstens ein Umlaut je Ablenker und kein „Hass“', () => {
    const skill = ALL_SKILLS.find((s) => s.id === 'd2-mehrzahl')!;
    const r = mulberry32(4);
    for (let i = 0; i < 1500; i++) {
      const t = skill.generate(r, 2);
      if (t.answer.type !== 'choice') continue;
      for (const o of t.answer.options) {
        expect((o.match(/[äöü]/g) ?? []).length, o).toBeLessThanOrEqual(1);
        expect(o).not.toBe('Hass');
      }
    }
  });
});
