// node qa/review.mjs [url] [out] – Durchsicht weiterer Bildschirme mit realistischem Lernstand
import { readFileSync } from 'node:fs';
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/review';
const progress = JSON.parse(readFileSync(new URL('./seed.json', import.meta.url), 'utf-8'));
const { p, shot, click, done } = await open({ url, out, grade: 3, progress });
await p.getByRole('button', { name: 'Profil und Einstellungen' }).click();
if (await p.getByText('Vorlese-Stimme').isVisible().catch(() => false)) await p.getByText('Vorlese-Stimme').click();
await shot('einstellungen', true);
await p.getByRole('button', { name: 'Zurück' }).first().click();
await click('Wiederholen');
await p.getByText(/Was liegt in der Fehler-Kiste/).click();
await shot('wiederholen', true);
await click('Lernen');
await click('Deutsch');
await shot('deutsch-liste', true);
await p.getByRole('button', { name: /Erklärung zu Wörter verlängern/ }).click();
await shot('erklaerung');
await p.keyboard.press('Escape');
// Runde zu Ende spielen (Auswahl: immer erste Antwort)
await p.getByRole('button', { name: /Wortarten/ }).first().click();
for (let i = 0; i < 50; i++) {
  if (await p.getByText(/Fantastisch|Super gemacht|Gut durchgehalten/).first().isVisible().catch(() => false)) break;
  if (await p.getByRole('button', { name: 'Weiter' }).first().isVisible().catch(() => false)) { await click('Weiter'); continue; }
  await p.locator('.choice').first().click();
  await p.waitForTimeout(150);
}
await shot('rundenende', true);
await click('Fertig');
// Test mit sehr kurzer Zeit: „Zeit ist um“
await click('Tests');
await p.getByRole('tab', { name: 'Probetest' }).click();
await click('Keins');
await p.getByLabel(/Runden/).check();
await click('8');
await click('Turbo');
await click('Test starten');
await p.evaluate(() => { const t = Date.now; Date.now = () => t() + 60 * 60 * 1000; });
await p.waitForTimeout(800);
await shot('zeit-um');
process.exit(await done());
