// Umzug des Lernstands in IndexedDB (Nachtlauf 23.10.2026): localStorage und IndexedDB nachgebildet, die App-Module
// je Start frisch geladen. Geprüft wird vor allem, dass nie ein Stand verloren geht.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Snapshot } from './mirror';

const db = vi.hoisted(() => ({
  kv: new Map<string, Snapshot>(),
  failRead: 0,
  failWrite: false,
  /** solange gesetzt, wartet putMirror darauf (Umzug „unterwegs“) */
  gate: null as Promise<void> | null,
}));

// der Lehrplan ist groß und hier unwichtig – jeder frische Start lädt sonst alles neu
vi.mock('../content/curriculum', () => ({ DEFAULT_STATE: 'NW', stateInfo: () => ({ code: 'NW', englishFrom: 3, gradesFrom: 3 }) }));

vi.mock('./mirror', async (orig) => {
  const real = await orig<typeof import('./mirror')>();
  return {
    ...real,
    available: () => true,
    askPersist: () => {},
    readMirror: async (id = 'app') => db.kv.get(id) ?? null,
    readMirrorStrict: async (id = 'app') => {
      if (db.failRead > 0) {
        db.failRead--;
        throw new Error('UnknownError: Connection to Indexed Database server lost');
      }
      return db.kv.get(id) ?? null;
    },
    putMirror: async (s: Snapshot, id = 'app') => {
      if (db.gate) await db.gate;
      if (db.failWrite) return false;
      db.kv.set(id, s);
      return true;
    },
    writeMirror: (s: Snapshot, done?: (ok: boolean) => void) =>
      void Promise.resolve().then(() => {
        const ok = !db.failWrite;
        if (ok) db.kv.set('app', s);
        done?.(ok);
      }),
    mirrorOk: () => !db.failWrite,
  };
});

/** localStorage mit Grenze (Zeichen, wie die Browser zählen) */
function fakeStorage(limit = 5_000_000) {
  const m = new Map<string, string>();
  const size = () => [...m].reduce((n, [k, v]) => n + k.length + v.length, 0);
  return {
    m,
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (size() - (m.get(k)?.length ?? 0) - (m.has(k) ? k.length : 0) + k.length + v.length > limit) throw new DOMException('voll', 'QuotaExceededError');
      m.set(k, v);
    },
    removeItem: (k: string) => void m.delete(k),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  };
}

let ls: ReturnType<typeof fakeStorage>;
const start = async () => {
  vi.resetModules();
  return import('./store');
};
const settle = () => new Promise((r) => setTimeout(r, 10));
const big = 'x'.repeat(1_000_100);
const stub = () => JSON.parse(ls.m.get('schlaufuchs:v1') ?? 'null');

beforeEach(() => {
  db.kv.clear();
  db.failRead = 0;
  db.failWrite = false;
  db.gate = null;
  ls = fakeStorage();
  vi.stubGlobal('localStorage', ls);
});
afterEach(() => vi.unstubAllGlobals());

