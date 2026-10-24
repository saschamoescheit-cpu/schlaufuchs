// Abgleich zwischen iPad, iPhone und PC (Sascha 21.10.2026: „genauso wie bei GolfOS, inkl. der Lernfortschritte“).
// Offline zuerst: die App speichert weiter auf dem Gerät; mit Google-Anmeldung (ein Elternteil) und Netz wird mit der
// Kopie in Supabase (EU) abgeglichen – dasselbe Projekt wie GolfOS, aber eine eigene Tabelle schlaufuchs_items.
// Zeilen: je Kind das Profil, der Lernstand, jeder Test und der Aufgaben-Verlauf je Tag; dazu die Eltern-Einstellungen.
// Hat ein Kind auf zwei Geräten geübt, ohne dass sie dazwischen abgeglichen haben, wird der Lernstand
// zusammengeführt (merge.ts) – nichts geht verloren. Ein auf einem Gerät gelöschtes Kind verschwindet auch auf den
// anderen, dort bleibt aber eine Kopie zum Wiederherstellen.
//
// Die Logik arbeitet auf zwei kleinen Schnittstellen (Gerät und Server) und ist ohne Browser und Server getestet
// (sync.test.ts).
import { useSyncExternalStore } from 'react';
import { dayKey, emptyProgress, LOG_MAX, type Attempt, type Progress, type TestResult } from '../engine/learning';
import type { AppData, Profile } from './store';
import { baseOf, coreOf, mergeCore, mergeRescue, unionLog, type Base, type Core } from './merge';

export interface Row {
  kind: string;
  id: string;
  data?: unknown;
  updated_at: string;
  deleted?: boolean;
}
export interface Remote {
  /** Alle Zeilen der angemeldeten Familie ohne Inhalt. */
  list(): Promise<Row[]>;
  fetch(keys: { kind: string; id: string }[]): Promise<Row[]>;
  /** Schreibt die Zeilen (neu oder ersetzen); gibt die abgelehnten zurück. */
  upsert(rows: Row[]): Promise<{ row: Row; error: string }[]>;
  /** Legt eine Zeile nur an, wenn es sie noch nicht gibt – false: ein anderes Gerät war schneller. */
  create(row: Row): Promise<boolean>;
  /** Ersetzt eine Zeile nur, wenn sie noch so ist wie zuletzt gesehen – false: inzwischen von einem anderen Gerät geändert. */
  replace(row: Row, ifAt: string): Promise<boolean>;
}
export interface Device {
  get(): AppData;
  commit(fn: (d: AppData) => void): void;
  read(key: string): string | null;
  write(key: string, v: string | null): void;
}

const META = 'schlaufuchs:sync.meta.v1';
const BASE = 'schlaufuchs:sync.base.v1';
const REMOVED = 'schlaufuchs:sync.removed.v1';
/** Kinder, die auf diesem Gerät ausdrücklich gelöscht wurden (store.ts deleteProfile/mergeProfiles). Nur diese gehen
 *  als „gelöscht“ hoch – fehlt ein Kind hier aus einem anderen Grund (z. B. Speicher beim Start nicht lesbar), wird es
 *  vom Server zurückgeholt statt überall gelöscht (Leanas Lernstand verschwand am 24.10.2026). */
export const DELETED = 'schlaufuchs:sync.deleted.v1';

type Kind = 'profile' | 'progress' | 'test' | 'log' | 'parent';
/** Zeilen, die zwei Geräte gleichzeitig ändern können – sie werden zusammengeführt statt überschrieben. */
const MERGED = new Set<string>(['progress', 'log']);
/** Reihenfolge beim Einspielen: erst das Kind, dann sein Lernstand. */
const ORDER: Record<string, number> = { parent: 0, profile: 1, progress: 2, test: 3, log: 4 };

interface Item {
  kind: Kind;
  id: string;
  json: string;
}
type Meta = Record<string, { hash: string; at: string }>;
const key = (kind: string, id: string) => `${kind}|${id}`;
const pidOf = (kind: string, id: string): string | null => (kind === 'profile' || kind === 'progress' ? id : kind === 'test' || kind === 'log' ? id.split('/')[0] : null);
const sameTime = (a: string, b: string) => a === b || Date.parse(a) === Date.parse(b);

const parse = <T>(s: string | null, fallback: T): T => {
  try {
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
};

/** JSON mit sortierten Schlüsseln – der Server (jsonb) ordnet die Schlüssel um, gleich muss gleich bleiben. */
export function canon(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canon(o[k])}`)
    .join(',')}}`;
}

/** Ein kurzer Fingerabdruck (FNV-1a) – hat sich ein Wert seit dem letzten Abgleich geändert? */
export function hashOf(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36) + s.length.toString(36);
}

/** Der Verlauf eines Kindes nach Tagen. Ist er voll (die ältesten fallen heraus), fehlt der älteste Tag womöglich
 *  zum Teil – der bleibt dann so auf dem Server, wie er war. */
function logDays(log: Attempt[]): Map<string, Attempt[]> {
  const out = new Map<string, Attempt[]>();
  for (const a of log) {
    const d = dayKey(a.t);
    const list = out.get(d);
    if (list) list.push(a);
    else out.set(d, [a]);
  }
  if (log.length >= LOG_MAX && log.length) out.delete(dayKey(log[0].t));
  return out;
}

/** Alles Abgeglichene auf dem Gerät als kind|id → JSON. „Wer lernt gerade“ bleibt je Gerät. */
export function itemsOf(d: AppData): Map<string, Item> {
  const out = new Map<string, Item>();
  const add = (kind: Kind, id: string, v: unknown) => out.set(key(kind, id), { kind, id, json: canon(v) });
  add('parent', 'parent', d.parent);
  for (const p of d.profiles) {
    add('profile', p.id, p);
    const pr = d.progress[p.id];
    if (!pr) continue;
    add('progress', p.id, coreOf(pr));
    for (const t of pr.tests) add('test', `${p.id}/${t.id}`, t);
    for (const [day, list] of logDays(pr.log)) add('log', `${p.id}/${day}`, list);
  }
  return out;
}

/** Ein auf einem anderen Gerät gelöschtes Kind: hier aufgehoben, bis es jemand wiederherstellt. */
export interface Removed {
  profile: Profile;
  progress: Progress;
  at: string;
}

