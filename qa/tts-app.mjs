// node qa/tts-app.mjs [url] – echte Sprachausgabe (Edge mit Windows-Stimmen): Lautsprecher-Knöpfe drücken und protokollieren,
// ob das Vorlesen startet, zu Ende läuft oder abgebrochen wird.
import { chromium, devices } from 'playwright';
const url = process.argv[2] ?? 'http://localhost:5192/';
const b = await chromium.launch({ channel: 'msedge' });
const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'de-DE', isMobile: false, hasTouch: false });
const id = 'k1';
const app = { schema: 1, profiles: [{ id, name: 'Mia', avatar: '🦊', age: 9, grade: 3, state: 'NW', englishFrom: 3, gradesFrom: 3, gradeKey: [95, 80, 65, 50, 25], autoRead: process.env.AUTO === '1', sound: false, pace: 'schule', created: 1, gradeYear: 9999 }], progress: { [id]: { skills: {}, review: [], solved: 0, log: [], tests: [], stars: 0, days: {} } }, activeId: id, parent: { pin: null } };
await ctx.addInitScript((d) => {
  if (!sessionStorage.getItem('s')) { localStorage.setItem('schlaufuchs:v1', JSON.stringify(d)); sessionStorage.setItem('s', '1'); }
  window.__tts = [];
  const t0 = performance.now();
  const log = (x) => window.__tts.push(`${Math.round(performance.now() - t0)}ms ${x}`);
  const s = window.speechSynthesis;
  const sp = s.speak.bind(s), ca = s.cancel.bind(s);
  s.speak = (u) => { log(`speak "${u.text.slice(0, 40)}" ${u.lang} voice=${u.voice?.name ?? '-'}`); u.addEventListener('start', () => log('  start')); u.addEventListener('end', () => log('  end')); u.addEventListener('error', (e) => log('  error ' + e.error)); sp(u); };
  s.cancel = () => { log('cancel'); ca(); };
}, app);
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('pageerror', e.message));
await p.goto(url);
await p.waitForTimeout(1500);
let bad = 0;
// ein Schritt gilt als gelungen, wenn eine echte Ausgabe (nicht das stumme Aufschließen) startet
const dump = async (title) => {
  const l = await p.evaluate(() => window.__tts.splice(0));
  // automatischer Schritt: ohne „Automatisch vorlesen“ und ohne Hör-Aufgabe wird zu Recht nichts gesprochen
  const wanted = l.some((x) => x.includes('speak "') && !x.includes('speak " "'));
  const ok = !wanted ? title.includes('automatisch') : l.some((x, i) => x.includes('  start') && !(l[i - 1] ?? '').includes('speak " "'));
  console.log(`\n${ok ? '✓' : '✗'} ${title}\n` + l.join('\n'));
  if (!ok) bad++;
};
await p.getByRole('button', { name: 'Englisch' }).first().click();
await p.locator('.topic-main', { hasText: 'Animals' }).first().click();
await p.waitForTimeout(2500);
await dump('Aufgabe geöffnet (automatisch)');
const listen = p.getByRole('button', { name: 'Anhören' });
if (await listen.count()) { await listen.first().click(); await p.waitForTimeout(2500); await dump('„Anhören“ gedrückt'); }
await p.getByRole('button', { name: 'Aufgabe vorlesen' }).first().click();
await p.waitForTimeout(4000);
await dump('„Aufgabe vorlesen“ gedrückt');
await b.close();
console.log(bad ? `✗ ${bad} Schritte ohne Sprachausgabe` : '✓ überall wird vorgelesen');
process.exit(bad);
