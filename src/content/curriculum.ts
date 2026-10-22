// Bundesländer, Fächer und welche Themen ein Kind sieht.
import type { Grade, Skill, Subject } from '../engine/types';
import { MATHE } from './mathe';
import { DEUTSCH } from './deutsch';
import { ENGLISCH } from './englisch';
import { DIKTAT } from './diktat';
import { DEUTSCH_EXTRA, ENGLISCH_EXTRA, MATHE_EXTRA } from './extra';
import { DEUTSCH_EXTRA2, ENGLISCH_EXTRA2, MATHE_EXTRA2 } from './extra2';
import { DEUTSCH_EXTRA3, ENGLISCH_EXTRA3, MATHE_EXTRA3 } from './extra3';

export interface StateInfo {
  code: string;
  name: string;
  /** Klasse, in der Englisch beginnt (im Profil änderbar) */
  englishFrom: Grade;
  /** ab dieser Klasse gibt es Ziffernnoten bei Lernzielkontrollen (im Profil änderbar) */
  gradesFrom: Grade;
  note?: string;
}

// Stand Oktober 2026 (Quellen u. a. Friedrich Verlag, Cornelsen, miaundmika.de). Schulen können abweichen – deshalb ist alles im Profil anpassbar.
export const STATES: StateInfo[] = [
  { code: 'BW', name: 'Baden-Württemberg', englishFrom: 3, gradesFrom: 3, note: 'An der Rheinschiene lernen manche Kinder Französisch statt Englisch. Am Ende von Klasse 2 gibt es oft schon Noten in Deutsch und Mathe.' },
  { code: 'BY', name: 'Bayern', englishFrom: 3, gradesFrom: 3, note: 'Manche Schulen geben schon ab dem 2. Halbjahr von Klasse 2 Noten.' },
  { code: 'BE', name: 'Berlin', englishFrom: 3, gradesFrom: 3 },
  { code: 'BB', name: 'Brandenburg', englishFrom: 1, gradesFrom: 3 },
  { code: 'HB', name: 'Bremen', englishFrom: 3, gradesFrom: 3 },
  { code: 'HH', name: 'Hamburg', englishFrom: 1, gradesFrom: 3 },
  { code: 'HE', name: 'Hessen', englishFrom: 3, gradesFrom: 3 },
  { code: 'MV', name: 'Mecklenburg-Vorpommern', englishFrom: 3, gradesFrom: 3 },
  { code: 'NI', name: 'Niedersachsen', englishFrom: 3, gradesFrom: 3 },
  { code: 'NW', name: 'Nordrhein-Westfalen', englishFrom: 3, gradesFrom: 3, note: 'Englisch beginnt seit dem Einschulungsjahrgang 2021/22 in Klasse 3.' },
  { code: 'RP', name: 'Rheinland-Pfalz', englishFrom: 1, gradesFrom: 3, note: 'Fremdsprache ab Klasse 1 (Englisch oder Französisch).' },
  { code: 'SL', name: 'Saarland', englishFrom: 3, gradesFrom: 3, note: 'Im Saarland lernen die meisten Kinder Französisch statt Englisch.' },
  { code: 'SN', name: 'Sachsen', englishFrom: 3, gradesFrom: 3 },
  { code: 'ST', name: 'Sachsen-Anhalt', englishFrom: 3, gradesFrom: 3 },
  { code: 'SH', name: 'Schleswig-Holstein', englishFrom: 3, gradesFrom: 3 },
  { code: 'TH', name: 'Thüringen', englishFrom: 3, gradesFrom: 3 },
];
export const DEFAULT_STATE = 'NW';
export const stateInfo = (code: string) => STATES.find((s) => s.code === code) ?? STATES.find((s) => s.code === DEFAULT_STATE)!;

export const SUBJECTS: { id: Subject; name: string; icon: string; color: string; soft: string }[] = [
  { id: 'mathe', name: 'Mathe', icon: '🔢', color: 'var(--mathe)', soft: 'var(--mathe-soft)' },
  { id: 'deutsch', name: 'Deutsch', icon: '📚', color: 'var(--deutsch)', soft: 'var(--deutsch-soft)' },
  { id: 'englisch', name: 'Englisch', icon: '💂', color: 'var(--englisch)', soft: 'var(--englisch-soft)' },
];
export const subjectInfo = (s: Subject) => SUBJECTS.find((x) => x.id === s)!;

export const ALL_SKILLS: Skill[] = [...MATHE, ...MATHE_EXTRA, ...MATHE_EXTRA2, ...MATHE_EXTRA3, ...DIKTAT, ...DEUTSCH, ...DEUTSCH_EXTRA, ...DEUTSCH_EXTRA2, ...DEUTSCH_EXTRA3, ...ENGLISCH, ...ENGLISCH_EXTRA, ...ENGLISCH_EXTRA2, ...ENGLISCH_EXTRA3];
const BY_ID = new Map(ALL_SKILLS.map((s) => [s.id, s]));
export const skillById = (id: string) => BY_ID.get(id);

