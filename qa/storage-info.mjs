// node qa/storage-info.mjs – Eltern-Bereich → Einstellungen: Anzeige des belegten Gerätespeichers
import { readFileSync } from 'node:fs';
import { open } from './lib.mjs';
const progress = JSON.parse(readFileSync(new URL('./seed.json', import.meta.url), 'utf-8'));
const { p, shot, click, done } = await open({ url: 'http://localhost:5192/', out: 'qa/shots/einst', grade: 3, progress });
await p.getByRole('button', { name: 'Profil und Einstellungen' }).click();
await click('Eltern-Bereich');
for (const d of '1234') await p.getByRole('button', { name: d, exact: true }).click();
for (const d of '1234') await p.getByRole('button', { name: d, exact: true }).click();
await p.locator('.parent-card').first().click();
await p.getByRole('tab', { name: /Einstellungen/ }).click();
await p.getByText('Speicher auf diesem Gerät').scrollIntoViewIfNeeded();
await shot('speicher');
console.log(await p.getByText(/von ca. 5 MB/).innerText());
process.exit(await done());
