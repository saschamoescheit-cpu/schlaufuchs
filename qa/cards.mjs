// node qa/cards.mjs [url] – Englisch: Vokabelkarten (umdrehen, bewerten, Karteikasten) und Buchstabier-Diktat
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const { p, shot, click, done } = await open({ url, out: 'qa/shots/cards', grade: 4 });
let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) bad++; };
const sheet = () => p.locator('.sheet');

// 1) Karteikarten
await click('Englisch');
await click('Vokabeln lernen');
await sheet().getByRole('radio', { name: /Karteikarten/ }).click();
await sheet().getByRole('button', { name: 'Keins' }).click();
await sheet().locator('label.list-row', { hasText: 'Jobs' }).click();
await p.waitForTimeout(200);
const plan = await sheet().innerText();
check(/Diese Runde: 0 zum Wiederholen, 10 neue Karten/.test(plan), 'Plan: 10 neue Karten');
await shot('karten-auswahl', true);
await sheet().getByRole('button', { name: /Los geht/ }).click();
await p.locator('.vcard').waitFor({ timeout: 8000 }).catch(() => {});
check(await p.locator('.vcard').isVisible(), 'Karte angezeigt');
await shot('karte-vorne');
// 10 Karten: 8 gewusst, 2 nicht (die kommen in derselben Runde wieder)
let rated = 0;
for (let i = 0; i < 20 && (await p.locator('.vcard').isVisible().catch(() => false)); i++) {
  await p.locator('.vcard').click();
  if (i === 0) await shot('karte-hinten');
  const ok = !(i === 1 || i === 4);
  await p.getByRole('button', { name: ok ? /Gewusst/ : /Noch nicht/ }).click();
  rated++;
  await p.waitForTimeout(80);
}
check(rated === 12, `12 Bewertungen (10 Karten + 2 nochmal): ${rated}`);
const end = await p.locator('body').innerText();
await shot('karten-ende', true);
check(/✓ 10/.test(end) && /↻ 2/.test(end), 'Ergebnis: 10 gewusst, 2 nicht');
const boxes = await p.locator('.card-box b').allInnerTexts();
check(boxes.join(',') === '2,10,0,0,0,0', `Karteikasten nach der Runde: ${boxes.join(',')} (2 neu, 10 in Fach 1)`);
check(/morgen/.test(end) || /neue Karten/.test(end), 'nächster Termin genannt');
// gespeichert? neue Runde: nichts fällig, nur noch 2 neue
await click('Noch eine Runde');
await p.waitForTimeout(300);
let n2 = 0;
for (let i = 0; i < 10 && (await p.locator('.vcard').isVisible().catch(() => false)); i++) {
  await p.locator('.vcard').click();
  await p.getByRole('button', { name: /Gewusst/ }).click();
  n2++;
}
check(n2 === 2, `zweite Runde: nur die 2 restlichen neuen Karten (${n2})`);
await click('Fertig');

// 2) Diktat
await click('Vokabeln lernen');
await sheet().getByRole('radio', { name: /Diktat/ }).click();
const fields = await sheet().locator('label.list-row').allInnerTexts();
check(fields.some((t) => /Numbers 1/.test(t)) && fields.some((t) => /Shapes/.test(t)) && !fields.some((t) => /Classroom|The alphabet/.test(t)), 'Diktat: nur Wortfelder mit Wortliste (auch Zahlen und Formen)');
await sheet().getByRole('button', { name: /Los geht/ }).click();
await p.waitForTimeout(400);
await shot('diktat');
const prompt = await p.locator('.prompt').first().innerText();
check(/Hör gut zu und schreibe das Wort/.test(prompt), 'Diktat-Aufgabe');
const inp = p.locator('input').first();
check(await inp.isVisible(), 'Eingabefeld da');
process.exit((await done()) + bad);