export interface ProfileLike {
  grade: Grade;
  englishFrom: Grade;
}

/** Lernjahr Englisch (0 = noch kein Englisch) */
export const englishYear = (p: ProfileLike) => Math.max(0, p.grade - p.englishFrom + 1);

/** Stufen-Reiter eines Fachs: Klassen 1–4, Englisch: 1. und 2. Lernjahr */
export function levelsFor(subject: Subject): { grade: Grade; label: string }[] {
  if (subject === 'englisch') return [{ grade: 3, label: '1. Lernjahr' }, { grade: 4, label: '2. Lernjahr' }];
  return [1, 2, 3, 4].map((g) => ({ grade: g as Grade, label: `Klasse ${g}` }));
}

/** Stufe, die für das Kind „dran“ ist */
export function currentLevel(subject: Subject, p: ProfileLike): Grade {
  if (subject !== 'englisch') return p.grade;
  return englishYear(p) >= 2 ? 4 : 3;
}

export const skillsOf = (subject: Subject, grade?: Grade) => ALL_SKILLS.filter((s) => s.subject === subject && (grade === undefined || s.grade === grade));

/** Bereiche je Fach – gliedern die Themenliste (erste passende Regel gewinnt, Reihenfolge = Anzeige) */
const AREAS: Record<Subject, { name: string; re: RegExp }[]> = {
  mathe: [
    { name: 'Zahlen', re: /zaehlen|vergleichen|nachbarn|zerlegen|stellenwert|runden|zahlenstrahl|zahlenfolgen|zahlwoerter|ordnen|ziffern/ },
    { name: 'Rechnen', re: /plus|minus|ergaenzen|einmaleins|geteilt|verdoppeln|kopfrechnen|schriftlich|mal-gross|division|zahlenmauer|ueberschlag/ },
    { name: 'Größen und Sachrechnen', re: /uhr|geld|laengen|gewichte|groessen|kalender|sachaufgaben|fahrplan|massstab/ },
    { name: 'Geometrie und Daten', re: /formen|lage|symmetrie|koerper|wuerfel|flaeche|diagramme|wahrscheinlichkeit|kombinatorik/ },
  ],
  deutsch: [
    { name: 'Buchstaben und Laute', re: /anlaut|endlaut|buchstaben|^d1-silben|reime|luecke|selbstlaute|d1-schreiben|nachspuren/ },
    { name: 'Lesen', re: /lesen|saetze|sachtexte|minitexte/ },
    { name: 'Rechtschreibung', re: /diktat|doppelkonsonant|ck-tz|-ie$|grossschreibung|nominalisierung|v-f|silbentrennung|auslaut|ae-aeu|dehnungs|s-ss-sz|das-dass|komma|woertliche|satzzeichen|abc|woerterbuch/ },
    { name: 'Sprache untersuchen', re: /./ },
  ],
  englisch: [
    { name: 'Sätze, Hören und Lesen', re: /phrases|time|prepositions|a-an|sentences|listening|questions|shopping|classroom|reading/ },
    { name: 'Wörter', re: /./ },
  ],
};
export const areaOf = (s: Skill) => AREAS[s.subject].find((a) => a.re.test(s.id))?.name ?? 'Weitere';
/** Themen einer Liste nach Bereichen gruppiert (leere Bereiche fallen weg) */
export const byArea = (subject: Subject, skills: Skill[]) => {
  const names = [...AREAS[subject].map((a) => a.name), 'Weitere'];
  return names.map((name) => ({ name, skills: skills.filter((s) => areaOf(s) === name) })).filter((g) => g.skills.length);
};

/** Lernziele des aktuellen Schuljahres (für Fortschritt und Mix) */
export const currentSkills = (subject: Subject, p: ProfileLike) => skillsOf(subject, currentLevel(subject, p));

// Hat ein Thema echte Stufen? Gleicher Zufall, Stufe 1 und 3 – unterscheiden sich die Aufgaben, ja.
import { mulberry32 } from '../engine/rng';
for (const s of ALL_SKILLS) {
  if (s.staged !== undefined) continue;
  const a = mulberry32(5);
  const b = mulberry32(5);
  let diff = false;
  for (let i = 0; i < 12 && !diff; i++) {
    const x = s.generate(a, 1);
    const y = s.generate(b, 3);
    diff = x.key !== y.key || JSON.stringify(x.answer) !== JSON.stringify(y.answer);
  }
  s.staged = diff;
}
