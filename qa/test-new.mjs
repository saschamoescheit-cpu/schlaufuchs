// node qa/test-new.mjs [url] [out] – Probetest nur mit neuen Themen (Kl. 4: Fahrplan, Brüche bei Größen): starten, beantworten, abgeben, Note
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/test-new';
const { p, shot, click, done } = await open({ url, out, grade: 4 });
await click('Tests');
await click('Keins');
await p.getByLabel(/Fahrplan lesen/).check();
await p.getByLabel(/Brüche bei Größen/).check();
await p.getByRole('button', { name: '8', exact: true }).click();
await shot('setup', true);
await click('Test starten');
for (let i = 0; i < 8; i++) {
  await p.waitForTimeout(250);
  if (i === 0) await shot('aufgabe1');
  const ch = p.locator('.choice').first();
  if (await ch.isVisible().catch(() => false)) await ch.click();
  else {
    await p.keyboard.press('5');
    await p.keyboard.press('Enter');
  }
  const next = p.getByRole('button', { name: /Weiter|Nächste/ }).first();
  if (await next.isVisible({ timeout: 300 }).catch(() => false)) await next.click();
}
await click('Abgeben');
const yes = p.getByRole('button', { name: /Ja, abgeben|Abgeben/ }).last();
if (await yes.isVisible({ timeout: 800 }).catch(() => false)) await yes.click();
await p.waitForTimeout(500);
await shot('ergebnis', true);
const note = await p.getByText(/Note/).first().isVisible().catch(() => false);
console.log(note ? '✓ Ergebnis mit Note' : '✗ kein Ergebnis');
process.exit((await done()) + (note ? 0 : 1));
