// node qa/parent.mjs [url] [out] – Eltern-Bereich: PIN festlegen, Übersicht, Kind im Detail, Kind-Profil eingeschränkt.
import { readFileSync } from 'node:fs';
import { open } from './lib.mjs';

const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/parent';
const progress = JSON.parse(readFileSync(new URL('./seed.json', import.meta.url), 'utf-8'));
const { p, shot, click, done } = await open({ url, out, grade: 3, progress });

await p.getByRole('button', { name: 'Profil und Einstellungen' }).click();
await click('Eltern-Bereich');
await shot('pin-neu');
for (const d of '1234') await p.getByRole('button', { name: d, exact: true }).click();
await p.waitForTimeout(250);
for (const d of '1234') await p.getByRole('button', { name: d, exact: true }).click();
await p.waitForTimeout(400);
await shot('uebersicht', true);
await p.locator('.parent-card').first().click();
await shot('kind', true);
await p.getByRole('button', { name: 'Zurück' }).first().click();
await click('Sperren');
await p.waitForTimeout(300);
// Kind-Profil: Klasse nicht mehr änderbar
await click('Ändern');
await shot('kind-profil', true);
await p.getByRole('button', { name: 'Zurück' }).first().click();
await click('Eltern-Bereich');
await shot('pin-eingabe');
for (const d of '9999') await p.getByRole('button', { name: d, exact: true }).click();
await p.waitForTimeout(400);
await shot('pin-falsch');
for (const d of '1234') await p.getByRole('button', { name: d, exact: true }).click();
await p.waitForTimeout(400);
const ok = await p.getByText('Lernzeit (7 Tage)').first().isVisible();
console.log(ok ? '✓ PIN entsperrt' : '✗ PIN entsperrt nicht');
process.exit((await done()) + (ok ? 0 : 1));