/** Schreibt eine Zeile vom Server auf das Gerät (null = dort entfernen). */
function apply(d: AppData, kind: string, id: string, data: unknown, removed: Removed[], at: string): void {
  const pid = pidOf(kind, id);
  if (kind === 'parent') {
    if (data != null) d.parent = data as AppData['parent'];
    return;
  }
  if (kind === 'profile') {
    const i = d.profiles.findIndex((p) => p.id === id);
    if (data == null) {
      if (i < 0) return;
      removed.push({ profile: d.profiles[i], progress: d.progress[id] ?? emptyProgress(), at });
      d.profiles.splice(i, 1);
      delete d.progress[id];
      if (d.activeId === id) d.activeId = null;
      return;
    }
    if (i >= 0) d.profiles[i] = data as Profile;
    else {
      d.profiles.push(data as Profile);
      d.profiles.sort((a, b) => a.created - b.created);
    }
    d.progress[id] ??= emptyProgress();
    return;
  }
  if (!pid || !d.profiles.some((p) => p.id === pid)) return; // ohne das Kind kein Lernstand
  const pr = (d.progress[pid] ??= emptyProgress());
  if (kind === 'progress') {
    if (data != null) Object.assign(pr, data as Core);
  } else if (kind === 'test') {
    const tid = id.slice(pid.length + 1);
    pr.tests = pr.tests.filter((t) => t.id !== tid);
    if (data != null) pr.tests = [...pr.tests, data as TestResult].sort((a, b) => a.t - b.t);
  } else if (kind === 'log') {
    if (data != null) pr.log = unionLog(pr.log, data as Attempt[]).slice(-LOG_MAX);
  }
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  at: string;
  /** Zeilen, die ein anderes Gerät gerade geändert hat oder die hier während des Abgleichs geändert wurden – gleich noch einmal. */
  again: number;
  failed?: number;
  error?: string;
}

/**
 * Ein Abgleich: Geändertes geht hoch, auf anderen Geräten Geändertes kommt herunter. Haben beide Seiten geändert,
 * wird der Lernstand zusammengeführt; beim Profil und den Eltern-Einstellungen gilt die Änderung auf diesem Gerät.
 */
