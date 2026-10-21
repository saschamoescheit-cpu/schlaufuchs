// node qa/outfits.mjs [url] [out] – Kleiderschrank: Hinweis „neu“ am Fuchs, Teile anziehen (je Platz eins), gesperrte Teile, Fuchs auf der Startseite.
import { open } from './lib.mjs';

const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/outfits';
const progress = { skills: {}, review: [], solved: 520, log: [], tests: [], stars: 520, days: {} };
const { p, shot, done } = await open({ url, out, grade: 3, progress });
const badge = await p.locator('.fox-btn .badge').innerText().catch(() => '');
console.log('Hinweis am Fuchs:', badge);
await shot('start');
await p.getByRole('button', { name: 'Fuchs anziehen' }).click();
await shot('schrank');
await p.getByRole('button', { name: 'Kappe', exact: true }).click();
await p.getByRole('button', { name: 'Doktorhut', exact: true }).click();
await p.getByRole('button', { name: 'Schal', exact: true }).click();
await shot('angezogen');
const on = await p.locator('.wardrobe-item.on b').allInnerTexts();
console.log('an:', on);
const locked = await p.locator('.wardrobe-item:disabled').count();
console.log('gesperrt:', locked);
await p.locator('.sheet').getByRole('button', { name: 'Fertig' }).click();
await shot('start-mit-outfit');
const badgeAfter = await p.locator('.fox-btn .badge').count();
const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('schlaufuchs:v1')).profiles[0].outfit);
console.log('gespeichert:', saved, '· Hinweis danach:', badgeAfter);
const ok = badge === '7' && on.join() === 'Schal,Doktorhut' && locked === 2 && badgeAfter === 0 && saved.join() === 'doktorhut,schal';
console.log(ok ? '✓ Kleiderschrank ok' : '✗ Kleiderschrank fehlerhaft');
process.exit((await done()) + (ok ? 0 : 1));
