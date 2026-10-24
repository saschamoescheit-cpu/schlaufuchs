// Speicherung aller Kinderprofile und Lernstände auf dem Gerät; mit Google-Anmeldung zusätzlich auf allen Geräten
// gleich (sync.ts).
// Speicherort: localStorage (sofort lesbar) mit Kopie in IndexedDB (mirror.ts). Wird der Lernstand groß oder ist
// localStorage voll, zieht er ganz in IndexedDB um; localStorage behält dann nur einen Verweis (Nachtlauf 23.10.2026,
// docs/speicher.md). Umgezogen wird erst, wenn IndexedDB genau diesen Stand nachweislich hat – nie geht etwas verloren.
// Das Datenmodell ist für einen späteren Eltern-Bereich vorbereitet (parent: PIN, Einstellungen je Kind).
import { useSyncExternalStore } from 'react';
import { DEFAULT_KEY } from '../engine/grading';
import { emptyProgress, type Progress } from '../engine/learning';
import type { Grade, Subject } from '../engine/types';
import type { Pace } from '../engine/session';
import { DEFAULT_STATE, stateInfo } from '../content/curriculum';
import { mergeTwo } from './merge';
import { askPersist, available as mirrorAvailable, choose, pruneDaily, putMirror, readMirror, readMirrorStrict, writeMirror } from './mirror';
import { DELETED } from './sync';

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  age: number;
  grade: Grade;
  state: string;
  englishFrom: Grade;
  gradesFrom: Grade;
  gradeKey: number[];
  /** Aufgaben automatisch vorlesen (Leseanfänger) */
  autoRead: boolean;
  sound: boolean;
  pace: Pace;
  /** Tagesziel: so viele Aufgaben am Tag (0 = kein Ziel) */
  dailyGoal?: number;
  /** eingetragene Klassenarbeiten/Tests in der Schule */
  plannedTests?: PlannedTest[];
  /** Blitzrunde: Rekord (richtige Aufgaben in 60 s) je Thema */
  blitz?: Record<string, number>;
  /** Fuchs-Outfit: ausgewählte Teile (je Platz Kopf/Hals eins), freigeschaltet mit Sternen */
  outfit?: string[];
  /** Englisch: Nachsprechen mit Mikrofon (Spracherkennung von Apple/Google) – nur mit Erlaubnis der Eltern */
  micPractice?: boolean;
  /** Schuljahr (Startjahr, z. B. 2026 für 2026/27), für das die Klasse zuletzt bestätigt wurde */
  gradeYear?: number;
  /** Schulschrift (Leseschrift Andika: eindeutige Buchstaben, z. B. I und l verschieden) für Aufgaben – ohne Angabe an in Klasse 1 und 2 */
  schoolFont?: boolean;
  created: number;
}

export const usesSchoolFont = (p: Profile) => p.schoolFont ?? p.grade <= 2;

/** ein Test in der Schule, für den geübt wird */
export interface PlannedTest {
  id: string;
  subject: Subject;
  /** Datum JJJJ-MM-TT */
  date: string;
  note?: string;
  skills: string[];
}

export interface AppData {
  schema: 1;
  profiles: Profile[];
  progress: Record<string, Progress>;
  activeId: string | null;
  /** für den späteren Eltern-Bereich */
  parent: { pin: string | null; push?: FamilyPush };
}

/** Mitteilungen für die ganze Familie (wird mit dem Eltern-Datensatz zwischen den Geräten abgeglichen, Sascha 23.10.2026):
 *  an/aus und welche Arten. Jedes Gerät muss sie trotzdem einmal selbst erlauben (Apple/Browser). */
export interface FamilyPush {
  on: boolean;
  kinds: { learn: boolean; tests: boolean; cards: boolean };
}

const KEY = 'schlaufuchs:v1';
/** auf diesem Gerät absichtlich gelöschte Kinder (für immer – rescue.ts) */
export const DELETED_EVER = 'schlaufuchs:deleted-ever.v1';
const AT_KEY = 'schlaufuchs:v1:at';
/** Ab dieser Größe (Zeichen) zieht der Lernstand in den großen Speicher (IndexedDB) um: localStorage fasst je Seite nur
 *  etwa 5 MB und wird auch für Anmeldung und Abgleich gebraucht. */
