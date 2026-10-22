// npx vite-node scripts/variety.ts – wie viele verschiedene Aufgaben jedes Thema erzeugt (wenig = schnell langweilig)
import { ALL_SKILLS } from '../src/content/curriculum';
import { mulberry32 } from '../src/engine/rng';

const r = mulberry32(3);
const rows = ALL_SKILLS.map((s) => {
  const keys = new Set<string>();
  for (const st of [1, 2, 3] as const) for (let i = 0; i < 400; i++) keys.add(s.generate(r, st).key);
  return [s.id, keys.size] as const;
}).sort((a, b) => a[1] - b[1]);
for (const [id, n] of rows.slice(0, Number(process.argv[2] ?? 25))) console.log(`${String(n).padStart(4)}  ${id}`);
