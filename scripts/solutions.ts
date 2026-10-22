// npx vite-node scripts/solutions.ts [prefix] [stufe] – je Thema eine Aufgabe mit Lösungsweg (Korrekturlesen der Rückmeldungen)
import { ALL_SKILLS } from '../src/content/curriculum';
import { mulberry32 } from '../src/engine/rng';
import { correctText } from '../src/engine/check';
const [pre = '', st = '2'] = process.argv.slice(2);
const r = mulberry32(7);
for (const s of ALL_SKILLS.filter((x) => x.id.startsWith(pre))) {
  const t = s.generate(r, Number(st) as 1 | 2 | 3);
  console.log(`${s.id}: ${t.prompt.replace(/\n/g, ' / ').slice(0, 90)} → ${correctText(t.answer)} || ${t.solution.join(' | ')}`);
}
