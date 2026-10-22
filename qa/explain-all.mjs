// node qa/explain-all.mjs [url] [gerät] – jede Erklärung (💡) öffnen, Beispiel aufklappen, auf Überlauf und Seitenfehler prüfen
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const device = process.argv[3] ?? 'iPhone SE';
const { p, done } = await open({ url, out: 'qa/shots/explain-all', grade: 4, device });
const only = process.argv[4] ? process.argv[4].split(',') : null;
const skillsAll = await p.evaluate(async () => (await import('/src/content/curriculum.ts')).ALL_SKILLS.map((s) => ({ id: s.id, subject: s.subject, grade: s.grade, title: s.title })));
const skills = only ? skillsAll.filter((s) => only.includes(s.id)) : skillsAll;
const SUBJ = { mathe: 'Mathe', deutsch: 'Deutsch', englisch: 'Englisch' };
let bad = 0;
let last = '';
for (const s of skills) {
  const key = s.subject + s.grade;
  if (key !== last) {
    await p.goto(url);
    await p.getByRole('button', { name: SUBJ[s.subject] }).first().click();
    const lv = s.subject === 'englisch' ? (s.grade === 3 ? '1. Lernjahr' : '2. Lernjahr') : `Klasse ${s.grade}`;
    await p.getByRole('tab', { name: new RegExp(`^${lv}`) }).first().click().catch(() => {});
    last = key;
  }
  const btn = p.getByRole('button', { name: `Erklärung zu ${s.title}`, exact: true });
  if (!(await btn.count())) { bad++; console.log(`✗ ${s.id}: kein Erklär-Knopf`); continue; }
  await btn.first().click();
  const ex = p.locator('.example');
  await ex.getByRole('button', { name: /Lösung zeigen/ }).click({ timeout: 3000 }).catch(() => {});
  await p.waitForTimeout(150);
  const r = await p.evaluate(() => {
    const sheet = document.querySelector('.sheet');
    const inner = Math.max(0, ...[...document.querySelectorAll('.sheet .visual-box, .sheet .vis-grid, .sheet .vis-table-wrap, .sheet .prompt, .sheet .steps')].map((e) => e.scrollWidth - e.clientWidth));
    return { inner, sheetOver: sheet ? sheet.scrollWidth - sheet.clientWidth : 0, steps: document.querySelectorAll('.example .steps li').length };
  });
  if (r.inner > 2 || r.sheetOver > 1 || !r.steps) {
    bad++;
    console.log(`✗ ${s.id}: innen +${r.inner}px, Blatt +${r.sheetOver}px, ${r.steps} Schritte`);
    await p.screenshot({ path: `qa/shots/explain-all/${s.id}.png`, fullPage: true });
  }
  await p.keyboard.press('Escape');
  await p.waitForTimeout(150);
}
console.log(`${skills.length} Erklärungen geprüft, ${bad} auffällig`);
process.exit((await done()) + bad);
