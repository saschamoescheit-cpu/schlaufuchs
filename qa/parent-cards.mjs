// node qa/parent-cards.mjs [url] – Eltern-Bereich zeigt den Karteikasten (Englisch-Vokabeln) des Kindes
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const D = 24 * 60 * 60 * 1000;
const t0 = Date.now() - 10 * D;
const log = [];
for (const [i, w] of ['dog', 'cat', 'pig', 'cow'].entries()) {
  log.push({ t: t0 + i, s: 'e1-animals', ok: 1, m: 'karten', w });
  if (i < 2) log.push({ t: t0 + 2 * D + i, s: 'e1-animals', ok: 1, m: 'übung', w });
}
const { p, shot, click, done } = await open({ url, out: 'qa/shots/parent-cards', grade: 4, progress: { skills: {}, review: [], solved: 0, log, tests: [], stars: 0, days: {} } });
await p.getByRole('button', { name: 'Profil und Einstellungen' }).click();
await click('Eltern-Bereich');
for (const d of '1234') await p.getByRole('button', { name: d, exact: true }).click();
await p.waitForTimeout(250);
for (const d of '1234') await p.getByRole('button', { name: d, exact: true }).click();
await p.waitForTimeout(400);
await p.locator('.parent-card').first().click();
await p.waitForTimeout(400);
const card = p.locator('.card', { hasText: 'Englisch-Vokabeln' });
const ok = await card.isVisible();
const boxes = ok ? await card.locator('.card-box b').allInnerTexts() : [];
await card.scrollIntoViewIfNeeded().catch(() => {});
await shot('kasten');
console.log(ok ? `✓ Karteikasten sichtbar: ${boxes.join(',')}` : '✗ Karteikasten fehlt');
const right = boxes.join(',') === `${17 - 4},2,2,0,0,0`;
console.log(right ? '✓ Fächer stimmen (13 neu, 2 in Fach 1, 2 in Fach 2)' : '✗ Fächer unerwartet');
process.exit((await done()) + (ok && right ? 0 : 1));