export async function syncOnce(dev: Device, remote: Remote, now = () => new Date().toISOString()): Promise<SyncResult> {
  const meta = parse<Meta>(dev.read(META), {});
  const base = parse<Record<string, Base>>(dev.read(BASE), {});
  const snap = itemsOf(dev.get());
  const rows = await remote.list();
  const remoteBy = new Map(rows.map((r) => [key(r.kind, r.id), r]));
  const at = now();

  type Push = { row: Row; ifAt?: string; create?: boolean; core?: Core };
  const push: Push[] = [];
  const pullKeys: { kind: string; id: string }[] = [];
  const removeHere: string[] = [];
  const pushLocal = (l: Item, r?: Row) => {
    const data = JSON.parse(l.json);
    push.push({ row: { kind: l.kind, id: l.id, data, updated_at: at, deleted: false }, ...(MERGED.has(l.kind) ? (r && !r.deleted ? { ifAt: r.updated_at } : { create: !r }) : {}), ...(l.kind === 'progress' ? { core: data } : {}) });
  };
  const changedHere = (k: string, l?: Item) => l != null && (!meta[k] || meta[k].hash !== hashOf(l.json));
  const changedThere = (k: string, r?: Row) => r != null && (!meta[k] || !sameTime(r.updated_at, meta[k].at));

  /** Zeilen, die nicht einfach hochgehen dürfen, sondern mit der Cloud zusammengeführt werden */
  const guard = new Set<string>();
  /** Lernstand kleiner als beim letzten Abgleich (Sterne, gelöste Aufgaben oder Antworten je Thema weniger)? */
  const shrunk = (id: string, l: Item): boolean => {
    const b = base[id];
    if (!b) return false;
    const c = JSON.parse(l.json) as Core;
    const n = (s: Record<string, { n: number }>) => Object.values(s ?? {}).reduce((x, y) => x + (y?.n ?? 0), 0);
    return (c.stars ?? 0) < (b.stars ?? 0) || (c.solved ?? 0) < (b.solved ?? 0) || n(c.skills) < n(b.skills);
  };
  const lostDay = (pid: string, day: string): boolean => {
    const pr = dev.get().progress[pid];
    if (!pr || !dev.get().profiles.some((p) => p.id === pid)) return false;
    if (pr.log.length < LOG_MAX) return true;
    return day > dayKey(pr.log[0].t);
  };
  const keys = [...new Set([...snap.keys(), ...remoteBy.keys()])];
  const deletedHere = new Set(parse<string[]>(dev.read(DELETED), []));
  // Kinder, die hier gelöscht wurden: ihre übrigen Zeilen gehen mit
  const goneHere = new Set<string>();
  // Kinder, die hier fehlen, ohne gelöscht worden zu sein: alle ihre Zeilen zurückholen – nie aus dem Fehlen schließen,
  // dass gelöscht wurde
  const missing = new Set<string>();
  for (const k of keys) {
    const [kind, id] = k.split('|');
    if (kind !== 'profile' || snap.has(k) || !remoteBy.get(k) || remoteBy.get(k)!.deleted) continue;
    if (deletedHere.has(id) && meta[k] && !changedThere(k, remoteBy.get(k))) goneHere.add(id);
    else if (!deletedHere.has(id)) missing.add(id);
  }
  for (const k of keys) {
    const l = snap.get(k);
    const r = remoteBy.get(k);
    const [kind, id] = k.split('|');
    const lc = changedHere(k, l);
    const rc = changedThere(k, r);
    if (l && !r) pushLocal(l);
    else if (!l && r) {
      if (r.deleted) continue;
      const pid = pidOf(kind, id);
      if (pid && missing.has(pid)) pullKeys.push({ kind, id });
      // ein Tag fehlt im Verlauf, obwohl er nicht voll ist (oder der Tag jünger ist als der älteste hier): verloren
      // gegangen, nicht herausgefallen → zurückholen (vereint)
      else if (kind === 'log' && pid && lostDay(pid, id.slice(pid.length + 1))) pullKeys.push({ kind, id });
      else if (meta[k] && !rc) {
        // hier nicht mehr da: gelöscht – oder nur ein alter Tag, der aus dem vollen Verlauf gefallen ist
        if (kind === 'profile' || (pid && goneHere.has(pid))) push.push({ row: { kind, id, updated_at: at, deleted: true } });
      } else pullKeys.push({ kind, id });
    } else if (l && r) {
      if (r.deleted) {
        if (rc && !lc) removeHere.push(k);
        else if (lc) pushLocal(l, r); // hier nach dem Löschen noch geändert (oder wiederhergestellt): bleibt
      } else if (lc && !rc) {
        // nie verkleinern: ein geschrumpfter Lernstand oder Tagesverlauf wird mit der Cloud zusammengeführt statt sie
        // zu überschreiben (24.10.2026: ein geleerter Stand hätte sonst auch die Cloud geleert)
        if (kind === 'log' || (kind === 'progress' && shrunk(id, l))) {
          guard.add(k);
          pullKeys.push({ kind, id });
        } else pushLocal(l, r);
      } else if (rc) pullKeys.push({ kind, id }); // nach dem Holen entschieden
    }
  }

  const fetched = pullKeys.length ? await remote.fetch(pullKeys) : [];
  fetched.sort((a, b) => (ORDER[a.kind] ?? 9) - (ORDER[b.kind] ?? 9));
  /** was auf das Gerät kommt: kind|id → Inhalt (null = entfernen) */
  // merged: zusammengeführt, geht gleich wieder hoch (bis das geklappt hat, gilt es hier als geändert)
  const writes = new Map<string, { kind: string; id: string; data: unknown; at: string; merged?: unknown }>();
  for (const r of fetched) {
    const k = key(r.kind, r.id);
    const l = snap.get(k);
    if (r.deleted) {
      if (l && changedHere(k, l)) pushLocal(l, r);
      else if (l) removeHere.push(k);
      continue;
    }
    const json = canon(r.data);
    if (l && guard.has(k)) {
      const local = JSON.parse(l.json) as unknown;
      const merged = r.kind === 'progress' ? mergeCore(null, local as Core, r.data as Core) : unionLog(local as Attempt[], r.data as Attempt[]);
      const up = canon(merged) !== json;
      writes.set(k, { kind: r.kind, id: r.id, data: merged, at: r.updated_at, ...(up ? { merged: r.data } : {}) });
      if (up) push.push({ row: { kind: r.kind, id: r.id, data: merged, updated_at: at, deleted: false }, ifAt: r.updated_at, ...(r.kind === 'progress' ? { core: merged as Core } : {}) });
      continue;
    }
    if (l && l.json === json) {
      meta[k] = { hash: hashOf(l.json), at: r.updated_at };
      if (r.kind === 'progress') base[r.id] = baseOf(r.data as Core);
      continue;
    }
    const firstMeet = l != null && !meta[k];
    const both = l != null && !firstMeet && changedHere(k, l);
    if (l && (both || firstMeet)) {
      if (r.kind === 'progress') {
        const merged = mergeCore(firstMeet ? null : (base[r.id] ?? null), JSON.parse(l.json) as Core, r.data as Core);
        writes.set(k, { kind: r.kind, id: r.id, data: merged, at: r.updated_at, merged: r.data });
        push.push({ row: { kind: r.kind, id: r.id, data: merged, updated_at: at, deleted: false }, ifAt: r.updated_at, core: merged });
        continue;
      }
      if (r.kind === 'log') {
        const merged = unionLog(JSON.parse(l.json) as Attempt[], r.data as Attempt[]);
        const up = canon(merged) !== json;
        writes.set(k, { kind: r.kind, id: r.id, data: merged, at: r.updated_at, ...(up ? { merged: r.data } : {}) });
        if (up) push.push({ row: { kind: r.kind, id: r.id, data: merged, updated_at: at, deleted: false }, ifAt: r.updated_at });
        continue;
      }
      // Profil, Eltern-Einstellungen, Test: beide geändert → die Änderung hier; ein neues Gerät übernimmt die vom Server
      if (both) {
        pushLocal(l, r);
        continue;
      }
    }
    writes.set(k, { kind: r.kind, id: r.id, data: r.data, at: r.updated_at });
  }
  for (const k of removeHere) {
    const [kind, id] = k.split('|');
    writes.set(k, { kind, id, data: null, at: remoteBy.get(k)!.updated_at });
  }

  // Aufs Gerät – aber nur, was sich hier seit dem Start des Abgleichs nicht geändert hat (das Kind übt ja weiter);
  // das andere kommt beim nächsten Abgleich gleich danach dran
  let again = 0;
  let pulled = 0;
  const skipped = new Set<string>();
  const removedNow: Removed[] = [];
  if (writes.size) {
    dev.commit((d) => {
      const cur = itemsOf(d);
      for (const [k, w] of [...writes].sort((a, b) => (ORDER[a[1].kind] ?? 9) - (ORDER[b[1].kind] ?? 9))) {
        if (cur.get(k)?.json !== snap.get(k)?.json) {
          skipped.add(k);
          continue;
        }
        apply(d, w.kind, w.id, w.data, removedNow, at);
        pulled++;
      }
    });
    const after = itemsOf(dev.get());
    for (const [k, w] of writes) {
      if (skipped.has(k)) continue;
      const a = after.get(k);
      // zusammengeführt: der Server-Stand ist ab jetzt der gemeinsame; bis der neue oben ist, gilt er hier als geändert
      meta[k] = { hash: a && w.merged === undefined ? hashOf(a.json) : '', at: w.at };
      if (w.kind === 'progress' && w.data) base[w.id] = baseOf((w.merged ?? w.data) as Core);
      if (w.kind === 'profile' && w.data == null) delete base[w.id];
    }
  }
  if (removedNow.length) dev.write(REMOVED, JSON.stringify([...removedList(dev), ...removedNow]));
  again += skipped.size;
  // gleich festhalten: bricht das Hochladen ab (Netz weg), darf Zusammengeführtes nicht doppelt zählen
  dev.write(META, JSON.stringify(meta));
  dev.write(BASE, JSON.stringify(base));

  // Hoch – eine abgelehnte Zeile hält die anderen nicht auf
  const send = push.filter((p) => !skipped.has(key(p.row.kind, p.row.id)));
  const sent: Push[] = [];
  const plain: Push[] = [];
  for (const p of send) {
    if (p.ifAt) (await remote.replace(p.row, p.ifAt)) ? sent.push(p) : again++;
    else if (p.create) (await remote.create(p.row)) ? sent.push(p) : again++;
    else plain.push(p);
  }
  const refused = plain.length ? await remote.upsert(plain.map((p) => p.row)) : [];
  const bad = new Set(refused.map((f) => key(f.row.kind, f.row.id)));
  sent.push(...plain.filter((p) => !bad.has(key(p.row.kind, p.row.id))));
  for (const p of sent) {
    const k = key(p.row.kind, p.row.id);
    meta[k] = { hash: p.row.deleted ? '' : hashOf(canon(p.row.data)), at: p.row.updated_at };
    if (p.core) base[p.row.id] = baseOf(p.core);
    if (p.row.kind === 'profile' && p.row.deleted) delete base[p.row.id];
  }
  dev.write(META, JSON.stringify(meta));
  dev.write(BASE, JSON.stringify(base));
  // ausdrücklich gelöschte Kinder: erledigt, sobald die Löschung oben ist (oder dort schon gelöscht war)
  if (deletedHere.size) {
    const done = new Set(sent.filter((p) => p.row.kind === 'profile' && p.row.deleted).map((p) => p.row.id));
    for (const id of deletedHere) if (remoteBy.get(key('profile', id))?.deleted || !remoteBy.has(key('profile', id))) done.add(id);
    const left = [...deletedHere].filter((id) => !done.has(id));
    if (left.length !== deletedHere.size) dev.write(DELETED, left.length ? JSON.stringify(left) : null);
  }
  return { pushed: sent.length, pulled, at, again, ...(refused.length ? { failed: refused.length, error: refused[0].error } : {}) };
}

