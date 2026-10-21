// node qa/storage-full.mjs [url] [out] – Gerätespeicher voll: Hinweis erscheint, App läuft weiter.
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/storage-full';
const { ctx, p, shot, click, done } = await open({ url, out, grade: 2 });
await ctx.addInitScript(() => {
  const orig = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) {
    if (k === 'schlaufuchs:v1' && sessionStorage.getItem('qa-full')) throw new DOMException('voll', 'QuotaExceededError');
    return orig.call(this, k, v);
  };
});
await p.reload();
await p.evaluate(() => sessionStorage.setItem('qa-full', '1'));
await click('Mathe');
await p.getByRole('button', { name: /Einmaleins/ }).first().click();
await p.keyboard.press('1');
await p.keyboard.press('Enter');
await p.waitForTimeout(300);
await click('Weiter');
await p.getByRole('button', { name: 'Übung beenden' }).click();
const y = p.getByRole('button', { name: 'Ja, beenden' });
if (await y.isVisible({ timeout: 800 }).catch(() => false)) await y.click();
await p.waitForTimeout(300);
const warn = await p.locator('.save-warn').isVisible().catch(() => false);
await shot('warnung');
console.log(warn ? '✓ Hinweis „Speicher voll“ sichtbar' : '✗ kein Hinweis');
process.exit((await done()) + (warn ? 0 : 1));
