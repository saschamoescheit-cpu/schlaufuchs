// Noten für Lernzielkontrollen.

/** Mindest-Prozente für die Noten 1 bis 5 (darunter 6). Üblicher Grundschul-Schlüssel; Schulen können abweichen. */
export const DEFAULT_KEY = [95, 80, 65, 50, 25];

export const GRADE_NAMES = ['', 'sehr gut', 'gut', 'befriedigend', 'ausreichend', 'mangelhaft', 'ungenügend'];

export function gradeFor(percent: number, key: number[] = DEFAULT_KEY): number {
  const i = key.findIndex((min) => percent >= min);
  return i < 0 ? 6 : i + 1;
}

/** kindgerechte Rückmeldung ohne Ziffernnote (Klassen vor dem Notenstart) */
export function verbalFor(percent: number): { stars: number; text: string } {
  if (percent >= 90) return { stars: 3, text: 'Super gemacht!' };
  if (percent >= 70) return { stars: 2, text: 'Gut gemacht!' };
  if (percent >= 50) return { stars: 1, text: 'Schon ganz ordentlich – weiter üben!' };
  return { stars: 0, text: 'Das üben wir noch zusammen!' };
}
