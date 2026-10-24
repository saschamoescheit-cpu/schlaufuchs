// Lernstand-Rettung (24.10.2026: Leanas Aufgaben, Sterne und Lernstand waren mitten im Üben weg).
// Die App hebt an mehreren Stellen Kopien auf: ein anderswo „gelöschtes“ Kind (Abgleich), Sicherungen im großen
// Speicher (IndexedDB: vor-wiederherstellung:…, unlesbar:…) und unlesbare Stände in localStorage. Hier wird gesucht,
// ob eine davon mehr enthält als der Stand jetzt – dann bietet die App an, sie zurückzuholen. Zurückgeholt wird durch
// Zusammenführen (mergeRescue: Zähler das Größere, Verlauf und Tests vereint): was heute geübt wurde, bleibt auch.
// Nichts wird dabei gelöscht.
import { emptyProgress, type Progress } from '../engine/learning';
import { mergeRescue } from './merge';
import { listMirror } from './mirror';
import { getData, update, type AppData, type Profile } from './store';

export interface Rescue {
  profile: Profile;
  progress: Progress;
  /** woher (für die Anzeige) */
  source: string;
  /** Kennung, um „Nicht nötig“ zu merken */
  sig: string;
  /** das Kind hier (Id), in das zurückgeholt wird – null: das Kind fehlt hier ganz */
  into: string | null;
}

const REMOVED = 'schlaufuchs:sync.removed.v1';
const DISMISSED = 'schlaufuchs:rescue.dismissed.v1';
/** zurückgeholte Kopien aus REMOVED – bleiben als Sicherung liegen und werden weiter mit durchsucht */
const RESTORED = 'schlaufuchs:rescue.restored.v1';

const readLs = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const parse = <T,>(s: string | null, fallback: T): T => {
  try {
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
};

/** Wie viel steckt in einem Lernstand? */
export const amount = (p: Progress | undefined) => ({ solved: p?.solved ?? 0, answers: p?.log?.length ?? 0, stars: p?.stars ?? 0, tests: p?.tests?.length ?? 0 });

/** Hat die Kopie etwas, das hier fehlt? */
export function hasMore(copy: Progress, here: Progress | undefined): boolean {
  const a = amount(copy);
  const b = amount(here);
  if (a.solved === 0 && a.answers === 0 && a.tests === 0) return false;
  if (!here) return true;
  return a.solved > b.solved || a.answers > b.answers || a.stars > b.stars || a.tests > b.tests;
}

/** Das Kind hier zur Kopie: gleiche Id, sonst gleicher Name (z. B. nach dem Verlust neu angelegt). */
export function matchKid(d: AppData, p: Profile): string | null {
  if (d.profiles.some((x) => x.id === p.id)) return p.id;
  const name = p.name.trim().toLowerCase();
  return d.profiles.find((x) => x.name.trim().toLowerCase() === name)?.id ?? null;
}

const sigOf = (p: Profile, pr: Progress) => `${p.id}:${pr.solved}:${pr.log.length}:${pr.stars}`;

/** Aus allen Kopien je Kind die mit dem meisten Inhalt, wenn sie mehr hat als der Stand hier. Pure (getestet). */
export function pickRescues(d: AppData, copies: { profile: Profile; progress: Progress; source: string }[], dismissed: string[] = []): Rescue[] {
  const best = new Map<string, Rescue>();
  for (const c of copies) {
    if (!c.profile || typeof c.profile.id !== 'string' || !c.progress) continue;
    const progress: Progress = { ...emptyProgress(), ...c.progress, log: c.progress.log ?? [], tests: c.progress.tests ?? [] };
    const into = matchKid(d, c.profile);
    if (!hasMore(progress, into ? d.progress[into] : undefined)) continue;
    const sig = sigOf(c.profile, progress);
    if (dismissed.includes(sig)) continue;
    const k = into ?? `neu:${c.profile.id}`;
    const prev = best.get(k);
    const score = (p: Progress) => p.solved + p.log.length;
    if (!prev || score(progress) > score(prev.progress)) best.set(k, { profile: c.profile, progress, source: c.source, sig, into });
  }
  return [...best.values()];
}

/** Alle Kopien auf diesem Gerät einsammeln. */
export async function collectCopies(): Promise<{ profile: Profile; progress: Progress; source: string }[]> {
  const out: { profile: Profile; progress: Progress; source: string }[] = [];
  const addData = (d: Partial<AppData> | null, source: string) => {
    if (!d || !Array.isArray(d.profiles)) return;
    for (const p of d.profiles) if (p && d.progress?.[p.id]) out.push({ profile: p, progress: d.progress[p.id], source });
  };
  // 1. auf einem anderen Gerät „gelöscht“ – beim Abgleich hier aufgehoben
  for (const k of [REMOVED, RESTORED]) for (const r of parse<{ profile: Profile; progress: Progress }[]>(readLs(k), [])) if (r?.profile && r.progress) out.push({ profile: r.profile, progress: r.progress, source: 'Abgleich' });
  // 2. Sicherungen und Kopie im großen Speicher
  for (const { id, snap } of await listMirror()) addData(parse<AppData | null>(snap.json, null), `Speicher (${id})`);
  // 3. unlesbare oder alte Stände in localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k === 'schlaufuchs:v1' || k.startsWith('schlaufuchs:v1:unlesbar:'))) addData(parse<AppData | null>(readLs(k), null), k);
    }
  } catch {
    /* nicht lesbar */
  }
  return out;
}

export async function findRescues(): Promise<Rescue[]> {
  return pickRescues(getData(), await collectCopies(), parse<string[]>(readLs(DISMISSED), []));
}

/** Zurückholen: zusammenführen – nichts von heute geht verloren. Geht mit dem nächsten Abgleich auf alle Geräte. */
export function applyRescue(r: Rescue): void {
  update((d) => {
    let id = matchKid(d, r.profile);
    if (!id) {
      d.profiles.push(r.profile);
      d.profiles.sort((a, b) => a.created - b.created);
      id = r.profile.id;
    }
    const cur = d.progress[id];
    d.progress[id] = cur ? mergeRescue(cur, r.progress) : r.progress;
    if (!d.activeId) d.activeId = id;
  });
  // die Karte „wurde auf einem anderen Gerät gelöscht“ ist damit erledigt – die Kopie wird nicht gelöscht, sondern
  // unter RESTORED aufgehoben
  try {
    const list = parse<{ profile: Profile }[]>(readLs(REMOVED), []);
    const mine = list.filter((x) => x.profile?.id === r.profile.id);
    if (mine.length) {
      localStorage.setItem(RESTORED, JSON.stringify([...parse<unknown[]>(readLs(RESTORED), []), ...mine]));
      localStorage.setItem(REMOVED, JSON.stringify(list.filter((x) => x.profile?.id !== r.profile.id)));
    }
  } catch {
    /* egal – die Karte bleibt dann stehen */
  }
}

/** „Nicht nötig“: diese Kopie nicht mehr anbieten (sie bleibt trotzdem aufgehoben). */
export function dismissRescue(r: Rescue): void {
  try {
    const list = parse<string[]>(readLs(DISMISSED), []);
    localStorage.setItem(DISMISSED, JSON.stringify([...list, r.sig]));
  } catch {
    /* nicht schreibbar */
  }
}
