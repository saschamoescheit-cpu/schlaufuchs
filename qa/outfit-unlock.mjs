// node qa/outfit-unlock.mjs [url] [out] – Einmaleins-Runde mit 13 Sternen beginnen: am Ende Hinweis „Neu für deinen Fuchs: Blume“.
import { open } from './lib.mjs';

const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/outfit-unlock';
const progress = { skills: {}, review: [], solved: 13, log: [], tests: [], stars: 13, days: {} };
const { p, shot, click, done } = await open({ url, out, grade: 2, progress });
await click('Mathe');
await p.getByRole('button', { name: /Einmaleins/ }).first().click();
for (let i = 0; i < 30; i++) {
  if (await p.getByText('Neu für deinen Fuchs').or(p.getByRole('button', { name: 'Fertig' })).first().isVisible().catch(() => false)) break;
  const prompt = await p.locator('.prompt').first().innerText();
  const m = prompt.match(/(\d+)\s*·\s*(\d+)/) ?? prompt.match(/(\d+)\s*:\s*(\d+)/);
  const ans = m ? (prompt.includes(':') ? Number(m[1]) / Number(m[2]) : Number(m[1]) * Number(m[2])) : 1;
  for (const ch of String(ans)) await p.keyboard.press(ch);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(150);
  await click('Weiter');
  await p.waitForTimeout(150);
}
await shot('ende', true);
const note = await p.getByText(/Neu für deinen Fuchs/).first().locator('..').innerText().catch(() => '');
console.log('Hinweis:', note);
const ok = note.includes('Blume');
console.log(ok ? '✓ Freischalt-Hinweis ok' : '✗ kein Freischalt-Hinweis');
process.exit((await done()) + (ok ? 0 : 1));