/** Lernstand aus dem Aufgaben-Verlauf neu berechnen: Sterne = richtige Antworten, je Thema Anzahl/richtig/letzte
 *  Antworten, Übungstage. (Was nicht im Verlauf steht – Stufe, Fehler-Kiste, gelöste Wiederholungen – bleibt leer.) */
export function progressFromLog(log: Attempt[]): Progress {
  const p = emptyProgress();
  for (const a of [...log].sort((x, y) => x.t - y.t)) {
    const st = (p.skills[a.s] ??= { n: 0, ok: 0, recent: [], last: 0, tags: {} });
    st.n++;
    if (a.ok) st.ok++;
    st.recent = [...st.recent, a.ok].slice(-12);
    st.last = Math.max(st.last, a.t);
    if (a.tag) {
      const c = (st.tags[a.tag] ??= [0, 0]);
      c[0]++;
      if (!a.ok) c[1]++;
    }
    if (a.ok) p.stars++;
    const dk = dayKey(a.t);
    p.days[dk] = (p.days[dk] ?? 0) + 1;
  }
  p.log = log.slice(-LOG_MAX);
  return p;
}

/** Alles, was die Cloud zu jedem Kind hat – auch als gelöscht markierte Zeilen und alte Tage (Lernstand-Rettung,
 *  24.10.2026). Je Kind: Profil (wenn noch lesbar), Lernstand aus der Lernstand-Zeile und dem ganzen Verlauf. */
export async function collectCloud(remote: Remote): Promise<{ pid: string; profile: Profile | null; progress: Progress }[]> {
  const rows = await remote.list();
  const keys = rows.filter((r) => r.kind === 'profile' || r.kind === 'progress' || r.kind === 'test' || r.kind === 'log').map((r) => ({ kind: r.kind, id: r.id }));
  const full = keys.length ? await remote.fetch(keys) : [];
  const by = new Map<string, { profile: Profile | null; core: Partial<Core> | null; log: Attempt[]; tests: TestResult[] }>();
  const get = (pid: string) => {
    let g = by.get(pid);
    if (!g) by.set(pid, (g = { profile: null, core: null, log: [], tests: [] }));
    return g;
  };
  for (const r of full) {
    const pid = pidOf(r.kind, r.id);
    if (!pid || r.data == null || typeof r.data !== 'object') continue;
    const g = get(pid);
    if (r.kind === 'profile' && typeof (r.data as Profile).name === 'string') g.profile = r.data as Profile;
    else if (r.kind === 'progress' && (r.data as Core).skills) g.core = r.data as Core;
    else if (r.kind === 'log' && Array.isArray(r.data)) g.log = unionLog(g.log, r.data as Attempt[]);
    else if (r.kind === 'test' && typeof (r.data as TestResult).id === 'string') g.tests.push(r.data as TestResult);
  }
  const out: { pid: string; profile: Profile | null; progress: Progress }[] = [];
  for (const [pid, g] of by) {
    const fromLog = { ...progressFromLog(g.log), tests: g.tests.sort((a, b) => a.t - b.t) };
    const fromRow = g.core ? { ...emptyProgress(), ...g.core, log: [], tests: [] } : null;
    const progress = fromRow ? mergeRescue(fromRow as Progress, fromLog) : fromLog;
    if (progress.log.length || progress.stars || progress.solved || progress.tests.length) out.push({ pid, profile: g.profile, progress });
  }
  return out;
}

/** Kurzer Überblick über die Cloud für die Speicher-Diagnose: je Kind, ob Profil/Lernstand dort als gelöscht markiert
 *  sind und wie viele Tage Verlauf es gibt. null = nicht angemeldet oder offline. */
export async function cloudSummary(): Promise<{ pid: string; profileDeleted: boolean | null; progressDeleted: boolean | null; logDays: number; logDaysDeleted: number }[] | null> {
  if (!syncConfigured() || !loadSession()) return null;
  const t = await authToken();
  if (!t) return null;
  const rows = await supabaseRemote(t).list();
  const by = new Map<string, { pid: string; profileDeleted: boolean | null; progressDeleted: boolean | null; logDays: number; logDaysDeleted: number }>();
  for (const r of rows) {
    const pid = pidOf(r.kind, r.id);
    if (!pid) continue;
    const g = by.get(pid) ?? { pid, profileDeleted: null, progressDeleted: null, logDays: 0, logDaysDeleted: 0 };
    by.set(pid, g);
    if (r.kind === 'profile') g.profileDeleted = !!r.deleted;
    if (r.kind === 'progress') g.progressDeleted = !!r.deleted;
    if (r.kind === 'log') r.deleted ? g.logDaysDeleted++ : g.logDays++;
  }
  return [...by.values()];
}

