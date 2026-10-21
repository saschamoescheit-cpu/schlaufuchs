// node qa/offline.mjs [url] – App einmal online laden, dann ohne Netz neu laden: muss weiter funktionieren (PWA).
// Mit Chromium/Edge, weil WebKit unter Playwright offline nicht über den Service Worker neu lädt.
import { chromium, devices } from 'playwright';
const url = process.argv[2] ?? 'http://localhost:5193/';
const b = await chromium.launch({ channel: 'msedge' });
const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'de-DE', serviceWorkers: 'allow' });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
let fails = 0;
const ok = (c, w) => { console.log(`${c ? '✓' : '✗'} ${w}`); if (!c) fails++; };
await p.goto(url);
await p.evaluate(() => {
  const id = 'k1';
  localStorage.setItem('schlaufuchs:v1', JSON.stringify({ schema: 1, profiles: [{ id, name: 'Mia', avatar: '🦊', age: 8, grade: 3, state: 'NW', englishFrom: 3, gradesFrom: 3, gradeKey: [95, 80, 65, 50, 25], autoRead: false, sound: false, pace: 'schule', created: 1 }], progress: { [id]: { skills: {}, review: [], solved: 0, log: [], tests: [], stars: 0, days: {} } }, activeId: id, parent: { pin: null } }));
});
await p.reload();
await p.waitForFunction(() => navigator.serviceWorker?.controller != null, null, { timeout: 30000 }).catch(() => {});
ok(await p.evaluate(() => navigator.serviceWorker?.controller != null), 'Service Worker steuert die Seite');
await p.waitForTimeout(1500);
await ctx.setOffline(true);
await p.reload();
await p.waitForTimeout(1000);
ok(await p.getByRole('button', { name: /Mathe/ }).first().isVisible().catch(() => false), 'Startseite offline sichtbar');
await p.getByRole('button', { name: /Mathe/ }).first().click();
await p.getByRole('button', { name: /Runden/ }).first().click();
ok(await p.locator('.prompt').first().isVisible().catch(() => false), 'Üben offline möglich');
const font = await p.evaluate(() => document.fonts.check('600 20px Fredoka'));
ok(font, 'Schrift offline geladen');
console.log(errs.length ? 'FEHLER:\n' + errs.join('\n') : 'keine Seitenfehler');
await b.close();
process.exit(fails + errs.length);
