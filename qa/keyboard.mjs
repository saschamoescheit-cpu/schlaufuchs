// node qa/keyboard.mjs [url] – Übung nur mit der Tastatur: Tab zu den Antworten, Enter, Weiter; Zahlen tippen
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const { p, shot, click, done } = await open({ url, out: 'qa/shots/keyboard', grade: 2, device: 'Desktop Chrome' });
let bad = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) bad++; };
// Start: per Tab zum Fach Mathe
let found = false;
for (let i = 0; i < 40 && !found; i++) {
  await p.keyboard.press('Tab');
  found = await p.evaluate(() => (document.activeElement?.classList.contains('subject-card') ?? false) && /Mathe/.test(document.activeElement?.textContent ?? ''));
}
check(found, 'Fach „Mathe“ per Tab erreichbar');
await p.keyboard.press('Enter');
await p.waitForTimeout(300);
check(await p.getByRole('tab', { name: /Klasse 1/ }).isVisible(), 'Fach mit Enter geöffnet');
// erstes Thema per Tab + Enter
found = false;
for (let i = 0; i < 40 && !found; i++) {
  await p.keyboard.press('Tab');
  found = await p.evaluate(() => document.activeElement?.classList.contains('topic-main') ?? false);
}
check(found, 'Thema per Tab erreichbar');
await p.keyboard.press('Enter');
await p.waitForTimeout(500);
const inTask = await p.locator('.task').count();
check(inTask > 0, 'Übung gestartet');
// 5 Aufgaben nur mit Tastatur beantworten
let answered = 0;
let focusStyle = '';
for (let k = 0; k < 5; k++) {
  const isChoice = await p.locator('.choice').count();
  if (isChoice) {
    let f = false;
    for (let i = 0; i < 30 && !f; i++) {
      await p.keyboard.press('Tab');
      f = await p.evaluate(() => document.activeElement?.classList.contains('choice') ?? false);
    }
    if (!f) break;
    if (k === 0) focusStyle = await p.evaluate(() => { const cs = getComputedStyle(document.activeElement); return `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor} | ${cs.boxShadow}`; });
    await p.keyboard.press('Enter');
  } else {
    await p.keyboard.type('7');
    await p.keyboard.press('Enter');
  }
  await p.waitForTimeout(300);
  // Weiter-Knopf: Fokus liegt dort oder per Enter erreichbar
  const next = p.getByRole('button', { name: /Weiter|Nochmal/ }).first();
  if (await next.isVisible().catch(() => false)) {
    let f = await p.evaluate(() => /Weiter|Nochmal/.test(document.activeElement?.textContent ?? ''));
    for (let i = 0; i < 30 && !f; i++) {
      await p.keyboard.press('Tab');
      f = await p.evaluate(() => /Weiter|Nochmal/.test(document.activeElement?.textContent ?? ''));
    }
    if (!f) break;
    await p.keyboard.press('Enter');
    await p.waitForTimeout(300);
  }
  answered++;
}
await shot('nach-tastatur');
check(answered === 5, `5 Aufgaben nur mit Tastatur beantwortet (${answered})`);
const ring = await p.evaluate(() => { const b = document.querySelector('.topic-main, button'); b.focus(); const cs = getComputedStyle(document.activeElement); return cs.outlineStyle + ' ' + cs.outlineWidth; });
check(/solid 3px/.test(ring) || /solid/.test(focusStyle), `Fokus sichtbar (${ring})`);
process.exit((await done()) + bad);
