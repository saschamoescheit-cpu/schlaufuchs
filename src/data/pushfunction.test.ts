import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { b64u, fromB64u } from '../../supabase/functions/schlaufuchs-push/index';

// Die Mitteilungs-Funktion als Ganzes (Sascha 23.10.2026, wie bei GolfOS Rounds), so wie Supabase sie ausführt: ihre
// Anfragen beantwortet eine kleine Nachbildung der Datenbank (die wenigen Abfrageformen, die sie nutzt), die Push-Dienste
// ein Rekorder. Jede verschickte Mitteilung wird mit dem Schlüssel des Geräts entschlüsselt und gelesen – was die Familie sähe.

type Row = Record<string, unknown>;
const tables: Record<string, Row[]> = {};
const pushes: { endpoint: string; headers: Record<string, string>; body: Uint8Array }[] = [];
const users: Record<string, string> = { 'token-familie': 'u-familie', 'token-andere': 'u-andere' };
const GONE = 'https://updates.push.services.mozilla.com/wpush/v2/gone';

function matches(row: Row, params: URLSearchParams): boolean {
  for (const [key, cond] of params) {
    if (key === 'select' || key === 'on_conflict') continue;
    const dot = cond.indexOf('.');
    const op = cond.slice(0, dot);
    const val = cond.slice(dot + 1);
    const v = row[key];
    if (op === 'eq' && String(v) !== val) return false;
    if (op === 'neq' && String(v) === val) return false;
    if (op === 'in' && !val.slice(1, -1).split(',').includes(String(v))) return false;
    if (op === 'like' && !new RegExp(`^${val.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`).test(String(v))) return false;
  }
  return true;
}
const KEYS: Record<string, string[]> = { schlaufuchs_push: ['endpoint'], schlaufuchs_push_sent: ['user_id', 'key'], schlaufuchs_push_keys: ['id'] };
const same = (t: string, a: Row, b: Row) => KEYS[t].every((k) => a[k] === b[k]);

async function fakeFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const u = new URL(String(input));
  const method = init?.method ?? 'GET';
  const headers = Object.fromEntries(Object.entries((init?.headers as Record<string, string>) ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
  if (u.host === 'db.test' && u.pathname === '/auth/v1/user') {
    const id = users[(headers.authorization ?? '').replace('Bearer ', '')];
    return id ? Response.json({ id }) : new Response('nein', { status: 401 });
  }
  if (u.host === 'db.test' && u.pathname.startsWith('/rest/v1/')) {
    expect(headers.authorization).toBe('Bearer service-key'); // die Funktion liest und schreibt mit dem Service-Schlüssel
    const t = u.pathname.slice(9);
    const rows = (tables[t] ??= []);
    if (method === 'GET') return Response.json(rows.filter((r) => matches(r, u.searchParams)));
    if (method === 'DELETE') {
      tables[t] = rows.filter((r) => !matches(r, u.searchParams));
      return new Response(null, { status: 204 });
    }
    if (method === 'PATCH') {
      const patch = JSON.parse(String(init!.body));
      for (const r of rows) if (matches(r, u.searchParams)) Object.assign(r, patch);
      return new Response(null, { status: 204 });
    }
    if (method === 'POST') {
      const body = JSON.parse(String(init!.body));
      for (const x of Array.isArray(body) ? body : [body]) {
        const old = rows.find((r) => same(t, r, x));
        if (old && /merge-duplicates/.test(headers.prefer ?? '')) Object.assign(old, x);
        else if (!old) rows.push({ ...x });
      }
      return new Response(null, { status: 201 });
    }
  }
  pushes.push({ endpoint: String(input), headers, body: new Uint8Array(init!.body as ArrayBuffer) });
  return new Response(null, { status: String(input) === GONE ? 410 : 201 });
}

let handle: (r: Request) => Promise<Response>;
beforeAll(async () => {
  (globalThis as { Deno?: unknown }).Deno = {
    env: { get: (k: string) => ({ SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'service-key', SUPABASE_ANON_KEY: 'anon-key' })[k] },
    serve: () => {},
  };
  vi.stubGlobal('fetch', fakeFetch);
  handle = (await import('../../supabase/functions/schlaufuchs-push/index')).handle;
});
afterEach(() => vi.useRealTimers());
afterAll(() => {
  vi.unstubAllGlobals();
  delete (globalThis as { Deno?: unknown }).Deno;
});

/** die Uhr für einen Takt stellen (nur Date – fetch und Krypto laufen normal) */
const at = (iso: string) => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(iso));
};
const post = (body: unknown, token?: string) =>
  handle(new Request('https://db.test/functions/v1/schlaufuchs-push', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) }));
const tick = async () => (await post({ action: 'tick' })).json();

