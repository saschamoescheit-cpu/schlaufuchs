// node qa/visuals.mjs <json-liste-von-visuals> [out.png] [breite] – Bilder (Visual) direkt rendern, ohne Aufgabe
import { webkit, devices } from 'playwright';
const list = JSON.parse(process.argv[2]);
const out = process.argv[3] ?? 'qa/shots/visuals.png';
const width = Number(process.argv[4] ?? 375);
const b = await webkit.launch();
const p = await b.newPage({ viewport: { width, height: 800 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:5192/');
await p.evaluate(async (list) => {
  const React = (await import('/node_modules/.vite/deps/react.js')).default;
  const rdc = await import('/node_modules/.vite/deps/react-dom_client.js');
  const createRoot = rdc.createRoot ?? rdc.default.createRoot;
  const { Visual } = await import('/src/ui/Visual.tsx');
  document.body.innerHTML = '<div id="vroot" style="padding:16px;display:flex;flex-direction:column;gap:12px"></div>';
  createRoot(document.getElementById('vroot')).render(list.map((v, i) => React.createElement('div', { key: i, className: 'visual-box' }, React.createElement(Visual, { v }))));
}, list);
await p.waitForTimeout(500);
await p.screenshot({ path: out, fullPage: true });
await b.close();
