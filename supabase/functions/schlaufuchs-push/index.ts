// Schlaufuchs-Mitteilungen (Sascha 23.10.2026: „Push genauso wie bei GolfOS Rounds“). Eine Supabase Edge Function, eine
// Datei – einmal im Dashboard einfügen (Edge Functions → Deploy a new function → Via editor, Name „schlaufuchs-push“,
// dann „Verify JWT“ aus: die Funktion prüft die Anmeldung der Eltern selbst).
//
// Was sie schickt (an/aus und die Arten gelten für die Familie – Eltern-Datensatz parent.push –, jedes Gerät abonniert für sich):
// - Lern-Erinnerung: ein Kind hat heute noch nicht geübt (17–19 Uhr auf der Uhr des Geräts, einmal am Tag)
// - Klassenarbeit naht: eine eingetragene Arbeit in 3 Tagen und morgen (16–19 Uhr)
// - Vokabelkarten fällig: mindestens 5 Karten im Karteikasten sind dran (15–19 Uhr, einmal am Tag)
// Grundlage sind die abgeglichenen Daten der Familie (schlaufuchs_items) – ohne Konto keine Mitteilungen.
//
// Web Push nach den Standards – die Nachricht für das Gerät verschlüsselt (RFC 8291, aes128gcm), der Absender signiert
// (VAPID, RFC 8292) – mit der Web Crypto der Plattform, ohne Bibliothek (wie golfos-push). Das Schlüsselpaar des Absenders
// erzeugt die Funktion beim ersten Aufruf selbst und hält es in schlaufuchs_push_keys: nichts von Hand zu kopieren, der
// private Schlüssel verlässt den Server nie. Tabellen und der 15-Minuten-Takt: supabase/schlaufuchs-push.sql.

declare const Deno: { env: { get(k: string): string | undefined }; serve(h: (r: Request) => Response | Promise<Response>): void } | undefined;

// ---------- Bytes ----------

export const b64u = (b: Uint8Array): string => {
  let s = '';
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
export const fromB64u = (s: string): Uint8Array => {
  const t = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(t, (c) => c.charCodeAt(0));
};
const cat = (...parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};
const utf8 = (s: string) => new TextEncoder().encode(s);

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, bytes: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8));
}

// ---------- Der Schlüssel des Absenders (VAPID) ----------

export interface VapidKeys {
  publicKey: string; // der unkomprimierte Punkt, base64url – damit abonniert die App
  privateJwk: JsonWebKey;
}

export async function newVapidKeys(): Promise<VapidKeys> {
  const k = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', k.publicKey));
  return { publicKey: b64u(raw), privateJwk: await crypto.subtle.exportKey('jwk', k.privateKey) };
}

/** Der „Authorization“-Kopf einer Mitteilung: ein Token für den Push-Dienst, 12 Stunden gültig. */
export async function vapidHeader(endpoint: string, keys: VapidKeys, subject: string, now = Date.now()): Promise<string> {
  const header = b64u(utf8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u(utf8(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: subject })));
  const key = await crypto.subtle.importKey('jwk', { ...keys.privateJwk, key_ops: ['sign'] }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, utf8(`${header}.${claims}`)));
  return `vapid t=${header}.${claims}.${b64u(sig)}, k=${keys.publicKey}`;
}

// ---------- Die Nachricht, für das Gerät verschlüsselt (RFC 8291) ----------

/** Der Inhalt einer Mitteilung. `fixed` nur für den Test mit dem Beispiel aus dem Standard. */
export async function encrypt(
  plain: Uint8Array,
  uaPublic: Uint8Array,
  authSecret: Uint8Array,
  fixed?: { asPrivate: JsonWebKey; asPublic: Uint8Array; salt: Uint8Array },
): Promise<Uint8Array> {
  let asPrivate: CryptoKey;
  let asPublic: Uint8Array;
  if (fixed) {
    asPrivate = await crypto.subtle.importKey('jwk', fixed.asPrivate, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
    asPublic = fixed.asPublic;
  } else {
    const pair = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
    asPrivate = pair.privateKey;
    asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  }
  const salt = fixed?.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asPrivate, 256));
  const ikm = await hkdf(authSecret, ecdh, cat(utf8('WebPush: info\0'), uaPublic, asPublic), 32);
  const cek = await hkdf(salt, ikm, utf8('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, utf8('Content-Encoding: nonce\0'), 12);
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, cat(plain, new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]); // Datensatzgröße 4096
  return cat(salt, rs, new Uint8Array([asPublic.length]), asPublic, sealed);
}