export const MOVE_AT = 1_000_000;
/** Verweis in localStorage: der Lernstand liegt in IndexedDB */
const MOVED = 'indexeddb';
const empty = (): AppData => ({ schema: 1, profiles: [], progress: {}, activeId: null, parent: { pin: null } });

/** fehlende oder kaputte Felder auffüllen (nichts wird entfernt) – sonst stürzen Bildschirme ab */
function repair(d: AppData): AppData {
  const obj = (x: unknown) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
  const arr = (x: unknown) => (Array.isArray(x) ? x : []);
  const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
  const progress: AppData['progress'] = {};
  for (const [id, p] of Object.entries(obj(d.progress) as Record<string, Partial<Progress> | null>)) {
    const q = (p ?? {}) as Partial<Progress>;
    progress[id] = { ...emptyProgress(), ...q, skills: obj(q.skills) as Progress['skills'], review: arr(q.review), log: arr(q.log), tests: arr(q.tests), days: obj(q.days) as Progress['days'], stars: num(q.stars), solved: num(q.solved) };
  }
  return { ...empty(), ...d, profiles: arr(d.profiles), progress };
}

/** Liegt der Lernstand nur noch in IndexedDB? */
let movedOut = false;
/** Nach dem Umzug ist beim Start erst IndexedDB zu lesen – bis dahin wird nichts geschrieben (sonst überschriebe ein
 *  leerer Stand den echten). Bleibt false, wenn IndexedDB nicht lesbar ist. */
let ready = true;
/** IndexedDB beim Start nicht lesbar (nach dem Umzug): nichts schreiben, Hinweis zeigen, später neu versuchen */
let loadError = false;

function load(): AppData {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as AppData & { moved?: string };
    if (parsed && parsed.moved === MOVED) {
      movedOut = true;
      ready = false;
      return empty();
    }
    return repair(parsed);
  } catch {
    // nicht lesbar: Rohdaten aufheben, bevor irgendetwas überschrieben wird (nie Nutzerdaten verlieren)
    try {
      if (raw) localStorage.setItem(`${KEY}:unlesbar:${Date.now()}`, raw);
    } catch {
      /* Speicher voll – dann bleibt nur der Hinweis */
    }
    return empty();
  }
}

let data: AppData = load();
let saveError = false;
const listeners = new Set<() => void>();
let onChange: (() => void) | null = null;
/** Jede Änderung meldet sich hier (der Abgleich startet kurz danach). */
export const setChangeHook = (fn: (() => void) | null) => void (onChange = fn);

let rev = 0;
function persist() {
  if (!ready) return;
  const json = JSON.stringify(data);
  const at = Date.now();
  const r = ++rev;
  if (movedOut) {
    // Hauptspeicher ist IndexedDB. Den Zeitpunkt in localStorage NICHT erneuern: Schreibt ein alter, noch offener Tab
    // dort einen vollen (älteren) Stand hinein, soll der beim Start älter aussehen als die Kopie – dann gilt die Kopie.
    writeMirror({ json, at }, (ok) => {
      if (ok) return void (saveError = false);
      if (r !== rev) return; // inzwischen gibt es einen neueren Stand – der schreibt selbst
      // IndexedDB klappt nicht (mehr): den ganzen Stand doch wieder in localStorage
      try {
        localStorage.setItem(KEY, json);
        localStorage.setItem(AT_KEY, String(at));
        movedOut = false;
        saveError = false;
      } catch {
        saveError = true;
      }
    });
    return;
  }
  let full = false;
  try {
    localStorage.setItem(KEY, json);
    localStorage.setItem(AT_KEY, String(at));
    saveError = false;
  } catch {
    saveError = true;
    full = true;
  }
  // immer auch in den Zweitspeicher (springt ein, wenn localStorage voll ist)
  writeMirror({ json, at });
  if (full || json.length > MOVE_AT) void moveOut(json, at, r);
}

let moving = false;
/** Umzug in IndexedDB: erst dort schreiben und nachlesen; nur wenn genau dieser Stand dort liegt (und es nichts Neueres
 *  gibt), ersetzt ein Verweis den Lernstand in localStorage. */
