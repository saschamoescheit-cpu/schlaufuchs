// Grundtypen von Schlaufuchs: Fächer, Aufgaben, Themen (Lernziele).

export type Subject = 'mathe' | 'deutsch' | 'englisch';
export type Grade = 1 | 2 | 3 | 4;
export type Lang = 'de' | 'en';
/** Schwierigkeit innerhalb eines Themas: 1 leicht, 2 mittel, 3 schwer */
export type Stage = 1 | 2 | 3;

/** Ein Bild zur Aufgabe oder Erklärung. Wird von ui/Visual.tsx als SVG gezeichnet. */
export type Visual =
  | { kind: 'dots'; n: number; m?: number } // n Punkte in Zehnerfeldern (m = zweite Farbe dazu)
  | { kind: 'tenframe'; a: number; b?: number; crossOut?: number }
  | { kind: 'numberline'; from: number; to: number; start: number; jumps: number[]; step?: number }
  | { kind: 'blocks'; h?: number; t: number; o: number; th?: number } // Stellenwert-Material
  | { kind: 'placetable'; digits: number[]; labels: string[]; highlight?: number }
  | { kind: 'clock'; h: number; m: number }
  | { kind: 'money'; items: number[] } // Werte in Cent
  | { kind: 'emoji'; chars: string; label?: string }
  | { kind: 'column'; op: '+' | '−' | '·' | ':'; rows: number[]; result?: number; carries?: number[]; steps?: string[] }
  | { kind: 'array'; rows: number; cols: number; split?: number }
  | { kind: 'shape'; shape: string }
  | { kind: 'rect'; w: number; h: number; show?: 'umfang' | 'flaeche' }
  | { kind: 'syllables'; parts: string[]; emoji?: string }
  | { kind: 'word'; word: string; mark?: [number, number][] } // Buchstaben markieren [start, ende)
  | { kind: 'color'; hex: string }
  | { kind: 'marbles'; colors: Record<string, number> }
  | { kind: 'compare'; a: number; b: number }
  | { kind: 'text'; text: string; title?: string }
  | { kind: 'ruler'; cm: number; emoji?: string }
  | { kind: 'prep'; pos: 'in' | 'on' | 'under' | 'next to' | 'behind' | 'in front of' };

export type Answer =
  | { type: 'number'; value: number; unit?: string; prefix?: string; suffix?: string }
  | { type: 'choice'; options: string[]; correct: number; speakOptions?: Lang; big?: boolean }
  | { type: 'text'; value: string; accept?: string[]; caseSensitive?: boolean; lang?: Lang; dictation?: boolean };

/** Schriftliches Rechnen in Kästchen (Ziffer für Ziffer wie auf Papier) */
export interface ColumnWork {
  op: '+' | '−' | '·' | ':';
  /** Zahlen der Aufgabe (bei ':' Dividend und Divisor, bei '·' die beiden Faktoren) */
  rows: number[];
  result: number;
}

export interface Task {
  /** gleicher Schlüssel = gleiche Aufgabe (für die Wiederholung genau dieser Aufgabe) */
  key: string;
  skillId: string;
  prompt: string;
  /** vorzulesender Text (sonst prompt) */
  speak?: string;
  /** Aufgabe zum Hören: der Lautsprecher ist das Wichtigste (z. B. englisches Wort) */
  listen?: { text: string; lang: Lang; slow?: boolean };
  visual?: Visual;
  /** Kästchen-Rechnung statt Ziffernblock (das Ergebnis bleibt answer.value) */
  work?: ColumnWork;
  answer: Answer;
  /** Fehlermuster dieser Aufgabe (z. B. 'zehnerübergang', 'ie') */
  tags?: string[];
  /** typische falsche Antworten: erkannt → eigenes Fehlermuster + gezielter Hinweis */
  traps?: { answer: string; tag: string; hint: string }[];
  /** Lösungsweg genau dieser Aufgabe */
  solution: string[];
  solutionVisual?: Visual;
  /** Wort zum Anhören in der Erklärung (z. B. englische Aussprache) */
  pronounce?: { text: string; lang: Lang };
  /** Stufe, mit der die Aufgabe erzeugt wurde */
  stage?: Stage;
  /** Punkte in einer Lernzielkontrolle */
  points?: number;
}

export interface Video {
  id: string;
  title: string;
  channel: string;
}

export interface Explanation {
  title?: string;
  text: string[];
  visual?: Visual;
  /** Suchbegriff für weitere YouTube-Videos */
  videoQuery: string;
}

export interface Skill {
  id: string;
  subject: Subject;
  /** Klasse (Englisch: Lernjahr 1 oder 2, siehe englishYear) */
  grade: Grade;
  title: string;
  icon: string;
  explain: Explanation;
  /** lesbare Namen der Fehlermuster */
  tagLabels?: Record<string, string>;
  generate: (rng: () => number, stage?: Stage) => Task;
  /** Stufen machen bei diesem Thema einen echten Unterschied */
  staged?: boolean;
  /** Sekunden pro Aufgabe in einer Lernzielkontrolle (Schultempo) */
  testSeconds?: number;
}
