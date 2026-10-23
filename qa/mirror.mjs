// node qa/mirror.mjs [url] – Zweitspeicher (IndexedDB): springt ein, wenn localStorage voll oder leer ist; nichts geht verloren
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const { ctx, p, click, done } = await open({ url, out: 'qa/shots/mirror', grade: 2 });
let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) bad++; };
await ctx.addInitScript(() => {
  const orig = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) {
    if (k.startsWith('schlaufuchs:v1') && sessionStorage.getItem('qa-full')) throw new DOMException('voll', 'QuotaExceededError');
    return orig.call(this, k, v);
  };
});
const state = () => p.evaluate(async () => {
  // dieselbe Modul-Instanz wie die App (der Entwicklungsserver hängt nach Änderungen ?t=… an)
  const url = performance.getEntriesByType('resource').map((e) => e.name).filter((n) => n.includes('/src/data/store.ts')).pop() ?? '/src/data/store.ts';
  const d = (await import(url)).getData();
  const pr = d.progress[d.activeId] ?? { log: [] };
  return { profiles: d.profiles.length, log: pr.log.length };
});
const idbKeys = () => p.evaluate(() => new Promise((res) => {
  const r = indexedDB.open('schlaufuchs', 1);
  r.onsuccess = () => { const q = r.result.transaction('kv').objectStore('kv').getAllKeys(); q.onsuccess = () => res(q.result); };
  r.onerror = () => res([]);
}));
await p.reload();
// die Kopie wird verzögert geschrieben – unter Last kann das dauern
let copied = false;
for (let i = 0; i < 25 && !copied; i++) {
  await p.waitForTimeout(200);
  copied = (await idbKeys()).includes('app');
}
check(copied, 'Kopie im Zweitspeicher angelegt');

// 1) Speicher voll: drei Antworten landen nur im Zweitspeicher
await p.evaluate(() => sessionStorage.setItem('qa-full', '1'));
await click('Mathe');
await p.getByRole('button', { name: /Einmaleins/ }).first().click();
for (let i = 0; i < 3; i++) {
  // Auswahl-Aufgabe (Punktefeld): erste Antwort antippen, sonst eine Zahl tippen
  if (await p.locator('.choice').count()) await p.locator('.choice').first().click();
  else {
    await p.keyboard.press('1');
    await p.keyboard.press('Enter');
  }
  await p.waitForTimeout(250);
  await p.getByRole('button', { name: 'Weiter' }).first().click({ timeout: 2000 }).catch(() => {});
  await p.waitForTimeout(150);
}
const before = await state();
check(before.log >= 3, `Antworten im Speicher der Seite: ${before.log}`);
await p.evaluate(() => new Promise((r) => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pagehide')); setTimeout(r, 400); }));
await p.reload();
await p.waitForTimeout(1200);
const after = await state();
check(after.log === before.log, `nach Neuladen aus dem Zweitspeicher: ${after.log} von ${before.log} Antworten`);
check((await idbKeys()).some((k) => String(k).startsWith('vor-wiederherstellung:')), 'alter Stand als Sicherung aufgehoben');

// 2) normaler Speicher geleert: Kind und Lernstand kommen zurück
await p.evaluate(() => { sessionStorage.removeItem('qa-full'); localStorage.removeItem('schlaufuchs:v1'); localStorage.removeItem('schlaufuchs:v1:at'); });
await p.reload();
await p.waitForTimeout(1200);
const back = await state();
check(back.profiles === 1 && back.log === before.log, `nach Löschen von localStorage wiederhergestellt: ${back.profiles} Kind, ${back.log} Antworten`);
check(/Mia/.test(await p.locator('body').innerText()), 'Startseite zeigt das Kind');
check(await p.evaluate(() => !!localStorage.getItem('schlaufuchs:v1')), 'normaler Speicher wieder befüllt');
process.exit((await done()) + bad);
