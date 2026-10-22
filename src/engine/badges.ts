// Abzeichen: werden aus dem Lernstand berechnet (nichts extra gespeichert – auf allen Geräten gleich).
import { ALL_SKILLS, currentSkills, englishYear, SUBJECTS, type ProfileLike } from '../content/curriculum';
import { level, streakDays, type Progress } from './learning';
import { cardStates } from './cards';

/** was die Abzeichen vom Profil brauchen */
export type BadgeProfile = ProfileLike & { dailyGoal?: number; blitz?: Record<string, number> };

export interface Badge {
  id: string;
  icon: string;
  title: string;
  /** Text je Stufe, {n} = Schwelle */
  text: string;
  tiers: number[];
  value: (p: Progress, prof: BadgeProfile) => number;
}

const total = (p: Progress) => Object.values(p.skills).reduce((a, s) => a + s.n, 0);
const sure = (p: Progress) => ALL_SKILLS.filter((s) => level(p, s.id) === 3).length;

export const BADGES: Badge[] = [
  { id: 'aufgaben', icon: '🐾', title: 'Fleißiger Fuchs', text: '{n} Aufgaben gelöst', tiers: [50, 500, 2000], value: (p) => total(p) },
  { id: 'sterne', icon: '⭐', title: 'Sternensammler', text: '{n} Sterne gesammelt', tiers: [25, 250, 1000], value: (p) => p.stars },
  { id: 'serie', icon: '🔥', title: 'Dranbleiber', text: '{n} Tage in Folge geübt', tiers: [3, 7, 21], value: (p) => streakDays(p, Date.now()) },
  { id: 'lernziele', icon: '🎯', title: 'Zielscheibe', text: '{n} Lernziele sicher', tiers: [1, 5, 15], value: (p) => sure(p) },
  { id: 'fehlerjaeger', icon: '🧰', title: 'Fehlerjäger', text: '{n} Aufgaben aus der Fehler-Kiste geschafft', tiers: [5, 25, 100], value: (p) => p.solved },
  { id: 'tests', icon: '⏱️', title: 'Test-Profi', text: '{n} Lernzielkontrollen geschrieben', tiers: [1, 5, 15], value: (p) => p.tests.length },
  { id: 'bestnote', icon: '🏆', title: 'Bestleistung', text: '{n}× eine Note 1 (oder 3 Sterne) im Test', tiers: [1, 3, 10], value: (p) => p.tests.filter((t) => (t.grade ? t.grade === 1 : t.percent >= 90)).length },
  { id: 'stufe3', icon: '🚀', title: 'Hoch hinaus', text: 'In {n} Themen die schwerste Stufe erreicht', tiers: [1, 5, 15], value: (p) => Object.values(p.skills).filter((s) => s.stage === 3).length },
  { id: 'tagesziel', icon: '📅', title: 'Zielstrebig', text: 'An {n} Tagen das Tagesziel geschafft', tiers: [1, 5, 20], value: (p, prof) => (prof.dailyGoal ? Object.values(p.days).filter((n) => n >= prof.dailyGoal!).length : 0) },
  { id: 'vokabeln', icon: '🗂️', title: 'Vokabel-Profi', text: '{n} englische Wörter sitzen (Karteikasten Fach 4 oder 5)', tiers: [10, 50, 150], value: (p) => [...cardStates(p.log).values()].filter((c) => c.box >= 4).length },
  { id: 'blitz', icon: '⚡', title: 'Blitzmerker', text: 'In der Blitzrunde {n} Aufgaben in 60 Sekunden', tiers: [10, 20, 30], value: (_p, prof) => Math.max(0, ...Object.values(prof.blitz ?? {})) },
  {
    id: 'meister',
    icon: '👑',
    title: 'Klassenmeister',
    text: 'Alle Lernziele der Klasse in {n} Fach/Fächern sicher',
    tiers: [1, 2, 3],
    value: (p, prof) => SUBJECTS.filter((s) => (s.id !== 'englisch' || englishYear(prof) > 0) && currentSkills(s.id, prof).every((k) => level(p, k.id) === 3)).length,
  },
];

export const TIER_NAMES = ['Bronze', 'Silber', 'Gold'];
export const TIER_COLORS = ['#C98B53', '#A9B4C2', '#E8B923'];

/** erreichte Stufe (0 = noch keine, 1–3) */
export function tierOf(b: Badge, p: Progress, prof: BadgeProfile): { tier: number; value: number; next?: number } {
  const v = b.value(p, prof);
  const tier = b.tiers.filter((t) => v >= t).length;
  return { tier, value: v, next: b.tiers[tier] };
}

/** alle erreichten Abzeichen-Stufen als Schlüssel „id:stufe“ */
export function earnedKeys(p: Progress, prof: BadgeProfile): string[] {
  return BADGES.flatMap((b) => {
    const { tier } = tierOf(b, p, prof);
    return Array.from({ length: tier }, (_, i) => `${b.id}:${i + 1}`);
  });
}
