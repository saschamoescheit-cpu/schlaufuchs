// node qa/small-lage.mjs [url] [out] – Links/rechts Stufe 3 (5 Bilder) auf iPhone SE ohne Überlauf
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/se-lage';
const skills = { 'm1-lage': { n: 0, ok: 0, recent: [], last: 0, tags: {}, stage: 3 } };
const { p, shot, click, done } = await open({ url, out, grade: 1, device: 'iPhone SE', progress: { skills, review: [], solved: 0, log: [], tests: [], stars: 0, days: {} } });
await click('Mathe');
await p.locator('.topic-main', { hasText: 'Links, rechts' }).first().click();
let bad = 0;
for (let i = 0; i < 4; i++) {
  await p.waitForTimeout(300);
  const [sw, iw, gw] = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth, Math.max(0, ...[...document.querySelectorAll('.vis-grid')].map((g) => g.scrollWidth - g.clientWidth))]);
  if (sw > iw + 1 || gw > 1) bad++;
  await shot(`a${i}`);
  await p.locator('.choice').first().click();
  await p.waitForTimeout(200);
  await p.getByRole('button', { name: 'Weiter' }).first().click();
}
console.log(bad ? `✗ Überlauf (${bad})` : '✓ Raster passt auf 320 px');
process.exit((await done()) + bad);
