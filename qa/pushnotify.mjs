// QA Mitteilungen (Sascha 23.10.2026, wie bei GolfOS Rounds): in der gebauten App mit ihrem Service Worker (Edge –
// WebKit hat unter Windows keinen Service Worker). Die Einstellungen schalten Mitteilungen für dieses Gerät ein und
// schicken das Abo an die Funktion schlaufuchs-push (hier beantwortet); jede Art an und aus; eine an den Service Worker
// zugestellte Mitteilung wird angezeigt; ihre Sprungziele öffnen das richtige Kind bzw. seine Vokabeln; wieder aus.
// iPhone im Browser: Hinweis auf den Home-Bildschirm; ohne Konto: Hinweis aufs Anmelden; Funktion fehlt: gesagt.
// Aufruf: node qa/pushnotify.mjs [Adresse der gebauten App, Standard die Vorschau :5193] (vorher npm run build)
import { chromium, devices } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:5193/';
const origin = new URL(url).origin;
const b = await chromium.launch({ channel: 'msedge' });
let fails = 0;
const ok = (c, m) => {
  console.log(`${c ? '✓' : '✗'} ${m}`);
  if (!c) fails++;
};

// ein echter Absender-Schlüssel, wie die Funktion ihn herausgibt
const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const publicKey = Buffer.from(await crypto.subtle.exportKey('raw', pair.publicKey)).toString('base64url');

const kid = (id, name) => ({ id, name, avatar: id === 'k1' ? '🦊' : '🐻', age: 8, grade: 3, state: 'NW', englishFrom: 3, gradesFrom: 3, gradeKey: [95, 80, 65, 50, 25], autoRead: false, sound: false, pace: 'schule', created: 1, gradeYear: 9999 });
const empty = { skills: {}, review: [], solved: 0, log: [], tests: [], stars: 0, days: {} };
const APP = { schema: 1, profiles: [kid('k1', 'Mia'), kid('k2', 'Ben')], progress: { k1: empty, k2: empty }, activeId: 'k1', parent: { pin: null } };
const SESSION = { access_token: 'test-token', refresh_token: 'r', expires_at: Math.floor(Date.now() / 1000) + 3 * 3600, email: 'eltern@example.com', name: 'familie', url: 'https://gypgaepmlftnqwywupeq.supabase.co' };
const seen = JSON.stringify(['aufgaben', 'sterne', 'serie', 'lernziele', 'fehlerjaeger', 'tests', 'bestnote', 'stufe3', 'tagesziel', 'blitz', 'meister', 'vokabeln'].flatMap((x) => [1, 2, 3].map((t) => `${x}:${t}`)));

async function context(device, { signedIn = true, fakePush = true } = {}) {
  const ctx = await b.newContext({ ...device, locale: 'de-DE', serviceWorkers: 'allow' });
  await ctx.grantPermissions(['notifications'], { origin });
  const calls = [];
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
  await ctx.route(/supabase\.co\/functions\/v1\/schlaufuchs-push/, async (r) => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
    const body = JSON.parse(r.request().postData() ?? '{}');
    calls.push({ ...body, auth: r.request().headers().authorization });
    return r.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify(body.action === 'key' ? { publicKey } : { ok: true }) });
  });
  // Abgleich und Cloud-Stimme: leer bzw. nicht da
  await ctx.route(/supabase\.co\/(rest|auth)\/v1\//, (r) => r.fulfill({ status: 200, headers: { ...cors, 'Content-Type': 'application/json' }, body: '[]' }));
  await ctx.route(/supabase\.co\/functions\/v1\/tts/, (r) => r.fulfill({ status: 404, headers: cors, body: '' }));
  // einen Push-Dienst erreicht der Testbrowser nicht: das Abo entsteht hier, alles andere ist echt
  if (fakePush)
    await ctx.addInitScript(() => {
      if (!('PushManager' in self)) return;
      const sub = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/schlaufuchs-test',
        expirationTime: null,
        toJSON() {
          return { endpoint: this.endpoint, expirationTime: null, keys: { p256dh: 'BPd4ZwNQ1YJ0v7b0V3T2n8Q', auth: 'k3y5Auth' } };
        },
        async unsubscribe() {
          localStorage.setItem('qa.unsubscribed', String(Number(localStorage.getItem('qa.unsubscribed') ?? 0) + 1));
          localStorage.removeItem('qa.subscribed');
          return true;
        },
      };
      PushManager.prototype.subscribe = async function (o) {
        localStorage.setItem('qa.keylength', String(o.applicationServerKey.byteLength));
        localStorage.setItem('qa.subscribed', '1');
        return sub;
      };
      PushManager.prototype.getSubscription = async function () {
        return localStorage.getItem('qa.subscribed') ? sub : null;
      };
    });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(url);
  await p.evaluate(
    ({ APP, SESSION, signedIn, seen }) => {
      localStorage.clear();
      localStorage.setItem('schlaufuchs:v1', JSON.stringify(APP));
      localStorage.setItem('schlaufuchs:cloudvoice', '0');
      for (const id of ['k1', 'k2']) localStorage.setItem(`schlaufuchs:badges-seen:${id}`, seen);
      if (signedIn) localStorage.setItem('schlaufuchs:auth.v1', JSON.stringify(SESSION));
    },
    { APP, SESSION, signedIn, seen },
  );
  return { ctx, p, calls, errs };
}

