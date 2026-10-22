// npx vite-node scripts/scan.ts – viele Aufgaben aller Stufen nach typischen Textfehlern durchsuchen
// (NaN, undefined, „1 sind“, „− 0 =“, Leerzeichen vor Punkt, doppelte Kommas oder Leerzeichen)
import { ALL_SKILLS } from '../src/content/curriculum';
import { mulberry32 } from '../src/engine/rng';
import { correctText } from '../src/engine/check';

const r = mulberry32(99);
const bad = /NaN|undefined|\bnull\b|\[object|\b1 sind\b|sind noch 1 |− 0 =|\+ 0 =| \.(?!\.)|,,|\S {2,}\S/;
const seen = new Set<string>();
for (const s of ALL_SKILLS)
  for (const st of [1, 2, 3] as const)
    for (let i = 0; i < 150; i++) {
      const t = s.generate(r, st);
      const parts = [t.prompt, t.speak, correctText(t.answer), ...t.solution, ...(t.answer.type === 'choice' ? t.answer.options : [])];
      const txt = parts.filter(Boolean).map((x) => String(x).replace(/\n/g, ' / ')).join(' ¦ ');
      const m = txt.match(bad);
      if (m && !seen.has(`${s.id}:${m[0]}`)) {
        seen.add(`${s.id}:${m[0]}`);
        console.log(`${s.id} [${m[0]}] → ${txt.slice(0, 240)}`);
      }
    }
console.log(`fertig: ${seen.size} Fundstellen`);
