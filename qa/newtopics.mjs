// node qa/newtopics.mjs [url] [out] – neue Themen ansehen (Zahlenmauer, Diagramm, Sätze lesen, Hörverstehen, Symmetrie)
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/new';
const { p, shot, click, done } = await open({ url, out, grade: 4 });
for (const [subj, tab, title, nm] of [['Mathe', 'Klasse 2', /Zahlenmauern/, 'mauer'], ['Mathe', 'Klasse 3', /Diagramme lesen/, 'diagramm'], ['Mathe', 'Klasse 2', /Symmetrie/, 'symmetrie'], ['Deutsch', 'Klasse 1', /Sätze lesen/, 'saetze'], ['Englisch', '2. Lernjahr', /Listen and choose/, 'hoeren']]) {
  await click(subj);
  await p.getByRole('tab', { name: tab }).click();
  await p.getByRole('button', { name: title }).first().click();
  await shot(nm);
  await p.getByRole('button', { name: 'Übung beenden' }).click();
  const y = p.getByRole('button', { name: 'Ja, beenden' });
  if (await y.isVisible({ timeout: 800 }).catch(() => false)) await y.click();
  await click('Lernen');
}
process.exit(await done());
