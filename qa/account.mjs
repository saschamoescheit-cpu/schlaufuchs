// node qa/account.mjs [url] [outDir] – Konto mit Benutzername + Passwort: auf dem iPad anlegen, auf dem iPhone mit
// Benutzername + Passwort anmelden → dieselben Kinder. Gegen einen simulierten Supabase (Anmeldung, RPCs, Tabelle).
import { webkit, devices } from 'playwright';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5191/';
const out = process.argv[3] ?? 'qa/shots-account';
mkdirSync(out, { recursive: true });
let fails = 0;
const ok = (c, m) => {
  console.log(`${c ? '✓' : '✗'} ${m}`);
  if (!c) fails++;
};

// ---- simulierter Server ----
const users = new Map(); // email → { id, password }
const names = new Map(); // username → user id
const rows = new Map(); // `${uid}|${kind}|${id}` → row
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (sub) => `${b64({ alg: 'none' })}.${b64({ sub })}.x`;
const subOf = (req) => {
  const t = (req.headers()['authorization'] ?? '').replace('Bearer ', '');
  try {
    return JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString()).sub;
  } catch {
    return null;
  }
};
const session = (u, email) => ({ access_token: jwt(u.id), refresh_token: `r-${u.id}`, expires_in: 3600, token_type: 'bearer', user: { id: u.id, email } });
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'apikey, authorization, content-type, prefer', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,OPTIONS' };
const stamp = (at) => new Date(at).toISOString().replace('Z', '+00:00');
const unq = (s) => s.replace(/^"|"$/g, '').replace(/\\"/g, '"');
function matches(row, q) {
  for (const [k, v] of q) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(k)) continue;
    if (v.startsWith('eq.') && String(row[k]) !== v.slice(3)) return false;
    if (v.startsWith('in.(') && !v.slice(4, -1).match(/"(?:[^"\\]|\\.)*"|[^,]+/g).map(unq).includes(row[k])) return false;
  }
  return true;
}
let calls = { signup: 0, token: 0, rpc: 0 };
async function server(route) {
  const req = route.request();
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  const u = new URL(req.url());
  const json = (status, body) => route.fulfill({ status, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const body = req.postData() ? JSON.parse(req.postData()) : null;
  if (u.pathname === '/auth/v1/signup') {
    calls.signup++;
    if (users.has(body.email)) return json(422, { code: 422, error_code: 'user_already_exists', msg: 'User already registered' });
    const name = body.data?.sf_username;
    if (name && names.has(name)) return json(500, { code: 500, error_code: 'unexpected_failure', msg: 'Database error saving new user' });
    const user = { id: `u${users.size + 1}`, password: body.password };
    users.set(body.email, user);
    if (name) names.set(name, user.id);
    return json(200, session(user, body.email));
  }
  if (u.pathname === '/auth/v1/token') {
    calls.token++;
    const user = users.get(body.email);
    if (!user || user.password !== body.password) return json(400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' });
    return json(200, session(user, body.email));
  }
  if (u.pathname === '/auth/v1/user' && req.method() === 'PUT') {
    const uid = subOf(req);
    const e = [...users].find(([, x]) => x.id === uid);
    if (body.password) e[1].password = body.password;
    return json(200, { id: uid, email: e[0] });
  }
  if (u.pathname.startsWith('/rest/v1/rpc/')) {
    calls.rpc++;
    const fn = u.pathname.split('/').pop();
    if (fn === 'schlaufuchs_name_free') return json(200, !names.has(body.p_username));
    if (fn === 'schlaufuchs_login_email') {
      const uid = names.get(body.p_username);
      const e = [...users].find(([, x]) => x.id === uid && x.password === body.p_password);
      return json(200, e ? e[0] : null);
    }
    if (fn === 'schlaufuchs_set_username') {
      if (names.has(body.p_username) && names.get(body.p_username) !== subOf(req)) return json(409, { code: '23505', message: 'duplicate key value violates unique constraint' });
      for (const [n, id] of names) if (id === subOf(req)) names.delete(n);
      names.set(body.p_username, subOf(req));
      return route.fulfill({ status: 204, headers: cors, body: '' });
    }
  }
  if (u.pathname === '/rest/v1/schlaufuchs_names') return json(200, [...names].filter(([, id]) => id === subOf(req)).map(([username]) => ({ username })));
  if (u.pathname === '/rest/v1/schlaufuchs_items') {
    const uid = subOf(req);
    const q = [...u.searchParams.entries()];
    const mine = () => [...rows].filter(([k]) => k.startsWith(`${uid}|`)).map(([, r]) => r);
    const put = (r) => rows.set(`${uid}|${r.kind}|${r.id}`, { kind: r.kind, id: r.id, data: r.data, deleted: !!r.deleted, updated_at: stamp(r.updated_at) });
    if (req.method() === 'GET') {
      const sel = u.searchParams.get('select').split(',');
      return json(200, mine().filter((r) => matches(r, q)).map((r) => Object.fromEntries(sel.map((k) => [k, r[k]]))));
    }
    const prefer = req.headers()['prefer'] ?? '';
    if (req.method() === 'POST') {
      const done = [];
      for (const r of body) {
        if (rows.has(`${uid}|${r.kind}|${r.id}`) && prefer.includes('ignore-duplicates')) continue;
        put(r);
        done.push(r);
      }
      return prefer.includes('return=representation') ? json(201, done) : route.fulfill({ status: 201, headers: cors, body: '' });
    }
    if (req.method() === 'PATCH') {
      const hit = mine().filter((r) => matches(r, q));
      for (const r of hit) put({ ...r, ...body });
      return json(200, hit);
    }
  }
  return json(404, { msg: `nicht simuliert: ${req.method()} ${u.pathname}` });
}
const sockets = new Set();
function realtime(ws) {
  sockets.add(ws);
  ws.onMessage((m) => {
    const d = JSON.parse(String(m));
    if (d.event === 'phx_join') ws.send(JSON.stringify({ topic: d.topic, event: 'phx_reply', payload: { status: 'ok', response: {} }, ref: d.ref }));
    if (d.event === 'broadcast') for (const o of sockets) if (o !== ws) o.send(JSON.stringify({ topic: d.topic, event: 'broadcast', payload: d.payload, ref: null }));
  });
  ws.onClose(() => sockets.delete(ws));
}

const errs = [];
const b = await webkit.launch();
async function device(name, dev) {
  const ctx = await b.newContext({ ...devices[dev], locale: 'de-DE' });
  // ein Test-Projekt statt des echten (sync.ts liest window.__schlaufuchsSupabase)
  await ctx.addInitScript(() => { window.__schlaufuchsSupabase = { url: 'https://test-sf.supabase.co', key: 'test', google: true }; });
  await ctx.route(/supabase\.co\/(auth|rest)\//, server);
  await ctx.routeWebSocket(/supabase\.co\/realtime/, realtime);
  const p = await ctx.newPage();
  // WebKit leitet den CORS-Vorabcheck nicht durch den Mock – das meldet es als Zugriffsfehler, nicht die App
  p.on('pageerror', (e) => !/supabase\.co.*access control/.test(e.message) && errs.push(`${name}: ${e.message}`));
  await p.goto(url);
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  return p;
}
const until = async (fn, ms = 10000) => {
  for (let t = 0; t < ms; t += 400) {
    if (await fn().catch(() => false)) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
};

// iPad: Konto anlegen
const ipad = await device('iPad', 'iPad Pro 11');
await ipad.getByRole('button', { name: 'Schon auf einem anderen Gerät? Anmelden' }).click();
await ipad.getByRole('tab', { name: 'Konto anlegen' }).click();
await ipad.fill('#acc-name', 'Familie.M');
await ipad.fill('#acc-email', 'eltern@example.com');
await ipad.fill('#acc-pw', 'kurz');
ok(await ipad.getByRole('button', { name: 'Konto anlegen', exact: true }).isDisabled(), 'zu kurzes Passwort: „Konto anlegen“ gesperrt');
await ipad.fill('#acc-pw', 'geheim123');
await ipad.screenshot({ path: `${out}/1-ipad-konto-anlegen.png`, fullPage: true });
await ipad.getByRole('button', { name: 'Konto anlegen', exact: true }).click();
ok(await until(() => ipad.getByText(/noch kein Kind angelegt|werden geladen/).isVisible()), 'iPad: nach dem Anlegen angemeldet');
ok(names.get('familie.m') === 'u1', 'Benutzername klein geschrieben auf dem Server');
await ipad.getByRole('button', { name: "Los geht's!" }).click();
await ipad.fill('#name', 'Mia');
await ipad.getByRole('button', { name: '2.' }).click();
await ipad.getByRole('button', { name: 'Fertig – los geht’s!' }).click();
ok(await until(async () => [...rows.keys()].some((k) => k.startsWith('u1|profile|'))), 'iPad: Mia ist auf dem Server');

// iPhone: erst falsches, dann richtiges Passwort
const phone = await device('iPhone', 'iPhone 13');
await phone.getByRole('button', { name: 'Schon auf einem anderen Gerät? Anmelden' }).click();
await phone.fill('#acc-name', ' familie.M ');
await phone.fill('#acc-pw', 'falsch123');
await phone.getByRole('button', { name: 'Anmelden', exact: true }).click();
ok(await until(() => phone.getByRole('alert').filter({ hasText: 'stimmt nicht' }).isVisible()), 'iPhone: falsches Passwort wird gemeldet');
await phone.fill('#acc-pw', 'geheim123');
await phone.screenshot({ path: `${out}/2-iphone-anmelden.png`, fullPage: true });
await phone.getByRole('button', { name: 'Anmelden', exact: true }).click();
ok(await until(() => phone.getByRole('button', { name: /Mia/ }).isVisible()), 'iPhone: mit Benutzername + Passwort angemeldet, Mia ist da');
await phone.screenshot({ path: `${out}/3-iphone-wer-lernt.png` });

// iPhone: Einstellungen zeigen den Benutzernamen
await phone.getByRole('button', { name: /Mia/ }).first().click();
await phone.locator('button[aria-label*="Einstellungen"]').first().click();
await phone.waitForTimeout(400);
const text = await phone.locator('body').innerText();
ok(/Angemeldet als familie\.m/.test(text), 'iPhone: „Angemeldet als familie.m“');
ok(/Benutzernamen familie\.m und deinem Passwort/.test(text), 'Hinweis, wie man sich auf anderen Geräten anmeldet');
await phone.screenshot({ path: `${out}/4-iphone-einstellungen.png`, fullPage: true });

// Passwort ändern → neues gilt
await phone.getByRole('button', { name: 'Benutzername & Passwort' }).click();
await phone.fill('#ed-pw', 'neuesPasswort1');
await phone.getByRole('button', { name: 'Speichern' }).click();
ok(await until(async () => users.get('eltern@example.com').password === 'neuesPasswort1'), 'Passwort geändert');

// ein drittes Gerät: vergebener Benutzername
const pc = await device('PC', 'Desktop Chrome');
await pc.getByRole('button', { name: 'Schon auf einem anderen Gerät? Anmelden' }).click();
await pc.getByRole('tab', { name: 'Konto anlegen' }).click();
await pc.fill('#acc-name', 'familie.m');
await pc.fill('#acc-email', 'andere@example.com');
await pc.fill('#acc-pw', 'geheim456');
await pc.getByRole('button', { name: 'Konto anlegen', exact: true }).click();
ok(await until(() => pc.getByRole('alert').filter({ hasText: 'schon vergeben' }).isVisible()), 'PC: vergebener Benutzername wird gemeldet');
// mit E-Mail statt Benutzername und dem neuen Passwort
await pc.getByRole('tab', { name: 'Anmelden' }).click();
await pc.fill('#acc-name', 'eltern@example.com');
await pc.fill('#acc-pw', 'neuesPasswort1');
await pc.getByRole('button', { name: 'Anmelden', exact: true }).click();
ok(await until(() => pc.getByRole('button', { name: /Mia/ }).isVisible()), 'PC: Anmeldung mit E-Mail + neuem Passwort, Mia ist da');

ok(errs.length === 0, `keine Fehler auf den Seiten${errs.length ? `: ${errs.join(' · ')}` : ''}`);
console.log(`Anfragen: ${JSON.stringify(calls)}`);
await b.close();
process.exit(fails ? 1 : 0);
