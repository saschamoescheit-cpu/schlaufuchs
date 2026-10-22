// node qa/trace-demo.mjs [out.png] – Schreibrichtungs-Pfade über den Buchstaben legen (Passung prüfen)
import { webkit } from 'playwright';
const out = process.argv[2] ?? 'qa/shots/trace-demo.png';
const b = await webkit.launch();
const p = await b.newPage({ viewport: { width: 1000, height: 800 } });
await p.goto('http://localhost:5192/');
await p.evaluate(async () => {
  const { demoStrokes } = await import('/src/ui/Trace.tsx');
  await document.fonts.load(`400 220px Andika`, 'ABDEFGHIJKLMNOPRSTUWZ');
  document.body.innerHTML = '<div id="w" style="display:flex;flex-wrap:wrap;gap:4px;background:#fff"></div>';
  for (const L of 'ABDEFGHIJKLMNOPRSTUWZ') {
    const c = document.createElement('canvas');
    c.width = 300; c.height = 300; c.style.width = '240px';
    const g = c.getContext('2d');
    g.font = `400 220px Andika, 'Nunito', sans-serif`; g.textAlign = 'center';
    g.fillStyle = '#ddd'; g.fillText(L, 150, 205);
    const st = demoStrokes(L) ?? [];
    st.forEach((s, i) => {
      g.strokeStyle = ['#e33', '#27f', '#1a6', '#a3c'][i % 4]; g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(...s[0]); s.slice(1).forEach((pt) => g.lineTo(...pt)); g.stroke();
      g.fillStyle = g.strokeStyle; g.beginPath(); g.arc(...s[0], 8, 0, 7); g.fill();
    });
    document.getElementById('w').appendChild(c);
  }
});
await p.waitForTimeout(300);
await p.screenshot({ path: out, fullPage: true });
await b.close();
