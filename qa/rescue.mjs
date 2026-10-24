// node qa/rescue.mjs [url] – Lernstand-Rettung (24.10.2026, Leanas Lernstand war weg) in WebKit:
// A) Kind fehlt, Kopie liegt in der Abgleich-Ablage (sync.removed) → Karte „gefunden“ → Zurückholen → alles wieder da
// B) Kind neu angelegt (1 Aufgabe), Kopie nur als Sicherung im großen Speicher → wird in das neue Kind zusammengeführt
import { webkit, devices } from 'playwright';
const url = process.argv[2] ?? 'http://localhost:5192/';
const b = await webkit.launch();
let bad = 0;
const check = (ok, text) => {
  console.log(`${ok ? '✓' : '✗'} ${text}`);
  if (!ok) bad++;
};
const kid = (id, name) => ({ id, name, avatar: '🦊', age: 8, grade: 3, state: 'NW', englishFrom: 3, gradesFrom: 3, gradeKey: [95, 80, 65, 50, 25], autoRead: false, sound: false, pace: 'schule', created: 1, gradeYear: 9999 });
const prog = (n, from) => ({ skills: {}, review: [], log: Array.from({ length: n }, (_, i) => ({ t: from + i * 1000, s: 'm3-plus', ok: 1, m: 'übung' })), tests: [], days: {}, stars: n, solved: n });
const T0 = Date.now() - 3 * 86400000;

async function run(name, seed) {
  const ctx = await b.newContext({ ...devices['iPad (gen 7)'], locale: 'de-DE' });
  await ctx.addInitScript(seed, { kid: kid('leana', 'Leana'), full: prog(120, T0), T0 });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(url);
  await p.waitForTimeout(2500);
  const card = p.locator('.card', { hasText: 'Lernstand von Leana gefunden' });
  if (process.env.SHOT && name.startsWith('A')) await p.screenshot({ path: process.env.SHOT });
  check(await card.count() > 0, `${name}: Karte „Lernstand von Leana gefunden“`);
  await card.getByRole('button', { name: 'Zurückholen' }).click().catch(() => {});
  await p.waitForTimeout(1500);
  const d = await p.evaluate(async () => {
    try {
      return (await import('/src/data/store.ts')).getData();
    } catch {
      return JSON.parse(localStorage.getItem('schlaufuchs:v1'));
    }
  });
  const l = d.profiles.find((x) => x.name.trim().toLowerCase() === 'leana');
  const pr = l && d.progress[l.id];
  check(!!l, `${name}: Leana ist da`);
  check(pr && pr.solved >= 120 && (name.startsWith("C") || pr.log.length >= 120), `${name}: 120 Aufgaben zurück (gelöst ${pr?.solved}, Verlauf ${pr?.log.length})`);
  check(await p.locator('text=ist wieder da').count() > 0, `${name}: Bestätigung „wieder da“`);
  await p.reload();
  await p.waitForTimeout(2500);
  check(await p.locator('.card', { hasText: 'Lernstand von Leana gefunden' }).count() === 0, `${name}: nach Neuladen keine Karte mehr (Stand gespeichert)`);
  check(!errors.length, `${name}: keine Seitenfehler ${errors.join(' | ')}`);
  await ctx.close();
  return pr;
}

await run('A Abgleich-Ablage', ({ kid, full }) => {
  if (sessionStorage.getItem('seeded')) return;
  localStorage.clear();
  const other = { ...kid, id: 'ben', name: 'Ben' };
  localStorage.setItem('schlaufuchs:v1', JSON.stringify({ schema: 1, profiles: [other], progress: { ben: { skills: {}, review: [], log: [], tests: [], days: {}, stars: 0, solved: 0 } }, activeId: 'ben', parent: { pin: null } }));
  localStorage.setItem('schlaufuchs:sync.removed.v1', JSON.stringify([{ profile: kid, progress: full, at: new Date().toISOString() }]));
  sessionStorage.setItem('seeded', '1');
});

