// node qa/render-svg.mjs <in.svg> <out.png> <size> [bg] – rendert ein SVG als PNG (Logo, App-Icons)
import { webkit } from 'playwright';
import { readFileSync } from 'node:fs';
const [, , inp, out, size = '512', bg = 'transparent', pad = '0'] = process.argv;
const svg = readFileSync(inp, 'utf-8');
const s = Number(size), p = Number(pad);
const b = await webkit.launch();
const pg = await b.newPage({ viewport: { width: s, height: s } });
await pg.setContent(`<html><body style="margin:0;background:${bg};width:${s}px;height:${s}px;display:flex;align-items:center;justify-content:center">
<div style="width:${s - 2 * p}px;height:${s - 2 * p}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body></html>`);
await pg.screenshot({ path: out, omitBackground: bg === 'transparent' });
await b.close();
