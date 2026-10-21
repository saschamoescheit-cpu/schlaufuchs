// npx vite-node scripts/seed.ts > qa/seed.json – realistischer Lernstand für Browser-Prüfungen (14 Tage geübt, Tests, Fehler)
import { ALL_SKILLS, currentSkills } from '../src/content/curriculum';
import { check } from '../src/engine/check';
import { emptyProgress, record, type TestResult } from '../src/engine/learning';
import { gradeFor } from '../src/engine/grading';
import { mulberry32 } from '../src/engine/rng';

const r = mulberry32(7);
const p = emptyProgress();
const prof = { grade: 3 as const, englishFrom: 3 as const };
const skills = [...currentSkills('mathe', prof), ...currentSkills('deutsch', prof), ...currentSkills('englisch', prof)];
const hard = new Set(['m3-schriftlich-minus', 'd3-auslaut', 'd3-diktat', 'm3-uhrzeit']);
const now = Date.now();
for (let d = 13; d >= 0; d--) {
  if (d % 4 === 3) continue; // ein paar Tage Pause
  let t = now - d * 86400000 - 3 * 3600000;
  for (let i = 0; i < 25 + Math.floor(r() * 20); i++) {
    const s = skills[Math.floor(r() * skills.length)];
    const task = s.generate(r);
    const ok = r() > (hard.has(s.id) ? 0.55 : 0.15);
    t += 20000 + r() * 40000;
    const a = task.answer;
    const wrong = a.type === 'number' ? String(a.value + 1) : a.type === 'choice' ? String((a.correct + 1) % a.options.length) : a.value.toLowerCase().replace('ie', 'i');
    const c = check(task, ok ? (a.type === 'number' ? String(a.value) : a.type === 'choice' ? String(a.correct) : a.value) : wrong);
    record(p, task, c.ok, 'übung', t, c.tags ?? c.trap?.tag);
  }
}
for (const [subj, pct, days] of [['mathe', 78, 9], ['deutsch', 91, 5], ['mathe', 84, 2]] as const) {
  const t = now - days * 86400000;
  const res: TestResult = { id: `t${days}`, t, subject: subj, skills: [], correct: 10, total: 12, points: Math.round(pct * 0.15), maxPoints: 15, percent: pct, grade: gradeFor(pct), seconds: 700, limit: 900, timeUp: false, pace: 'schule', items: [] };
  p.tests.push(res);
}
console.log(JSON.stringify(p));
void ALL_SKILLS;
