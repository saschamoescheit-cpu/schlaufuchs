// Speicherung aller Kinderprofile und Lernstände auf dem Gerät; mit Google-Anmeldung zusätzlich auf allen Geräten
// gleich (sync.ts).
// Das Datenmodell ist für einen späteren Eltern-Bereich vorbereitet (parent: PIN, Einstellungen je Kind).
import { useSyncExternalStore } from 'react';
import { DEFAULT_KEY } from '../engine/grading';
import { emptyProgress, type Progress } from '../engine/learning';
import type { Grade, Subject } from '../engine/types';
import type { Pace } from '../engine/session';
import { DEFAULT_STATE, stateInfo } from '../content/curriculum';
import { mergeTwo } from './merge';
import { askPersist, choose, putMirror, readMirror, writeMirror } from './mirror';

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
const AT_KEY = 'schlaufuchs:v1:at';
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

function load(): AppData {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    return repair(JSON.parse(raw) as AppData);
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

function persist() {
  const json = JSON.stringify(data);
  const at = Date.now();
  try {
    localStorage.setItem(KEY, json);
    localStorage.setItem(AT_KEY, String(at));
    saveError = false;
  } catch {
    saveError = true;
  }
  // immer auch in den Zweitspeicher (springt ein, wenn localStorage voll ist)
  writeMirror({ json, at });
}

/**
 * Beim Start einmal: Zweitspeicher mit dem normalen Speicher vergleichen. Ist die Kopie neuer (der normale Speicher war
 * voll) oder der normale Speicher leer, gilt die Kopie; der bisherige Stand bleibt als Sicherung im Zweitspeicher.
 */
export async function checkMirror(): Promise<'local' | 'mirror'> {
  askPersist();
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

// structuredClone gibt es in Safari erst ab iOS 15.4 – auf älteren iPads per JSON kopieren (die Daten sind reines JSON)
const clone = <T,>(x: T): T => (typeof structuredClone === 'function' ? structuredClone(x) : (JSON.parse(JSON.stringify(x)) as T));

function commit(fn: (d: AppData) => void) {
  const next = clone(data);
  fn(next);
  data = next;
  persist();
  listeners.forEach((l) => l());
}

export function update(fn: (d: AppData) => void) {
  commit(fn);
  onChange?.();
}

/** Was der Abgleich von den anderen Geräten holt – löst selbst keinen neuen Abgleich aus. */
export const updateFromSync = commit;

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

export function deleteProfile(id: string) {
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
  update((d) => {
    d.progress[keepId] = mergeTwo(d.progress[keepId] ?? emptyProgress(), d.progress[dropId] ?? emptyProgress());
    d.profiles = d.profiles.filter((p) => p.id !== dropId);
    delete d.progress[dropId];
    if (d.activeId === dropId) d.activeId = keepId;
  });
}

/** belegter Gerätespeicher (localStorage) von Schlaufuchs in Zeichen – Browser erlauben je Seite etwa 5 Mio. Zeichen */
export function storageUsage(): { used: number; limit: number } {
  let used = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('schlaufuchs')) used += k.length + (localStorage.getItem(k)?.length ?? 0);
    }
  } catch {
    // Speicher nicht lesbar – dann 0 anzeigen
  }
  return { used, limit: 5 * 1024 * 1024 };
}
