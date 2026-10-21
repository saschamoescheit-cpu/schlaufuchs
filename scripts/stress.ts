// npx vite-node scripts/stress.ts [anzahl] – viele Aufgaben je Thema und Stufe erzeugen und prüfen (seltene Fehlfälle finden)
import { ALL_SKILLS } from '../src/content/curriculum';
import { check, correctText } from '../src/engine/check';
import { mulberry32 } from '../src/engine/rng';
const N = Number(process.argv[2] ?? 3000);
const BAD = /NaN|undefined|null|\[object|Infinity/;
let problems = 0;
for (const s of ALL_SKILLS) {
  const r = mulberry32(s.id.length * 104729 + 7);
  for (let i = 0; i < N * 3; i++) {
    const stage = ((i % 3) + 1) as 1 | 2 | 3;
    let t;
    try {
      t = s.generate(r, stage);
    } catch (e) {
      console.log(`${s.id} s${stage}: Absturz ${String(e)}`);
      problems++;
      break;
    }
    const a = t.answer;
    const texts = [t.prompt, t.speak ?? '', ...t.solution, ...(a.type === 'choice' ? a.options : [])];
    const fail = (m: string) => {
      problems++;
      if (problems < 60) console.log(`${s.id} s${stage}: ${m} | ${t.prompt.replace(/\n/g, ' / ').slice(0, 120)}`);
    };
    if (texts.some((x) => BAD.test(x))) fail('kaputter Text');
    if (a.type === 'choice') {
      if (new Set(a.options).size !== a.options.length) fail('doppelte Auswahl ' + a.options.join('|'));
      if (!check(t, String(a.correct)).ok) fail('richtige Auswahl wird nicht akzeptiert');
    } else if (a.type === 'number') {
      if (!Number.isFinite(a.value) || a.value < 0) fail('Zahl ungültig ' + a.value);
      if (!check(t, String(a.value)).ok) fail('Zahl wird nicht akzeptiert');
    } else if (!check(t, a.value).ok) fail('Text wird nicht akzeptiert ' + correctText(a));
    for (const trap of t.traps ?? []) if (check(t, trap.answer).ok) fail('Falle gilt als richtig: ' + trap.answer);
  }
}
console.log(problems ? `${problems} Probleme` : 'keine Probleme');
