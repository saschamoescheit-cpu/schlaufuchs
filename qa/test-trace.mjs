// node qa/test-trace.mjs [url] – Probetest Kl. 1 nur „Ziffern schreiben“: nachspuren, abgeben, Ergebnis zählt die Aufgaben als richtig
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const { p, shot, click, done } = await open({ url, out: 'qa/shots/test-trace', grade: 1 });
await click('Tests');
await click('Keins');
await p.getByLabel(/Ziffern schreiben/).check();
await p.getByRole('button', { name: '5', exact: true }).click().catch(() => {});
await click('Test starten');
let n = 0;
for (let i = 0; i < 20; i++) {
  await p.waitForTimeout(400);
  const c = p.locator('.trace-canvas');
  if (!(await c.isVisible().catch(() => false))) break;
  // Ziffer zeilenweise vollständig nachfahren
  const strokes = await p.evaluate(() => {
    const cv = document.querySelector('.trace-canvas');
    const letter = cv.getAttribute('aria-label').replace(/^Buchstabe (.) .*$/, '$1');
    const S = 300, o = document.createElement('canvas'); o.width = S; o.height = S;
    const g = o.getContext('2d'); g.font = `400 220px Andika, 'Nunito', sans-serif`; g.textAlign = 'center'; g.fillText(letter, S / 2, 205);
    const m = g.getImageData(0, 0, S, S).data, r = cv.getBoundingClientRect(), k = r.width / S, out = [];
    for (let y = 0; y < S; y += 8) for (let x = 0; x < S; x++) { if (m[(y * S + x) * 4 + 3] <= 128) continue; let x2 = x; while (x2 < S && m[(y * S + x2) * 4 + 3] > 128) x2++; out.push([r.left + x * k, r.top + y * k, r.left + (x2 - 1) * k]); x = x2; }
    return out;
  });
  for (const [x1, y, x2] of strokes) { await p.mouse.move(x1, y); await p.mouse.down(); await p.mouse.move(x2, y, { steps: 3 }); await p.mouse.up(); }
  await p.getByRole('button', { name: 'Fertig' }).click();
  n++;
  if (i === 0) await shot('aufgabe1-fertig');
  const next = p.getByRole('button', { name: /Weiter|Nächste/ }).first();
  if (await next.isVisible({ timeout: 500 }).catch(() => false)) await next.click();
  else break;
}
await click('Abgeben');
const yes = p.getByRole('button', { name: /Ja, abgeben|Abgeben/ }).last();
if (await yes.isVisible({ timeout: 800 }).catch(() => false)) await yes.click();
await p.waitForTimeout(600);
await shot('ergebnis', true);
const txt = await p.locator('body').innerText();
const m = /(\d+)\s*von\s*(\d+)/.exec(txt);
console.log(`${n} nachgespurt; Ergebnis: ${m ? m[0] : '?'}`);
process.exit((await done()) + (m && m[1] === m[2] ? 0 : 1));