async function moveOut(json: string, at: number, r: number): Promise<void> {
  if (moving || movedOut || !mirrorAvailable()) return;
  moving = true;
  try {
    if (!(await putMirror({ json, at }))) return;
    const back = await readMirrorStrict();
    if (back?.json !== json || r !== rev) return;
    localStorage.setItem(KEY, JSON.stringify({ moved: MOVED, at }));
    movedOut = true;
    saveError = false;
    localStorage.setItem(AT_KEY, String(at));
  } catch {
    /* Verweis nicht schreibbar oder IndexedDB nicht lesbar – dann bleibt es wie bisher (die neuere Kopie gilt beim Start) */
  } finally {
    moving = false;
  }
}
/** Liegt der Lernstand in IndexedDB? (Anzeige in den Eltern-Einstellungen) */
export const isMovedOut = () => movedOut;
/** Ist der Lernstand wirklich geladen? Vorher (oder wenn er nicht lesbar ist) darf nicht abgeglichen werden. */
export const isLoaded = () => ready && !loadError;
/** Muss die App vor dem ersten Bild IndexedDB lesen? (main.tsx) */
export const needsMirrorFirst = () => !ready;
/** Lernstand nach dem Umzug nicht lesbar – die App zeigt dann nur einen Hinweis */
export const hasLoadError = () => loadError;

/**
 * Beim Start einmal: Zweitspeicher mit dem normalen Speicher vergleichen. Ist die Kopie neuer (der normale Speicher war
 * voll) oder der normale Speicher leer, gilt die Kopie; der bisherige Stand bleibt als Sicherung im Zweitspeicher.
 */
export async function checkMirror(): Promise<'local' | 'mirror'> {
  askPersist();
  const res = await checkMirrorInner();
  if (isLoaded()) void dailyBackup().catch(() => undefined);
  return res;
}
async function checkMirrorInner(): Promise<'local' | 'mirror'> {
  if (movedOut && !ready) return loadMoved();
  let at = 0;
  let has = false;
  try {
    has = !!localStorage.getItem(KEY);
    at = Number(localStorage.getItem(AT_KEY) ?? 0) || 0;
  } catch {
    /* nicht lesbar – dann zählt die Kopie */
  }
  const m = await readMirror();
  const pick = choose({ has: has && data.profiles.length > 0, at }, m);
  if (pick === 'local' || !m) {
    if (data.profiles.length) writeMirror({ json: JSON.stringify(data), at: at || Date.now() });
    return 'local';
  }
  let restored: AppData;
  try {
    restored = repair(JSON.parse(m.json) as AppData);
  } catch {
    return 'local';
  }
  if (!restored.profiles.length) return 'local';
  if (data.profiles.length) await putMirror({ json: JSON.stringify(data), at: at || Date.now() }, `vor-wiederherstellung:${Date.now()}`);
  data = restored;
  persist();
  listeners.forEach((l) => l());
  onChange?.();
  return 'mirror';
}

/** Start nach dem Umzug: den Lernstand aus IndexedDB holen. Ein Lesefehler ist nicht „leer“: dann wird nichts
 *  geschrieben (bis zum nächsten Start), damit der echte Stand nicht überschrieben wird. */
async function loadMoved(): Promise<'local' | 'mirror'> {
  let m: Awaited<ReturnType<typeof readMirrorStrict>> = null;
  for (let i = 0; ; i++) {
    try {
      m = await readMirrorStrict();
      break;
    } catch {
      if (i >= 2) {
        loadError = true;
        listeners.forEach((l) => l());
        return 'local';
      }
      await new Promise((res) => setTimeout(res, 300));
    }
  }
  ready = true;
  if (m) {
    try {
      data = repair(JSON.parse(m.json) as AppData);
    } catch {
      // unlesbar: aufheben, nicht überschreiben
      await putMirror(m, `unlesbar:${Date.now()}`);
    }
  }
  listeners.forEach((l) => l());
  onChange?.();
  return 'mirror';
}

