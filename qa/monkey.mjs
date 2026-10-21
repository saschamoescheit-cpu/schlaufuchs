// node qa/monkey.mjs [url] [schritte] [seed] – zufällige Klicks/Eingaben quer durch die App, sammelt Laufzeitfehler.
// Gefährliche Knöpfe (Löschen, Abmelden, PIN …) werden ausgelassen.
import { readFileSync } from 'node:fs';
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const steps = Number(process.argv[3] ?? 300);
let seed = Number(process.argv[4] ?? 1);
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const progress = JSON.parse(readFileSync(new URL('./seed.json', import.meta.url), 'utf-8'));
const { p, done, errs } = await open({ url, out: 'qa/shots/monkey', grade: 3, progress });
const SKIP = /löschen|entfernen|abmelden|anmelden|google|pin|eltern|drucken|sperren|kind anlegen|neues kind|youtube|video/i;
let clicks = 0;
for (let i = 0; i < steps; i++) {
  if (rnd() < 0.15) {
    await p.keyboard.press(String(Math.floor(rnd() * 10))).catch(() => {});
    if (rnd() < 0.5) await p.keyboard.press('Enter').catch(() => {});
    continue;
  }
  const buttons = await p.locator('button:visible, [role=tab]:visible, label.list-row:visible').all();
  const ok = [];
  for (const b of buttons) {
    const t = ((await b.innerText().catch(() => '')) + ' ' + ((await b.getAttribute('aria-label').catch(() => '')) ?? '')).trim();
    if (!SKIP.test(t)) ok.push(b);
  }
  if (!ok.length) {
    await p.goBack().catch(() => {});
    continue;
  }
  const b = ok[Math.floor(rnd() * ok.length)];
  await b.click({ timeout: 1500 }).then(() => clicks++).catch(() => {});
  await p.waitForTimeout(60);
}
console.log(`${clicks} Klicks`);
if (errs.length) await p.screenshot({ path: 'qa/shots/monkey-fehler.png' });
process.exit(await done());
