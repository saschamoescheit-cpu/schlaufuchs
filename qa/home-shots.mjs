// node qa/home-shots.mjs [url] – Bildschirmfotos aus der App für die Homepage (public/home/img/*.jpg)
import { readFileSync, mkdirSync } from 'node:fs';
import { open } from './lib.mjs';

const url = process.argv[2] ?? 'http://localhost:5192/';
const out = 'public/home/img';
mkdirSync(out, { recursive: true });
const progress = JSON.parse(readFileSync(new URL('./seed.json', import.meta.url), 'utf-8'));
const { p, click, done } = await open({ url, out: 'qa/shots/home-shots', grade: 3, progress, dpr: 2 });
const snap = (name) => p.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 78 });
await p.waitForTimeout(600);
await snap('start');

// Aufgabe: Mathe Klasse 3
await click('Mathe');
await p.waitForTimeout(300);
await p.locator('.topic', { hasText: process.argv[3] ?? 'Einmaleins' }).first().click();
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
