// node qa/week.mjs [url] [out] – Wochenleiste im Tagesziel (Testdaten mit geübten Tagen)
import { readFileSync } from 'node:fs';
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/week';
const progress = JSON.parse(readFileSync(new URL('./seed.json', import.meta.url), 'utf-8'));
const { p, shot, done } = await open({ url, out, grade: 3, progress });
await p.waitForTimeout(400);
await shot('home');
const n = await p.locator('.week-dots .wd').count();
console.log(n === 7 ? '✓ Wochenleiste mit 7 Tagen' : `✗ ${n} Tage`);
process.exit((await done()) + (n === 7 ? 0 : 1));