/** Angemeldet: die Cloud nach Lernständen durchsuchen (rescue.ts). Ohne Anmeldung oder Netz: nichts. */
export async function cloudCopies(): Promise<{ pid: string; profile: Profile | null; progress: Progress }[]> {
  if (!syncConfigured() || !loadSession()) return [];
  const t = await authToken();
  if (!t) return [];
  return collectCloud(supabaseRemote(t));
}

export const removedList = (dev: Device = browserDevice): Removed[] => parse<Removed[]>(dev.read(REMOVED), []);
/** Ein anderswo gelöschtes Kind wiederherstellen – es kommt mit dem nächsten Abgleich auch auf die anderen Geräte. */
export function restoreRemoved(profileId: string, dev: Device = browserDevice): void {
  const list = removedList(dev);
  const r = list.find((x) => x.profile.id === profileId);
  if (!r) return;
  dev.commit((d) => {
    if (!d.profiles.some((p) => p.id === profileId)) d.profiles.push(r.profile);
    // zusammenführen statt ersetzen: was seitdem geübt wurde, bleibt auch
    const cur = d.progress[profileId];
    d.progress[profileId] = cur ? mergeRescue(cur, r.progress) : r.progress;
  });
  dev.write(REMOVED, JSON.stringify(list.filter((x) => x.profile.id !== profileId)));
  changed();
  syncSoon(500);
}
export function forgetRemoved(profileId: string, dev: Device = browserDevice): void {
  dev.write(REMOVED, JSON.stringify(removedList(dev).filter((x) => x.profile.id !== profileId)));
  changed();
}

// ---------- im Browser: localStorage und Supabase (REST, keine Bibliothek) ----------

// Eigenes Supabase-Projekt „Schlaufuchs“ (Sascha 22.10.2026: nicht das GolfOS-Projekt). Solange die beiden Werte leer
// sind, ist der Abgleich aus und die Anmeldung ausgeblendet. Die Browser-Prüfungen setzen window.__schlaufuchsSupabase.
const TEST = (typeof window !== 'undefined' ? (window as unknown as { __schlaufuchsSupabase?: { url: string; key: string; google?: boolean } }).__schlaufuchsSupabase : undefined) ?? null;
export const SUPABASE_URL: string = TEST?.url ?? 'https://gypgaepmlftnqwywupeq.supabase.co'; // Projekt „Schlaufuchs“ (EU, Frankfurt)
export const SUPABASE_KEY: string = TEST?.key ?? 'sb_publishable_o6xh8QQjKQBq1NXuVbBBRA_uJhRKAo9'; // öffentlich – die Zeilen-Regel schützt die Daten
/** „Mit Google anmelden“ erst zeigen, wenn Google im Schlaufuchs-Projekt eingerichtet ist. */
export const GOOGLE_LOGIN: boolean = TEST?.google ?? true; // eingerichtet (Sascha 22.10.2026, eigener Google-Client)
export const syncConfigured = (): boolean => SUPABASE_URL !== '' && SUPABASE_KEY !== '';
const TABLE = 'schlaufuchs_items';

const ls = {
  read: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  write: (k: string, v: string | null) => {
    try {
      if (v == null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch {
      /* voll oder gesperrt */
    }
  },
};

let browserDevice: Device = { get: () => ({ schema: 1, profiles: [], progress: {}, activeId: null, parent: { pin: null } }), commit: () => {}, ...ls };
/** Verbindet den Abgleich mit dem Speicher der App (main.tsx). */
/** Ist der Lernstand auf diesem Gerät geladen? Vorher (oder wenn er nicht lesbar ist) wird nie abgeglichen – ein leerer
 *  Stand darf nicht als „alles gelöscht“ hochgehen. */
let storeLoaded: () => boolean = () => true;
export function connectStore(get: () => AppData, commit: (fn: (d: AppData) => void) => void, loaded?: () => boolean): void {
  browserDevice = { get, commit, ...ls };
  if (loaded) storeLoaded = loaded;
}

const AUTH = 'schlaufuchs:auth.v1';
/** ein Hinweis fürs Anmeldeformular (z. B. abgelaufener Link aus der Mail) */
const NOTICE = 'schlaufuchs:auth.notice.v1';
export function clearNotice(): void {
  ls.write(NOTICE, null);
  changed();
}
interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  email: string | null;
  /** der Benutzername der Familie (wenn festgelegt) – damit melden sich die anderen Geräte an */
  name?: string | null;
  /** zu welchem Supabase-Projekt die Anmeldung gehört – eine aus einem anderen Projekt gilt nicht */
  url?: string;
}
const loadSession = (): Session | null => {
  const s = parse<Session | null>(ls.read(AUTH), null);
  return s && s.url === SUPABASE_URL && syncConfigured() ? s : null;
};
const saveSession = (s: Session | null) => ls.write(AUTH, s ? JSON.stringify({ ...s, url: SUPABASE_URL }) : null);

/** „Mit Google anmelden“: Supabase schickt zu Google und mit den Schlüsseln in der Adresse zurück in die App. */
export function signIn(): void {
  const back = location.origin + location.pathname;
  location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(back)}`;
}
export function signOut(): void {
  liveClose();
  saveSession(null);
  ls.write(META, null);
  ls.write(BASE, null);
  ls.write(LAST, null);
  noteError(null);
  changed();
}

/** Zurück von Google oder aus der Bestätigungs-Mail: die Schlüssel stehen in der Adresse (#access_token=…) – merken,
 *  Adresse aufräumen. Ein abgelaufener oder schon benutzter Link (#error=…) wird beim Anmelden erklärt. */
export async function finishSignIn(): Promise<void> {
  if (/[#&]error=/.test(location.hash) && !location.hash.includes('access_token=')) {
    const p = new URLSearchParams(location.hash.slice(1));
    history.replaceState(null, '', location.pathname + location.search);
    ls.write(NOTICE, p.get('error_code') === 'otp_expired' ? 'Der Link aus der E-Mail ist abgelaufen oder wurde schon benutzt. Melde dich einfach mit Benutzername und Passwort an.' : 'Die Anmeldung über den Link hat nicht geklappt. Melde dich mit Benutzername und Passwort an.');
    changed();
    return;
  }
  if (!location.hash.includes('access_token=')) return;
  const p = new URLSearchParams(location.hash.slice(1));
  history.replaceState(null, '', location.pathname + location.search);
  const access = p.get('access_token');
  const refresh = p.get('refresh_token');
  if (!access || !refresh) return;
  const s: Session = { access_token: access, refresh_token: refresh, expires_at: Math.floor(Date.now() / 1000) + Number(p.get('expires_in') ?? 3600), email: null };
  try {
    const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${access}` } }).then((r) => r.json());
    s.email = u.email ?? null;
    s.name = await ownName(access);
  } catch {
    /* die Adresse kommt später */
  }
  saveSession(s);
  changed();
}

