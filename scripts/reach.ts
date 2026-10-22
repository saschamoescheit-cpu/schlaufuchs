// npx vite-node scripts/reach.ts – findet Fehlermuster (tagLabels), die ein Thema nie erzeugt (toter Code / zu kurze Auswahllisten)
import { ALL_SKILLS } from '../src/content/curriculum';
import { mulberry32 } from '../src/engine/rng';
let n = 0;
for (const s of ALL_SKILLS) {
  const labels = Object.keys(s.tagLabels ?? {});
  if (!labels.length) continue;
  const seen = new Set<string>();
  const r = mulberry32(17);
  for (let i = 0; i < 3000; i++) {
    const t = s.generate(r, ((i % 3) + 1) as 1 | 2 | 3);
    for (const x of t.tags ?? []) seen.add(x);
    for (const x of t.traps ?? []) seen.add(x.tag);
  }
  const miss = labels.filter((l) => !seen.has(l));
  if (miss.length) { n++; console.log(`${s.id}: nie erzeugt → ${miss.join(', ')}`); }
}
console.log(n ? `${n} Themen mit unerreichbaren Fehlermustern` : 'alle Fehlermuster erreichbar');