const pr = await run('B Sicherung im großen Speicher', ({ kid, full, T0 }) => {
  if (sessionStorage.getItem('seeded')) return;
  localStorage.clear();
  const fresh = { ...kid, id: 'neu1', name: 'Leana' };
  const now = { skills: {}, review: [], log: [{ t: T0 + 2 * 86400000, s: 'm3-plus', ok: 1, m: 'übung' }], tests: [], days: {}, stars: 1, solved: 1 };
  localStorage.setItem('schlaufuchs:v1', JSON.stringify({ schema: 1, profiles: [fresh], progress: { neu1: now }, activeId: 'neu1', parent: { pin: null } }));
  localStorage.setItem('schlaufuchs:v1:at', String(Date.now()));
  sessionStorage.setItem('seeded', '1');
  const r = indexedDB.open('schlaufuchs', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('kv');
  r.onsuccess = () => {
    const tx = r.result.transaction('kv', 'readwrite');
    tx.objectStore('kv').put({ json: JSON.stringify({ schema: 1, profiles: [kid], progress: { leana: full }, activeId: 'leana', parent: { pin: null } }), at: T0 }, 'vor-wiederherstellung:1');
  };
});
check(pr && pr.log.length === 121, `B: heutige Aufgabe bleibt dazu (Verlauf ${pr?.log.length} = 120 + 1)`);

// C) Kind da, Lernstand leer, nur der letzte Abgleich-Stand (sync.base) kennt Sterne und Lernstand
const pc = await run('C letzter Abgleich-Stand', ({ kid }) => {
  if (sessionStorage.getItem('seeded')) return;
  localStorage.clear();
  localStorage.setItem('schlaufuchs:v1', JSON.stringify({ schema: 1, profiles: [kid], progress: { leana: { skills: {}, review: [], log: [], tests: [], days: {}, stars: 0, solved: 0 } }, activeId: 'leana', parent: { pin: null } }));
  localStorage.setItem('schlaufuchs:v1:at', String(Date.now()));
  localStorage.setItem('schlaufuchs:sync.base.v1', JSON.stringify({ leana: { skills: { 'm3-plus': { n: 130, ok: 120, recent: [], last: 1, tags: {} } }, review: [], solved: 120, stars: 120, days: {} } }));
  sessionStorage.setItem('seeded', '1');
}).catch(() => null);
check(pc && pc.stars === 120 && pc.skills['m3-plus']?.n === 130, `C: Sterne und Lernstand je Thema zurück (${pc?.stars} Sterne)`);
// D) Eltern-Bereich: „Lernstand suchen“ zeigt den Überblick (ohne Anmeldung: Cloud nicht erreichbar)
{
  const ctx = await b.newContext({ ...devices['iPad (gen 7)'], locale: 'de-DE' });
  await ctx.addInitScript(({ kid }) => {
    if (sessionStorage.getItem('seeded')) return;
    localStorage.clear();
    localStorage.setItem('schlaufuchs:v1', JSON.stringify({ schema: 1, profiles: [kid], progress: { leana: { skills: {}, review: [], log: [], tests: [], days: {}, stars: 3, solved: 0 } }, activeId: 'leana', parent: { pin: null } }));
    sessionStorage.setItem('seeded', '1');
  }, { kid: kid('leana', 'Leana') });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(url);
  await p.waitForTimeout(2000);
  await p.getByRole('button', { name: 'Profil und Einstellungen' }).click();
  await p.getByRole('button', { name: /Eltern-Bereich/ }).first().click();
  for (const d of '1234') await p.getByRole('button', { name: d, exact: true }).click();
  await p.waitForTimeout(300);
  for (const d of '1234') await p.getByRole('button', { name: d, exact: true }).click();
  await p.waitForTimeout(300);
  await p.locator('.parent-card').first().click();
  await p.getByRole('tab', { name: /Einstellungen/ }).click();
  await p.getByRole('button', { name: 'Lernstand suchen' }).click();
  await p.waitForTimeout(2500);
  const txt = await p.locator('body').innerText();
  check(/Jetzt: Leana – 0 Aufgaben im Verlauf, 3 Sterne/.test(txt), 'D: Überblick zeigt den Stand jetzt');
  check(/Cloud: nicht angemeldet oder offline/.test(txt), 'D: Überblick nennt die Cloud');
  if (process.env.SHOT2) await p.screenshot({ path: process.env.SHOT2, fullPage: false });
  check(!errors.length, `D: keine Seitenfehler ${errors.join(' | ')}`);
  await ctx.close();
}
await b.close();
console.log(bad ? `${bad} Fehler` : 'alles gut');
process.exit(bad ? 1 : 0);
