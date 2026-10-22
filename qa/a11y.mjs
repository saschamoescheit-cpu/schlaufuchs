// node qa/a11y.mjs [url] – Barrierefreiheit mit axe-core auf den wichtigsten Bildschirmen (WCAG 2.1 A/AA)
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { open } from './lib.mjs';
const require = createRequire(import.meta.url);
const axe = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const url = process.argv[2] ?? 'http://localhost:5192/';
const progress = JSON.parse(readFileSync(new URL('./seed.json', import.meta.url), 'utf-8'));
const { p, click, done } = await open({ url, out: 'qa/shots/a11y', grade: 3, progress });
const all = new Map();
async function scan(name) {
  await p.waitForTimeout(500);
  await p.evaluate(axe);
  const res = await p.evaluate(() => window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'], resultTypes: ['violations'] }));
  for (const v of res.violations) {
    const k = v.id;
    const e = all.get(k) ?? { impact: v.impact, help: v.help, where: new Set(), nodes: [] };
    e.where.add(name);
    for (const n of v.nodes.slice(0, 3)) if (e.nodes.length < 6) e.nodes.push(`${name}: ${n.target.join(' ')} ${n.failureSummary?.split('\n')[1] ?? ''}`.slice(0, 220));
    all.set(k, e);
  }
  console.log(`${name}: ${res.violations.length} Regelverstöße`);
}
await scan('start');
await click('Mathe');
await scan('fach');
await p.locator('.topic').nth(2).click();
await scan('aufgabe');
await p.getByRole('button', { name: /Hilfe/ }).first().click();
await scan('erklaerung');
await p.goto(url);
await click('Englisch');
await click('Vokabeln lernen');
await scan('vokabel-auswahl');
await p.locator('.sheet').getByRole('radio', { name: /Karteikarten/ }).click();
await p.locator('.sheet').getByRole('button', { name: /Los geht/ }).click();
await scan('karte');
await p.goto(url);
await click('Tests');
await scan('tests');
await click('Lernstand');
await scan('lernstand');
await click('Wiederholen');
await scan('wiederholen');
await p.goto(url);
await p.getByRole('button', { name: 'Profil und Einstellungen' }).click();
await scan('einstellungen');
console.log('\n=== Regeln ===');
for (const [k, e] of [...all].sort((a, b) => ['critical', 'serious', 'moderate', 'minor'].indexOf(a[1].impact) - ['critical', 'serious', 'moderate', 'minor'].indexOf(b[1].impact))) {
  console.log(`[${e.impact}] ${k} – ${e.help} (${[...e.where].join(', ')})`);
  for (const n of e.nodes) console.log('    ' + n);
}
process.exit(await done());
