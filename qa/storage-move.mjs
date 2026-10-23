// node qa/storage-move.mjs [url] – Umzug in den großen Speicher (IndexedDB, Nachtlauf 23.10.2026) in WebKit:
// ein Kind mit sehr viel Verlauf (über 1 Mio. Zeichen) übt → der Lernstand zieht um, localStorage behält nur den
// Verweis; nach Neuladen ist alles da (ohne leeren Zwischenstand), weiteres Üben landet in IndexedDB; die
// Eltern-Einstellungen sagen „großer Speicher“.
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const t0 = Date.parse('2026-01-05T15:00:00Z');
// drei fleißige Kinder mit vollem Verlauf (je 6000 Antworten – so viel hält die App je Kind) und Vokabeln
const skills = ['m2-plus100', 'm2-einmaleins', 'd2-nomen', 'e2-weather', 'e1-colours', 'm2-geld'];
const logOf = (seed) => Array.from({ length: 6000 }, (_, i) => ({ t: t0 + i * 2400e3 + seed, s: skills[(i + seed) % 6], ok: (i + seed) % 5 ? 1 : 0, m: i % 9 ? 'übung' : 'karten', tag: `tag-${i % 13}`, ...(i % 9 ? {} : { w: `word${i % 120}` }) }));
const prog = (seed) => ({ skills: {}, review: [], solved: 6000, log: logOf(seed), tests: [], stars: 120, days: {} });
const ben = { id: 'testkind2', name: 'Ben', avatar: '🐻', age: 9, grade: 3, state: 'NW', englishFrom: 3, gradesFrom: 3, gradeKey: [95, 80, 65, 50, 25], autoRead: false, sound: false, pace: 'schule', created: 2, gradeYear: 9999 };
const progress = prog(0);
const { p, shot, click, done } = await open({ url, out: 'qa/shots/storage-move', grade: 2, progress, data: {} });
const lea = { ...ben, id: 'testkind3', name: 'Lea', avatar: '🐰', created: 3 };
// Ben und Lea dazulegen (vor dem ersten Start, wie Geschwister aus dem Abgleich)
await p.evaluate((kids) => {
  const d = JSON.parse(localStorage.getItem('schlaufuchs:v1'));
  for (const [k, pr] of kids) {
    d.profiles.push(k);
    d.progress[k.id] = pr;
  }
  localStorage.setItem('schlaufuchs:v1', JSON.stringify(d));
  // Zeitstempel mitsetzen – sonst gilt beim Start (richtig) die neuere Kopie im Zweitspeicher
  localStorage.setItem('schlaufuchs:v1:at', String(Date.now() + 5000));
}, [[ben, prog(7)], [lea, prog(3)]]);
await p.reload();
await p.waitForTimeout(800);
let bad = 0;
const check = (ok, msg) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) bad++;
};
const idb = () =>
  p.evaluate(
    () =>
      new Promise((res) => {
        const r = indexedDB.open('schlaufuchs', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => {
          const q = r.result.transaction('kv').objectStore('kv').get('app');
          q.onsuccess = () => {
            const v = q.result;
            if (!v) return res(null);
            const d = JSON.parse(v.json);
            res({ size: v.json.length, log: d.progress[d.activeId]?.log.length ?? 0, ben: d.progress.testkind2?.log.length ?? 0, kids: d.profiles.length });
          };
        };
        r.onerror = () => res(null);
      }),
  );
const local = () => p.evaluate(() => JSON.parse(localStorage.getItem('schlaufuchs:v1') ?? 'null'));
const answer = async () => {
  await click('Mathe');
  await p.getByRole('button', { name: /Einmaleins/ }).first().click();
  if (await p.locator('.choice').count()) await p.locator('.choice').first().click();
  else {
    await p.keyboard.press('1');
    await p.keyboard.press('Enter');
  }
  await p.waitForTimeout(300);
  await p.getByRole('button', { name: 'Weiter' }).first().click({ timeout: 2000 }).catch(() => {});
  await p.getByRole('button', { name: 'Übung beenden' }).click();
  const y = p.getByRole('button', { name: 'Ja, beenden' });
  if (await y.isVisible({ timeout: 800 }).catch(() => false)) await y.click();
  await p.waitForTimeout(300);
};

const pre = await local();
check(pre?.progress?.testkind1?.log?.length === 6000 && pre?.progress?.testkind3?.log?.length === 6000, 'vorher: drei Kinder mit je 6000 Antworten in localStorage');
const preSize = JSON.stringify(pre).length;
console.log(`  Größe vorher: ${Math.round(preSize / 1000)} Tsd. Zeichen`);
await answer();
let moved = null;
for (let i = 0; i < 30 && !moved?.moved; i++) {
  await p.waitForTimeout(200);
  moved = await local();
}
check(moved?.moved === 'indexeddb', 'nach dem Üben: localStorage hält nur den Verweis');
const after = await idb();
check(after?.log === 6000 && after?.ben === 6000 && after.kids === 3 && after.size > 1_000_000, `im großen Speicher: Mia ${after?.log}, Ben ${after?.ben} Antworten, ${Math.round((after?.size ?? 0) / 1000)} Tsd. Zeichen`);
const lsSize = await p.evaluate(() => Object.keys(localStorage).reduce((n, k) => n + k.length + (localStorage.getItem(k)?.length ?? 0), 0));
check(lsSize < 20_000, `localStorage wieder fast leer (${lsSize} Zeichen) – Platz für Anmeldung und Abgleich`);

// Neuladen: nie leer, gleich das Kind
const seenEmpty = [];
p.on('framenavigated', () => {});
await p.reload();
for (let i = 0; i < 10; i++) {
  const txt = await p.locator('body').innerText().catch(() => '');
  if (/Wer lernt heute|Neues Kind|Los geht/.test(txt) && !/Mia/.test(txt)) seenEmpty.push(i);
  await p.waitForTimeout(100);
}
check(seenEmpty.length === 0, 'nach Neuladen: kein leerer Start (kein „neues Kind anlegen“)');
check(/Mia/.test(await p.locator('body').innerText()), 'Startseite zeigt Mia');
await shot('start-nach-umzug');

// weiter üben: landet im großen Speicher
await answer();
await p.waitForTimeout(1200);
const later = await idb();
const lastT = await p.evaluate(() => new Promise((res) => { const r = indexedDB.open('schlaufuchs', 1); r.onsuccess = () => { const q = r.result.transaction('kv').objectStore('kv').get('app'); q.onsuccess = () => { const d = JSON.parse(q.result.json); res(d.progress.testkind1.log.at(-1).t); }; }; }));
check(later?.log === 6000 && Date.now() - lastT < 120e3, `weiter geübt: neueste Antwort im großen Speicher (vor ${Math.round((Date.now() - lastT) / 1000)} s)`);
const lsNow = await local();
check(lsNow?.moved === 'indexeddb', `localStorage bleibt beim Verweis${lsNow?.moved ? '' : ` (stattdessen: ${lsNow ? Object.keys(lsNow).join(',') + ', ' + JSON.stringify(lsNow).length + ' Zeichen' : 'leer'})`}`);

// Eltern-Einstellungen
await p.goto(url);
await p.waitForTimeout(1500);
await p.getByRole('button', { name: 'Profil und Einstellungen' }).click();
await click('Eltern-Bereich');
for (const d of '1234') await p.getByRole('button', { name: d, exact: true }).click();
await p.waitForTimeout(300);
for (const d of '1234') await p.getByRole('button', { name: d, exact: true }).click();
await p.waitForTimeout(300);
await p.locator('.parent-card').first().click();
await p.getByRole('tab', { name: /Einstellungen/ }).click();
const info = p.getByText('großen Speicher des Browsers');
await info.scrollIntoViewIfNeeded().catch(() => {});
check(await info.isVisible().catch(() => false), 'Eltern-Einstellungen: „Liegt im großen Speicher des Browsers“');
await shot('speicher');
process.exit((await done()) + bad);
