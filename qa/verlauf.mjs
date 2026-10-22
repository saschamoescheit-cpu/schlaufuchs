// node qa/verlauf.mjs [url] [out] – Tests → Ergebnisse: Verlauf je Fach (Säulen)
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/verlauf';
const day = 86400000;
const test = (i, subject, percent, grade) => ({ id: `t${i}`, t: Date.now() - (10 - i) * 3 * day, subject, skills: [], correct: 0, total: 10, points: percent / 10, maxPoints: 10, percent, grade, seconds: 300, limit: 600, timeUp: false, pace: 'schule', items: [] });
const tests = [test(1, 'mathe', 55, 4), test(2, 'mathe', 70, 3), test(3, 'deutsch', 80, 2), test(4, 'mathe', 85, 2), test(5, 'mathe', 95, 1), test(6, 'deutsch', 90, 2)];
const progress = { skills: {}, review: [], solved: 0, log: [], tests, stars: 0, days: {} };
const { p, shot, click, done } = await open({ url, out, grade: 3, progress });
await click('Tests');
await p.getByRole('tab', { name: /Ergebnisse/ }).click();
await p.waitForTimeout(300);
await shot('ergebnisse', true);
const n = await p.getByText(/Verlauf \(Prozent richtig\)/).count();
console.log(n === 2 ? '✓ Verlauf für Mathe und Deutsch' : `✗ ${n} Verläufe`);
process.exit((await done()) + (n === 2 ? 0 : 1));
