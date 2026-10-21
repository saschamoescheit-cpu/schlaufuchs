// node qa/english3.mjs [url] [out] – neue Englisch-Themen (Feste, Einkaufen): Aufgabe + Rückmeldung ansehen.
import { open } from './lib.mjs';

const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/english3';
let bad = 0;
for (const [grade, name] of [[3, 'Festivals'], [4, 'Shopping'], [4, 'Shopping']]) {
  const { p, shot, click, done } = await open({ url, out, grade });
  await click('Englisch');
  await p.locator('.topic-main', { hasText: name }).first().click();
  await p.waitForTimeout(400);
  await shot(name);
  await p.locator('.choice').first().click();
  await p.waitForTimeout(500);
  await shot(name + '-feedback', true);
  bad += await done();
}
process.exit(bad);