// ---------- Was die Mitteilungen sagen ----------

export interface Note {
  title: string;
  body: string;
  tag: string; // eine spätere mit demselben tag ersetzt sie auf dem Gerät
  url: string; // öffnet beim Antippen – relativ zur App
}

export type PushKind = 'learn' | 'tests' | 'cards';

/** „Mia“, „Mia und Ben“, „Mia, Ben und Lea“ */
const names = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} und ${xs[xs.length - 1]}`);

export function learnNote(kids: { id: string; name: string; streak: number }[]): Note {
  if (kids.length === 1) {
    const k = kids[0];
    return {
      title: 'Zeit für den Schlaufuchs 🦊',
      body:
        k.streak >= 2
          ? `${k.name} hat heute noch nicht geübt – sonst reißt die Serie von ${k.streak} Tagen. 10 Minuten reichen!`
          : `${k.name} hat heute noch nicht geübt. Wie wäre es mit 10 Minuten?`,
      tag: 'schlaufuchs-learn',
      url: `./#kind=${encodeURIComponent(k.id)}`,
    };
  }
  return { title: 'Zeit für den Schlaufuchs 🦊', body: `${names(kids.map((k) => k.name))} haben heute noch nicht geübt.`, tag: 'schlaufuchs-learn', url: './' };
}

const SUBJECT_NAMES: Record<string, string> = { mathe: 'Mathe', deutsch: 'Deutsch', englisch: 'Englisch' };

export function testNote(kid: { id: string; name: string }, subject: string, daysLeft: number): Note {
  const when = daysLeft === 1 ? 'morgen' : `in ${daysLeft} Tagen`;
  const what = `${SUBJECT_NAMES[subject] ?? 'Klassen'}-Arbeit`;
  return {
    title: `${what} ${when}`,
    body: `${kid.name} schreibt ${when} die ${what} – jetzt kurz wiederholen?`,
    tag: `schlaufuchs-test-${kid.id}`,
    url: `./#kind=${encodeURIComponent(kid.id)}`,
  };
}

export function cardsNote(kid: { id: string; name: string }, due: number): Note {
  return {
    title: 'Vokabelkarten fällig 🗂️',
    body: `Für ${kid.name} sind ${due} Vokabelkarten dran – ein paar Minuten Karteikasten?`,
    tag: `schlaufuchs-cards-${kid.id}`,
    url: `./#karten=${encodeURIComponent(kid.id)}`,
  };
}

export const helloNote = (): Note => ({ title: 'Schlaufuchs', body: 'Mitteilungen sind an ✓', tag: 'schlaufuchs-hello', url: './' });

// ---------- Wann ----------

/** Stunde und Datum (JJJJ-MM-TT) auf der Uhr des Geräts (seine Zeitzone). */
export function clockIn(tz: string | null | undefined, now: Date): { hour: number; day: string } {
  try {
    const f = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', timeZone: tz || 'Europe/Berlin' });
    const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]));
    return { hour: Number(p.hour), day: `${p.year}-${p.month}-${p.day}` };
  } catch {
    return clockIn('Europe/Berlin', now);
  }
}

/** Tag ± n (Kalender, ohne Zeitzonen-Fallen) */
export const addDay = (day: string, n: number): string => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Tage in Folge mit mindestens einer Aufgabe bis gestern (heute fehlt ja noch) – wie die Serie in der App */
export function streakUntilYesterday(days: Record<string, number>, today: string): number {
  let n = 0;
  for (let d = addDay(today, -1); days[d]; d = addDay(d, -1)) n++;
  return n;
}

/** Erinnern? Heute noch nicht geübt, aber in den letzten 14 Tagen schon einmal (wer länger pausiert, wird nicht bedrängt) */
export function needsLearnReminder(days: Record<string, number> | undefined, today: string): boolean {
  if (!days || days[today]) return false;
  for (let i = 1; i <= 14; i++) if (days[addDay(today, -i)]) return true;
  return false;
}

