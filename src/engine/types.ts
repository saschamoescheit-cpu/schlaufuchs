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
  /** Zahlenstrahl: step = Abstand der Beschriftung, minor = Abstand der kleinen Striche, ask = „?“ statt Zahl am Punkt */
  | { kind: 'numberline'; from: number; to: number; start: number; jumps: number[]; step?: number; minor?: number; ask?: boolean }
  | { kind: 'blocks'; h?: number; t: number; o: number; th?: number } // Stellenwert-Material
  | { kind: 'placetable'; digits: number[]; labels: string[]; highlight?: number }
  | { kind: 'clock'; h: number; m: number }
  | { kind: 'money'; items: number[] } // Werte in Cent
  | { kind: 'emoji'; chars: string; label?: string }
  | { kind: 'column'; op: '+' | '−' | '·' | ':'; rows: number[]; result?: number; carries?: number[]; steps?: string[] }
  | { kind: 'array'; rows: number; cols: number; split?: number }
  | { kind: 'shape'; shape: string; rot?: number; fill?: string } // rot: gedreht (Grad)
  | { kind: 'lines'; a: [number, number, number, number]; b: [number, number, number, number]; right?: boolean } // zwei Strecken (200×160), right: rechten Winkel markieren
  | { kind: 'row'; items: string[] } // Bilder in einer Reihe (Muster), passt sich der Breite an
  | { kind: 'scatter'; emoji: string; pts: [number, number][] } // ungeordnete Menge zum Zählen (240×150)
  | { kind: 'shapemix'; items: { s: string; rot: number; c: number; big: boolean }[] } // bunte Formen zum Zählen
  | { kind: 'rect'; w: number; h: number; show?: 'umfang' | 'flaeche' }
  | { kind: 'syllables'; parts: string[]; emoji?: string }
  | { kind: 'word'; word: string; mark?: [number, number][] } // Buchstaben markieren [start, ende)
  | { kind: 'color'; hex: string }
  | { kind: 'marbles'; colors: Record<string, number> }
  | { kind: 'compare'; a: number; b: number }
  | { kind: 'text'; text: string; title?: string }
  | { kind: 'ruler'; cm: number; emoji?: string }
  | { kind: 'prep'; pos: 'in' | 'on' | 'under' | 'next to' | 'behind' | 'in front of'; animal?: string } // animal: Emoji (Standard 🐱)
  /** Zahlenmauer: Reihen von unten nach oben, null = gesuchter Stein */
  | { kind: 'wall'; rows: (number | null)[][] }
  /** Netz aus Quadraten (Würfelnetz): Zellen [Spalte, Zeile] */
  | { kind: 'net'; cells: [number, number][] }
  /** Säulendiagramm */
  | { kind: 'bars'; title: string; items: { label: string; value: number; emoji?: string }[]; unit?: string; step?: number; top?: number }
  // Strichliste: je Zeile Striche in Fünferbündeln
  | { kind: 'tally'; title?: string; rows: { label: string; n: number }[] }
  /** Raster aus Bildern (Lagebeziehungen): Zeilen von oben nach unten, '' = leer */
  | { kind: 'grid'; rows: string[][]; mark?: [number, number] }
  /** Würfelgebäude im Schrägbild: Höhen je Feld, Zeilen von hinten nach vorne */
  | { kind: 'cubes'; h: number[][] }
  /** Tabelle (z. B. Fahrplan): erste Zeile = Kopf */
  | { kind: 'table'; title?: string; head: string[]; rows: string[][]; mark?: [number, number] };

export type Answer =
  | { type: 'number'; value: number; unit?: string; prefix?: string; suffix?: string }
  | { type: 'choice'; options: string[]; correct: number; speakOptions?: Lang; big?: boolean }
  | { type: 'text'; value: string; accept?: string[]; caseSensitive?: boolean; lang?: Lang; dictation?: boolean }
  /** Buchstaben mit dem Finger nachspuren – die Ansicht bewertet und liefert 'ok' oder 'daneben' */
  | { type: 'trace'; value: string };

/** Schriftliches Rechnen in Kästchen (Ziffer für Ziffer wie auf Papier) */
export interface ColumnWork {
  op: '+' | '−' | '·' | ':';
  /** Zahlen der Aufgabe (bei ':' Dividend und Divisor, bei '·' die beiden Faktoren) */
  rows: number[];
  result: number;
  /** Teilen mit Rest: der Rest (eigenes Kästchen) */
  rest?: number;
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
  /** englische Vokabel dieser Aufgabe (für die Vokabelkarten) */
  word?: string;
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
