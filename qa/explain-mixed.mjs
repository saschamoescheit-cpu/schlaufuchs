// node qa/explain-mixed.mjs [url] – gemischtes Vorlesen der Erklärungen (Nachtlauf 23.10.2026): Englisch-Themen werden
// abschnittsweise vorgelesen, Englisch mit englischer, Deutsch mit deutscher Stimme; Stopp bricht die Folge ab;
// Mathe/Deutsch wie bisher in einem Stück. Die Sprachausgabe des Browsers wird mitgeschrieben (Gerätestimme).
import { open } from './lib.mjs';
const url = process.argv[2] ?? 'http://localhost:5192/';
const { ctx, p, done } = await open({ url, out: 'qa/shots/explain-mixed', grade: 3 });
let bad = 0;
const check = (ok, msg) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) bad++;
};
await ctx.addInitScript(() => {
  localStorage.setItem('schlaufuchs:cloudvoice', '0');
  window.__said = [];
  // vollständige Nachbildung der Sprachausgabe (WebKit im Test hat keine): schreibt mit, „spricht“ 8 ms je Zeichen
  let cur = null;
  let timer = null;
  const fake = {
    get speaking() {
      return !!cur;
    },
    pending: false,
    paused: false,
    onvoiceschanged: null,
    getVoices: () => [],
    addEventListener: () => {},
    resume: () => {},
    pause: () => {},
    speak(u) {
      window.__said.push({ text: u.text, lang: u.lang });
      cur = u;
      setTimeout(() => u.onstart?.(new Event('start')), 10);
      timer = setTimeout(() => {
        if (cur !== u) return;
        cur = null;
        u.onend?.(new Event('end'));
      }, 40 + u.text.length * 8);
    },
    cancel() {
      const u = cur;
      cur = null;
      clearTimeout(timer);
      if (u) u.onerror?.(Object.assign(new Event('error'), { error: 'interrupted' }));
    },
  };
  Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
  if (!window.SpeechSynthesisUtterance)
    window.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
      }
    };
});
await p.reload();
await p.waitForTimeout(800);
const said = () => p.evaluate(() => window.__said);
const reset = () => p.evaluate(() => (window.__said = []));

await p.getByRole('button', { name: 'Englisch' }).first().click();
await p.getByRole('tab', { name: /^1\. Lernjahr/ }).first().click().catch(() => {});
await p.getByRole('button', { name: 'Erklärung zu Colours – Farben', exact: true }).click();
await reset();
await p.getByRole('button', { name: 'Erklärung vorlesen' }).click();
await p.waitForTimeout(4000);
const s1 = await said();
check(s1.length >= 6, `Colours: ${s1.length} Abschnitte nacheinander vorgelesen`);
check(s1[0]?.lang === 'en-GB' && s1[0]?.text === 'Colours', `zuerst „Colours“ englisch (${s1[0]?.lang} „${s1[0]?.text}“)`);
check(s1[1]?.lang === 'de-DE' && /Farben/.test(s1[1]?.text), `dann „Farben“ deutsch (${s1[1]?.lang} „${s1[1]?.text}“)`);
check(s1.some((x) => x.lang === 'en-GB' && x.text === 'red') && s1.some((x) => x.lang === 'de-DE' && /heißt rot/.test(x.text)), '„red“ englisch, „heißt rot“ deutsch');
check(!s1.some((x) => x.lang === 'de-DE' && /\b(red|blue|green)\b/.test(x.text)), 'kein englisches Wort mit deutscher Stimme');
check(s1.at(-1)?.lang === 'de-DE' && /Tipp/.test(s1.at(-1)?.text ?? ''), 'zum Schluss der deutsche Tipp');
console.log('  ' + s1.map((x) => `${x.lang.slice(0, 2)}:${x.text}`).join(' | ').slice(0, 400));

// Stopp mitten in der Folge: danach kommt nichts mehr
await reset();
const btn = p.getByRole('button', { name: 'Erklärung vorlesen' });
await btn.click();
await p.waitForTimeout(250);
await btn.click(); // zweites Tippen = Stopp
const n = (await said()).length;
await p.waitForTimeout(2500);
check((await said()).length === n && n >= 1 && n < s1.length, `Stopp: nach ${n} Abschnitt(en) Schluss`);
await p.keyboard.press('Escape');

// Üben: der Lösungsweg nach einer falschen Antwort (Englisch-Thema) – Englisch mit englischer Stimme
await p.goto(url);
await p.getByRole('button', { name: 'Englisch' }).first().click();
await p.getByRole('tab', { name: /^1\. Lernjahr/ }).first().click().catch(() => {});
await p.locator('.topic-main', { hasText: 'Colours' }).first().click();
let solved = null;
for (let i = 0; i < 8 && !solved; i++) {
  await p.waitForTimeout(400);
  const choices = p.locator('.choice');
  if (await choices.count()) await choices.last().click();
  else {
    await p.keyboard.type('xyz');
    await p.keyboard.press('Enter');
  }
  await p.waitForTimeout(500);
  const read = p.getByRole('button', { name: 'Lösungsweg vorlesen' });
  if (await read.isVisible().catch(() => false)) {
    await reset();
    await read.click();
    await p.waitForTimeout(2500);
    solved = await said();
  } else await p.getByRole('button', { name: 'Weiter' }).first().click().catch(() => {});
}
check(!!solved && solved.some((x) => x.lang === 'en-GB') && solved.some((x) => x.lang === 'de-DE'), `Lösungsweg gemischt: ${(solved ?? []).map((x) => `${x.lang.slice(0, 2)}:${x.text}`).join(' | ')}`);

// Mathe: wie bisher in einem Stück, deutsch
await p.goto(url);
await p.getByRole('button', { name: 'Mathe' }).first().click();
const mBtn = p.getByRole('button', { name: /^Erklärung zu / }).first();
await mBtn.click();
await reset();
await p.getByRole('button', { name: 'Erklärung vorlesen' }).click();
await p.waitForTimeout(1500);
const s2 = await said();
check(s2.length === 1 && s2[0].lang === 'de-DE', `Mathe: ein Stück, deutsch (${s2.length}× ${s2[0]?.lang})`);
process.exit((await done()) + bad);
