import { describe, expect, it } from 'vitest';
import { emptyProgress, LOG_MAX, record, type TestResult } from '../engine/learning';
import type { Task } from '../engine/types';
import type { AppData, Profile } from './store';
import { removedList, restoreRemoved, syncOnce, type Device, type Remote, type Row } from './sync';

// Ein simulierter Server mit denselben Regeln wie Supabase: Zeilen je kind|id, „nur anlegen, wenn neu“ und
// „nur ersetzen, wenn unverändert“.
function server() {
  const rows = new Map<string, Row>();
  // der Server speichert die mitgeschickte Zeit, gibt sie aber in seinem Format zurück (+00:00 statt Z) und ordnet JSON-Schlüssel um
  const stamp = (at: string) => new Date(at).toISOString().replace('Z', '+00:00');
  const reorder = (v: unknown): unknown => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).reverse().map(([k, x]) => [k, reorder(x)])) : Array.isArray(v) ? v.map(reorder) : v);
  const put = (r: Row) => rows.set(`${r.kind}|${r.id}`, { ...r, data: reorder(structuredClone(r.data ?? {})), updated_at: stamp(r.updated_at) });
  const remote: Remote = {
    list: async () => [...rows.values()].map(({ kind, id, updated_at, deleted }) => ({ kind, id, updated_at, deleted })),
    fetch: async (keys) => keys.map((k) => rows.get(`${k.kind}|${k.id}`)).filter((x): x is Row => !!x).map((x) => structuredClone(x)),
    upsert: async (list) => {
      list.forEach(put);
      return [];
    },
    create: async (r) => {
      if (rows.has(`${r.kind}|${r.id}`)) return false;
      put(r);
      return true;
    },
    replace: async (r, ifAt) => {
      const cur = rows.get(`${r.kind}|${r.id}`);
      if (!cur || cur.updated_at !== ifAt) return false;
      put(r);
      return true;
    },
  };
  return { rows, remote };
}

// eine Uhr, die immer weiterläuft (echte Geräte gleichen nie in derselben Millisekunde ab)
let clock = Date.parse('2026-10-21T10:00:00Z');
const sync = (dev: Device, remote: Remote) => syncOnce(dev, remote, () => new Date((clock += 1000)).toISOString());

type Dev = Device & { d: AppData };
function device(): Dev {
  const kv = new Map<string, string>();
  const dev: Dev = {
    d: { schema: 1, profiles: [], progress: {}, activeId: null, parent: { pin: null } },
    get: () => dev.d,
    commit: (fn) => {
      const next = structuredClone(dev.d);
      fn(next);
      dev.d = next;
    },
    read: (k) => kv.get(k) ?? null,
    write: (k, v) => (v == null ? kv.delete(k) : kv.set(k, v)),
  };
  return dev;
}

const kid = (id = 'mia'): Profile => ({ id, name: 'Mia', avatar: '🦊', age: 7, grade: 2, state: 'NW', englishFrom: 3, gradesFrom: 3, gradeKey: [92, 81, 67, 50, 30], autoRead: false, sound: true, pace: 'schule', created: 1 });
const task = (key: string, skillId = 'm2-plus100'): Task => ({ key, skillId, prompt: key, answer: { type: 'number', value: 1 }, solution: ['x'], tags: ['plus'] });
let t = Date.parse('2026-10-21T09:00:00Z');
function practice(dev: Dev, answers: [string, boolean][], pid = 'mia') {
  dev.commit((d) => {
    const p = (d.progress[pid] ??= emptyProgress());
    for (const [k, ok] of answers) record(p, task(k), ok, 'übung', (t += 60_000));
  });
}
function addKid(dev: Dev, id = 'mia') {
  dev.commit((d) => {
    d.profiles.push(kid(id));
    d.progress[id] = emptyProgress();
  });
}
const test = (id: string): TestResult => ({ id, t: (t += 1000), subject: 'mathe', skills: ['m2-plus100'], correct: 8, total: 10, points: 8, maxPoints: 10, percent: 80, seconds: 300, limit: 600, timeUp: false, pace: 'schule', items: [] });
const P = (dev: Dev, pid = 'mia') => dev.d.progress[pid];