// structuredClone gibt es in Safari erst ab iOS 15.4 – auf älteren iPads per JSON kopieren (die Daten sind reines JSON)
const clone = <T,>(x: T): T => (typeof structuredClone === 'function' ? structuredClone(x) : (JSON.parse(JSON.stringify(x)) as T));

/** Verliert diese Änderung etwas? (ein Kind weg, oder weniger Sterne/gelöste Aufgaben/Verlauf) */
export function losesSomething(before: AppData, after: AppData): boolean {
  for (const p of before.profiles) {
    if (!after.profiles.some((x) => x.id === p.id)) return true;
    const a = before.progress[p.id];
    const b = after.progress[p.id];
    if (!a) continue;
    if (!b || b.stars < a.stars || b.solved < a.solved || b.log.length < a.log.length || b.tests.length < a.tests.length) return true;
  }
  return false;
}

/** Vor jedem Verlust den bisherigen Stand als eigene Sicherung in den großen Speicher (24.10.2026: Leanas Lernstand) –
 *  die Lernstand-Rettung (rescue.ts) findet sie. */
function keepBeforeLoss(before: AppData, after: AppData, source: 'app' | 'abgleich') {
  if (!before.profiles.length || !losesSomething(before, after)) return;
  const at = Date.now();
  void putMirror({ json: JSON.stringify(before), at }, `vor-verlust:${at}`);
  // Protokoll auf dem Gerät (Überblick „Lernstand suchen“): was ging verloren, woher kam es
  try {
    const what = before.profiles
      .map((p) => {
        const a = before.progress[p.id];
        const b = after.profiles.some((x) => x.id === p.id) ? after.progress[p.id] : undefined;
        if (!after.profiles.some((x) => x.id === p.id)) return `${p.name} weg`;
        if (a && (!b || b.stars < a.stars || b.log.length < a.log.length)) return `${p.name} ${a.stars}→${b?.stars ?? 0} Sterne, ${a.log.length}→${b?.log.length ?? 0} Aufgaben`;
        return '';
      })
      .filter(Boolean)
      .join('; ');
    const log = JSON.parse(localStorage.getItem(LOSS_LOG) ?? '[]') as unknown[];
    localStorage.setItem(LOSS_LOG, JSON.stringify([...log, { at, source, what, version: typeof __APP_BUILD__ === 'string' ? __APP_BUILD__ : '?' }].slice(-50)));
  } catch {
    /* Protokoll ist nur Beiwerk */
  }
  lossListeners.forEach((l) => l());
}
/** Protokoll der Verluste auf diesem Gerät (die letzten 50) */
export const LOSS_LOG = 'schlaufuchs:loss-log.v1';
const lossListeners = new Set<() => void>();
/** Bescheid bei jedem Verlust – die Rettungs-Karte sucht dann sofort */
export const onLoss = (fn: () => void) => {
  lossListeners.add(fn);
  return () => void lossListeners.delete(fn);
};

/** Einmal am Tag eine Sicherung (die letzten 30 Tage bleiben) */
async function dailyBackup() {
  if (!data.profiles.length) return;
  const day = new Date().toISOString().slice(0, 10);
  const ok = await putMirror({ json: JSON.stringify(data), at: Date.now() }, `tag:${day}`);
  if (ok) await pruneDaily(30);
}

function commit(fn: (d: AppData) => void, source: 'app' | 'abgleich' = 'app') {
  const next = clone(data);
  fn(next);
  keepBeforeLoss(data, next, source);
  data = next;
  persist();
  listeners.forEach((l) => l());
}

export function update(fn: (d: AppData) => void) {
  commit(fn);
  onChange?.();
}

/** Was der Abgleich von den anderen Geräten holt – löst selbst keinen neuen Abgleich aus. */
export const updateFromSync = (fn: (d: AppData) => void) => commit(fn, 'abgleich');

export const getData = () => data;
export const hasSaveError = () => saveError;

export function useData(): AppData {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => data,
  );
}

/** Schuljahr als Startjahr: ab August zählt das neue Schuljahr (2026/27 → 2026) */
export const schoolYear = (t = Date.now()) => {
  const d = new Date(t);
  return d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
};