/** ein Gerät: eigenes Schlüsselpaar und Geheimnis, wie der Browser sie macht */
async function device(endpoint: string) {
  const k = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', k.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));
  const read = async (body: Uint8Array) => {
    const hk = async (salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, n: number) =>
      new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), n * 8));
    const te = new TextEncoder();
    const as = body.slice(21, 21 + body[20]);
    const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: await crypto.subtle.importKey('raw', as, { name: 'ECDH', namedCurve: 'P-256' }, false, []) }, k.privateKey, 256));
    const ikm = await hk(auth, ecdh, new Uint8Array([...te.encode('WebPush: info'), 0, ...pub, ...as]), 32);
    const salt = body.slice(0, 16);
    const cek = await hk(salt, ikm, new Uint8Array([...te.encode('Content-Encoding: aes128gcm'), 0]), 16);
    const nonce = await hk(salt, ikm, new Uint8Array([...te.encode('Content-Encoding: nonce'), 0]), 12);
    const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']), body.slice(21 + body[20])));
    return JSON.parse(new TextDecoder().decode(plain.slice(0, plain.lastIndexOf(2))));
  };
  const inbox = async () => Promise.all(pushes.filter((p) => p.endpoint === endpoint).map((p) => read(p.body)));
  return { subscription: { endpoint, keys: { p256dh: b64u(pub), auth: b64u(auth) } }, inbox };
}

// Familie mit zwei Kindern; das iPad meldet alles, das Eltern-Handy nur Klassenarbeiten
let ipad: Awaited<ReturnType<typeof device>>;
let handy: Awaited<ReturnType<typeof device>>;
const DAY = 24 * 3600e3;
const item = (kind: string, id: string, data: unknown) => ({ user_id: 'u-familie', kind, id, deleted: false, data });
// Mias Vokabeln vom 10.10.: 6 Wörter gewusst → Fach 1, am 11.10. wieder dran – am 23.10. alle fällig
const words = ['red', 'blue', 'green', 'yellow', 'pink', 'black'];
const mia = { id: 'k1', name: 'Mia' };
const ben = { id: 'k2', name: 'Ben', plannedTests: [{ id: 't1', subject: 'mathe', date: '2026-10-24', skills: [] }] };

