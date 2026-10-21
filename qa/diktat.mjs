// node qa/diktat.mjs [url] [out] – Diktat: Wort und Satz falsch schreiben, Rückmeldung ansehen.
import { open } from './lib.mjs';

const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/diktat';
const { p, shot, click, done } = await open({ url, out, grade: 4 });

for (const [g, title, text] of [[2, /Diktat: Lernwörter/, 'bine'], [4, /Diktat: ganze Sätze/, 'ich weis das es regnet']]) {
  await click('Deutsch');
  await p.getByRole('tab', { name: `Klasse ${g}` }).click();
  await p.getByRole('button', { name: title }).first().click();
  await shot(`k${g}-aufgabe`);
  await p.locator('.text-input').fill(text);
  await click('Prüfen');
  await shot(`k${g}-falsch`, true);
  await p.getByRole('button', { name: 'Übung beenden' }).click();
  await click('Ja, beenden');
  await click('Lernen');
}
process.exit(await done());
