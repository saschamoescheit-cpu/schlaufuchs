// node qa/sync.mjs [url] [outDir] – iPad und iPhone nebeneinander gegen einen simulierten Supabase-Server (REST +
// Realtime): Kind auf dem iPad anlegen und üben → auf dem iPhone da; auf dem iPhone üben → das iPad zeigt es live.
import { webkit, devices } from 'playwright';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5191/';
const out = process.argv[3] ?? 'qa/shots-sync';
mkdirSync(out, { recursive: true });
let fails = 0;
const ok = (c, m) => {
  console.log(`${c ? '✓' : '✗'} ${m}`);
  if (!c) fails++;
};

// ---- der simulierte Server: eine Tabelle, Zeilen je kind|id ----
const rows = new Map();
const stamp = (at) => new Date(at).toISOString().replace('Z', '+00:00');
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'apikey, authorization, content-type, prefer', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS' };
const unq = (s) => s.replace(/^"|"$/g, '').replace(/\\"/g, '"');
function matches(row, q) {
  for (const [k, v] of q) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(k)) continue;
    if (v.startsWith('eq.') && String(k === 'updated_at' ? row[k] : row[k]) !== v.slice(3)) return false;
    if (v.startsWith('in.(')) {
      const list = v.slice(4, -1).match(/"(?:[^"\\]|\\.)*"|[^,]+/g).map(unq);
      if (!list.includes(row[k])) return false;
    }
  }
  return true;
}
const put = (r) => rows.set(`${r.kind}|${r.id}`, { kind: r.kind, id: r.id, data: r.data, deleted: !!r.deleted, updated_at: stamp(r.updated_at) });
let requests = 0;
async function rest(route) {
  const req = route.request();
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  requests++;
  const u = new URL(req.url());
  const q = [...u.searchParams.entries()];
  const json = (status, body) => route.fulfill({ status, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (req.method() === 'GET') {
    const sel = u.searchParams.get('select').split(',');
    const list = [...rows.values()].filter((r) => matches(r, q)).map((r) => Object.fromEntries(sel.map((k) => [k, r[k]])));
    return json(200, list);
  }
  const prefer = req.headers()['prefer'] ?? '';
  const body = JSON.parse(req.postData() ?? '[]');
  if (req.method() === 'POST') {
    const done = [];
    for (const r of body) {
      const k = `${r.kind}|${r.id}`;
      if (rows.has(k) && prefer.includes('ignore-duplicates')) continue;
      put(r);
      done.push(rows.get(k));
    }
    return prefer.includes('return=representation') ? json(201, done) : route.fulfill({ status: 201, headers: cors, body: '' });
  }
  if (req.method() === 'PATCH') {
    const hit = [...rows.values()].filter((r) => matches(r, q));
    for (const r of hit) put({ ...r, ...body });
    return json(200, hit.map((r) => rows.get(`${r.kind}|${r.id}`)));
  }
  return route.fulfill({ status: 405, headers: cors });
}

// ---- Realtime: was ein Gerät in den Kanal schickt, hören die anderen ----
const sockets = new Set();
async function realtime(ws) {
  sockets.add(ws);
  ws.onMessage((m) => {
    const d = JSON.parse(String(m));
    if (d.event === 'phx_join') ws.send(JSON.stringify({ topic: d.topic, event: 'phx_reply', payload: { status: 'ok', response: {} }, ref: d.ref }));
    if (d.event === 'broadcast') for (const o of sockets) if (o !== ws) o.send(JSON.stringify({ topic: d.topic, event: 'broadcast', payload: d.payload, ref: null }));
  });
  ws.onClose(() => sockets.delete(ws));
}

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const token = `${b64({ alg: 'none' })}.${b64({ sub: '00000000-0000-0000-0000-000000000001' })}.x`;
const errs = [];
async function device(name, dev) {
  const ctx = await b.newContext({ ...devices[dev], locale: 'de-DE' });
  await ctx.route(/supabase\.co\/rest\/v1\/schlaufuchs_items/, rest);
  await ctx.routeWebSocket(/supabase\.co\/realtime/, realtime);
  const p = await ctx.newPage();
  // WebKit leitet den CORS-Vorabcheck nicht durch den Mock – das meldet es als Zugriffsfehler, nicht die App
  p.on('pageerror', (e) => !/schlaufuchs_items.*access control/.test(e.message) && errs.push(`${name}: ${e.message}`));
  await p.goto(url);
  await p.evaluate((t) => {
    localStorage.clear();
    localStorage.setItem('schlaufuchs:auth.v1', JSON.stringify({ access_token: t, refresh_token: 'r', expires_at: Math.floor(Date.now() / 1000) + 3600, email: 'eltern@example.com' }));
  }, token);
  await p.reload();
  return p;
}
const answer = async (p, digit) => {
  await p.locator('.numpad button', { hasText: new RegExp(`^${digit}$`) }).click();
  await p.locator('.numpad .ok-key').click();
  await p.getByRole('button', { name: 'Weiter' }).first().click();
};
const stars = async (p) => Number(((await p.locator('.pill[title="Sterne"]').first().innerText()).match(/\d+/) ?? ['-1'])[0]);

const b = await webkit.launch();
const ipad = await device('iPad', 'iPad Pro 11');
const phone = await device('iPhone', 'iPhone 13');

// iPad: Kind anlegen und eine Aufgabe falsch lösen
await ipad.getByRole('button', { name: "Los geht's!" }).click();
await ipad.fill('#name', 'Mia');
await ipad.getByRole('button', { name: '3.' }).click();
await ipad.getByRole('button', { name: 'Fertig – los geht’s!' }).click();
await ipad.getByRole('button', { name: 'Mathe' }).first().click();
await ipad.getByRole('button', { name: /Schriftliche Addition/ }).first().click();
await answer(ipad, 1);
await ipad.getByRole('button', { name: 'Übung beenden' }).click();
const y = ipad.getByRole('button', { name: 'Ja, beenden' });
if (await y.isVisible({ timeout: 800 }).catch(() => false)) await y.click();
await ipad.waitForTimeout(4000);
ok([...rows.keys()].some((k) => k.startsWith('profile|')), 'iPad: Kind ist auf dem Server');
ok([...rows.values()].some((r) => r.kind === 'progress' && r.data.review?.length === 1), 'iPad: Fehler-Kiste ist auf dem Server');

// iPhone: Mia ist da (live angestupst, ohne Neuladen)
let seen = false;
for (let i = 0; i < 20 && !seen; i++) {
  seen = await phone.getByRole('button', { name: /Mia/ }).isVisible().catch(() => false);
  if (!seen) await phone.waitForTimeout(500);
}
ok(seen, 'iPhone: Mia erscheint ohne Neuladen');
await phone.screenshot({ path: `${out}/1-iphone-wer-lernt.png` });
await phone.getByRole('button', { name: /Mia/ }).first().click();
await phone.waitForTimeout(300);
ok((await phone.locator('.tab .badge').first().innerText().catch(() => '')) === '1', 'iPhone: die Fehler-Aufgabe vom iPad steht in der Fehler-Kiste');

// iPhone: eine Aufgabe richtig – das iPad zeigt den Stern live
await ipad.getByRole('button', { name: 'Lernen' }).click().catch(() => {});
const before = await stars(ipad);
await phone.getByRole('button', { name: 'Mathe' }).first().click();
await phone.getByRole('button', { name: /Einmaleins|Plus|Addition/ }).first().click();
await answer(phone, 1);
await phone.waitForTimeout(4500);
const after = await stars(ipad);
const logs = [...rows.values()].filter((r) => r.kind === 'log').reduce((n, r) => n + r.data.length, 0);
ok(logs === 2, `Server: beide Antworten im Verlauf (${logs})`);
const prog = [...rows.values()].find((r) => r.kind === 'progress').data;
const n = Object.values(prog.skills).reduce((a, s) => a + s.n, 0);
ok(n === 2, `Server: Lernstand zählt beide Antworten (${n})`);
const ipadN = await ipad.evaluate(() => Object.values(Object.values(JSON.parse(localStorage.getItem('schlaufuchs:v1')).progress)[0].skills).reduce((a, s) => a + s.n, 0));
ok(ipadN === 2, `iPad: hat die Antwort vom iPhone live, ohne Neuladen (${ipadN})`);
ok(after === before, `iPad: Sterne-Anzeige stimmt (${before} → ${after})`);

// Einstellungen auf dem iPad
await ipad.goto(url);
await ipad.waitForTimeout(1500);
await ipad.locator('button[aria-label*="Einstellungen"], button:has-text("⚙️"), .home-profile, header button').first().click().catch(() => {});
await ipad.waitForTimeout(500);
const text = await ipad.locator('body').innerText();
ok(/Angemeldet als eltern@example\.com/.test(text), 'iPad: Einstellungen zeigen die Anmeldung');
ok(!/Sicherung laden/.test(text), 'kein „Sicherung laden“ mehr');
await ipad.screenshot({ path: `${out}/2-ipad-einstellungen.png`, fullPage: true });

ok(errs.length === 0, `keine Fehler auf den Seiten${errs.length ? `: ${errs.join(' · ')}` : ''}`);
console.log(`${requests} Anfragen an den Server`);
await b.close();
process.exit(fails ? 1 : 0);
