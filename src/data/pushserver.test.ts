import { describe, expect, it } from 'vitest';
import {
  addDay,
  b64u,
  cardsNote,
  clockIn,
  dueCards,
  encrypt,
  fromB64u,
  learnNote,
  needsLearnReminder,
  newVapidKeys,
  streakUntilYesterday,
  testNote,
  testsDue,
  vapidHeader,
  type Attempt,
} from '../../supabase/functions/schlaufuchs-push/index';
import { cardStates } from '../engine/cards';
import type { Attempt as AppAttempt } from '../engine/learning';

// Die Mitteilungs-Funktion (Sascha 23.10.2026, wie bei GolfOS Rounds): die Verschlüsselung gegen das Beispiel des
// Standards (RFC 8291, Anhang A) und durch Entschlüsseln wie ein Gerät geprüft; die Signatur des Absenders (VAPID) mit
// seinem Schlüssel; dazu die Regeln, wann welche Erinnerung kommt.

const jwkOf = (d: string, pub: Uint8Array): JsonWebKey => ({ kty: 'EC', crv: 'P-256', d, x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33)), ext: true });

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, n: number) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, n * 8));
}

/** Die Seite des Geräts, aus dem Standard: Kopf lesen, Schlüssel vereinbaren, Datensatz öffnen. */
async function decrypt(body: Uint8Array, uaPrivate: JsonWebKey, uaPublic: Uint8Array, auth: Uint8Array): Promise<string> {
  const salt = body.slice(0, 16);
  const rs = new DataView(body.buffer, body.byteOffset + 16, 4).getUint32(0);
  const idlen = body[20];
  const asPublic = body.slice(21, 21 + idlen);
  const sealed = body.slice(21 + idlen);
  expect(rs).toBe(4096);
  const priv = await crypto.subtle.importKey('jwk', uaPrivate, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const pub = await crypto.subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: pub }, priv, 256));
  const te = new TextEncoder();
  const ikm = await hkdf(auth, ecdh, new Uint8Array([...te.encode('WebPush: info'), 0, ...uaPublic, ...asPublic]), 32);
  const cek = await hkdf(salt, ikm, new Uint8Array([...te.encode('Content-Encoding: aes128gcm'), 0]), 16);
  const nonce = await hkdf(salt, ikm, new Uint8Array([...te.encode('Content-Encoding: nonce'), 0]), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, sealed));
  let end = plain.length - 1;
  while (end >= 0 && plain[end] === 0) end--;
  expect(plain[end]).toBe(2); // der letzte Datensatz
  return new TextDecoder().decode(plain.slice(0, end));
}

describe('Mitteilungen: für das Gerät verschlüsselt (RFC 8291)', () => {
  it('ergibt genau das Beispiel des Standards', async () => {
    const uaPublic = fromB64u('BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4');
    const asPublic = fromB64u('BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8');
    const body = await encrypt(new TextEncoder().encode('When I grow up, I want to be a watermelon'), uaPublic, fromB64u('BTBZMqHH6r4Tts7J_aSIgg'), {
      asPrivate: jwkOf('yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw', asPublic),
      asPublic,
      salt: fromB64u('DGv6ra1nlYgDCS1FRnbzlw'),
    });
    expect(b64u(body)).toBe(
      'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
    );
    const uaPrivate = jwkOf('q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94', uaPublic);
    expect(await decrypt(body, uaPrivate, uaPublic, fromB64u('BTBZMqHH6r4Tts7J_aSIgg'))).toBe('When I grow up, I want to be a watermelon');
  });

  it('jedes Mal neu verschlüsselt: das Gerät liest die Mitteilung, ein Fremder nicht', async () => {
    const ua = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
    const uaPublic = new Uint8Array(await crypto.subtle.exportKey('raw', ua.publicKey));
    const uaPrivate = await crypto.subtle.exportKey('jwk', ua.privateKey);
    const auth = crypto.getRandomValues(new Uint8Array(16));
    const note = JSON.stringify(learnNote([{ id: 'k1', name: 'Mia', streak: 4 }]));
    const a = await encrypt(new TextEncoder().encode(note), uaPublic, auth);
    const b = await encrypt(new TextEncoder().encode(note), uaPublic, auth);
    expect(b64u(a)).not.toBe(b64u(b));
    expect(await decrypt(a, uaPrivate, uaPublic, auth)).toBe(note);
    await expect(decrypt(a, uaPrivate, uaPublic, crypto.getRandomValues(new Uint8Array(16)))).rejects.toThrow();
    expect(a.length).toBeLessThan(4096 - 100);
  });
});

