// node qa/no-voice.mjs [url] [out] – Gerät ohne Sprachausgabe: Diktat zeigt Ausweg für Erwachsene
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/no-voice';
const { ctx, p, shot, click, done } = await open({ url, out, grade: 2 });
await ctx.addInitScript(() => {
  // Gerätestimme prüfen: Cloud-Stimme aus (sonst geht das Vorlesen zuerst über den Sprachdienst)
  localStorage.setItem('schlaufuchs:cloudvoice', '0');
  Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true });
});
await p.reload();
await click('Deutsch');
await p.locator('.topic-main', { hasText: 'Diktat' }).first().click();
await p.waitForTimeout(400);
const hint = p.getByText(/kann nicht vorlesen/);
const ok = await hint.isVisible().catch(() => false);
if (ok) await hint.click();
await shot('diktat');
console.log(ok ? '✓ Ausweg ohne Sprachausgabe sichtbar' : '✗ kein Hinweis');
process.exit((await done()) + (ok ? 0 : 1));