/** Eingetragene Arbeiten in genau 3 Tagen oder morgen */
export function testsDue(planned: { id: string; subject: string; date: string }[] | undefined, today: string): { id: string; subject: string; daysLeft: number }[] {
  const out: { id: string; subject: string; daysLeft: number }[] = [];
  for (const t of planned ?? [])
    for (const n of [3, 1]) if (t.date === addDay(today, n)) out.push({ id: t.id, subject: t.subject, daysLeft: n });
  return out;
}

// Vokabelkarten wie in der App (src/engine/cards.ts): Fach und nächster Termin aus dem Aufgaben-Verlauf
const BOX_DAYS = [0, 1, 3, 7, 14, 30];
const DAY = 24 * 3600e3;
const SLACK = 6 * 3600e3;
export interface Attempt {
  t: number;
  s: string;
  ok: 0 | 1;
  m: string;
  w?: string;
}
/** Wie viele Karten jetzt fällig sind (schon gesehen, Termin erreicht) */
export function dueCards(log: Attempt[], now: number): number {
  const cards = new Map<string, { box: number; due: number }>();
  for (const a of [...log].sort((x, y) => x.t - y.t)) {
    if (!a.w || a.m === 'test') continue;
    const k = `${a.s}|${a.w}`;
    const c = cards.get(k) ?? { box: 0, due: 0 };
    if (!a.ok) {
      c.box = 0;
      c.due = a.t;
    } else if (a.t >= c.due) {
      c.box = Math.min(5, c.box + 1);
      c.due = a.t + BOX_DAYS[c.box] * DAY - SLACK;
    }
    cards.set(k, c);
  }
  let n = 0;
  for (const c of cards.values()) if (c.due <= now) n++;
  return n;
}
export const CARDS_MIN = 5;

// ---------- Der Server ----------

interface Sub {
  endpoint: string;
  user_id: string;
  p256dh: string;
  auth: string;
  kinds: Partial<Record<PushKind, boolean>> | null;
  tz: string | null;
}

const SUBJECT = 'https://saschamoescheit-cpu.github.io/schlaufuchs/';

