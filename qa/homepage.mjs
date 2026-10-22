// node qa/homepage.mjs [base] – Homepage, Datenschutz, Impressum: Darstellung (Handy + PC), Links, Sprungmarken in die App
import { webkit, devices } from 'playwright';
import { mkdirSync } from 'node:fs';
const base = process.argv[2] ?? 'http://localhost:5193/';
const out = 'qa/shots/homepage';
mkdirSync(out, { recursive: true });
let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) bad++; };
const b = await webkit.launch();
for (const [name, opts] of [['handy', devices['iPhone SE']], ['pc', { viewport: { width: 1280, height: 860 } }]]) {
  const ctx = await b.newContext({ ...opts, locale: 'de-DE' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  for (const page of ['home/', 'datenschutz/', 'impressum/']) {
    const r = await p.goto(base + page);
    check(r.ok(), `${name}: ${page} lädt (${r.status()})`);
    await p.waitForLoadState('networkidle');
    const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(over <= 0, `${name}: ${page} ohne waagerechtes Scrollen (${over})`);
    const fonts = await p.evaluate(() => getComputedStyle(document.querySelector('h1')).fontFamily);
    check(/Fredoka/.test(fonts), `${name}: ${page} Überschrift in Fredoka`);
    await p.screenshot({ path: `${out}/${name}-${page.replace('/', '')}.png`, fullPage: true });
  }
  // Bilder geladen?
  await p.goto(base + 'home/');
  await p.evaluate(() => Promise.all([...document.images].map((i) => (i.loading = 'eager', i.decode().catch(() => null)))));
  const broken = await p.evaluate(() => [...document.images].filter((i) => !i.naturalWidth).map((i) => i.src));
  check(broken.length === 0, `${name}: alle Bilder geladen ${broken.join(' ')}`);
  // Links
  const links = await p.evaluate(() => [...document.querySelectorAll('a')].map((a) => a.href));
  for (const l of [...new Set(links)].filter((l) => l.startsWith(base))) {
    const r = await ctx.request.get(l.split('#')[0]);
    check(r.ok(), `${name}: Link ${l.replace(base, '/')} (${r.status()})`);
  }
  check(errs.length === 0, `${name}: keine Seitenfehler ${errs.join(' | ')}`);
  await ctx.close();
}
// Sprungmarken in die App (mit Testkind)
const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'de-DE' });
await ctx.addInitScript(() => {
  if (sessionStorage.getItem('seeded')) return;
  const id = 'k1';
  localStorage.setItem('schlaufuchs:v1', JSON.stringify({ schema: 1, profiles: [{ id, name: 'Mia', avatar: '🦊', age: 8, grade: 3, state: 'NW', englishFrom: 3, gradesFrom: 3, gradeKey: [95, 80, 65, 50, 25], autoRead: false, sound: false, pace: 'schule', created: 1, gradeYear: 9999 }], progress: {}, activeId: id, parent: { pin: null } }));
  sessionStorage.setItem('seeded', '1');
});
const p = await ctx.newPage();
await p.goto(base + '#eltern');
await p.waitForTimeout(800);
check(/PIN/.test(await p.locator('body').innerText()), '#eltern öffnet den Eltern-Bereich (PIN)');
check(!p.url().includes('#'), 'Sprungmarke aus der Adresse entfernt');
await p.goto('about:blank');
await p.goto(base + '#anmelden');
await p.waitForTimeout(800);
const t = await p.locator('body').innerText();
check(/Einstellungen|Konto|Anmelden/.test(t), '#anmelden öffnet die Einstellungen mit Konto');
await p.screenshot({ path: `${out}/app-anmelden.png` });
await b.close();
process.exit(bad);
