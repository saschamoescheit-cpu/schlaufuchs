// node qa/newtopics3.mjs [url] [out] – neue Themen (Lage, Zahlenstrahl, Wörterbuch): Stufe 1 und 3 ansehen + falsch beantworten.
import { open } from './lib.mjs';

const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/newtopics3';
const topics = [
  ['Mathe', 1, 'm1-lage', 'Links, rechts'],
  ['Mathe', 2, 'm2-zahlenstrahl', 'Zahlenstrahl bis 100'],
  ['Mathe', 3, 'm3-zahlenstrahl', 'Zahlenstrahl bis 1000'],
  ['Deutsch', 3, 'd3-woerterbuch', 'Wörterbuch'],
];
let bad = 0;
for (const [subj, grade, id, name] of topics) {
  for (const stage of [1, 3]) {
    const skills = stage === 3 ? { [id]: { n: 0, ok: 0, recent: [], last: 0, tags: {}, stage: 3 } } : {};
    const progress = { skills, review: [], solved: 0, log: [], tests: [], stars: 0, days: {} };
    const { p, shot, click, done } = await open({ url, out, grade, progress });
    await click(subj);
    await p.locator('.topic-main', { hasText: name }).first().click();
    await p.waitForTimeout(400);
    const tag = `${id}-s${stage}`;
    await shot(tag);
    const ch = p.locator('.choice').first();
    if (await ch.isVisible().catch(() => false)) await ch.click();
    else {
      await p.keyboard.press('1');
      await p.keyboard.press('Enter');
    }
    await p.waitForTimeout(500);
    await shot(tag + '-feedback', true);
    bad += await done();
  }
}
process.exit(bad);
