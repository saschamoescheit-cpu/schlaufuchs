// node qa/print-vocab.mjs [url] – Vokabeltest als Arbeitsblatt drucken (nur Wortfelder, Druckansicht)
import { chromium } from 'playwright';
const url = process.argv[2] ?? 'http://localhost:5192/';
const b = await chromium.launch({ channel: 'msedge' });
const ctx = await b.newContext({ viewport: { width: 900, height: 1200 }, locale: 'de-DE' });
const p = await ctx.newPage();
await p.goto(url);
await p.evaluate(() => {
  const id = 'k1';
  localStorage.setItem('schlaufuchs:v1', JSON.stringify({ schema: 1, profiles: [{ id, name: 'Mia', avatar: '🦊', age: 9, grade: 4, state: 'NW', englishFrom: 3, gradesFrom: 3, gradeKey: [95, 80, 65, 50, 25], autoRead: false, sound: false, pace: 'schule', created: 1, gradeYear: 9999 }], progress: { [id]: { skills: {}, review: [], solved: 0, log: [], tests: [], stars: 0, days: {} } }, activeId: id, parent: { pin: null } }));
});
await p.reload();
await p.getByRole('button', { name: 'Tests' }).click();
await p.getByRole('button', { name: 'Englisch' }).first().click();
await p.getByRole('button', { name: /Vokabeltest/ }).click();
await p.waitForTimeout(300);
await p.getByRole('button', { name: /Arbeitsblatt drucken/ }).click();
await p.waitForTimeout(600);
await p.emulateMedia({ media: 'print' });
await p.screenshot({ path: 'qa/shots/print-vocab.png', fullPage: true });
const txt = await p.locator('body').innerText();
const ok = /Vokabel/i.test(txt) && !/Where is|Little sentences|Shopping|Sentence builder/.test(txt);
console.log(ok ? '✓ Vokabel-Arbeitsblatt' : '✗ Arbeitsblatt enthält keine/fremde Themen');
await b.close();
process.exit(ok ? 0 : 1);