// ---------- Anmelden mit Benutzername (oder E-Mail) und Passwort ----------
// Sascha 22.10.2026: „eine Anmeldung, wo man sich im Anschluss mit Benutzernamen und Passwort auf verschiedenen Geräten
// anmelden kann“. Einmal ein Konto anlegen (Benutzername, E-Mail, Passwort), danach überall mit Benutzername + Passwort.
// Supabase kennt nur E-Mail + Passwort: der Server sucht zum Benutzernamen die E-Mail – nur bei richtigem Passwort
// (supabase/schlaufuchs.sql). Wer mit Google angemeldet ist, kann Benutzername + Passwort nachträglich festlegen.

export const USERNAME_RULE = /^[a-z0-9][a-z0-9._-]{2,19}$/;
export const PASSWORD_MIN = 8;
export const normName = (s: string) => s.trim().toLowerCase();

const authHeaders = (bearer?: string) => ({ apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) });

/** Die Meldungen von Supabase in Elternsprache. */
async function authProblem(r: Response): Promise<Error> {
  const j = (await r.json().catch(() => ({}))) as { error_code?: string; code?: string | number; msg?: string; message?: string; error_description?: string };
  const code = String(j.error_code ?? j.code ?? '');
  const text = `${j.msg ?? j.message ?? j.error_description ?? ''}`;
  const say = (t: string) => new Error(t);
  if (code === 'user_already_exists' || /already registered/i.test(text)) return say('Mit dieser E-Mail gibt es schon ein Konto – bitte anmelden.');
  if (code === 'invalid_credentials' || /invalid login/i.test(text)) return say('Benutzername oder Passwort stimmt nicht.');
  if (code === 'weak_password' || /password/i.test(text) && /least|short|weak/i.test(text)) return say(`Das Passwort ist zu kurz – mindestens ${PASSWORD_MIN} Zeichen.`);
  if (code === 'email_address_invalid' || /email.*invalid/i.test(text)) return say('Diese E-Mail-Adresse funktioniert nicht.');
  if (code === 'over_request_rate_limit' || r.status === 429) return say('Zu viele Versuche – bitte in ein paar Minuten noch einmal.');
  if (code === 'email_not_confirmed' || /not confirmed/i.test(text)) return say('Die E-Mail-Adresse ist noch nicht bestätigt – bitte zuerst den Link in der Bestätigungs-Mail antippen.');
  if (code === 'signup_disabled' || code === 'email_provider_disabled') return say('Konten mit E-Mail sind in Supabase noch ausgeschaltet.');
  if (code === '23505' || /duplicate|unique/i.test(text) || /database error saving new user/i.test(text)) return say('Dieser Benutzername ist schon vergeben.');
  if (/too_many_attempts/.test(text)) return say('Zu viele falsche Versuche – bitte in 15 Minuten noch einmal.');
  return say(`Anmeldung fehlgeschlagen (${r.status}${text ? `: ${text.slice(0, 80)}` : ''}).`);
}

async function rpc<T>(fn: string, args: Record<string, unknown>, bearer?: string): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: authHeaders(bearer), body: JSON.stringify(args) });
  if (!r.ok) throw await authProblem(r);
  const text = await r.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** Der Benutzername dieses Kontos (null: keiner festgelegt). */