describe('die Mitteilungs-Funktion, von vorne bis hinten gegen eine Nachbildung der Datenbank', () => {
  it('gibt ihren Schlüssel heraus – einmal erzeugt, jedes Mal derselbe', async () => {
    const a = await (await handle(new Request('https://db.test/functions/v1/schlaufuchs-push'))).json();
    const b = await (await post({ action: 'key' })).json();
    expect(fromB64u(a.publicKey).length).toBe(65);
    expect(b.publicKey).toBe(a.publicKey);
    expect(tables.schlaufuchs_push_keys.length).toBe(1);
  });

  it('nur angemeldete Eltern abonnieren; das Gerät bekommt einen Gruß, den es lesen kann', async () => {
    ipad = await device('https://web.push.apple.com/kinder-ipad');
    handy = await device('https://fcm.googleapis.com/fcm/send/eltern-handy');
    expect((await post({ action: 'subscribe', subscription: ipad.subscription })).status).toBe(401);
    expect((await post({ action: 'subscribe', subscription: ipad.subscription }, 'gefälscht')).status).toBe(401);
    const r = await post({ action: 'subscribe', subscription: ipad.subscription, kinds: { learn: true, tests: true, cards: true }, tz: 'Europe/Berlin' }, 'token-familie');
    expect(await r.json()).toEqual({ ok: true, sent: true });
    await post({ action: 'subscribe', subscription: handy.subscription, kinds: { learn: false, tests: true, cards: false }, tz: 'Europe/Berlin' }, 'token-familie');
    expect(tables.schlaufuchs_push.map((x) => x.user_id)).toEqual(['u-familie', 'u-familie']);
    expect(await ipad.inbox()).toEqual([expect.objectContaining({ title: 'Schlaufuchs', body: 'Mitteilungen sind an ✓' })]);
    const sent = pushes[0];
    expect(sent.headers['content-encoding']).toBe('aes128gcm');
    expect(sent.headers.authorization).toMatch(/^vapid t=.+, k=/);
  });

  it('nachmittags: Lern-Erinnerung für Mia, Klassenarbeit morgen für Ben, Mias Vokabelkarten – jede nur einmal', async () => {
    const t10 = Date.parse('2026-10-10T15:00:00Z');
    tables.schlaufuchs_items = [
      item('profile', 'k1', mia),
      item('profile', 'k2', ben),
      item('progress', 'k1', { days: { '2026-10-22': 12, '2026-10-21': 8, '2026-10-20': 3, '2026-10-10': 6 } }), // gestern ja, heute nicht
      item('progress', 'k2', { days: { '2026-10-23': 5, '2026-10-22': 4 } }), // heute schon geübt
      item('log', 'k1/2026-10-10', words.map((w, i) => ({ t: t10 + i, s: 'e1-colours', ok: 1, m: 'karten', w }))),
      item('log', 'k2/2026-10-23', [{ t: Date.parse('2026-10-23T09:00:00Z'), s: 'm2-plus100', ok: 1, m: 'übung' }]),
      { ...item('profile', 'k9', { id: 'k9', name: 'Gelöscht' }), deleted: true },
      { user_id: 'u-andere', kind: 'profile', id: 'x1', deleted: false, data: { id: 'x1', name: 'Fremd' } },
    ];
    // morgens: nichts
    at('2026-10-23T06:00:00Z');
    expect(await tick()).toEqual({ learn: 0, tests: 0, cards: 0 });
    // 17:30 Uhr in Berlin
    at('2026-10-23T15:30:00Z');
    expect(await tick()).toEqual({ learn: 1, tests: 1, cards: 1 });
    const notes = (await ipad.inbox()).slice(1);
    expect(notes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Zeit für den Schlaufuchs 🦊', body: 'Mia hat heute noch nicht geübt – sonst reißt die Serie von 3 Tagen. 10 Minuten reichen!', url: './#kind=k1' }),
        expect.objectContaining({ title: 'Mathe-Arbeit morgen', body: 'Ben schreibt morgen die Mathe-Arbeit – jetzt kurz wiederholen?', url: './#kind=k2' }),
        expect.objectContaining({ title: 'Vokabelkarten fällig 🗂️', body: 'Für Mia sind 6 Vokabelkarten dran – ein paar Minuten Karteikasten?', url: './#karten=k1' }),
      ]),
    );
    expect(notes).toHaveLength(3);
    expect(notes.some((n) => /Gelöscht|Fremd/.test(n.body))).toBe(false);
    // das Eltern-Handy hat nur Klassenarbeiten an
    expect((await handy.inbox()).slice(1).map((n) => n.title)).toEqual(['Mathe-Arbeit morgen']);
    // der nächste Takt: schon geschickt
    at('2026-10-23T15:45:00Z');
    expect(await tick()).toEqual({ learn: 0, tests: 0, cards: 0 });
    // abends um 21 Uhr: nichts mehr
    at('2026-10-23T19:00:00Z');
    expect(await tick()).toEqual({ learn: 0, tests: 0, cards: 0 });
  });

  it('am nächsten Tag neu – nach dem Üben keine Lern-Erinnerung, die Arbeit ist vorbei', async () => {
    tables.schlaufuchs_items.find((x) => x.kind === 'progress' && x.id === 'k1')!.data = { days: { '2026-10-24': 7, '2026-10-23': 2 } };
    tables.schlaufuchs_items.find((x) => x.kind === 'progress' && x.id === 'k2')!.data = { days: { '2026-10-23': 5 } };
    at('2026-10-24T15:30:00Z');
    const r = await tick();
    expect(r).toEqual({ learn: 1, tests: 0, cards: 1 }); // nur Ben (Mia hat heute geübt); Mias Karten sind weiter fällig – einmal am Tag
    const today = (await ipad.inbox()).slice(-2);
    expect(today.map((n) => n.body)).toEqual(['Ben hat heute noch nicht geübt. Wie wäre es mit 10 Minuten?', 'Für Mia sind 6 Vokabelkarten dran – ein paar Minuten Karteikasten?']);
  });

  it('ein Gerät, das der Push-Dienst nicht mehr kennt, wird vergessen; ausgeschaltet ist es weg; nur das eigene', async () => {
    const alt = await device(GONE);
    await post({ action: 'subscribe', subscription: alt.subscription }, 'token-familie'); // der Gruß kommt mit 410 zurück
    expect(tables.schlaufuchs_push.some((r) => r.endpoint === GONE)).toBe(false);
    const ep = handy.subscription.endpoint;
    await post({ action: 'unsubscribe', endpoint: ep }, 'token-andere'); // nicht dessen Gerät: bleibt
    expect(tables.schlaufuchs_push.some((r) => r.endpoint === ep)).toBe(true);
    await post({ action: 'settings', endpoint: ep, kinds: { learn: true, tests: false, cards: false } }, 'token-familie');
    expect(tables.schlaufuchs_push.find((r) => r.endpoint === ep)!.kinds).toEqual({ learn: true, tests: false, cards: false });
    await post({ action: 'unsubscribe', endpoint: ep }, 'token-familie');
    expect(tables.schlaufuchs_push.some((r) => r.endpoint === ep)).toBe(false);
    expect((await post({ action: 'subscribe', subscription: { endpoint: 'http://unsicher.example/x', keys: { p256dh: 'a', auth: 'b' } } }, 'token-familie')).status).toBe(400);
    expect((await post({ action: 'unsinn' }, 'token-familie')).status).toBe(400);
    expect(DAY).toBeGreaterThan(0);
  });
});
