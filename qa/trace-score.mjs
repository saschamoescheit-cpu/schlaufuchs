// node qa/trace-score.mjs – wer der Vorführung (▶) folgt, muss bei jedem Buchstaben und jeder Ziffer bestehen
import { webkit } from 'playwright';
const b = await webkit.launch();
const p = await b.newPage();
await p.goto('http://localhost:5192/');
const r = await p.evaluate(async () => {
  const L = 'ABDEFGHIJKLMNOPRSTUWZabdefghijklmnoprstuwz0123456789';
  await document.fonts.load('400 220px Andika', L);
  const { traceScore, tracePassed, demoStrokes } = await import('/src/ui/Trace.tsx');
  const fine = (st) => { const q = []; for (let k = 1; k < st.length; k++) for (let t = 0; t <= 10; t++) q.push([st[k - 1][0] + ((st[k][0] - st[k - 1][0]) * t) / 10, st[k - 1][1] + ((st[k][1] - st[k - 1][1]) * t) / 10]); return q; };
  const res = [];
  for (const c of L) { const sc = traceScore(c, demoStrokes(c).map(fine)); res.push(`${c}:${sc.cover.toFixed(2)}${tracePassed(sc) ? '' : '✗'}`); }
  return res.join(' ');
});
console.log(r);
const bad = (r.match(/✗/g) ?? []).length;
console.log(bad ? `✗ ${bad} Zeichen fallen durch` : '✓ alle Zeichen bestehen');
await b.close();
process.exit(bad);