const openSettings = async (p) => {
  await p.reload();
  await p.waitForTimeout(1500);
  await p.getByRole('button', { name: 'Profil und Einstellungen' }).click();
  await p.waitForTimeout(400);
  const card = p.locator('details.push-card');
  if (!(await card.getAttribute('open').catch(() => null))) await card.locator('summary').click();
  await p.waitForTimeout(300);
  return card;
};
const main = (card) => card.getByRole('checkbox', { name: 'Mitteilungen auf diesem Gerät' });

// ---------- Android, angemeldet: an, Arten, eine Mitteilung, Sprungziele, aus ----------
{
  const { ctx, p, calls, errs } = await context(devices['Pixel 7']);
  await p.waitForFunction(() => navigator.serviceWorker?.ready, null, { timeout: 15000 }).catch(() => {});
  const card = await openSettings(p);
  ok(await card.locator('summary').filter({ hasText: 'Mitteilungen' }).isVisible(), 'Einstellungen: Bereich „🔔 Mitteilungen“');
  ok((await main(card).isVisible()) && !(await main(card).isChecked()), 'Schalter „Mitteilungen auf diesem Gerät“, aus');
  await main(card).click();
  await p.waitForTimeout(1500);
  const sub = calls.find((c) => c.action === 'subscribe');
  ok(calls.some((c) => c.action === 'key'), 'Schlüssel von der Funktion geholt');
  ok(Number(await p.evaluate(() => localStorage.getItem('qa.keylength'))) === 65, 'mit dem Schlüssel der Funktion abonniert (65 Bytes)');
  ok(sub?.subscription?.endpoint === 'https://fcm.googleapis.com/fcm/send/schlaufuchs-test' && !!sub?.subscription?.keys?.p256dh, 'Abo an die Funktion geschickt');
  ok(sub?.auth === 'Bearer test-token', 'mit der Anmeldung der Eltern');
  ok(typeof sub?.tz === 'string' && sub.tz.length > 2, `Zeitzone des Geräts (${sub?.tz})`);
  ok(sub?.kinds?.learn && sub?.kinds?.tests && sub?.kinds?.cards, 'alle drei Arten zuerst an');
  ok(await card.getByRole('status').filter({ hasText: 'Mitteilungen sind an' }).isVisible(), 'gesagt: an – eine erste ist unterwegs');
  ok(await main(card).isChecked(), 'Schalter an');
  if (process.env.SHOTS) await card.screenshot({ path: `${process.env.SHOTS}/push-card.png` });
  const cards = card.getByRole('checkbox', { name: 'Vokabelkarten fällig' });
  ok((await card.getByRole('checkbox').count()) === 4, 'je Art ein Schalter: Lern-Erinnerung, Klassenarbeit, Vokabelkarten');
  await cards.click();
  await p.waitForTimeout(600);
  const set1 = calls.filter((c) => c.action === 'settings').pop();
  ok(set1?.kinds?.cards === false && set1?.kinds?.learn === true && set1?.endpoint === sub?.subscription?.endpoint, 'Vokabelkarten aus: der Funktion gesagt');
  await cards.click();
  await p.waitForTimeout(600);
  ok(calls.filter((c) => c.action === 'settings').pop()?.kinds?.cards === true, 'und wieder an');
  const again = await openSettings(p);
  ok(await main(again).isChecked(), 'nach Neuladen: weiter an');

  // eine an den Service Worker zugestellte Mitteilung wird angezeigt
  const cdp = await ctx.newCDPSession(p);
  const regs = [];
  cdp.on('ServiceWorker.workerRegistrationUpdated', (e) => regs.push(...e.registrations));
  await cdp.send('ServiceWorker.enable');
  await p.waitForTimeout(800);
  const reg = regs.find((r) => !r.isDeleted && r.scopeURL.startsWith(origin));
  ok(!!reg, 'Service Worker der App registriert');
  if (reg) {
    const note = { title: 'Mathe-Arbeit morgen', body: 'Ben schreibt morgen die Mathe-Arbeit – jetzt kurz wiederholen?', tag: 'schlaufuchs-test-k2', url: './#kind=k2' };
    await cdp.send('ServiceWorker.deliverPushMessage', { origin, registrationId: reg.registrationId, data: JSON.stringify(note) });
    await p.waitForTimeout(1500);
    const shown = await p.evaluate(async () => (await (await navigator.serviceWorker.ready).getNotifications()).map((n) => ({ title: n.title, body: n.body, url: n.data?.url })));
    ok(shown.length === 1 && shown[0].title === note.title && shown[0].body === note.body && shown[0].url === note.url, `angezeigt: „${shown[0]?.title}“ – ${shown[0]?.body}`);
  }

  // Sprungziele: die App ist offen, das Antippen ändert die Stelle in der Adresse
  await p.goto(`${url}#kind=k2`);
  await p.waitForTimeout(1500);
  ok((await p.evaluate(() => JSON.parse(localStorage.getItem('schlaufuchs:v1')).activeId)) === 'k2' && (await p.getByText('Ben').first().isVisible()), '#kind=k2: Ben ist dran');
  ok((await p.evaluate(() => location.hash)) === '', 'Stelle einmal gelesen (Adresse wieder sauber)');
  await p.goto(`${url}#karten=k1`);
  await p.waitForTimeout(1500);
  ok((await p.evaluate(() => JSON.parse(localStorage.getItem('schlaufuchs:v1')).activeId)) === 'k1' && (await p.getByRole('button', { name: /Vokabeln lernen/ }).isVisible()), '#karten=k1: Mia, gleich bei Englisch mit „Vokabeln lernen“');
  await p.evaluate(() => (location.hash = '#kind=k2'));
  await p.waitForTimeout(1200);
  ok((await p.evaluate(() => JSON.parse(localStorage.getItem('schlaufuchs:v1')).activeId)) === 'k2', 'auch ohne Neuladen (Adresse geändert, während die App offen ist)');
  await p.goto(`${url}#kind=gibt-es-nicht`);
  await p.waitForTimeout(1200);
  ok((await p.evaluate(() => JSON.parse(localStorage.getItem('schlaufuchs:v1')).activeId)) === 'k2', 'unbekanntes Kind: nichts geändert');

  // aus
  const off = await openSettings(p);
  await main(off).click();
  await p.waitForTimeout(800);
  ok(calls.some((c) => c.action === 'unsubscribe' && c.endpoint === sub?.subscription?.endpoint), 'ausgeschaltet: die Funktion vergisst das Gerät');
  ok(Number(await p.evaluate(() => localStorage.getItem('qa.unsubscribed'))) >= 1, 'und das Gerät meldet sich ab');
  ok(!(await main(off).isChecked()) && (await off.getByRole('checkbox').count()) === 1, 'Schalter aus, Arten ausgeblendet');
  ok(errs.length === 0, `keine Seitenfehler ${errs.slice(0, 2).join(' | ')}`);
  await ctx.close();
}

