// node qa/sayit.mjs [url] [out] – „Sprich nach“ mit simulierter Spracherkennung: erst falsch verstanden, dann richtig.
// Ohne Eltern-Erlaubnis (micPractice) darf der Knopf nicht erscheinen.
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/sayit';
let bad = 0;
for (const allowed of [false, true]) {
  const { ctx, p, shot, click, done } = await open({ url, out: `${out}-${allowed ? 'an' : 'aus'}`, grade: 3, profile: { micPractice: allowed } });
  await ctx.addInitScript(() => {
    window.__say = 'banana';
    window.webkitSpeechRecognition = class {
      start() {
        setTimeout(() => {
          this.onresult?.({ results: [[{ transcript: window.__say }]] });
          this.onend?.();
        }, 150);
      }
      abort() {}
    };
  });
  await p.reload();
  await click('Englisch');
  await p.getByRole('button', { name: /Animals/ }).first().click();
  await p.waitForTimeout(400);
  await p.locator('.choice').first().click();
  await p.waitForTimeout(400);
  // Zufallsaufgabe ohne fettes Zielwort in der Rückmeldung (z. B. Bildauswahl): weiterblättern
  for (let k = 0; k < 6 && allowed && !(await p.evaluate(() => [...document.querySelectorAll('.feedback span b')].some((b) => /^[a-z ]+$/i.test(b.textContent ?? '')))); k++) {
    await p.getByRole('button', { name: 'Weiter' }).click().catch(() => {});
    await p.waitForTimeout(400);
    await p.locator('.choice').first().click().catch(() => {});
    await p.waitForTimeout(400);
  }
  const btn = p.getByRole('button', { name: /Sprich nach/ }).first();
  const visible = await btn.isVisible().catch(() => false);
  if (!allowed) {
    console.log(visible ? '✗ Knopf ohne Erlaubnis sichtbar' : '✓ ohne Erlaubnis kein Mikrofon-Knopf');
    bad += (visible ? 1 : 0) + (await done());
    continue;
  }
  if (!visible) {
    console.log('✗ Sprich-nach-Knopf fehlt');
    bad += 1 + (await done());
    continue;
  }
  await btn.click();
  await p.waitForTimeout(400);
  const wrongMsg = await p.getByText(/versuch es noch einmal/).first().isVisible().catch(() => false);
  await shot('nochmal', true);
  const target = await p.locator('.feedback b').last().innerText().catch(() => '');
  const word = await p.evaluate(() => [...document.querySelectorAll('.feedback span b')].map((b) => b.textContent).find(Boolean));
  await p.evaluate((w) => (window.__say = w), word ?? target);
  await btn.click();
  await p.waitForTimeout(400);
  const okMsg = await p.getByText(/Super ausgesprochen/).first().isVisible().catch(() => false);
  await shot('richtig', true);
  console.log(`Zielwort: ${word} · falsch erkannt: ${wrongMsg ? '✓' : '✗'} · richtig erkannt: ${okMsg ? '✓' : '✗'}`);
  bad += (wrongMsg && okMsg ? 0 : 1) + (await done());
}
process.exit(bad);
