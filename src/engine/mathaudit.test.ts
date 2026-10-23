import { expect, it } from 'vitest';
import { ALL_SKILLS } from '../content/curriculum';
import { mulberry32 } from './rng';

// Rechenaufgaben in der Form „a op b = ☐“, „☐ op b = c“ oder „a op ☐ = c“ unabhängig nachrechnen (Nachtlauf 23.10.2026)
const num = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'));
const calc = (a: number, op: string, b: number) => (op === '+' ? a + b : op === '−' || op === '-' ? a - b : op === '·' ? a * b : op === ':' ? a / b : NaN);
it('alle Rechenaufgaben der Form „a + b = ☐“ (auch mit Lücke vorne/mitten) stimmen', () => {
  const bad: string[] = [];
  let seen = 0;
  for (const s of ALL_SKILLS.filter((x) => x.subject === 'mathe')) {
    const r = mulberry32(99);
    for (let i = 0; i < 300; i++) {
      const t = s.generate(r, ((i % 3) + 1) as 1 | 2 | 3);
      if (t.answer.type !== 'number') continue;
      const v = t.answer.value;
      for (const line of t.prompt.split('\n')) {
        const N = '(\\d[\\d.]*(?:,\\d+)?)';
        const OP = '\\s*([+−\\-·:])\\s*';
        let m = new RegExp(`^${N}${OP}${N}\\s*=\\s*☐$`).exec(line.trim());
        if (m) {
          seen++;
          const want = calc(num(m[1]), m[2], num(m[3]));
          if (Math.abs(want - v) > 1e-9) bad.push(`${s.id}: ${line} → ${v} (richtig ${want})`);
          continue;
        }
        m = new RegExp(`^☐${OP}${N}\\s*=\\s*${N}$`).exec(line.trim());
        if (m) {
          seen++;
          const ok = Math.abs(calc(v, m[1], num(m[2])) - num(m[3])) < 1e-9;
          if (!ok) bad.push(`${s.id}: ${line} → ${v}`);
          continue;
        }
        m = new RegExp(`^${N}${OP}☐\\s*=\\s*${N}$`).exec(line.trim());
        if (m) {
          seen++;
          const ok = Math.abs(calc(num(m[1]), m[2], v) - num(m[3])) < 1e-9;
          if (!ok) bad.push(`${s.id}: ${line} → ${v}`);
        }
      }
    }
  }
  expect(seen).toBeGreaterThan(2000);
  expect([...new Set(bad)].slice(0, 20)).toEqual([]);
});
