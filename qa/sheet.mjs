// node qa/sheet.mjs <out.png> <cols> <bild1.png> <bild2.png> … – mehrere Bildschirmfotos verkleinert auf ein Übersichtsbild
import { webkit } from 'playwright';
import { readFileSync } from 'node:fs';
const [, , out, cols = '3', ...files] = process.argv;
const w = 380;
const b = await webkit.launch();
const p = await b.newPage({ viewport: { width: w * Number(cols) + 10 * (Number(cols) + 1), height: 800 } });
const cells = files
  .map((f) => `<figure style="margin:0"><img src="data:image/png;base64,${readFileSync(f).toString('base64')}" style="width:${w}px;display:block;border:1px solid #ccc"><figcaption style="font:12px sans-serif">${f.split(/[\\/]/).pop()}</figcaption></figure>`)
  .join('');
await p.setContent(`<body style="margin:0;padding:10px;display:grid;grid-template-columns:repeat(${cols},${w}px);gap:10px;align-items:start">${cells}</body>`);
await p.waitForTimeout(300);
await p.screenshot({ path: out, fullPage: true });
await b.close();
