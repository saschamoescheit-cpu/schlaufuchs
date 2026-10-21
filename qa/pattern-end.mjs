// node qa/pattern-end.mjs [url] [out] – Runde „Wörter verlängern“ absichtlich mit d/t-Fehlern: am Ende „Genau das jetzt üben“.
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/pattern-end';
const { p, shot, click, done } = await open({ url, out, grade: 3 });
await click('Deutsch');
await p.locator('.topic-main', { hasText: 'Wörter verlängern' }).first().click();
for (let i = 0; i < 40; i++) {
  if (await p.getByRole('button', { name: 'Fertig' }).isVisible().catch(() => false)) break;
  // immer die falsche Antwort wählen: die Auswahl, die NICHT richtig ist, gibt es nicht vorher zu wissen → erste nehmen
  await p.locator('.choice').first().click();
  await p.waitForTimeout(150);
  await p.getByRole('button', { name: 'Weiter' }).first().click();
  await p.waitForTimeout(150);
}
await shot('ende', true);
const offer = p.getByRole('button', { name: 'Genau das jetzt üben' });
const has = await offer.isVisible().catch(() => false);
console.log(has ? '✓ Angebot „Genau das jetzt üben“' : '✗ kein Angebot');
if (has) {
  await offer.click();
  await p.waitForTimeout(400);
  await shot('gezielt');
  console.log('Antworten:', (await p.locator('.choice').allInnerTexts()).join(','));
}
process.exit((await done()) + (has ? 0 : 1));
