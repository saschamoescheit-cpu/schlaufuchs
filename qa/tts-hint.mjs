// node qa/tts-hint.mjs [url] – stummes Gerät simulieren (Sprachausgabe startet nie): erscheint der Hinweis „Kein Ton?“
import { chromium, devices } from 'playwright';
const url = process.argv[2] ?? 'http://localhost:5192/';
const b = await chromium.launch({ channel: 'msedge' });
const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'de-DE', isMobile: false, hasTouch: false });
const app = { schema: 1, profiles: [{ id: 'k1', name: 'Mia', avatar: '🦊', age: 9, grade: 3, state: 'NW', englishFrom: 3, gradesFrom: 3, gradeKey: [95, 80, 65, 50, 25], autoRead: false, sound: false, pace: 'schule', created: 1, gradeYear: 9999 }], progress: { k1: { skills: {}, review: [], solved: 0, log: [], tests: [], stars: 0, days: {} } }, activeId: 'k1', parent: { pin: null } };
await ctx.addInitScript((d) => {
  if (!sessionStorage.getItem('s')) { localStorage.setItem('schlaufuchs:v1', JSON.stringify(d)); sessionStorage.setItem('s', '1'); }
  window.speechSynthesis.speak = () => {}; // stumm: es startet nie etwas
}, app);
const p = await ctx.newPage();
await p.goto(url);
await p.getByRole('button', { name: 'Mathe' }).first().click();
await p.locator('.topic-main').first().click();
await p.getByRole('button', { name: 'Aufgabe vorlesen' }).first().click();
await p.waitForTimeout(9500);
const shown = await p.locator('.speech-hint').isVisible().catch(() => false);
await p.screenshot({ path: 'qa/shots/tts-hint.png' });
console.log(shown ? '✓ Hinweis „Kein Ton?“ erscheint' : '✗ kein Hinweis');
await b.close();
process.exit(shown ? 0 : 1);
