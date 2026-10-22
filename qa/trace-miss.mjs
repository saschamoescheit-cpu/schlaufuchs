// node qa/trace-miss.mjs [Zeichen] – zeigt rot, was die Vorführungs-Striche vom Buchstaben nicht abdecken (Bild: qa/shots/miss.png)
import { webkit } from 'playwright';
const letters = process.argv[2] ?? 'JjI';
const b = await webkit.launch();
const p = await b.newPage({ viewport: { width: 1000, height: 400 } });
await p.goto('http://localhost:5192/');
await p.evaluate(async (letters) => {
  await document.fonts.load('400 220px Andika', letters);
  const { demoStrokes } = await import('/src/ui/Trace.tsx');
  document.body.innerHTML = '<div id="w" style="display:flex;gap:6px;background:#fff"></div>';
  for (const L of letters) {
    const c = document.createElement('canvas'); c.width = 300; c.height = 300; c.style.width = '300px';
    const g = c.getContext('2d');
    g.font = `400 220px Andika, 'Nunito', sans-serif`; g.textAlign = 'center';
    g.fillStyle = '#f33'; g.fillText(L, 150, 205); // nicht abgedeckt = rot
    const st = demoStrokes(L);
    g.strokeStyle = 'rgba(80,160,255,0.85)'; g.lineWidth = 30; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const s of st) { g.beginPath(); g.moveTo(...s[0]); s.slice(1).forEach((q) => g.lineTo(...q)); g.stroke(); }
    g.strokeStyle = '#000'; g.lineWidth = 2;
    for (const s of st) { g.beginPath(); g.moveTo(...s[0]); s.slice(1).forEach((q) => g.lineTo(...q)); g.stroke(); }
    document.getElementById('w').appendChild(c);
  }
}, letters);
await p.screenshot({ path: 'qa/shots/miss.png' });
await b.close();
