// node qa/cards-due.mjs [url] – fällige Vokabelkarten am Knopf „Vokabeln lernen“
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const D = 24 * 60 * 60 * 1000;
const t0 = Date.now() - 3 * D;
// drei Wörter vor drei Tagen gewusst (Fach 1 → nach 1 Tag fällig), eins heute
const log = ['dog', 'cat', 'pig'].map((w, i) => ({ t: t0 + i, s: 'e1-animals', ok: 1, m: 'karten', w })).concat([{ t: Date.now() - 1000, s: 'e1-animals', ok: 1, m: 'karten', w: 'cow' }]);
const { p, shot, click, done } = await open({ url, out: 'qa/shots/cards-due', grade: 4, progress: { skills: {}, review: [], solved: 0, log, tests: [], stars: 0, days: {} } });
await click('Englisch');
await p.waitForTimeout(300);
const txt = await p.getByRole('button', { name: /Vokabeln lernen/ }).innerText();
await shot('knopf');
const ok = /3 Karten fällig/.test(txt);
console.log(ok ? '✓ 3 Karten fällig angezeigt' : `✗ Anzeige: ${txt}`);
process.exit((await done()) + (ok ? 0 : 1));
