// node qa/wordlist.mjs [url] – Erklärung eines Englisch-Wortfelds zeigt alle Wörter (aufklappbar, antippen = anhören)
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const { p, shot, click, done } = await open({ url, out: 'qa/shots/wordlist', grade: 4 });
await click('Englisch');
await p.getByRole('button', { name: 'Erklärung zu Jobs – Berufe', exact: true }).click();
await p.waitForTimeout(300);
await p.locator('.word-list summary').click();
await p.waitForTimeout(200);
await p.locator('.word-list').scrollIntoViewIfNeeded();
await shot('liste');
const n = await p.locator('.word-item').count();
console.log(n === 14 ? '✓ 14 Wörter in der Liste' : `✗ ${n} Wörter`);
process.exit((await done()) + (n === 14 ? 0 : 1));
