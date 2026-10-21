// node qa/column.mjs [url] [out] – Rechenkästchen: Plus, Minus, Mal, Geteilt ansehen, falsch und richtig ausfüllen.
import { open } from './lib.mjs';

const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/column';
const { p, shot, click, done } = await open({ url, out, grade: 4 });

async function topic(grade, title) {
  await click('Mathe');
  await p.getByRole('tab', { name: `Klasse ${grade}` }).click();
  await p.getByRole('button', { name: title }).first().click();
  await p.waitForTimeout(300);
}
async function quit() {
  await p.getByRole('button', { name: 'Übung beenden' }).click();
  const y = p.getByRole('button', { name: 'Ja, beenden' });
  if (await y.isVisible({ timeout: 800 }).catch(() => false)) await y.click();
  await p.waitForTimeout(200);
  await click('Lernen');
}

for (const [g, t, nm] of [[3, /Schriftliche Addition/, 'plus'], [3, /Schriftliche Subtraktion/, 'minus'], [4, /Schriftliche Multiplikation/, 'mal'], [4, /Schriftliche Division/, 'geteilt']]) {
  await topic(g, t);
  await shot(`${nm}-leer`);
  // ein paar Ziffern tippen (absichtlich unvollständig/falsch)
  for (const k of ['3', '1', '4']) await p.keyboard.press(k);
  await shot(`${nm}-getippt`);
  await p.locator('.numpad .ok-key').click();
  await shot(`${nm}-falsch`, true);
  await quit();
}
process.exit(await done());