export function newProfile(partial: Partial<Profile>): Profile {
  const st = stateInfo(partial.state ?? DEFAULT_STATE);
  const grade = partial.grade ?? 1;
  return {
    id: Math.random().toString(36).slice(2, 10),
    name: '',
    avatar: '🦊',
    age: 6 + grade - 1,
    grade,
    state: st.code,
    englishFrom: st.englishFrom,
    gradesFrom: st.gradesFrom,
    gradeKey: [...DEFAULT_KEY],
    autoRead: grade <= 1,
    sound: true,
    pace: 'schule',
    dailyGoal: 20,
    created: Date.now(),
    gradeYear: schoolYear(),
    ...partial,
  };
}

export function saveProfile(p: Profile, activate = true) {
  update((d) => {
    const i = d.profiles.findIndex((x) => x.id === p.id);
    if (i >= 0) d.profiles[i] = p;
    else {
      d.profiles.push(p);
      d.progress[p.id] = emptyProgress();
    }
    if (activate) d.activeId = p.id;
  });
}

/** Ausdrücklich gelöscht (nur das geht beim Abgleich als Löschung an die anderen Geräte, sync.ts DELETED). */
function markDeleted(id: string) {
  try {
    const list = JSON.parse(localStorage.getItem(DELETED) ?? '[]') as string[];
    if (!list.includes(id)) localStorage.setItem(DELETED, JSON.stringify([...list, id]));
    // dauerhaft: die Lernstand-Rettung bietet absichtlich gelöschte Kinder nicht wieder an
    const ever = JSON.parse(localStorage.getItem(DELETED_EVER) ?? '[]') as string[];
    if (!ever.includes(id)) localStorage.setItem(DELETED_EVER, JSON.stringify([...ever, id]));
  } catch {
    /* nicht schreibbar – dann bleibt das Kind auf den anderen Geräten (lieber zu viel als zu wenig) */
  }
}

export function deleteProfile(id: string) {
  markDeleted(id);
  update((d) => {
    d.profiles = d.profiles.filter((p) => p.id !== id);
    delete d.progress[id];
    if (d.activeId === id) d.activeId = null;
  });
}

/** Wer gerade lernt, gilt nur für dieses Gerät (auf dem iPad das eine Kind, auf dem iPhone das andere). */
export const setActive = (id: string | null) => commit((d) => void (d.activeId = id));

export function updateProgress(profileId: string, fn: (p: Progress) => void) {
  update((d) => fn((d.progress[profileId] ??= emptyProgress())));
}

/** Kinder, die es zweimal gibt (vor dem Sync auf zwei Geräten getrennt angelegt): gleicher Name. */
export function duplicateProfiles(d: AppData): [Profile, Profile][] {
  const out: [Profile, Profile][] = [];
  const byName = new Map<string, Profile>();
  for (const p of [...d.profiles].sort((a, b) => a.created - b.created)) {
    const k = p.name.trim().toLowerCase();
    const first = byName.get(k);
    if (first) out.push([first, p]);
    else byName.set(k, p);
  }
  return out;
}

/** Zwei Profile desselben Kindes zu einem: der ganze Lernstand beider zählt, das ältere Profil bleibt. */
export function mergeProfiles(keepId: string, dropId: string) {
  markDeleted(dropId);
  update((d) => {
    d.progress[keepId] = mergeTwo(d.progress[keepId] ?? emptyProgress(), d.progress[dropId] ?? emptyProgress());
    d.profiles = d.profiles.filter((p) => p.id !== dropId);
    delete d.progress[dropId];
    if (d.activeId === dropId) d.activeId = keepId;
  });
}

/** belegter Gerätespeicher (localStorage) von Schlaufuchs in Zeichen – Browser erlauben je Seite etwa 5 Mio. Zeichen */
export function storageUsage(): { used: number; limit: number; moved: boolean } {
  let used = movedOut ? JSON.stringify(data).length : 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('schlaufuchs')) used += k.length + (localStorage.getItem(k)?.length ?? 0);
    }
  } catch {
    // Speicher nicht lesbar – dann 0 anzeigen
  }
  return { used, limit: 5 * 1024 * 1024, moved: movedOut };
}