describe('Abgleich zwischen Geräten', () => {
  it('ein neues Gerät bekommt Kind und Lernstand', async () => {
    const s = server();
    const ipad = device();
    const phone = device();
    addKid(ipad);
    practice(ipad, [['a', true], ['b', false], ['c', true]]);
    await sync(ipad, s.remote);
    await sync(phone, s.remote);
    expect(phone.d.profiles.map((p) => p.name)).toEqual(['Mia']);
    expect(P(phone).skills['m2-plus100'].n).toBe(3);
    expect(P(phone).stars).toBe(2);
    expect(P(phone).review).toHaveLength(1);
    expect(P(phone).log).toHaveLength(3);
    expect(phone.d.activeId).toBeNull(); // wer lernt, wählt man je Gerät
    // nichts mehr zu tun – auch nicht wegen anders formatierter Zeiten oder umgeordneter Schlüssel
    const again = await sync(phone, s.remote);
    expect(again.pushed + again.pulled).toBe(0);
    const again2 = await sync(ipad, s.remote);
    expect(again2.pushed + again2.pulled).toBe(0);
  });

  it('auf zwei Geräten ohne Abgleich geübt: alles zählt', async () => {
    const s = server();
    const ipad = device();
    const phone = device();
    addKid(ipad);
    practice(ipad, [['a', false]]); // a in der Fehler-Kiste
    await sync(ipad, s.remote);
    await sync(phone, s.remote);
    // offline: auf dem iPad 3 Aufgaben, auf dem iPhone 2 – dort sitzt a jetzt (zweimal richtig)
    practice(ipad, [['b', true], ['c', false], ['d', true]]);
    phone.commit((d) => {
      const p = d.progress.mia;
      record(p, task('a'), true, 'wiederholung', (t += 60_000));
      record(p, task('a'), true, 'wiederholung', (t += 60 * 60_000));
    });
    phone.commit((d) => d.progress.mia.tests.push(test('t-phone')));
    ipad.commit((d) => d.progress.mia.tests.push(test('t-ipad')));
    await sync(ipad, s.remote);
    const r = await sync(phone, s.remote); // führt zusammen
    expect(r.pushed).toBeGreaterThan(0);
    await sync(ipad, s.remote);
    for (const dev of [ipad, phone]) {
      const p = P(dev);
      expect(p.skills['m2-plus100'].n).toBe(6);
      expect(p.skills['m2-plus100'].ok).toBe(4);
      expect(p.stars).toBe(4);
      expect(p.solved).toBe(1);
      expect(p.review.map((x) => x.task.key)).toEqual(['c']); // a auf dem iPhone gelöst, c auf dem iPad neu
      expect(p.log).toHaveLength(6);
      expect(p.tests.map((x) => x.id).sort()).toEqual(['t-ipad', 't-phone']);
      expect(Object.values(p.days).reduce((a, b) => a + b, 0)).toBe(6);
      expect(p.skills['m2-plus100'].recent).toHaveLength(6);
    }
    // und danach ruhig: kein Hin und Her
    expect((await sync(phone, s.remote)).pushed).toBe(0);
    expect((await sync(ipad, s.remote)).pushed).toBe(0);
  });

  it('gleichzeitig hochgeladen: das langsamere Gerät führt im nächsten Abgleich zusammen statt zu überschreiben', async () => {
    const s = server();
    const ipad = device();
    const phone = device();
    addKid(ipad);
    await sync(ipad, s.remote);
    await sync(phone, s.remote);
    practice(ipad, [['a', true], ['b', true]]);
    practice(phone, [['c', true]]);
    // das iPad liest den Server, dann lädt das iPhone hoch, dann will das iPad hochladen
    const sneaky: Remote = {
      ...s.remote,
      list: async () => {
        const rows = await s.remote.list();
        await sync(phone, s.remote);
        return rows;
      },
    };
    const first = await sync(ipad, sneaky);
    expect(first.again).toBeGreaterThan(0);
    await sync(ipad, s.remote);
    await sync(phone, s.remote);
    expect(P(ipad).stars).toBe(3);
    expect(P(phone).stars).toBe(3);
    expect(P(phone).log).toHaveLength(3);
  });

  it('bricht das Netz beim Hochladen ab, zählt nichts doppelt', async () => {
    const s = server();
    const ipad = device();
    const phone = device();
    addKid(ipad);
    await sync(ipad, s.remote);
    await sync(phone, s.remote);
    practice(ipad, [['a', true]]);
    practice(phone, [['b', true], ['c', true]]);
    await sync(phone, s.remote);
    const broken: Remote = { ...s.remote, replace: async () => Promise.reject(new Error('offline')), create: async () => Promise.reject(new Error('offline')) };
    await expect(sync(ipad, broken)).rejects.toThrow('offline');
    expect(P(ipad).stars).toBe(3); // schon zusammengeführt
    await sync(ipad, s.remote);
    await sync(phone, s.remote);
    expect(P(ipad).stars).toBe(3);
    expect(P(phone).stars).toBe(3);
  });

  it('übt das Kind während des Abgleichs weiter, geht keine Antwort verloren', async () => {
    const s = server();
    const ipad = device();
    const phone = device();
    addKid(ipad);
    await sync(ipad, s.remote);
    await sync(phone, s.remote);
    practice(ipad, [['a', true]]);
    await sync(ipad, s.remote);
    const busy: Remote = {
      ...s.remote,
      fetch: async (keys) => {
        const out = await s.remote.fetch(keys);
        practice(phone, [['b', true]]); // die Antwort kommt, während der Abgleich läuft
        return out;
      },
    };
    const r = await sync(phone, busy);
    expect(r.again).toBeGreaterThan(0);
    await sync(phone, s.remote);
    await sync(ipad, s.remote);
    expect(P(phone).stars).toBe(2);
    expect(P(ipad).stars).toBe(2);
  });

  it('ein gelöschtes Kind verschwindet überall, bleibt aber zum Wiederherstellen', async () => {
    const s = server();
    const ipad = device();
    const phone = device();
    addKid(ipad);
    addKid(ipad, 'leo');
    practice(ipad, [['a', true]]);
    ipad.commit((d) => d.progress.mia.tests.push(test('t1')));
    await sync(ipad, s.remote);
    await sync(phone, s.remote);
    phone.commit((d) => void (d.activeId = 'mia'));
    ipad.commit((d) => {
      d.profiles = d.profiles.filter((p) => p.id !== 'mia');
      delete d.progress.mia;
    });
    await sync(ipad, s.remote);
    expect([...s.rows.values()].filter((r) => r.id.startsWith('mia')).every((r) => r.deleted)).toBe(true);
    await sync(phone, s.remote);
    expect(phone.d.profiles.map((p) => p.id)).toEqual(['leo']);
    expect(phone.d.activeId).toBeNull();
    expect(removedList(phone).map((r) => r.profile.id)).toEqual(['mia']);
    expect(removedList(phone)[0].progress.stars).toBe(1);
    // auf dem iPhone wiederhergestellt → auch auf dem iPad wieder da, mit Lernstand
    restoreRemoved('mia', phone);
    await sync(phone, s.remote);
    await sync(ipad, s.remote);
    expect(ipad.d.profiles.map((p) => p.id).sort()).toEqual(['leo', 'mia']);
    expect(P(ipad).stars).toBe(1);
    expect(P(ipad).tests.map((x) => x.id)).toEqual(['t1']);
  });

  it('ein voller Verlauf löscht alte Tage nicht vom Server', async () => {
    const s = server();
    const ipad = device();
    addKid(ipad);
    practice(ipad, [['a', true]]);
    await sync(ipad, s.remote);
    const oldDay = [...s.rows.values()].find((r) => r.kind === 'log')!;
    t += 2 * 86400_000;
    ipad.commit((d) => {
      const p = d.progress.mia;
      for (let i = 0; i < LOG_MAX; i++) record(p, task(`x${i}`), true, 'übung', (t += 1000));
    });
    await sync(ipad, s.remote);
    expect(s.rows.get(`log|${oldDay.id}`)!.deleted).toBeFalsy();
    expect((s.rows.get(`log|${oldDay.id}`)!.data as unknown[]).length).toBe(1);
    expect((await sync(ipad, s.remote)).pushed).toBe(0);
  });

  it('Profiländerungen gehen auf die anderen Geräte', async () => {
    const s = server();
    const ipad = device();
    const phone = device();
    addKid(ipad);
    await sync(ipad, s.remote);
    await sync(phone, s.remote);
    phone.commit((d) => void (d.profiles[0].grade = 3));
    await sync(phone, s.remote);
    await sync(ipad, s.remote);
    expect(ipad.d.profiles[0].grade).toBe(3);
  });
});
