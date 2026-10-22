// node qa/monkey-vocab.mjs [url] [runden] – wildes Tippen im Vokabeltrainer (Auswahl, Karten, Diktat, Wortliste): keine Abstürze
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const rounds = Number(process.argv[3] ?? 250);
const { p, click, done } = await open({ url, out: 'qa/shots/monkey-vocab', grade: 4 });
let seed = 7;
const rnd = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
await click('Englisch');
for (let i = 0; i < rounds; i++) {
  if (i % 60 === 0) {
    await p.goto(url);
    await click('Englisch').catch(() => {});
    await click('Vokabeln lernen').catch(() => {});
  }
  const els = await p.locator('button:visible, label:visible, summary:visible, input:visible').all();
  if (!els.length) { await p.goBack().catch(() => {}); continue; }
  const el = els[rnd(els.length)];
  const tag = await el.evaluate((e) => e.tagName).catch(() => '');
  if (tag === 'INPUT' && (await el.getAttribute('type').catch(() => '')) !== 'checkbox') {
    await el.fill(['dog', 'cat', 'twelve', 'x', ''][rnd(5)]).catch(() => {});
    await p.keyboard.press('Enter').catch(() => {});
  } else {
    await el.click({ timeout: 800, force: true }).catch(() => {});
  }
  if (rnd(10) === 0) await p.keyboard.press([' ', 'Enter', 'ArrowRight', 'ArrowLeft', 'Escape'][rnd(5)]).catch(() => {});
  await p.waitForTimeout(40);
}
const crashed = await p.getByText(/Hoppla!|etwas schiefgelaufen/).count();
console.log(crashed ? '✗ Fehlerseite erschienen' : `✓ ${rounds} wilde Klicks ohne Absturz`);
process.exit((await done()) + (crashed ? 1 : 0));
