// node qa/homepage-top.mjs [base] – Homepage auf dem Handy: erster Bildschirm und Datenschutz (Ansicht)
import { webkit, devices } from 'playwright';
const base = process.argv[2] ?? 'http://localhost:5193/';
const b = await webkit.launch();
const p = await (await b.newContext({ ...devices['iPhone SE'], locale: 'de-DE' })).newPage();
await p.goto(base + 'home/');
await p.waitForLoadState('networkidle');
await p.screenshot({ path: 'qa/shots/homepage/handy-top.png' });
await p.goto(base + 'datenschutz/');
await p.waitForLoadState('networkidle');
await p.screenshot({ path: 'qa/shots/homepage/handy-datenschutz-top.png' });
await b.close();