async function ownName(bearer: string): Promise<string | null> {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/schlaufuchs_names?select=username`, { headers: authHeaders(bearer) });
    if (!r.ok) return null;
    return ((await r.json()) as { username: string }[])[0]?.username ?? null;
  } catch {
    return null;
  }
}

/** Antwort von Supabase mit Schlüsseln → angemeldet, dann gleich abgleichen. */
async function startSession(j: { access_token?: string; refresh_token?: string; expires_in?: number; user?: { email?: string } }): Promise<void> {
  if (!j.access_token || !j.refresh_token) throw new Error('Die Anmeldung hat nicht geklappt – bitte noch einmal versuchen.');
  // ein anderes Konto als zuletzt auf diesem Gerät: neu abgleichen (die Kinder hier kommen dazu)
  ls.write(META, null);
  ls.write(BASE, null);
  ls.write(NOTICE, null);
  saveSession({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Math.floor(Date.now() / 1000) + (j.expires_in ?? 3600), email: j.user?.email ?? null, name: await ownName(j.access_token) });
  noteError(null);
  changed();
  void syncNow();
}

/** Anmelden: Benutzername (oder E-Mail) und Passwort. */
export async function signInWithPassword(login: string, password: string): Promise<void> {
  let email = login.trim();
  if (!email.includes('@')) {
    const found = await rpc<string | null>('schlaufuchs_login_email', { p_username: normName(login), p_password: password });
    if (!found) throw new Error('Benutzername oder Passwort stimmt nicht.');
    email = found;
  }
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ email, password }) });
  if (!r.ok) throw await authProblem(r);
  await startSession(await r.json());
}

/**
 * Neues Konto: Benutzername, E-Mail, Passwort. 'done': dieses Gerät ist angemeldet. 'confirm': Supabase hat eine
 * Bestätigungs-Mail geschickt („Confirm email“ an) – der Link darin führt zurück in die App und meldet dort an.
 */
export async function signUp(username: string, email: string, password: string): Promise<'done' | 'confirm'> {
  const name = normName(username);
  if (!USERNAME_RULE.test(name)) throw new Error('Benutzername: 3–20 Zeichen, nur Buchstaben a–z, Ziffern, Punkt, Strich.');
  if (password.length < PASSWORD_MIN) throw new Error(`Das Passwort ist zu kurz – mindestens ${PASSWORD_MIN} Zeichen.`);
  if (!(await rpc<boolean>('schlaufuchs_name_free', { p_username: name }))) throw new Error('Dieser Benutzername ist schon vergeben.');
  // der Link in der Bestätigungs-Mail kommt hierher zurück (Sascha 22.10.2026: er landete auf einer 404-Seite)
  const back = encodeURIComponent(location.origin + location.pathname);
  const r = await fetch(`${SUPABASE_URL}/auth/v1/signup?redirect_to=${back}`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ email: email.trim(), password, data: { sf_username: name } }) });
  if (!r.ok) throw await authProblem(r);
  const j = await r.json();
  if (!j.access_token) return 'confirm';
  await startSession(j);
  return 'done';
}

/** Angemeldet (z. B. mit Google): Benutzername und Passwort festlegen oder ändern – für die Anmeldung auf den anderen Geräten. */
export async function setLogin(username: string | null, password: string | null): Promise<void> {
  const t = await authToken();
  if (!t) throw new Error('Bitte zuerst neu anmelden.');
  if (username != null) {
    const name = normName(username);
    if (!USERNAME_RULE.test(name)) throw new Error('Benutzername: 3–20 Zeichen, nur Buchstaben a–z, Ziffern, Punkt, Strich.');
    if (name !== loadSession()?.name) await rpc('schlaufuchs_set_username', { p_username: name }, t);
  }
  if (password != null) {
    if (password.length < PASSWORD_MIN) throw new Error(`Das Passwort ist zu kurz – mindestens ${PASSWORD_MIN} Zeichen.`);
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { method: 'PUT', headers: authHeaders(t), body: JSON.stringify({ password }) });
    if (!r.ok) throw await authProblem(r);
  }
  const s = loadSession();
  if (s) saveSession({ ...s, name: await ownName(t) });
  changed();
}

/** Ein gültiger Schlüssel – erneuert, wenn er abläuft (er gilt eine Stunde). Immer nur eine Erneuerung zugleich.
 *  Auch für die Mitteilungen (data/push.ts). */
let refreshing: Promise<string | null> | null = null;
export async function authToken(): Promise<string | null> {
  const s = loadSession();
  if (!s) return null;
  if (s.expires_at - 60 > Date.now() / 1000) return s.access_token;
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: s.refresh_token }),
      });
      if (!r.ok) {
        const why = await r.text().catch(() => '');
        if ((r.status === 400 || r.status === 401) && /invalid|not found|revoked/i.test(why) && !/already used/i.test(why)) {
          saveSession(null);
          noteError('Abgemeldet – bitte neu anmelden.');
        }
        return null;
      }
      const j = await r.json();
      const next = { ...s, access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Math.floor(Date.now() / 1000) + (j.expires_in ?? 3600) };
      saveSession(next);
      return next.access_token as string;
    } catch {
      return null; // offline
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

function supabaseRemote(bearer: string): Remote {
  const base = `${SUPABASE_URL}/rest/v1/${TABLE}`;
  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' };
  const ok = async (r: Response) => {
    if (!r.ok) throw new Error(`${r.status} ${(await r.text().catch(() => '')).slice(0, 120)}`.trim());
    return r;
  };
  const body = (r: Row) => ({ kind: r.kind, id: r.id, data: r.data ?? {}, updated_at: r.updated_at, deleted: !!r.deleted });
  const one = (r: Row) => `kind=eq.${encodeURIComponent(r.kind)}&id=eq.${encodeURIComponent(r.id)}`;
  return {
    list: async () => {
      const all: Row[] = [];
      for (let from = 0; ; from += 1000) {
        const page: Row[] = await (await ok(await fetch(`${base}?select=kind,id,updated_at,deleted&order=kind,id&limit=1000&offset=${from}`, { headers }))).json();
        all.push(...page);
        if (page.length < 1000) return all;
      }
    },
    fetch: async (keys) => {
      const out: Row[] = [];
      const byKind = new Map<string, string[]>();
      for (const x of keys) byKind.set(x.kind, [...(byKind.get(x.kind) ?? []), x.id]);
      for (const [kind, ids] of byKind)
        for (let i = 0; i < ids.length; i += 50) {
          const list = ids.slice(i, i + 50).map((id) => `"${id.replace(/"/g, '\\"')}"`).join(',');
          out.push(...(await (await ok(await fetch(`${base}?select=kind,id,data,updated_at,deleted&kind=eq.${encodeURIComponent(kind)}&id=in.(${encodeURIComponent(list)})`, { headers }))).json()));
        }
      return out;
    },
    upsert: async (all) => {
      const failed: { row: Row; error: string }[] = [];
      // Löschen setzt nur das Kennzeichen – der Inhalt bleibt in der Cloud (Rettung, 24.10.2026)
      const marks = all.filter((r) => r.deleted && r.data === undefined);
      for (const row of marks) {
        const x = await fetch(`${base}?${one(row)}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify({ deleted: true, updated_at: row.updated_at }) });
        if (x.status === 401) throw new Error('401 Anmeldung abgelaufen');
        if (!x.ok) failed.push({ row, error: `${x.status} ${(await x.text().catch(() => '')).slice(0, 120)}`.trim() });
      }
      const rows = all.filter((r) => !marks.includes(r));
      const send = (list: Row[]) => fetch(`${base}?on_conflict=user_id,kind,id`, { method: 'POST', headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(list.map(body)) });
      for (let i = 0; i < rows.length; i += 50) {
        const chunk = rows.slice(i, i + 50);
        const r = await send(chunk);
        if (r.ok) continue;
        if (r.status === 401) throw new Error('401 Anmeldung abgelaufen');
        for (const row of chunk) {
          const x = chunk.length === 1 ? r : await send([row]);
          if (!x.ok) failed.push({ row, error: `${x.status} ${(await x.text().catch(() => '')).slice(0, 120)}`.trim() });
        }
      }
      return failed;
    },
    create: async (row) => {
      const r = await ok(await fetch(`${base}?on_conflict=user_id,kind,id`, { method: 'POST', headers: { ...headers, Prefer: 'resolution=ignore-duplicates,return=representation' }, body: JSON.stringify([body(row)]) }));
      return ((await r.json()) as unknown[]).length > 0;
    },
    replace: async (row, ifAt) => {
      const r = await ok(await fetch(`${base}?${one(row)}&updated_at=eq.${encodeURIComponent(ifAt)}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify(body(row)) }));
      return ((await r.json()) as unknown[]).length > 0;
    },
  };
}

// ---------- Zustand für die Anzeige ----------

