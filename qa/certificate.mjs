// node qa/certificate.mjs [url] – Lernstand → Fächer → Urkunde (Bildschirm + Druckansicht)
import { readFileSync } from 'node:fs';
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const progress = JSON.parse(readFileSync(new URL('./seed.json', import.meta.url), 'utf-8'));
const { p, shot, click, done } = await open({ url, out: 'qa/shots/certificate', grade: 3, progress });
await click('Lernstand');
await p.getByRole('tab', { name: 'Fächer' }).click();
const btn = p.getByRole('button', { name: /Urkunde drucken/ });
let bad = 0;
if (!(await btn.count())) { bad++; console.log('✗ kein Urkunden-Knopf'); }
else {
  await btn.click();
  await p.waitForTimeout(400);
  await shot('urkunde', true);
  await p.emulateMedia({ media: 'print' });
  await shot('urkunde-druck', true);
  const n = await p.locator('.cert-list li').count();
  console.log(`✓ Urkunde mit ${n} Lernzielen`);
  if (!n) bad++;
}
process.exit((await done()) + bad);
