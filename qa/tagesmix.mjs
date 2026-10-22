// node qa/tagesmix.mjs [url] [out] – Startseite → Tagesmix: Runde mit Aufgaben aus mehreren Fächern
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/tagesmix';
const { p, shot, done } = await open({ url, out, grade: 3 });
await shot('start', true);
await p.getByRole('button', { name: /Tagesmix/ }).click();
const subjects = new Set();
for (let i = 0; i < 10; i++) {
  await p.waitForTimeout(250);
  const head = await p.locator('.practice-head, .task-head, .pl-task').first().innerText().catch(() => '');
  subjects.add(head.split('\n')[0]);
  const ch = p.locator('.choice').first();
  if (await ch.isVisible().catch(() => false)) await ch.click();
  else {
    await p.keyboard.press('1');
    await p.keyboard.press('Enter');
  }
  await p.waitForTimeout(200);
  const w = p.getByRole('button', { name: 'Weiter' }).first();
  if (await w.isVisible().catch(() => false)) await w.click();
}
console.log('Themen in der Runde:', [...subjects].slice(0, 10).join(' | '));
const ok = subjects.size >= 3;
console.log(ok ? '✓ Tagesmix mischt Themen' : '✗ zu wenig Abwechslung');
process.exit((await done()) + (ok ? 0 : 1));