const LAST = 'schlaufuchs:sync.last.v1';
const ERROR = 'schlaufuchs:sync.error.v1';
export interface SyncStatus {
  /** Supabase-Projekt eingetragen? Sonst keine Anmeldung zeigen. */
  configured: boolean;
  /** Google-Anmeldung im Projekt eingerichtet */
  google: boolean;
  signedIn: boolean;
  email: string | null;
  /** Benutzername der Familie (null: nur Google, noch keiner festgelegt) */
  name: string | null;
  running: boolean;
  last: string | null;
  error: string | null;
  removed: number;
  /** Hinweis fürs Anmeldeformular */
  notice: string | null;
}
let running: Promise<SyncResult | null> | null = null;
let status: SyncStatus = readStatus();
const watchers = new Set<() => void>();
function readStatus(): SyncStatus {
  const s = loadSession();
  return { configured: syncConfigured(), google: GOOGLE_LOGIN, signedIn: !!s, email: s?.email ?? null, name: s?.name ?? null, running: running != null, last: ls.read(LAST), error: parse<{ text: string } | null>(ls.read(ERROR), null)?.text ?? null, removed: parse<unknown[]>(ls.read(REMOVED), []).length, notice: ls.read(NOTICE) };
}
function changed() {
  status = readStatus();
  watchers.forEach((w) => w());
}
function noteError(text: string | null) {
  ls.write(ERROR, text ? JSON.stringify({ at: new Date().toISOString(), text }) : null);
}
export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (w) => {
      watchers.add(w);
      return () => watchers.delete(w);
    },
    () => status,
  );
}

let again = false;
/** Gleicht jetzt ab, wenn angemeldet und online. Immer nur einer zugleich; eine Änderung währenddessen → gleich noch einer. */
export function syncNow(): Promise<SyncResult | null> {
  if (!syncConfigured() || !loadSession() || (typeof navigator !== 'undefined' && navigator.onLine === false)) return Promise.resolve(null);
  if (!storeLoaded()) return Promise.resolve(null);
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      const t = await authToken();
      if (!t) return null;
      const res = await syncOnce(browserDevice, supabaseRemote(t));
      ls.write(LAST, res.at);
      noteError(res.failed ? `${res.failed} Einträge abgelehnt (${res.error}) – beim nächsten Abgleich erneut.` : null);
      if (res.pushed) nudgeOthers();
      if (res.again) again = true;
      return res;
    } catch (e) {
      if (typeof navigator === 'undefined' || navigator.onLine !== false) noteError(`Abgleich fehlgeschlagen: ${(e as Error).message}`);
      return null;
    } finally {
      running = null;
      changed();
      liveConnect();
      if (again) {
        again = false;
        syncSoon(800);
      }
    }
  })();
  changed();
  return running;
}

let soon = 0;
/** Etwas wurde gespeichert: in ein paar Sekunden abgleichen (mehrere Antworten hintereinander werden ein Abgleich). */
export function syncSoon(ms = 2500): void {
  if (!syncConfigured() || !loadSession()) return;
  window.clearTimeout(soon);
  soon = window.setTimeout(() => void syncNow(), ms);
}

/** Beim Start: Rückkehr von Google auswerten, abgleichen, live verbinden; dann beim Zurückkehren in die App, beim
 *  Verlassen (gleich hochschicken), wenn das Netz wiederkommt und alle 3 Minuten. */
export async function startSync(): Promise<void> {
  if (!syncConfigured()) return;
  await finishSignIn();
  void syncNow();
  document.addEventListener('visibilitychange', () => void syncNow());
  window.addEventListener('online', () => void syncNow());
  window.setInterval(() => void syncNow(), 3 * 60 * 1000);
}

// ---------- live: eine Änderung auf einem Gerät ist in Sekunden auf den anderen ----------
// Wie GolfOS: nach einem Abgleich, der etwas geschickt hat, ein Anstupser im Kanal der Familie (Supabase Realtime
// Broadcast – keine Daten, nur „etwas hat sich geändert“); jedes andere offene Gerät gleicht sofort ab.

let live: WebSocket | null = null;
let liveTopic = '';
let liveRef = 1;
let liveBeat = 0;
let liveRetry = 0;
let liveWait = 1000;

function userId(): string | null {
  const t = loadSession()?.access_token;
  if (!t) return null;
  try {
    const b = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return (JSON.parse(atob(b + '==='.slice((b.length + 3) % 4))) as { sub?: string }).sub ?? null;
  } catch {
    return null;
  }
}

export function liveConnect(): void {
  if (typeof WebSocket === 'undefined' || !syncConfigured()) return;
  const id = userId();
  if (!id) return liveClose();
  const topic = `realtime:schlaufuchs-${id}`;
  if (live && liveTopic === topic && (live.readyState === WebSocket.OPEN || live.readyState === WebSocket.CONNECTING)) return;
  liveClose();
  liveTopic = topic;
  const ws = new WebSocket(`${SUPABASE_URL.replace(/^http/, 'ws')}/realtime/v1/websocket?apikey=${SUPABASE_KEY}&vsn=1.0.0`);
  live = ws;
  const send = (event: string, payload: unknown, t = topic) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ topic: t, event, payload, ref: String(liveRef++) }));
  ws.onopen = () => {
    liveWait = 1000;
    send('phx_join', { config: { broadcast: { self: false }, presence: { key: '' }, private: false } });
    window.clearInterval(liveBeat);
    liveBeat = window.setInterval(() => send('heartbeat', {}, 'phoenix'), 25000);
  };
  ws.onmessage = (m) => {
    try {
      const d = JSON.parse(String(m.data)) as { event?: string; payload?: { event?: string } };
      if (d.event === 'broadcast' && d.payload?.event === 'changed') void syncNow();
    } catch {
      /* nicht für uns */
    }
  };
  ws.onclose = () => {
    if (live !== ws) return;
    live = null;
    window.clearInterval(liveBeat);
    window.clearTimeout(liveRetry);
    liveRetry = window.setTimeout(liveConnect, liveWait);
    liveWait = Math.min(liveWait * 2, 30000);
  };
}

export function liveClose(): void {
  window.clearTimeout(liveRetry);
  window.clearInterval(liveBeat);
  const ws = live;
  live = null;
  ws?.close();
}

function nudgeOthers(): void {
  if (!live || live.readyState !== WebSocket.OPEN) return liveConnect();
  live.send(JSON.stringify({ topic: liveTopic, event: 'broadcast', payload: { type: 'broadcast', event: 'changed', payload: {} }, ref: String(liveRef++) }));
}
