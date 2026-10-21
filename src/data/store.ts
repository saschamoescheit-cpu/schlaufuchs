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
  created: number;
}

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
  parent: { pin: string | null };
}

const KEY = 'schlaufuchs:v1';
const empty = (): AppData => ({ schema: 1, profiles: [], progress: {}, activeId: null, parent: { pin: null } });

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const d = JSON.parse(raw) as AppData;
    return { ...empty(), ...d };
  } catch {
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
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    saveError = false;
  } catch {
    saveError = true;
  }
}

function commit(fn: (d: AppData) => void) {
  const next = structuredClone(data);
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
