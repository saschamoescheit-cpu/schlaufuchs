// npx vite-node scripts/longest.ts – Auswahlaufgaben, bei denen die richtige Antwort auffällig oft die längste ist (Raten ohne Lesen)
import { ALL_SKILLS } from '../src/content/curriculum';
import { mulberry32 } from '../src/engine/rng';
const r = mulberry32(8);
const rows: [string, number, number][] = [];
for (const s of ALL_SKILLS) {
  let n = 0, longest = 0, shortest = 0;
  for (const st of [2, 3] as const)
    for (let i = 0; i < 150; i++) {
      const t = s.generate(r, st);
      const a = t.answer;
      if (a.type !== 'choice' || a.options.length < 3) continue;
      const len = a.options.map((o) => o.length);
      const ok = len[a.correct];
      const others = len.filter((_, k) => k !== a.correct);
      n++;
      if (ok > Math.max(...others)) longest++;
      if (ok < Math.min(...others)) shortest++;
    }
  if (n >= 40) rows.push([s.id, longest / n, shortest / n]);
}
rows.sort((a, b) => Math.max(b[1], b[2]) - Math.max(a[1], a[2]));
for (const [id, l, sh] of rows.slice(0, Number(process.argv[2] ?? 20))) console.log(`${id.padEnd(26)} längste ${(l * 100).toFixed(0).padStart(3)} %  kürzeste ${(sh * 100).toFixed(0).padStart(3)} %`);
