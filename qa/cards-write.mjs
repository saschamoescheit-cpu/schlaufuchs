// node qa/cards-write.mjs [url] – Vokabelkarten „✍️ Englisch schreiben“: richtig/falsch erkannt, Karteikasten zählt mit
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const { p, shot, click, done } = await open({ url, out: 'qa/shots/cards-write', grade: 4 });
let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) bad++; };
const DE_EN = { rot: 'red', blau: 'blue', grün: 'green', gelb: 'yellow', orange: 'orange', lila: 'purple', rosa: 'pink', schwarz: 'black', weiß: 'white', braun: 'brown', grau: 'grey' };
await click('Englisch');
await click('Vokabeln lernen');
const sheet = p.locator('.sheet');
await sheet.getByRole('radio', { name: /Karteikarten/ }).click();
await sheet.getByRole('button', { name: 'Keins' }).click();
await sheet.locator('label.list-row', { hasText: 'Colours – Farben' }).locator('input[type=checkbox]').check();
await sheet.getByRole('radio', { name: /Englisch schreiben/ }).click();
await sheet.getByRole('button', { name: /Los geht/ }).click();
await p.locator('.vcard').waitFor({ timeout: 8000 });
await shot('vorne');
// Karte antippen deckt nichts auf
await p.locator('.vcard').click();
check(!(await p.locator('.vcard.flipped').count()), 'Antippen der Karte verrät die Lösung nicht');
let right = 0, wrong = 0;
for (let i = 0; i < 25; i++) {
  if (!(await p.locator('.vcard').isVisible().catch(() => false))) break;
  const de = (await p.locator('.vcard-word').innerText()).trim();
  const answer = [2, 5, 8].includes(i) ? 'xyz' : DE_EN[de];
  await p.locator('input[aria-label="Englisches Wort"]').fill(answer ?? 'xyz');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(150);
  const fb = await p.locator('.vcard-check').innerText();
  if (i === 2) await shot('falsch');
  if (/Richtig geschrieben/.test(fb)) right++;
  else wrong++;
  await p.getByRole('button', { name: 'Weiter' }).click();
  await p.waitForTimeout(80);
}
check(right >= 6 && wrong >= 3, `richtig erkannt: ${right}, falsch erkannt: ${wrong}`);
await p.waitForTimeout(300);
const boxes = await p.locator('.card-box b').allInnerTexts().catch(() => []);
await shot('ende', true);
check(boxes.length === 6, `Karteikasten am Ende: ${boxes.join(',')}`);
process.exit((await done()) + bad);