function env(k: string): string {
  return (typeof Deno !== 'undefined' && Deno.env.get(k)) || '';
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, authorization, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

function db() {
  const url = env('SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const h = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  return {
    get: async <X>(path: string): Promise<X> => {
      const r = await fetch(`${url}/rest/v1/${path}`, { headers: h });
      if (!r.ok) throw new Error(`${path.split('?')[0]} ${r.status} ${await r.text()}`);
      return r.json();
    },
    upsert: async (table: string, row: unknown, onConflict: string) => {
      const r = await fetch(`${url}/rest/v1/${table}?on_conflict=${onConflict}`, { method: 'POST', headers: { ...h, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(row) });
      if (!r.ok) throw new Error(`${table} ${r.status} ${await r.text()}`);
    },
    insertIgnore: async (table: string, rows: unknown[]) => {
      if (!rows.length) return;
      await fetch(`${url}/rest/v1/${table}`, { method: 'POST', headers: { ...h, Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify(rows) });
    },
    patch: async (path: string, body: unknown) => {
      await fetch(`${url}/rest/v1/${path}`, { method: 'PATCH', headers: { ...h, Prefer: 'return=minimal' }, body: JSON.stringify(body) });
    },
    del: async (path: string) => {
      await fetch(`${url}/rest/v1/${path}`, { method: 'DELETE', headers: h });
    },
  };
}

let keysCache: VapidKeys | null = null;
async function senderKeys(): Promise<VapidKeys> {
  if (keysCache) return keysCache;
  const d = db();
  const rows = await d.get<{ public_key: string; private_jwk: JsonWebKey }[]>('schlaufuchs_push_keys?id=eq.1&select=public_key,private_jwk');
  if (rows.length) return (keysCache = { publicKey: rows[0].public_key, privateJwk: rows[0].private_jwk });
  const k = await newVapidKeys();
  await d.insertIgnore('schlaufuchs_push_keys', [{ id: 1, public_key: k.publicKey, private_jwk: k.privateJwk }]);
  return senderKeys(); // der zuerst gespeicherte gilt
}

/** Eine Mitteilung an ein Gerät; ein Abo, das der Push-Dienst nicht mehr kennt, wird entfernt. */
async function send(sub: Sub, note: Note, ttl = 6 * 3600): Promise<boolean> {
  const keys = await senderKeys();
  const body = await encrypt(utf8(JSON.stringify(note)), fromB64u(sub.p256dh), fromB64u(sub.auth));
  const r = await fetch(sub.endpoint, {
    method: 'POST',
    headers: { Authorization: await vapidHeader(sub.endpoint, keys, SUBJECT), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: String(ttl), Urgency: 'normal' },
    body,
  });
  if (r.status === 404 || r.status === 410) await db().del(`schlaufuchs_push?endpoint=eq.${encodeURIComponent(sub.endpoint)}`);
  return r.ok;
}

/** Wer ruft: die Anmeldung über Supabase Auth geprüft. */
async function caller(req: Request): Promise<string | null> {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const r = await fetch(`${env('SUPABASE_URL')}/auth/v1/user`, { headers: { apikey: req.headers.get('apikey') || env('SUPABASE_ANON_KEY'), Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  return ((await r.json()) as { id?: string }).id ?? null;
}

const SUB_FIELDS = 'endpoint,user_id,p256dh,auth,kinds,tz';
/** Mitteilungen der Familie (Eltern-Datensatz, zwischen den Geräten abgeglichen) – gilt vor der Einstellung des Geräts */
export interface FamilyPush {
  on: boolean;
  kinds?: Partial<Record<PushKind, boolean>>;
}
export const kindOn = (s: Pick<Sub, 'kinds'>, k: PushKind, family?: FamilyPush | null): boolean => (family?.kinds?.[k] ?? s.kinds?.[k]) !== false;

interface Kid {
  id: string;
  name: string;
  plannedTests?: { id: string; subject: string; date: string }[];
}

async function tick(now = new Date()): Promise<{ learn: number; tests: number; cards: number }> {
  const d = db();
  const subs = await d.get<Sub[]>(`schlaufuchs_push?select=${SUB_FIELDS}`);
  const out = { learn: 0, tests: 0, cards: 0 };
  const byUser = new Map<string, Sub[]>();
  for (const s of subs) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);
  for (const [user, mine] of byUser) {
    const { hour, day: today } = clockIn(mine[0].tz, now);
    if (hour < 15 || hour > 19) continue; // alle Erinnerungen liegen zwischen 15 und 20 Uhr
    const items = await d.get<{ kind: string; id: string; data: unknown }[]>(`schlaufuchs_items?select=kind,id,data&user_id=eq.${user}&deleted=eq.false&kind=in.(profile,progress,parent)`);
    // die Familie hat Mitteilungen ausgeschaltet: auch Geräte, die das noch nicht mitbekommen haben, bekommen nichts
    const family = (items.find((x) => x.kind === 'parent')?.data as { push?: FamilyPush } | undefined)?.push ?? null;
    if (family && family.on === false) continue;
    const on = (s: Sub, k: PushKind) => kindOn(s, k, family);
    const want = (k: PushKind, from: number, to: number) => hour >= from && hour <= to && mine.some((s) => on(s, k));
    const wantLearn = want('learn', 17, 19);
    const wantTests = want('tests', 16, 19);
    const wantCards = want('cards', 15, 19);
    if (!wantLearn && !wantTests && !wantCards) continue;
    const kids = items.filter((x) => x.kind === 'profile').map((x) => x.data as Kid);
    if (!kids.length) continue;
    const days = new Map(items.filter((x) => x.kind === 'progress').map((x) => [x.id, ((x.data as { days?: Record<string, number> }).days ?? {})]));
    const sentRows = await d.get<{ key: string }[]>(`schlaufuchs_push_sent?select=key&user_id=eq.${user}&key=like.*${today}*`);
    const sent = new Set(sentRows.map((x) => x.key));
    const mark: string[] = [];
    const deliver = async (k: PushKind, note: Note) => {
      for (const s of mine) if (on(s, k)) await send(s, note);
    };
    // Lern-Erinnerung: alle Kinder, die heute noch nicht geübt haben, in einer Mitteilung
    if (wantLearn) {
      const due = kids
        .filter((k) => !sent.has(`learn:${k.id}:${today}`) && needsLearnReminder(days.get(k.id), today))
        .map((k) => ({ id: k.id, name: k.name, streak: streakUntilYesterday(days.get(k.id) ?? {}, today) }));
      if (due.length) {
        await deliver('learn', learnNote(due));
        mark.push(...due.map((k) => `learn:${k.id}:${today}`));
        out.learn += due.length;
      }
    }
    // Klassenarbeit: in 3 Tagen und morgen, je Arbeit einmal
    if (wantTests)
      for (const k of kids)
        for (const t of testsDue(k.plannedTests, today)) {
          const key = `test:${k.id}:${t.id}:${t.daysLeft}:${today}`;
          if (sent.has(key)) continue;
          await deliver('tests', testNote(k, t.subject, t.daysLeft));
          mark.push(key);
          out.tests++;
        }
    // Vokabelkarten: aus dem Verlauf der letzten Wochen (die Fächer reichen bis 30 Tage)
    if (wantCards) {
      const fresh = kids.filter((k) => !sent.has(`cards:${k.id}:${today}`));
      if (fresh.length) {
        const since = addDay(today, -70);
        for (const k of fresh) {
          // Verlaufszeilen heißen „<Kind>/<Tag>“
          const rows = await d.get<{ id: string; data: Attempt[] }[]>(`schlaufuchs_items?select=id,data&user_id=eq.${user}&deleted=eq.false&kind=eq.log&id=like.${encodeURIComponent(`${k.id}/*`)}`);
          const log = rows.filter((x) => x.id.slice(k.id.length + 1) >= since).flatMap((x) => x.data ?? []);
          const n = dueCards(log, now.getTime());
          if (n < CARDS_MIN) continue;
          await deliver('cards', cardsNote(k, n));
          mark.push(`cards:${k.id}:${today}`);
          out.cards++;
        }
      }
    }
    await d.insertIgnore('schlaufuchs_push_sent', mark.map((key) => ({ user_id: user, key })));
  }
  return out;
}

export async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  try {
    if (req.method === 'GET') return json({ publicKey: (await senderKeys()).publicKey });
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(body.action ?? '');
    if (action === 'key') return json({ publicKey: (await senderKeys()).publicKey });
    if (action === 'tick') return json(await tick());
    const user = await caller(req);
    if (!user) return json({ error: 'not signed in' }, 401);
    const d = db();
    if (action === 'subscribe') {
      const s = body.subscription as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | undefined;
      if (!s?.endpoint || !/^https:\/\//.test(s.endpoint) || !s.keys?.p256dh || !s.keys?.auth) return json({ error: 'no subscription' }, 400);
      const row = { endpoint: s.endpoint, user_id: user, p256dh: s.keys.p256dh, auth: s.keys.auth, kinds: body.kinds ?? null, tz: String(body.tz ?? '').slice(0, 60) || null, updated_at: new Date().toISOString() };
      await d.del(`schlaufuchs_push?endpoint=eq.${encodeURIComponent(s.endpoint)}&user_id=neq.${user}`); // das Gerät gehörte vorher zu einem anderen Konto
      await d.upsert('schlaufuchs_push', row, 'endpoint');
      // still (quiet): ein Gerät zieht nach, weil ein anderes der Familie eingeschaltet hat – dann ohne Gruß
      if (body.quiet === true) return json({ ok: true, sent: false });
      const [mine] = await d.get<Sub[]>(`schlaufuchs_push?select=${SUB_FIELDS}&endpoint=eq.${encodeURIComponent(s.endpoint)}`);
      const ok = mine ? await send(mine, helloNote()) : false;
      return json({ ok, sent: ok });
    }
    const endpoint = String(body.endpoint ?? '');
    const mineOnly = `endpoint=eq.${encodeURIComponent(endpoint)}&user_id=eq.${user}`;
    if (action === 'unsubscribe') {
      await d.del(`schlaufuchs_push?${mineOnly}`);
      return json({ ok: true });
    }
    if (action === 'settings') {
      await d.patch(`schlaufuchs_push?${mineOnly}`, { kinds: body.kinds ?? null, updated_at: new Date().toISOString() });
      return json({ ok: true });
    }
    return json({ error: 'unknown action' }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
}

if (typeof Deno !== 'undefined') Deno.serve(handle);
