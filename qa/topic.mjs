// node qa/topic.mjs <Fach> <Klasse> <Themen-ID> <Titel-Teil> [Stufe] [Anzahl] [url] – ein Thema öffnen, mehrere Aufgaben ansehen,
// jeweils falsch beantworten (erste Auswahl bzw. „1“) und Rückmeldung fotografieren. Bilder in qa/shots/topic-<ID>.
import { open } from './lib.mjs';

const [subj, grade, id, name, stage = '2', count = '3', url = 'http://localhost:5192/'] = process.argv.slice(2);
const out = `qa/shots/topic-${id}`;
const skills = { [id]: { n: 0, ok: 0, recent: [], last: 0, tags: {}, stage: Number(stage) } };
const progress = { skills, review: [], solved: 0, log: [], tests: [], stars: 0, days: {} };
const { p, shot, click, done } = await open({ url, out, grade: Number(grade), progress });
await click(subj);
await p.locator('.topic-main', { hasText: name }).first().click();
for (let i = 0; i < Number(count); i++) {
  await p.waitForTimeout(400);
  await shot(`a${i}`);
  const ch = p.locator('.choice').first();
  if (await ch.isVisible().catch(() => false)) await ch.click();
  else {
    await p.keyboard.press('1');
    await p.keyboard.press('Enter');
  }
  await p.waitForTimeout(500);
  await shot(`a${i}-feedback`, true);
  await p.getByRole('button', { name: 'Weiter' }).first().click();
}
process.exit(await done());
