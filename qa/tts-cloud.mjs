// node qa/tts-cloud.mjs [url] – Cloud-Stimme mit simuliertem Server (liefert einen 1-s-Ton): spielt der Audio-Player,
// startet „Anhören“ und „Aufgabe vorlesen“ darüber, kommt der Text richtig beim Server an?
import { chromium, devices } from 'playwright';
const url = process.argv[2] ?? 'http://localhost:5192/';
// 1 s Sinus 440 Hz, 8 kHz, 8 Bit
const n = 8000, wav = Buffer.alloc(44 + n);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + n, 4); wav.write('WAVE', 8); wav.write('fmt ', 12); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(8000, 28); wav.writeUInt16LE(1, 32); wav.writeUInt16LE(8, 34); wav.write('data', 36); wav.writeUInt32LE(n, 40);
for (let i = 0; i < n; i++) wav[44 + i] = 128 + Math.round(60 * Math.sin((2 * Math.PI * 440 * i) / 8000));
const b = await chromium.launch({ channel: 'msedge', args: ['--autoplay-policy=user-gesture-required'] });
const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'de-DE', isMobile: false, hasTouch: false });
const asked = [];
await ctx.route(/\/functions\/v1\/tts\?/, (route) => {
  const u = new URL(route.request().url());
  asked.push(`${u.searchParams.get('l')} r=${u.searchParams.get('r')} „${u.searchParams.get('t')}“`);
  route.fulfill({ status: 200, body: wav, headers: { 'content-type': 'audio/wav', 'access-control-allow-origin': '*' } });
});
const app = { schema: 1, profiles: [{ id: 'k1', name: 'Mia', avatar: '🦊', age: 9, grade: 3, state: 'NW', englishFrom: 3, gradesFrom: 3, gradeKey: [95, 80, 65, 50, 25], autoRead: false, sound: false, pace: 'schule', created: 1, gradeYear: 9999 }], progress: { k1: { skills: {}, review: [], solved: 0, log: [], tests: [], stars: 0, days: {} } }, activeId: 'k1', parent: { pin: null } };
await ctx.addInitScript((d) => {
  if (!sessionStorage.getItem('s')) { localStorage.setItem('schlaufuchs:v1', JSON.stringify(d)); sessionStorage.setItem('s', '1'); }
  window.__synth = 0;
  const sp = window.speechSynthesis.speak.bind(window.speechSynthesis);
  window.speechSynthesis.speak = (u) => { if (u.text.trim()) window.__synth++; sp(u); };
}, app);
const p = await ctx.newPage();
p.on('pageerror', (e) => console.log('pageerror', e.message));
await p.goto(url);
await p.getByRole('button', { name: 'Englisch' }).first().click();
await p.locator('.topic-main', { hasText: 'Animals' }).first().click();
await p.waitForTimeout(800);
for (let i = 0; i < 6 && !(await p.getByRole('button', { name: 'Anhören' }).count()); i++) {
  // bis eine Hör-Aufgabe kommt: irgendwas antworten und weiter
  const ch = p.locator('.choice').first();
  if (await ch.isVisible().catch(() => false)) await ch.click();
  await p.getByRole('button', { name: /Weiter/ }).first().click().catch(() => {});
  await p.waitForTimeout(500);
}
if (await p.getByRole('button', { name: 'Anhören' }).count()) await p.getByRole('button', { name: 'Anhören' }).first().click();
await p.waitForTimeout(1800);
await p.getByRole('button', { name: 'Aufgabe vorlesen' }).first().click();
await p.waitForTimeout(1800);
const synth = await p.evaluate(() => window.__synth);
console.log('Server bekam:\n  ' + asked.join('\n  '));
const ok = asked.some((a) => a.startsWith('en')) && asked.some((a) => a.startsWith('de')) && synth === 0;
console.log(`Gerätestimme benutzt: ${synth}×`);
console.log(ok ? '✓ Cloud-Stimme spielt (Englisch und Deutsch), keine Gerätestimme nötig' : '✗ Cloud-Weg nicht vollständig');
await b.close();
process.exit(ok ? 0 : 1);
