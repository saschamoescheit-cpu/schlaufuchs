// node qa/print.mjs [url] [out] – Probetest als Arbeitsblatt: Bildschirm + PDF (Druckansicht)
import { chromium, devices } from 'playwright';
const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/print';
const b = await chromium.launch({ channel: 'msedge' });
const ctx = await b.newContext({ viewport: { width: 900, height: 1200 }, locale: 'de-DE' });
const p = await ctx.newPage();
await p.goto(url);
await p.evaluate(() => {
  const id = 'k1';
  localStorage.setItem('schlaufuchs:v1', JSON.stringify({ schema: 1, profiles: [{ id, name: 'Mia', avatar: '🦊', age: 9, grade: 4, state: 'NW', englishFrom: 3, gradesFrom: 3, gradeKey: [95, 80, 65, 50, 25], autoRead: false, sound: false, pace: 'schule', created: 1 }], progress: { [id]: { skills: {}, review: [], solved: 0, log: [], tests: [], stars: 0, days: {} } }, activeId: id, parent: { pin: null } }));
  localStorage.setItem('schlaufuchs:badges-seen:k1', '[]');
});
await p.reload();
await p.getByRole('button', { name: 'Tests' }).click();
await p.getByRole('button', { name: /Arbeitsblatt drucken/ }).click();
await p.waitForTimeout(500);
await p.screenshot({ path: `${out}-screen.png`, fullPage: true });
await p.pdf({ path: `${out}.pdf`, format: 'A4', margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' } });
await p.emulateMedia({ media: 'print' });
await p.screenshot({ path: `${out}-print.png`, fullPage: true });
console.log('ok');
await b.close();
