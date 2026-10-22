// npx vite-node scripts/giveaway.ts – Aufgaben, deren Text die Lösung schon enthält (nur Hinweise, von Hand prüfen)
// Auswahl: nur die richtige Option steht wörtlich im Text, keine der falschen. Text-Eingabe: Lösung steht als ganzes Wort im Text.
import { ALL_SKILLS } from '../src/content/curriculum';
import { mulberry32 } from '../src/engine/rng';

const r = mulberry32(7);
const seen = new Map<string, string>();
const tokens = (x: string) => x.split(/[^\p{L}\d]+/u).filter(Boolean);
// w steht als ganze Wortfolge in txt
const has = (txt: string, w: string) => {
  const a = tokens(txt), b = tokens(w);
  if (!b.length || w.length < 2) return false;
  for (let i = 0; i + b.length <= a.length; i++) if (b.every((x, k) => a[i + k] === x)) return true;
  return false;
};
for (const s of ALL_SKILLS)
  for (const st of [1, 2, 3] as const)
    for (let i = 0; i < 120; i++) {
      const t = s.generate(r, st);
      const a = t.answer;
      const txt = t.prompt;
      if (a.type === 'choice') {
        const ok = a.options[a.correct];
        const wrong = a.options.filter((_, k) => k !== a.correct);
        if (has(txt, ok) && !wrong.some((w) => has(txt, w)) && !seen.has(s.id)) seen.set(s.id, `${txt.replace(/\n/g, ' / ')}  →  ${ok}`);
      } else if (a.type === 'text' && !a.dictation && has(txt, String(a.value)) && !seen.has(s.id)) seen.set(s.id, `${txt.replace(/\n/g, ' / ')}  →  ${a.value}`);
    }
for (const [k, v] of seen) console.log(`${k}: ${v.slice(0, 220)}`);
console.log(`fertig: ${seen.size} Themen mit Hinweisen`);
