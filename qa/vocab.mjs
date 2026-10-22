// node qa/vocab.mjs [url] – Englisch: Vokabeltrainer (Wortfelder wählen, 20 Vokabeln) und Vokabeltest (nur Wortfelder, Ergebnis „Vokabeltest“)
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const { p, shot, click, done } = await open({ url, out: 'qa/shots/vocab', grade: 4 });
let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) bad++; };
// 1) Vokabeltrainer
await click('Englisch');
await click('Vokabeln lernen');
await p.waitForTimeout(300);
await shot('auswahl', true);
const boxes = await p.locator('.sheet input[type=checkbox]').count();
check(boxes >= 15, `Wortfelder zur Auswahl: ${boxes}`);
await p.locator('.sheet').getByRole('button', { name: '20', exact: true }).click();
await p.locator('.sheet').getByRole('button', { name: /Los geht/ }).click();
await p.waitForTimeout(400);
await shot('runde');
const head = await p.locator('body').innerText();
// die Übung zeigt je Aufgabe das Wortfeld – es muss ein Vokabel-Thema sein
check(/Colours|Numbers|Animals|Family|My body|School things|Food|Clothes|Days|Toys|Festivals|Shapes|Months|Weather|Feelings|Actions|My home|Hobbies|Fruit|Transport|Nature|In town|Jobs|Wild animals/.test(head), 'Runde besteht aus Vokabel-Wortfeldern');
// Fortschritt: Aufgabe 1 von 20?
const prog = await p.evaluate(() => document.querySelectorAll('.task').length);
check(prog === 1, 'Aufgabe angezeigt');
// zurück
await p.getByRole('button', { name: /Beenden|Schließen|Zurück/ }).first().click().catch(() => {});
await p.waitForTimeout(300);
const end = p.getByRole('button', { name: /Beenden|Ja/ }).last();
if (await end.isVisible({ timeout: 500 }).catch(() => false)) await end.click();
// 2) Vokabeltest
await p.goto(url);
await click('Tests');
await click('Englisch');
await click('Vokabeltest');
await p.waitForTimeout(300);
const rows = await p.locator('label.list-row').allInnerTexts();
check(rows.length > 0 && rows.every((t) => !/Where is|Read and|Little sentences|Shopping|Questions/.test(t)), `nur Wortfelder im Stoff (${rows.length})`);
await shot('test-setup', true);
await p.getByRole('button', { name: '8', exact: true }).click();
await click('Test starten');
for (let i = 0; i < 8; i++) {
  await p.waitForTimeout(250);
  const ch = p.locator('.choice').first();
  if (await ch.isVisible().catch(() => false)) await ch.click();
  else {
    const inp = p.locator('input.text-input, .text-input input, input[type=text]').first();
    if (await inp.isVisible().catch(() => false)) { await inp.fill('dog'); await p.keyboard.press('Enter'); }
  }
  const next = p.getByRole('button', { name: /Weiter|Nächste/ }).first();
  if (await next.isVisible({ timeout: 300 }).catch(() => false)) await next.click();
}
await click('Abgeben');
const yes = p.getByRole('button', { name: /Ja, abgeben|Abgeben/ }).last();
if (await yes.isVisible({ timeout: 800 }).catch(() => false)) await yes.click();
await p.waitForTimeout(600);
await shot('ergebnis', true);
check(/Vokabeltest/.test(await p.locator('body').innerText()), 'Ergebnis als „Vokabeltest“ gekennzeichnet');
process.exit((await done()) + bad);