describe('Mitteilungen: der Absender signiert (VAPID, RFC 8292)', () => {
  it('ein Token für den Push-Dienst, signiert mit dem Schlüssel, mit dem die App abonniert hat', async () => {
    const keys = await newVapidKeys();
    expect(fromB64u(keys.publicKey).length).toBe(65);
    const now = Date.parse('2026-10-23T10:00:00Z');
    const h = await vapidHeader('https://web.push.apple.com/QGuQyavXutnMH_abc', keys, 'https://saschamoescheit-cpu.github.io/schlaufuchs/', now);
    const m = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(h)!;
    expect(m[4]).toBe(keys.publicKey);
    const claims = JSON.parse(new TextDecoder().decode(fromB64u(m[2])));
    expect(claims).toMatchObject({ aud: 'https://web.push.apple.com', exp: now / 1000 + 12 * 3600 });
    const pub = await crypto.subtle.importKey('raw', fromB64u(keys.publicKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    expect(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, fromB64u(m[3]), new TextEncoder().encode(`${m[1]}.${m[2]}`))).toBe(true);
  });
});

describe('Mitteilungen: wann und was', () => {
  it('Uhr und Datum des Geräts nach seiner Zeitzone (auch über Mitternacht)', () => {
    expect(clockIn('Europe/Berlin', new Date('2026-10-23T15:30:00Z'))).toEqual({ hour: 17, day: '2026-10-23' });
    expect(clockIn('America/New_York', new Date('2026-10-23T02:00:00Z'))).toEqual({ hour: 22, day: '2026-10-22' });
    expect(clockIn('Gibt/Es_Nicht', new Date('2026-10-23T15:30:00Z')).hour).toBe(17);
    expect(addDay('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDay('2026-03-29', -1)).toBe('2026-03-28');
  });

  it('Lern-Erinnerung: heute noch nicht geübt, aber in den letzten 14 Tagen schon – Serie bis gestern', () => {
    const today = '2026-10-23';
    expect(needsLearnReminder({ '2026-10-22': 12, '2026-10-21': 5 }, today)).toBe(true);
    expect(needsLearnReminder({ '2026-10-23': 3, '2026-10-22': 12 }, today)).toBe(false); // heute schon geübt
    expect(needsLearnReminder({ '2026-10-01': 9 }, today)).toBe(false); // länger Pause: nicht bedrängen
    expect(needsLearnReminder(undefined, today)).toBe(false);
    expect(streakUntilYesterday({ '2026-10-22': 1, '2026-10-21': 1, '2026-10-19': 1 }, today)).toBe(2);
    expect(learnNote([{ id: 'k1', name: 'Mia', streak: 5 }])).toMatchObject({ body: expect.stringContaining('Serie von 5 Tagen'), url: './#kind=k1' });
    expect(learnNote([{ id: 'k1', name: 'Mia', streak: 0 }]).body).not.toContain('Serie');
    expect(learnNote([{ id: 'a', name: 'Mia', streak: 0 }, { id: 'b', name: 'Ben', streak: 2 }, { id: 'c', name: 'Lea', streak: 1 }])).toMatchObject({ body: 'Mia, Ben und Lea haben heute noch nicht geübt.', url: './' });
  });

  it('Klassenarbeit: genau 3 Tage vorher und am Tag davor', () => {
    const planned = [
      { id: 't1', subject: 'mathe', date: '2026-10-26' },
      { id: 't2', subject: 'deutsch', date: '2026-10-24' },
      { id: 't3', subject: 'englisch', date: '2026-10-25' },
      { id: 't4', subject: 'mathe', date: '2026-10-23' },
    ];
    expect(testsDue(planned, '2026-10-23')).toEqual([
      { id: 't1', subject: 'mathe', daysLeft: 3 },
      { id: 't2', subject: 'deutsch', daysLeft: 1 },
    ]);
    expect(testNote({ id: 'k1', name: 'Mia' }, 'mathe', 1)).toMatchObject({ title: 'Mathe-Arbeit morgen', body: 'Mia schreibt morgen die Mathe-Arbeit – jetzt kurz wiederholen?', url: './#kind=k1' });
    expect(testNote({ id: 'k1', name: 'Mia' }, 'deutsch', 3).title).toBe('Deutsch-Arbeit in 3 Tagen');
  });

  it('Vokabelkarten: genauso gezählt wie im Karteikasten der App', () => {
    const DAY = 24 * 3600e3;
    const t0 = Date.parse('2026-10-01T15:00:00Z');
    const log: Attempt[] = [
      // red: zweimal gewusst (Fach 2, nach 3 Tagen wieder dran)
      { t: t0, s: 'e1-colours', ok: 1, m: 'übung', w: 'red' },
      { t: t0 + 1 * DAY, s: 'e1-colours', ok: 1, m: 'karten', w: 'red' },
      // blue: zuletzt nicht gewusst – sofort wieder dran
      { t: t0 + 2 * DAY, s: 'e1-colours', ok: 0, m: 'karten', w: 'blue' },
      // green: frisch gewusst (Fach 1, morgen wieder)
      { t: t0 + 20 * DAY, s: 'e1-colours', ok: 1, m: 'karten', w: 'green' },
      // Test zählt nicht
      { t: t0, s: 'e1-colours', ok: 1, m: 'test', w: 'pink' },
      // ohne Wort: keine Karte
      { t: t0, s: 'm1-plus10', ok: 1, m: 'übung' },
    ];
    const now = t0 + 20 * DAY + 3600e3;
    const app = [...cardStates(log as AppAttempt[]).values()].filter((c) => c.seen > 0 && c.due <= now).length;
    expect(dueCards(log, now)).toBe(app);
    expect(dueCards(log, now)).toBe(2); // red und blue
    expect(cardsNote({ id: 'k1', name: 'Mia' }, 7)).toMatchObject({ body: 'Für Mia sind 7 Vokabelkarten dran – ein paar Minuten Karteikasten?', url: './#karten=k1' });
  });
});
