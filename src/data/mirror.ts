// Zweitspeicher (IndexedDB) für den Lernstand – Nachtlauf 22.10.2026.
// Warum: localStorage fasst nur etwa 5 MB und kann voll laufen; IndexedDB hat viel mehr Platz. Der Zweitspeicher
// bekommt bei jeder Änderung eine Kopie (nur schreiben, nie löschen). Beim Start gilt: Ist der normale Speicher leer
// oder älter als die Kopie (z. B. weil er voll war), wird die Kopie genommen – der bisherige Stand bleibt dabei als
// eigene Sicherung im Zweitspeicher liegen.
//
// Umzug (Nachtlauf 23.10.2026): Wird der Lernstand groß oder ist localStorage voll, ist dieser Speicher der
// Hauptspeicher – localStorage behält dann nur einen Verweis (store.ts, moveOut). Siehe docs/speicher.md.

const DB = 'schlaufuchs';
const STORE = 'kv';
const MAIN = 'app';

export interface Snapshot {
  json: string;
  /** Zeitpunkt der Änderung (ms) */
  at: number;
}

export const available = () => typeof indexedDB !== 'undefined';

let dbp: Promise<IDBDatabase> | null = null;
function open(): Promise<IDBDatabase> {
  dbp ??= new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.onblocked = () => reject(new Error('blocked'));
  });
  dbp.catch(() => (dbp = null));
  return dbp;
}

async function req<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const r = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(r.result as T);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function readMirror(id = MAIN): Promise<Snapshot | null> {
  if (!available()) return null;
  try {
    const v = await req<Snapshot | undefined>('readonly', (s) => s.get(id));
    return v && typeof v.json === 'string' && typeof v.at === 'number' ? v : null;
  } catch {
    return null;
  }
}

export async function putMirror(snap: Snapshot, id = MAIN): Promise<boolean> {
  if (!available()) return false;
  try {
    await req('readwrite', (s) => s.put(snap, id));
    return true;
  } catch {
    return false;
  }
}

// Schreiben gebündelt (viele Antworten kurz hintereinander = eine Kopie), beim Verlassen der Seite sofort
/** wie readMirror, aber ein Lesefehler wirft (statt „nichts da“) – wichtig, wenn dieser Speicher der einzige ist */
export async function readMirrorStrict(id = MAIN): Promise<Snapshot | null> {
  if (!available()) return null;
  const v = await req<Snapshot | undefined>('readonly', (s) => s.get(id));
  return v && typeof v.json === 'string' && typeof v.at === 'number' ? v : null;
}

/** Alle Einträge (Hauptkopie und Sicherungen wie „vor-wiederherstellung:…“) – für die Lernstand-Rettung (rescue.ts). */
export async function listMirror(): Promise<{ id: string; snap: Snapshot }[]> {
  if (!available()) return [];
  try {
    const ids = await req<IDBValidKey[]>('readonly', (s) => s.getAllKeys());
    const out: { id: string; snap: Snapshot }[] = [];
    for (const id of ids) {
      const v = await readMirror(String(id));
      if (v) out.push({ id: String(id), snap: v });
    }
    return out;
  } catch {
    return [];
  }
}

let pending: Snapshot | null = null;
let pendingDone: ((ok: boolean) => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let lastOk = true;
const flush = () => {
  if (timer) clearTimeout(timer);
  timer = null;
  const s = pending;
  const done = pendingDone;
  pending = null;
  pendingDone = null;
  if (s)
    void putMirror(s).then((ok) => {
      lastOk = ok;
      done?.(ok);
    });
};
/** Kopie schreiben (gebündelt). done: Bescheid, ob dieser Stand angekommen ist (nur der zuletzt übergebene). */
export function writeMirror(snap: Snapshot, done?: (ok: boolean) => void) {
  if (!available()) return done?.(false);
  pending = snap;
  pendingDone = done ?? null;
  timer ??= setTimeout(flush, 500);
}
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
}
/** Hat die letzte Kopie geklappt? */
export const mirrorOk = () => available() && lastOk;

/** Welcher Stand gilt beim Start? Pure Entscheidung (getestet). */
export function choose(local: { has: boolean; at: number }, mirror: Snapshot | null): 'local' | 'mirror' {
  if (!mirror) return 'local';
  if (!local.has) return 'mirror';
  // eine Sekunde Spielraum: beide werden bei jeder Änderung geschrieben
  return mirror.at > local.at + 1000 ? 'mirror' : 'local';
}

/** Browser bitten, den Speicher nicht von selbst zu leeren (wirkt v. a. in Chrome/Android und bei Home-Bildschirm-Apps). */
export function askPersist() {
  try {
    void navigator.storage?.persist?.().catch(() => undefined);
  } catch {
    /* nicht unterstützt */
  }
}
