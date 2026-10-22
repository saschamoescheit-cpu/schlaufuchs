// node qa/a11y-site.mjs [base] – Barrierefreiheit (axe-core) auf Homepage, Datenschutz und Impressum
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { webkit, devices } from 'playwright';
const require = createRequire(import.meta.url);
const axe = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const base = process.argv[2] ?? 'http://localhost:5193/';
const b = await webkit.launch();
const p = await (await b.newContext({ ...devices['iPhone 13'], locale: 'de-DE' })).newPage();
let bad = 0;
for (const page of ['home/', 'datenschutz/', 'impressum/']) {
  await p.goto(base + page);
  await p.waitForLoadState('networkidle');
  await p.evaluate(axe);
  const res = await p.evaluate(() => window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'], resultTypes: ['violations'] }));
  for (const v of res.violations) {
    bad++;
    console.log(`✗ ${page} [${v.impact}] ${v.id} – ${v.help}`);
    for (const n of v.nodes.slice(0, 3)) console.log('    ' + n.target.join(' ') + ' ' + (n.failureSummary?.split('\n')[1] ?? '').slice(0, 160));
  }
  if (!res.violations.length) console.log(`✓ ${page} ohne Befund`);
}
await b.close();
process.exit(bad);
