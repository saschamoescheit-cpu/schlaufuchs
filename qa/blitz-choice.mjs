// node qa/blitz-choice.mjs [url] [out] [device] – Blitzrunde mit Auswahl-Aufgaben (Deutsch Klasse 2), Bilder je Thema.
import { open } from './lib.mjs';

const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/blitz-choice';
const device = process.argv[4] ?? 'iPhone 13';
const { p, shot, click, done } = await open({ url, out, grade: 2, device });
await click('Deutsch');
await click('Blitzrunde');
const topics = await p.locator('.sheet .topic h3').allInnerTexts();
console.log('Themen:', topics.join(' | '));
await shot('auswahl');
for (const t of topics.slice(0, 6)) {
  await p.locator('.sheet').getByRole('button', { name: t }).first().click();
  await p.locator('.timebar').waitFor({ timeout: 5000 });
  await p.waitForTimeout(300);
  await shot(t.replace(/\W+/g, '-'));
  // eine Antwort geben
  const choice = p.locator('.choice').first();
  if (await choice.isVisible().catch(() => false)) await choice.click();
  else await p.keyboard.press('1');
  await p.waitForTimeout(400);
  await shot(t.replace(/\W+/g, '-') + '-antwort');
  await p.getByRole('button', { name: 'Blitzrunde beenden' }).click();
  await click('Blitzrunde');
}
process.exit(await done());
