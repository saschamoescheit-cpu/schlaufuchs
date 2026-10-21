// node qa/crop.mjs <in.png> <out.png> <y> <höhe> – Ausschnitt eines langen Bildschirmfotos
import { webkit } from 'playwright';
import { readFileSync } from 'node:fs';
const [, , inp, out, y = '0', h = '1600'] = process.argv;
const b = await webkit.launch();
const p = await b.newPage({ viewport: { width: 1170, height: Number(h) } });
await p.setContent(`<body style="margin:0"><img src="data:image/png;base64,${readFileSync(inp).toString('base64')}" style="display:block;margin-top:-${y}px"></body>`);
await p.waitForTimeout(200);
await p.screenshot({ path: out });
await b.close();
