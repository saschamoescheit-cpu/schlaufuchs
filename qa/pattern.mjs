// node qa/pattern.mjs [url] [out] – Wiederholen → Fehlermuster → „Üben“ startet eine gezielte Runde zu diesem Muster.
import { readFileSync } from 'node:fs';
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/pattern';
const progress = JSON.parse(readFileSync(new URL('./seed.json', import.meta.url), 'utf-8'));
const { p, shot, click, done } = await open({ url, out, grade: 3, progress });
await click('Wiederholen');
await p.getByRole('tab', { name: 'Fehlermuster' }).click();
await shot('muster', true);
const label = await p.locator('.list-row b').first().innerText().catch(() => '');
console.log('erstes Muster:', label);
await p.locator('.list-row').first().getByRole('button', { name: 'Üben' }).click();
await p.waitForTimeout(500);
await shot('runde');
// „d oder t am Ende“ → die Runde besteht aus d/t-Aufgaben
const opts = (await p.locator('.choice').allInnerTexts()).map((x) => x.trim()).sort().join(',');
console.log('Antworten:', opts);
const ok = label.startsWith('d oder t') ? opts === 'd,t' : opts.length > 0;
console.log(ok ? '✓ gezielte Runde gestartet' : '✗ Titel fehlt');
process.exit((await done()) + (ok ? 0 : 1));
