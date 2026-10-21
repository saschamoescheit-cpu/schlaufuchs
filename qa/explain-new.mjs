// node qa/explain-new.mjs [url] [out] – Erklärseiten (💡) der neuen Themen fotografieren
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/explain-new';
const list = [
  ['Mathe', 1, 'Links, rechts, oben, unten'], ['Mathe', 1, 'Geld bis 20 €'], ['Mathe', 2, 'Zahlenstrahl bis 100'], ['Mathe', 3, 'Würfelgebäude'],
  ['Mathe', 3, 'Teilen mit großen Zahlen'], ['Mathe', 4, 'Fahrplan lesen'], ['Mathe', 4, 'Brüche bei Größen: ½, ¼, ¾'], ['Deutsch', 1, 'Selbstlaute: a, e, i, o, u'],
  ['Deutsch', 2, 'V oder F?'], ['Deutsch', 3, 'Im Wörterbuch nachschlagen'], ['Deutsch', 4, 'Orts- und Zeitangaben'], ['Englisch', 4, 'Shopping – Einkaufen'],
];
let bad = 0;
for (const [subj, grade, name] of list) {
  const { p, shot, click, done } = await open({ url, out, grade });
  await click(subj);
  await p.getByRole('button', { name: `Erklärung zu ${name}` }).click();
  await p.waitForTimeout(500);
  await shot(String(name).replace(/\W+/g, '-'), true);
  bad += await done();
}
process.exit(bad);
