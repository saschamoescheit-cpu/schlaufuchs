// node qa/stats-areas.mjs [url] [out] – Lernstand → Fächer: Themen mit Bereichs-Zwischenzeilen
import { readFileSync } from 'node:fs';
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/stats-areas';
const progress = JSON.parse(readFileSync(new URL('./seed.json', import.meta.url), 'utf-8'));
const { p, shot, click, done } = await open({ url, out, grade: 3, progress });
await click('Lernstand');
await p.getByRole('tab', { name: 'Fächer' }).click();
await shot('faecher', true);
console.log((await p.locator('.area-label').allInnerTexts()).join(' | '));
process.exit(await done());
