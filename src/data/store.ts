// Lokale Speicherung aller Kinderprofile und Lernstände (nur auf diesem Gerät).
// Das Datenmodell ist für einen späteren Eltern-Bereich vorbereitet (parent: PIN, Einstellungen je Kind).
import { useSyncExternalStore } from 'react';
import { DEFAULT_KEY } from '../engine/grading';
import { emptyProgress, type Progress } from '../engine/learning';
import type { Grade } from '../engine/types';
import type { Pace } from '../engine/session';
import { DEFAULT_STATE, stateInfo } from '../content/curriculum';

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
  created: number;
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

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    saveError = false;
  } catch {
    saveError = true;
  }
}

export function update(fn: (d: AppData) => void) {
  const next = structuredClone(data);
  fn(next);
  data = next;
  persist();
  listeners.forEach((l) => l());
}

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
    created: Date.now(),
    ...partial,
  };
}

export function saveProfile(p: Profile) {
  update((d) => {
    const i = d.profiles.findIndex((x) => x.id === p.id);
    if (i >= 0) d.profiles[i] = p;
    else {
      d.profiles.push(p);
      d.progress[p.id] = emptyProgress();
    }
    d.activeId = p.id;
  });
}

export function deleteProfile(id: string) {
  update((d) => {
    d.profiles = d.profiles.filter((p) => p.id !== id);
    delete d.progress[id];
    if (d.activeId === id) d.activeId = null;
  });
}

export const setActive = (id: string | null) => update((d) => void (d.activeId = id));

export function updateProgress(profileId: string, fn: (p: Progress) => void) {
  update((d) => fn((d.progress[profileId] ??= emptyProgress())));
}

/** Sicherung als Datei (alle Kinder) */
export function exportJson(): string {
  return JSON.stringify({ app: 'schlaufuchs', exported: new Date().toISOString(), data }, null, 1);
}

/** Sicherung einspielen: Kinder aus der Datei kommen dazu, vorhandene mit gleicher ID werden ersetzt. */
export function importJson(text: string): number {
  const parsed = JSON.parse(text) as { app?: string; data?: AppData };
  if (parsed.app !== 'schlaufuchs' || !parsed.data?.profiles) throw new Error('Das ist keine Schlaufuchs-Sicherung.');
  const inc = parsed.data;
  update((d) => {
    for (const p of inc.profiles) {
      const i = d.profiles.findIndex((x) => x.id === p.id);
      if (i >= 0) d.profiles[i] = p;
      else d.profiles.push(p);
      d.progress[p.id] = inc.progress[p.id] ?? emptyProgress();
    }
  });
  return inc.profiles.length;
}
