// npx vite-node scripts/sample.ts [skillPrefix] – Beispielaufgaben ausgeben (Inhaltskontrolle)
import { ALL_SKILLS } from '../src/content/curriculum';
import { mulberry32 } from '../src/engine/rng';
import { correctText } from '../src/engine/check';
const pre = process.argv[2] ?? '';
const r = mulberry32(42);
for (const s of ALL_SKILLS.filter((x) => x.id.startsWith(pre))) {
  console.log(`\n## ${s.id} – ${s.title}`);
  for (let i = 0; i < 3; i++) {
    const t = s.generate(r);
    const opts = t.answer.type === 'choice' ? ` [${t.answer.options.join(' | ')}]` : '';
    console.log(`- ${t.prompt.replace(/\n/g, ' / ')}${opts} → ${correctText(t.answer)}  ‖ ${t.solution.join(' / ')}${t.traps?.length ? '  ‖ traps: ' + t.traps.map((x) => x.answer + '→' + x.tag).join(', ') : ''}`);
  }
}
