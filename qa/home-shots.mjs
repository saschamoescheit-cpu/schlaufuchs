// node qa/home-shots.mjs [url] – Bildschirmfotos aus der App für die Homepage (public/home/img/*.jpg)
import { readFileSync, mkdirSync } from 'node:fs';
import { open } from './lib.mjs';

const url = process.argv[2] ?? 'http://localhost:5192/';
const out = 'public/home/img';
mkdirSync(out, { recursive: true });
const progress = JSON.parse(readFileSync(new URL('./seed.json', import.meta.url), 'utf-8'));
// Werbefotos: nur ein paar Aufgaben in der Fehler-Kiste (56 wirken abschreckend)
progress.review = progress.review.slice(0, 3);
// Beispieldaten so verschieben, dass der letzte Lerntag gestern war (sonst zeigt die Serie 🔥 0, je nachdem wann das Skript läuft)
{
  const day = 86400000;
  const lastKey = Object.keys(progress.days).sort().pop();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(12, 0, 0, 0);
  const shift = Math.round((yesterday - new Date(`${lastKey}T12:00:00`)) / day) * day;
  const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  progress.days = Object.fromEntries(Object.entries(progress.days).map(([k, v]) => [key(new Date(new Date(`${k}T12:00:00`).getTime() + shift)), v]));
  const walk = (o) => {
    if (!o || typeof o !== 'object') return;
    for (const k of Object.keys(o)) {
      if (typeof o[k] === 'number' && o[k] > 1.7e12 && o[k] < 2e12) o[k] += shift;
      else walk(o[k]);
    }
  };
  for (const k of Object.keys(progress)) if (k !== 'days') walk(progress[k]);
}
const { p, click, done } = await open({ url, out: 'qa/shots/home-shots', grade: 3, progress, dpr: 2 });
const snap = (name) => p.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 78 });
// Nachmittags fotografieren (Begrüßung „Hallo“ statt „Guten Abend“ / „Gute Nacht“), egal wann das Skript läuft
const t = new Date();
t.setHours(16, 30, 0, 0);
await p.clock.setFixedTime(t);
await p.reload();
await p.waitForTimeout(600);
await snap('start');

// Aufgabe: Mathe Klasse 3
await click('Mathe');
await p.waitForTimeout(300);
await p.locator('.topic', { hasText: process.argv[3] ?? 'Uhrzeit' }).first().click();
await p.waitForTimeout(700);
await snap('aufgabe');

// Erklärung mit Video
await p.getByRole('button', { name: /Hilfe/ }).first().click();
await p.waitForTimeout(900);
await snap('erklaerung');

// Vokabelkarte
await p.goto(url);
await click('Englisch');
await click('Vokabeln lernen');
await p.locator('.sheet').getByRole('radio', { name: /Karteikarten/ }).click();
await p.locator('.sheet').getByRole('button', { name: /Los geht/ }).click();
await p.waitForTimeout(400);
await p.locator('.vcard').click();
await p.waitForTimeout(500);
await snap('karten');

// Eltern-Übersicht
await p.goto(url);
await p.getByRole('button', { name: 'Profil und Einstellungen' }).click();
await click('Eltern-Bereich');
for (const d of '1234') await p.getByRole('button', { name: d, exact: true }).click();
await p.waitForTimeout(250);
for (const d of '1234') await p.getByRole('button', { name: d, exact: true }).click();
await p.waitForTimeout(500);
await p.locator('.parent-card').first().click();
await p.waitForTimeout(500);
await snap('eltern');
process.exit(await done());
