// node qa/ipad-new.mjs [url] – neue Bildschirme auf dem iPad (quer): Vokabel-Auswahl, Karteikarte, Strichliste
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const { p, shot, click, done } = await open({ url, out: 'qa/shots/ipad-new', grade: 4, device: 'iPad Pro 11 landscape' });
await click('Englisch');
await click('Vokabeln lernen');
await p.locator('.sheet').getByRole('radio', { name: /Karteikarten/ }).click();
await shot('auswahl');
await p.locator('.sheet').getByRole('button', { name: /Los geht/ }).click();
await p.waitForTimeout(300);
await p.locator('.vcard').click();
await p.waitForTimeout(400);
await shot('karte');
const over = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
console.log(over <= 0 ? '✓ kein waagerechtes Scrollen' : `✗ Überlauf ${over}px`);
process.exit((await done()) + (over > 0 ? 1 : 0));
