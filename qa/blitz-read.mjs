// node qa/blitz-read.mjs [url] [out] – Blitzrunde Klasse 1 mit „Aufgaben vorlesen“: Lautsprecher sichtbar, Vorlesen startet.
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/blitz-read';
const { ctx, p, shot, click, done } = await open({ url, out, grade: 1, profile: { autoRead: true } });
await ctx.addInitScript(() => {
  // Sprachausgabe-Attrappe (WebKit unter Playwright hat keine): merkt sich, was vorgelesen würde
  // Gerätestimme prüfen: Cloud-Stimme aus (sonst geht das Vorlesen zuerst über den Sprachdienst)
  localStorage.setItem('schlaufuchs:cloudvoice', '0');
  window.__spoken = [];
  if (!window.SpeechSynthesisUtterance) window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  const fake = { speak: (u) => window.__spoken.push(u.text), cancel: () => {}, getVoices: () => [], addEventListener: () => {}, removeEventListener: () => {}, speaking: false };
  Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
});
await p.reload();
await click('Mathe');
await click('Blitzrunde');
await p.locator('.sheet').getByRole('button', { name: /Links, rechts/ }).first().click();
await p.locator('.timebar').waitFor({ timeout: 6000 });
await p.waitForTimeout(600);
await shot('lage');
const spoken = await p.evaluate(() => window.__spoken);
const btn = await p.getByRole('button', { name: 'Aufgabe vorlesen' }).count();
console.log('vorgelesen:', spoken.slice(0, 3), '· Knopf:', btn);
const ok = spoken.some((t) => /liegt/.test(t)) && btn === 1;
console.log(ok ? '✓ Vorlesen in der Blitzrunde' : '✗ Vorlesen fehlt');
process.exit((await done()) + (ok ? 0 : 1));
