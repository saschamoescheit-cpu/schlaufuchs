// npx vite-node scripts/sample3.ts [prefix] [stufe] [anzahl] – kompakte Beispielaufgaben einer Stufe (Inhaltskontrolle)
import { ALL_SKILLS } from '../src/content/curriculum';
import { mulberry32 } from '../src/engine/rng';
import { correctText } from '../src/engine/check';
const [pre = '', st = '3', n = '3'] = process.argv.slice(2);
const r = mulberry32(2026);
for (const s of ALL_SKILLS.filter((x) => x.id.startsWith(pre))) {
  const seen = new Set<string>();
  for (let i = 0; i < 40 && seen.size < Number(n); i++) {
    const t = s.generate(r, Number(st) as 1 | 2 | 3);
    if (seen.has(t.key)) continue;
    seen.add(t.key);
    const opts = t.answer.type === 'choice' ? ` [${t.answer.options.join(' | ')}]` : '';
    console.log(`${s.id}: ${t.prompt.replace(/\n/g, ' / ').slice(0, 140)}${opts.slice(0, 120)} → ${correctText(t.answer)}`);
  }
}