describe('Lernstand: localStorage, ab 1 Mio. Zeichen oder bei vollem Speicher in IndexedDB', { timeout: 30_000 }, () => {
  it('klein: bleibt in localStorage (mit Kopie), kein Umzug', async () => {
    const s = await start();
    s.saveProfile(s.newProfile({ name: 'Mia' }));
    await settle();
    expect(JSON.parse(ls.m.get('schlaufuchs:v1')!).profiles[0].name).toBe('Mia');
    expect(JSON.parse(db.kv.get('app')!.json).profiles[0].name).toBe('Mia');
    expect(s.isMovedOut()).toBe(false);
  });

  it('groß: zieht um – erst in IndexedDB geschrieben und nachgelesen, dann der Verweis; beim Neustart alles da', async () => {
    let s = await start();
    s.saveProfile(s.newProfile({ name: 'Mia' }));
    s.update((d) => void ((d as unknown as { pad: string }).pad = big));
    await settle();
    expect(s.isMovedOut()).toBe(true);
    expect(stub()).toEqual({ moved: 'indexeddb', at: expect.any(Number) });
    const full = JSON.parse(db.kv.get('app')!.json);
    expect(full.profiles[0].name).toBe('Mia');
    expect(full.pad.length).toBe(big.length);
    // weiter üben: nur noch IndexedDB
    s.update((d) => void (d.profiles[0].name = 'Mia M.'));
    await settle();
    expect(stub().moved).toBe('indexeddb');
    expect(JSON.parse(db.kv.get('app')!.json).profiles[0].name).toBe('Mia M.');
    // Neustart: erst IndexedDB lesen, vorher nichts zeigen und nichts schreiben
    s = await start();
    expect(s.needsMirrorFirst()).toBe(true);
    expect(s.getData().profiles).toEqual([]);
    s.update((d) => void (d.activeId = 'nicht-schreiben'));
    await settle();
    expect(JSON.parse(db.kv.get('app')!.json).profiles[0].name).toBe('Mia M.');
    expect(await s.checkMirror()).toBe('mirror');
    expect(s.needsMirrorFirst()).toBe(false);
    expect(s.getData().profiles[0].name).toBe('Mia M.');
    expect(s.storageUsage().moved).toBe(true);
    expect(s.storageUsage().used).toBeGreaterThan(1_000_000);
  });

  it('ein alter, noch offener Tab schreibt nach dem Umzug einen älteren Stand zurück: beim Start gilt der neuere', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date('2026-10-24T08:00:00Z'));
      const s = await start();
      s.saveProfile(s.newProfile({ name: 'Mia' }));
      s.update((d) => void ((d as unknown as { pad: string }).pad = big));
      await settle();
      expect(s.isMovedOut()).toBe(true);
      const old = JSON.stringify({ ...s.getData(), profiles: s.getData().profiles.map((p) => ({ ...p, name: 'Mia (alt)' })) });
      // eine Minute später weiter geübt (nur IndexedDB) …
      vi.setSystemTime(new Date('2026-10-24T08:01:00Z'));
      s.update((d) => void (d.profiles[0].name = 'Mia neu'));
      await settle();
      // … dann schreibt der alte Tab seinen vollen Stand in localStorage (mit seinem alten Zeitpunkt)
      ls.m.set('schlaufuchs:v1', old);
      vi.setSystemTime(new Date('2026-10-24T08:02:00Z'));
      const s2 = await start();
      expect(await s2.checkMirror()).toBe('mirror');
      expect(s2.getData().profiles[0].name).toBe('Mia neu');
    } finally {
      vi.useRealTimers();
    }
  });

  it('localStorage voll (auch klein): zieht um, statt den Stand zu verlieren', async () => {
    ls = fakeStorage(400);
    vi.stubGlobal('localStorage', ls);
    const s = await start();
    s.saveProfile(s.newProfile({ name: 'Ben' }));
    await settle();
    expect(s.isMovedOut()).toBe(true);
    expect(s.hasSaveError()).toBe(false);
    expect(JSON.parse(db.kv.get('app')!.json).profiles[0].name).toBe('Ben');
  });

  it('IndexedDB fällt nach dem Umzug aus: der ganze Stand geht zurück nach localStorage', async () => {
    const s = await start();
    s.saveProfile(s.newProfile({ name: 'Mia' }));
    s.update((d) => void ((d as unknown as { pad: string }).pad = big));
    await settle();
    expect(s.isMovedOut()).toBe(true);
    db.failWrite = true;
    s.update((d) => void (d.profiles[0].name = 'Mia neu'));
    await settle();
    expect(s.isMovedOut()).toBe(false);
    expect(JSON.parse(ls.m.get('schlaufuchs:v1')!).profiles[0].name).toBe('Mia neu');
  });

  it('IndexedDB nicht schreibbar: kein Umzug, localStorage behält alles', async () => {
    db.failWrite = true;
    const s = await start();
    s.saveProfile(s.newProfile({ name: 'Mia' }));
    s.update((d) => void ((d as unknown as { pad: string }).pad = big));
    await settle();
    expect(s.isMovedOut()).toBe(false);
    expect(JSON.parse(ls.m.get('schlaufuchs:v1')!).pad.length).toBe(big.length);
  });

  it('während des Umzugs geändert: kein Verweis auf einen alten Stand', async () => {
    const s = await start();
    s.saveProfile(s.newProfile({ name: 'Mia' }));
    let open!: () => void;
    db.gate = new Promise((r) => (open = r));
    s.update((d) => void ((d as unknown as { pad: string }).pad = big)); // Umzug beginnt, wartet auf IndexedDB
    s.update((d) => void (d.profiles[0].name = 'Mia jetzt')); // neuer Stand kommt dazwischen
    db.gate = null;
    open();
    await settle();
    await settle();
    // der neuere Stand ist sicher: entweder noch in localStorage oder (beim nächsten Umzug) in IndexedDB
    const where = s.isMovedOut() ? JSON.parse(db.kv.get('app')!.json) : JSON.parse(ls.m.get('schlaufuchs:v1')!);
    expect(where.profiles[0].name).toBe('Mia jetzt');
  });

  it('Lesefehler beim Start (Safari): nicht „leer“ – nichts geschrieben, Hinweis; ein kurzer Fehler wird überbrückt', async () => {
    let s = await start();
    s.saveProfile(s.newProfile({ name: 'Mia' }));
    s.update((d) => void ((d as unknown as { pad: string }).pad = big));
    await settle();
    const before = db.kv.get('app')!.json;
    db.failRead = 9;
    s = await start();
    await s.checkMirror();
    expect(s.hasLoadError()).toBe(true);
    expect(s.needsMirrorFirst()).toBe(true);
    s.saveProfile(s.newProfile({ name: 'Neu angelegt' }));
    await settle();
    expect(db.kv.get('app')!.json).toBe(before);
    expect(stub().moved).toBe('indexeddb');
    // einmal kurz gestört: der zweite Versuch klappt
    db.failRead = 1;
    s = await start();
    await s.checkMirror();
    expect(s.hasLoadError()).toBe(false);
    expect(s.getData().profiles[0].name).toBe('Mia');
  });
});
