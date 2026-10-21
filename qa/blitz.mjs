// node qa/blitz.mjs [url] [out] – Blitzrunde Einmaleins: Auswahl, Countdown, rechnen (richtig + falsch), Ende mit Rekord, Rekord im Profil.
import { open } from './lib.mjs';

const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/blitz';
const { p, shot, click, done, errs } = await open({ url, out, grade: 2 });
await click('Mathe');
await shot('fach');
await click('Blitzrunde');
await shot('auswahl');
await p.locator('.sheet').getByRole('button', { name: /Einmaleins/ }).first().click();
await p.waitForTimeout(300);
await shot('countdown');
await p.locator('.timebar').waitFor({ timeout: 5000 });
let solved = 0;
let wrongDone = false;
const until = Date.now() + 15000;
while (Date.now() < until) {
  const prompt = await p.locator('.blitz-task .prompt').innerText().catch(() => '');
  const m = prompt.match(/(\d+)\s*·\s*(\d+)/);
  if (!m) {
    await p.waitForTimeout(100);
    continue;
  }
  const want = String(Number(m[1]) * Number(m[2]));
  const typed = !wrongDone && solved === 3 ? (want === '1' ? '2' : '1'.repeat(want.length)) : want;
  for (const ch of typed) await p.keyboard.press(ch);
  if (typed !== want) {
    wrongDone = true;
    await shot('falsch');
  } else solved++;
  if (solved === 2) await shot('laeuft');
  await p.waitForTimeout(typed === want ? 320 : 1000);
}
console.log('richtig gelöst:', solved);
await p.locator('text=Zeit ist um!').or(p.locator('text=Neuer Rekord!')).waitFor({ timeout: 60000 });
await shot('ende');
const score = await p.locator('.tile b').first().innerText();
console.log('Ergebnis:', score);
await click('Fertig');
await click('Blitzrunde');
const rec = await p.locator('.sheet').getByText(/Rekord: \d+/).first().innerText().catch(() => '');
console.log('Rekord in Auswahl:', rec);
await shot('auswahl-rekord');
const ok = solved >= 5 && score.includes(String(solved)) && rec.includes(String(solved));
console.log(ok ? '✓ Blitzrunde ok' : '✗ Blitzrunde fehlerhaft');
process.exit((await done()) + (ok ? 0 : 1));
