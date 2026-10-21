// node qa/stage.mjs [url] [out] – Einmaleins richtig lösen, bis die Stufe steigt (Meldung + Stufenanzeige).
import { open } from './lib.mjs';

const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/stage';
const { p, shot, click, done } = await open({ url, out, grade: 2 });
await click('Mathe');
await p.getByRole('button', { name: /Einmaleins/ }).first().click();
await shot('stufe1');
let toast = false;
for (let i = 0; i < 8 && !toast; i++) {
  const prompt = await p.locator('.prompt').first().innerText();
  const m = prompt.match(/(\d+)\s*·\s*(\d+)/);
  if (!m) break;
  for (const ch of String(Number(m[1]) * Number(m[2]))) await p.keyboard.press(ch);
  await p.keyboard.press('Enter');
  toast = await p.locator('.toast').isVisible().catch(() => false);
  if (toast) await shot('stufe-hoch');
  await click('Weiter');
  await p.waitForTimeout(200);
}
const pill = await p.locator('.stage-pill').first().innerText().catch(() => '');
console.log(toast ? '✓ Stufen-Meldung erschienen' : '✗ keine Stufen-Meldung', '·', pill);
await shot('stufe2');
process.exit((await done()) + (toast && pill.includes('●●○') ? 0 : 1));
