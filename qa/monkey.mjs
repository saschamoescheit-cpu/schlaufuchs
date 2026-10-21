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
p.on('pageerror', (e) => console.log('Seitenfehler:', e.message));
const SKIP = /löschen|entfernen|abmelden|anmelden|google|pin|eltern|drucken|sperren|kind anlegen|neues kind|youtube|video/i;
const SEL = 'button, [role=tab], label.list-row';
let clicks = 0;
for (let i = 0; i < steps; i++) {
  if (rnd() < 0.15) {
    await p.keyboard.press(String(Math.floor(rnd() * 10))).catch(() => {});
    if (rnd() < 0.5) await p.keyboard.press('Enter').catch(() => {});
    continue;
  }
  // alle sichtbaren, erlaubten Knöpfe auf einmal ermitteln
  const idx = await p.$$eval(SEL, (els, skip) => {
    const re = new RegExp(skip, 'i');
    return els
      .map((el, i) => {
        const r = el.getBoundingClientRect();
        const t = `${el.textContent ?? ''} ${el.getAttribute('aria-label') ?? ''}`;
        return r.width > 0 && r.height > 0 && !el.disabled && !re.test(t) ? i : -1;
      })
      .filter((i) => i >= 0);
  }, SKIP.source).catch(() => []);
  if (!idx.length) {
    await p.goBack({ timeout: 2000 }).catch(() => {});
    continue;
  }
  const n = idx[Math.floor(rnd() * idx.length)];
  await p.locator(SEL).nth(n).click({ timeout: 1500 }).then(() => clicks++).catch(() => {});
  await p.waitForTimeout(40);
}
console.log(`${clicks} Klicks`);
if (errs.length) await p.screenshot({ path: 'qa/shots/monkey-fehler.png' });
process.exit(await done());
