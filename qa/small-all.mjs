// node qa/small-all.mjs [url] [gerät] – jedes Thema auf kleinem Bildschirm öffnen (Stufe 3) und auf abgeschnittene Inhalte prüfen
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const device = process.argv[3] ?? 'iPhone SE';
const list = JSON.parse(process.argv[4] ?? 'null');
const { p, done } = await open({ url, out: 'qa/shots/small-all', grade: 4, device });
// alle Themen aus der App holen (über den Modul-Graphen des Dev-Servers)
const skills = list ?? (await p.evaluate(async () => (await import('/src/content/curriculum.ts')).ALL_SKILLS.map((s) => ({ id: s.id, subject: s.subject, grade: s.grade, title: s.title }))));
const SUBJ = { mathe: 'Mathe', deutsch: 'Deutsch', englisch: 'Englisch' };
let bad = 0;
for (const s of skills) {
  // Stufe 3 setzen, dann Thema direkt über den Fach-Bildschirm öffnen
  await p.evaluate(([id, sf]) => {
    const d = JSON.parse(localStorage.getItem('schlaufuchs:v1'));
    d.progress.testkind1.skills[id] = { n: 0, ok: 0, recent: [], last: 0, tags: {}, stage: 3 };
    if (sf) d.profiles.forEach((pr) => (pr.schoolFont = true));
    localStorage.setItem('schlaufuchs:v1', JSON.stringify(d));
  }, [s.id, process.env.SF === '1']);
  await p.reload();
  await p.getByRole('button', { name: SUBJ[s.subject] }).first().click();
  const lv = s.subject === 'englisch' ? (s.grade === 3 ? '1. Lernjahr' : '2. Lernjahr') : `Klasse ${s.grade}`;
  await p.getByRole('tab', { name: new RegExp(`^${lv}`) }).first().click().catch(() => {});
  await p.locator('.topic-main', { hasText: s.title }).first().click({ timeout: 3000 }).catch(() => {});
  await p.waitForTimeout(350);
  const r = await p.evaluate(() => {
    const doc = document.documentElement.scrollWidth - innerWidth;
    const inner = Math.max(0, ...[...document.querySelectorAll('.cw-box, .vis-table-wrap, .visual-box, .vis-grid, .choices, .prompt')].map((e) => e.scrollWidth - e.clientWidth));
    return { doc, inner };
  });
  if (r.doc > 1 || r.inner > 2) {
    bad++;
    console.log(`✗ ${s.id}: Seite +${r.doc}px, innen +${r.inner}px`);
    await p.screenshot({ path: `qa/shots/small-all/${s.id}.png` });
  }
}
console.log(`${skills.length} Themen geprüft, ${bad} mit Überlauf`);
process.exit((await done()) + bad);
