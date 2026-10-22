// node qa/pause.mjs [url] [out] – heute 45 Minuten geübt → Pausen-Hinweis auf der Startseite
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/pause';
const now = Date.now();
const log = Array.from({ length: 90 }, (_, i) => ({ t: now - (90 - i) * 30000, s: 'm3-runden', ok: 1, m: 'übung' }));
const progress = { skills: {}, review: [], solved: 0, log, tests: [], stars: 90, days: {} };
const { p, shot, done } = await open({ url, out, grade: 3, progress });
await p.waitForTimeout(300);
const ok = await p.getByText(/Zeit für eine Pause/).isVisible().catch(() => false);
await shot('home');
console.log(ok ? '✓ Pausen-Hinweis' : '✗ kein Hinweis');
process.exit((await done()) + (ok ? 0 : 1));
