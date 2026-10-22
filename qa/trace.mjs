// node qa/trace.mjs [url] [gerät] [stufe] – Buchstaben nachspuren: sauber nachgefahren = richtig, Gekritzel daneben = falsch
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const device = process.argv[3] ?? 'iPhone 13';
const stage = Number(process.argv[4] ?? 1);
const [subj, topic, sid] = process.argv[5] === 'ziffern' ? ['Mathe', 'Ziffern schreiben', 'm1-ziffern'] : ['Deutsch', 'Buchstaben nachspuren', 'd1-nachspuren'];
const progress = { skills: { [sid]: { n: 0, ok: 0, recent: [], last: 0, tags: {}, stage } }, review: [], solved: 0, log: [], tests: [], stars: 0, days: {} };
let bad = 0;
// Striche (Bildschirm-Koordinaten), die den Buchstaben zeilenweise vollständig abdecken
const fillStrokes = (p) =>
  p.evaluate(() => {
    const c = document.querySelector('.trace-canvas');
    const letter = c.getAttribute('aria-label').replace(/^Buchstabe (.) .*$/, '$1');
    const S = 300;
    const o = document.createElement('canvas');
    o.width = S;
    o.height = S;
    const g = o.getContext('2d');
    g.font = `400 220px Andika, 'Nunito', sans-serif`;
    g.textAlign = 'center';
    g.fillText(letter, S / 2, 205);
    const m = g.getImageData(0, 0, S, S).data;
    const r = c.getBoundingClientRect();
    const k = r.width / S;
    const out = [];
    for (let y = 0; y < S; y += 8)
      for (let x = 0; x < S; x++) {
        if (m[(y * S + x) * 4 + 3] <= 128) continue;
        let x2 = x;
        while (x2 < S && m[(y * S + x2) * 4 + 3] > 128) x2++;
        out.push([[r.left + x * k, r.top + y * k], [r.left + (x2 - 1) * k, r.top + y * k]]);
        x = x2;
      }
    return { letter, out };
  });
const draw = async (p, strokes) => {
  for (const [[x1, y1], [x2, y2]] of strokes) {
    await p.mouse.move(x1, y1);
    await p.mouse.down();
    await p.mouse.move(x2, y2, { steps: 4 });
    await p.mouse.up();
  }
};
for (const mode of ['gut', 'kritzel', 'gut', 'gut']) {
  const { p, shot, click, done } = await open({ url, out: 'qa/shots/trace', grade: 1, device, progress });
  await click(subj);
  await p.locator('.topic-main', { hasText: topic }).first().click();
  await p.locator('.trace-canvas').waitFor();
  await p.waitForTimeout(600);
  const { letter, out } = await fillStrokes(p);
  if (mode === 'gut') await draw(p, out);
  else {
    const r = await p.locator('.trace-canvas').boundingBox();
    await draw(p, [[[r.x + 10, r.y + 20], [r.x + 60, r.y + 40]], [[r.x + r.width - 20, r.y + r.height - 20], [r.x + r.width - 70, r.y + r.height - 60]]]);
  }
  await shot(`${mode}-${letter}-vorher`);
  await p.getByRole('button', { name: 'Fertig' }).click();
  await p.waitForTimeout(500);
  const wrong = await p.locator('.feedback.wrong').count();
  const okExpected = mode === 'gut';
  if (okExpected === !!wrong) {
    bad++;
    console.log(`✗ ${mode} ${letter}: ${wrong ? 'als falsch' : 'als richtig'} gewertet`);
  } else console.log(`✓ ${mode} ${letter}`);
  await shot(`${mode}-${letter}-nachher`, true);
  bad += await done();
}
process.exit(bad);
