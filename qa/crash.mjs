// node qa/crash.mjs [url] [out] – kaputte Daten: (1) fehlende Felder werden repariert, die Startseite läuft;
// (2) unlesbarer Speicher wird vor dem Überschreiben gesichert (schlaufuchs:v1:unlesbar:…), nichts geht verloren.
import { webkit, devices } from 'playwright';
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/crash';
let bad = 0;

// (1) Lernstand ohne Themen-Liste
{
  const progress = { skills: null, review: null, solved: 0, log: [], tests: [], stars: 0, days: {} };
  const { p, shot, done } = await open({ url, out, grade: 3, progress });
  await p.waitForTimeout(500);
  await shot('repariert');
  const ok = await p.getByText('Tagesziel').first().isVisible().catch(() => false);
  console.log(ok ? '✓ kaputter Lernstand repariert – Startseite läuft' : '✗ Startseite fehlt');
  bad += (ok ? 0 : 1) + (await done());
}

// (2) unlesbarer Speicher
{
  const b = await webkit.launch();
  const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'de-DE' });
  await ctx.addInitScript(() => {
    if (!sessionStorage.getItem('qa-seeded')) {
      localStorage.setItem('schlaufuchs:v1', '{kaputt: das ist kein JSON');
      sessionStorage.setItem('qa-seeded', '1');
    }
  });
  const p = await ctx.newPage();
  await p.goto(url);
  await p.waitForTimeout(500);
  const keys = await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('schlaufuchs:v1:unlesbar:')));
  const kept = keys.length ? await p.evaluate((k) => localStorage.getItem(k), keys[0]) : '';
  const ok = kept === '{kaputt: das ist kein JSON';
  console.log(ok ? '✓ unlesbare Daten gesichert' : '✗ nicht gesichert');
  bad += ok ? 0 : 1;
  await b.close();
}
process.exit(bad);
