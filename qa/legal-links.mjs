// node qa/legal-links.mjs [url] – Einstellungen verlinken Datenschutz und Impressum (Seiten erreichbar)
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5193/';
const { ctx, p, done } = await open({ url, out: 'qa/shots/legal', grade: 3 });
await p.getByRole('button', { name: 'Profil und Einstellungen' }).click();
await p.waitForTimeout(300);
let bad = 0;
for (const name of ['Datenschutz', 'Impressum']) {
  const href = await p.getByRole('link', { name }).getAttribute('href');
  const r = await ctx.request.get(new URL(href, p.url()).href);
  const ok = r.ok() && (await r.text()).includes(`<h1>${name}</h1>`);
  console.log(ok ? `✓ ${name}: ${href}` : `✗ ${name}: ${href} (${r.status()})`);
  if (!ok) bad++;
}
process.exit((await done()) + bad);