// ---------- die Funktion ist noch nicht angelegt: gesagt ----------
{
  const { ctx, p } = await context(devices['Pixel 7']);
  await ctx.unroute(/supabase\.co\/functions\/v1\/schlaufuchs-push/);
  await ctx.route(/supabase\.co\/functions\/v1\/schlaufuchs-push/, (r) => r.fulfill({ status: 404, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }, body: '' }));
  const card = await openSettings(p);
  await main(card).click();
  await p.waitForTimeout(1200);
  ok(await card.getByRole('status').filter({ hasText: 'noch nicht eingerichtet' }).isVisible(), 'Funktion fehlt: „Auf dem Server noch nicht eingerichtet.“');
  ok(!(await main(card).isChecked()), 'und bleibt aus');
  await ctx.close();
}

// ---------- iPad im Browser (nicht vom Home-Bildschirm), und ohne Konto ----------
{
  const { ctx, p } = await context(devices['iPad (gen 7)']);
  const card = await openSettings(p);
  ok(await card.getByText('Zum Home-Bildschirm').isVisible(), 'iPad im Browser: wie der Schlaufuchs auf den Home-Bildschirm kommt');
  ok((await card.getByRole('checkbox').count()) === 0, 'kein Schalter, der nicht gehen kann');
  await ctx.close();
}
{
  const { ctx, p } = await context(devices['Pixel 7'], { signedIn: false });
  const card = await openSettings(p);
  ok(await card.getByText('Eltern-Konto').isVisible(), 'ohne Konto: erst anmelden');
  await ctx.close();
}
await b.close();
process.exit(fails ? 1 : 0);
