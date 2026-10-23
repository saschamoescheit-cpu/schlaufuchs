// Gemischtes Vorlesen für Englisch-Themen (Nachtlauf 23.10.2026): Erklärungen und Lösungswege enthalten deutsche und
// englische Wörter – hier aufgeteilt (langsplit.ts) für speakMixed. Andere Fächer: undefined (wie bisher vorlesen).
import type { Skill } from '../engine/types';
import { WORDS } from '../content/words';
import { addWords, hasEnglish, splitLangs, titleParts, type LangPart } from './langsplit';

// Wortlisten einmal übernehmen (die Wortfelder tragen sich beim Laden der Inhalte ein)
let wordsIn = 0;
function words() {
  const n = Object.keys(WORDS).length;
  if (n === wordsIn) return;
  addWords(Object.values(WORDS).flat());
  wordsIn = n;
}

/** Text eines Englisch-Themas in Abschnitte je Sprache – oder undefined (anderes Fach, kein Englisch darin) */
export function mixedParts(subject: Skill['subject'] | undefined, text: string, title?: string): LangPart[] | undefined {
  if (subject !== 'englisch') return undefined;
  words();
  const parts = [...(title ? titleParts(title) : []), ...splitLangs(text)];
  return hasEnglish(parts) ? parts : undefined;
}
