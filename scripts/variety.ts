// npx vite-node scripts/variety.ts – Themen mit wenig verschiedenen Aufgaben finden (60 Aufgaben je Thema, Stufe 2)
import { ALL_SKILLS } from '../src/content/curriculum';
import { mulberry32 } from '../src/engine/rng';
const r = mulberry32(42);
const rows: [string, number, number][] = [];
for (const s of ALL_SKILLS) {
  const keys = new Map<string, number>();
  for (let i = 0; i < 60; i++) { const t = s.generate(r, 2); keys.set(t.key, (keys.get(t.key) ?? 0) + 1); }
  const max = Math.max(...keys.values());
  rows.push([s.id, keys.size, max]);
}
rows.sort((a, b) => a[1] - b[1]);
for (const r of rows.slice(0, 25)) console.log(r.join('\t'));
