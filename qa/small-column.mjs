// node qa/small-column.mjs [url] [out] – Rechenkästchen mit 6 Stellen auf iPhone SE: kein verdeckter Teil
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/se-column';
const skills = { 'm4-schriftlich-plusminus': { n: 0, ok: 0, recent: [], last: 0, tags: {}, stage: 3 }, 'm4-schriftlich-mal': { n: 0, ok: 0, recent: [], last: 0, tags: {}, stage: 3 } };
const { p, shot, click, done } = await open({ url, out, grade: 4, device: 'iPhone SE', progress: { skills, review: [], solved: 0, log: [], tests: [], stars: 0, days: {} } });
let bad = 0;
for (const name of ['Schriftlich plus und minus', 'Schriftliche Multiplikation']) {
  await click('Mathe');
  await p.locator('.topic-main', { hasText: name }).first().click();
  await p.waitForTimeout(400);
  const hidden = await p.evaluate(() => Math.max(0, ...[...document.querySelectorAll('.cw-box')].map((b) => b.scrollWidth - b.clientWidth)));
  console.log(`${hidden > 1 ? '✗' : '✓'} ${name}: verdeckt ${hidden}px`);
  if (hidden > 1) bad++;
  await shot(name.replace(/\W+/g, '-'));
  await p.getByRole('button', { name: 'Übung beenden' }).click();
  const y = p.getByRole('button', { name: 'Ja, beenden' });
  if (await y.isVisible({ timeout: 800 }).catch(() => false)) await y.click();
  await p.getByRole('button', { name: 'Zurück' }).first().click();
}
process.exit((await done()) + bad);
