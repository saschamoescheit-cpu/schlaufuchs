// Lernstand-Rettung (24.10.2026: Leanas Aufgaben, Sterne und Lernstand waren mitten im Üben weg).
// Die App hebt an mehreren Stellen Kopien auf: ein anderswo „gelöschtes“ Kind (Abgleich), Sicherungen im großen
// Speicher (IndexedDB: vor-wiederherstellung:…, unlesbar:…) und unlesbare Stände in localStorage. Hier wird gesucht,
// ob eine davon mehr enthält als der Stand jetzt – dann bietet die App an, sie zurückzuholen. Zurückgeholt wird durch
// Zusammenführen (mergeRescue: Zähler das Größere, Verlauf und Tests vereint): was heute geübt wurde, bleibt auch.
// Nichts wird dabei gelöscht.
import { emptyProgress, type Progress } from '../engine/learning';
import { mergeRescue } from './merge';
import { listMirror } from './mirror';
import { cloudCopies } from './sync';
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
const BASE = 'schlaufuchs:sync.base.v1';
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

/** Deutlich mehr (für Cloud und letzten Abgleich: ein anderes Gerät ist dort oft nur ein paar Aufgaben voraus – das
 *  holt der Abgleich selbst; die Karte soll nur bei echtem Verlust erscheinen) */
export function hasMuchMore(copy: Progress, here: Progress | undefined): boolean {
  if (!here) return hasMore(copy, here);
  const a = amount(copy);
  const b = amount(here);
  const much = (x: number, y: number) => x - y >= Math.max(20, y * 0.2);
  return much(a.solved, b.solved) || much(a.answers, b.answers) || much(a.stars, b.stars);
}

/** Das Kind hier zur Kopie: gleiche Id, sonst gleicher Name (z. B. nach dem Verlust neu angelegt). */
export function matchKid(d: AppData, p: Profile): string | null {
  if (d.profiles.some((x) => x.id === p.id)) return p.id;
  const name = (p.name ?? '').trim().toLowerCase();
  if (!name) return null;
  return d.profiles.find((x) => x.name.trim().toLowerCase() === name)?.id ?? null;
}

const sigOf = (p: Profile, pr: Progress) => `${p.id}:${pr.solved}:${pr.log.length}:${pr.stars}`;

/** Aus allen Kopien je Kind die mit dem meisten Inhalt, wenn sie mehr hat als der Stand hier. Pure (getestet). */
export function pickRescues(d: AppData, copies: { profile: Profile; progress: Progress; source: string }[], dismissed: string[] = [], deletedOnPurpose: string[] = []): Rescue[] {
  const best = new Map<string, Rescue>();
  for (const c of copies) {
    if (!c.profile || typeof c.profile.id !== 'string' || !c.progress) continue;
    const progress: Progress = { ...emptyProgress(), ...c.progress, log: c.progress.log ?? [], tests: c.progress.tests ?? [] };
    const into = matchKid(d, c.profile);
    if (!into && deletedOnPurpose.includes(c.profile.id)) continue;
    const strict = c.source === 'Cloud' || c.source === 'letzter Abgleich';
    if (!(strict ? hasMuchMore : hasMore)(progress, into ? d.progress[into] : undefined)) continue;
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
export async function collectCopies(cloud = false): Promise<{ profile: Profile; progress: Progress; source: string }[]> {
  const out: { profile: Profile; progress: Progress; source: string }[] = [];
  const addData = (d: Partial<AppData> | null, source: string) => {
    if (!d || !Array.isArray(d.profiles)) return;
    for (const p of d.profiles) if (p && d.progress?.[p.id]) out.push({ profile: p, progress: d.progress[p.id], source });
  };
  // 1. auf einem anderen Gerät „gelöscht“ – beim Abgleich hier aufgehoben
  for (const k of [REMOVED, RESTORED]) for (const r of parse<{ profile: Profile; progress: Progress }[]>(readLs(k), [])) if (r?.profile && r.progress) out.push({ profile: r.profile, progress: r.progress, source: 'Abgleich' });
  // 1b. der zuletzt abgeglichene Stand je Kind (Sterne, gelöste Aufgaben, Lernstand je Thema – ohne Verlauf)
  const base = parse<Record<string, { skills?: Progress['skills']; solved?: number; stars?: number; days?: Progress['days'] }>>(readLs(BASE), {});
  const d = getData();
  for (const [id, b] of Object.entries(base)) {
    const p = d.profiles.find((x) => x.id === id);
    if (p && b) out.push({ profile: p, progress: { ...emptyProgress(), skills: b.skills ?? {}, solved: b.solved ?? 0, stars: b.stars ?? 0, days: b.days ?? {} }, source: 'letzter Abgleich' });
  }
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
  // 4. die Cloud (angemeldet): auch als gelöscht markierte Zeilen und der ganze Aufgaben-Verlauf
  if (cloud) try {
    for (const c of await cloudCopies()) {
      const here = d.profiles.find((x) => x.id === c.pid);
      out.push({ profile: c.profile ?? here ?? unnamed(c.pid), progress: c.progress, source: 'Cloud' });
    }
  } catch {
    /* offline – dann nur das Gerät */
  }
  return out;
}

/** Profil, dessen Name in der Cloud nicht mehr lesbar ist – die Karte fragt, zu welchem Kind es gehört */
const unnamed = (id: string): Profile => ({ ...newProfileStub(), id, name: '' });
const newProfileStub = (): Omit<Profile, 'id' | 'name'> => ({ avatar: '🦊', age: 8, grade: 3, state: 'NW', englishFrom: 3, gradesFrom: 3, gradeKey: [92, 81, 67, 50, 30], autoRead: false, sound: true, pace: 'schule', created: Date.now() });

/** Wo zuletzt in der Cloud gesucht wurde – beim Start höchstens alle 6 Stunden (liest den ganzen Verlauf) */
const CLOUD_AT = 'schlaufuchs:rescue.cloudAt';
export async function findRescues(opts: { cloud?: 'auto' | 'now' | 'never' } = {}): Promise<Rescue[]> {
  const mode = opts.cloud ?? 'auto';
  let cloud = mode === 'now';
  if (mode === 'auto') {
    const last = Number(readLs(CLOUD_AT) ?? 0) || 0;
    cloud = Date.now() - last > 6 * 3600_000;
  }
  if (cloud)
    try {
      localStorage.setItem(CLOUD_AT, String(Date.now()));
    } catch {
      /* egal */
    }
  return pickRescues(getData(), await collectCopies(cloud), parse<string[]>(readLs(DISMISSED), []), parse<string[]>(readLs('schlaufuchs:deleted-ever.v1'), []));
}

/** Zurückholen: zusammenführen – nichts von heute geht verloren. Geht mit dem nächsten Abgleich auf alle Geräte. */
export function applyRescue(r: Rescue, intoId?: string): void {
  update((d) => {
    let id = intoId ?? matchKid(d, r.profile);
    if (!id) {
      d.profiles.push(r.profile.name ? r.profile : { ...r.profile, name: 'Kind' });
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
