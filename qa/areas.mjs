// node qa/areas.mjs [url] [out] [device] – Themenliste mit Bereichs-Überschriften (Mathe Kl. 3, Deutsch Kl. 3)
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/areas';
const { p, shot, click, done } = await open({ url, out, grade: 3, device: process.argv[4] ?? 'iPhone 13' });
await click('Mathe');
await shot('mathe', true);
const heads = await p.locator('h2.section-title').allInnerTexts();
console.log('Mathe:', heads.join(' | '));
await p.getByRole('button', { name: 'Zurück' }).first().click();
await click('Deutsch');
await shot('deutsch', true);
console.log('Deutsch:', (await p.locator('h2.section-title').allInnerTexts()).join(' | '));
process.exit(await done());
