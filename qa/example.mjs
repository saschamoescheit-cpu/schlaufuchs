// node qa/example.mjs [url] – Beispiel in der Erklärung: aufklappen, Lösung + Lösungsbild sichtbar, neues Beispiel
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const list = [
  ['Mathe', 4, 'Schriftlich plus und minus'], ['Mathe', 3, 'Würfelgebäude'], ['Deutsch', 3, 'Im Wörterbuch nachschlagen'], ['Englisch', 4, 'Shopping – Einkaufen'],
];
let bad = 0;
for (const [subj, grade, name] of list) {
  const { p, shot, click, done } = await open({ url, out: 'qa/shots/example', grade, device: 'iPhone SE' });
  await click(subj);
  await p.getByRole('button', { name: `Erklärung zu ${name}` }).click();
  const ex = p.locator('.example');
  await ex.scrollIntoViewIfNeeded();
  await ex.getByRole('button', { name: /Lösung zeigen/ }).click();
  const steps = await ex.locator('.steps li').count();
  const sol = await ex.getByText(/^Lösung:/).count();
  if (!steps || !sol) { bad++; console.log(`✗ ${name}: ${steps} Schritte, Lösung ${sol}`); }
  await ex.screenshot({ path: `qa/shots/example/${name.replace(/\W+/g, '-')}.png` });
  const before = await ex.locator('.prompt').innerText();
  await ex.getByRole('button', { name: 'Neues Beispiel' }).click();
  if ((await ex.locator('.steps').count()) !== 0) { bad++; console.log(`✗ ${name}: Lösung bleibt nach neuem Beispiel offen`); }
  const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (over > 1) { bad++; console.log(`✗ ${name}: Überlauf ${over}px`); }
  console.log(`✓ ${name}: ${steps} Schritte; „${before.slice(0, 50)}“`);
  bad += await done();
}
process.exit(bad);
