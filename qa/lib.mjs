// Gemeinsame Helfer für die Browser-Prüfungen: Testkind anlegen, Fotos, Fehler sammeln.
import { webkit, devices } from 'playwright';
import { mkdirSync } from 'node:fs';

export async function open({ url = 'http://localhost:5192/', out = 'qa/shots', device = 'iPhone 13', grade = 3, name = 'Mia', progress, profile = {}, data = {} } = {}) {
  mkdirSync(out, { recursive: true });
  const b = await webkit.launch();
  const ctx = await b.newContext({ ...devices[device], locale: 'de-DE' });
  const id = 'testkind1';
  const app = {
    schema: 1,
    profiles: [{ id, name, avatar: '🦊', age: 5 + grade, grade, state: 'NW', englishFrom: 3, gradesFrom: 3, gradeKey: [95, 80, 65, 50, 25], autoRead: false, sound: false, pace: 'schule', created: 1, ...profile }],
    progress: { [id]: progress ?? { skills: {}, review: [], solved: 0, log: [], tests: [], stars: 0, days: {} } },
    activeId: id,
    parent: { pin: null },
    ...data,
  };
  await ctx.addInitScript((d) => {
    if (!sessionStorage.getItem('qa-seeded')) {
      localStorage.setItem('schlaufuchs:v1', JSON.stringify(d));
      sessionStorage.setItem('qa-seeded', '1');
    }
  }, app);
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => m.type() === 'error' && !/supabase|Failed to load resource|net::|access control/i.test(m.text()) && errs.push(m.text()));
  await p.goto(url);
  let n = 0;
  const shot = async (nm, full = false) => {
    await p.waitForTimeout(350);
    await p.screenshot({ path: `${out}/${String(++n).padStart(2, '0')}-${nm}.png`, fullPage: full });
  };
  const click = (t) => p.getByRole('button', { name: t }).first().click();
  const done = async () => {
    console.log(errs.length ? 'FEHLER:\n' + errs.join('\n') : 'keine Seitenfehler');
    await b.close();
    return errs.length;
  };
  return { b, ctx, p, shot, click, done, errs };
}
