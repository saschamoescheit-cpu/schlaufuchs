// node qa/schoolyear.mjs [url] [out] – neues Schuljahr: Frage „Bist du jetzt in Klasse 4?“, Ja stellt um und die Frage verschwindet
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const out = process.argv[3] ?? 'qa/shots/schoolyear';
const { p, shot, click, done } = await open({ url, out, grade: 3, profile: { gradeYear: 2020 } });
await shot('frage');
const q = await p.getByText(/Neues Schuljahr/).isVisible().catch(() => false);
await click('Ja, Klasse 4');
await p.waitForTimeout(300);
const gone = !(await p.getByText(/Neues Schuljahr/).isVisible().catch(() => false));
const grade = await p.evaluate(() => JSON.parse(localStorage.getItem('schlaufuchs:v1')).profiles[0].grade);
await shot('danach');
const ok = q && gone && grade === 4;
console.log(ok ? '✓ Schuljahr-Frage: Klasse 4 übernommen' : `✗ Frage ${q}, weg ${gone}, Klasse ${grade}`);
process.exit((await done()) + (ok ? 0 : 1));
