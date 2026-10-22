// Wortlisten der Englisch-Wortfelder – für Vokabelkarten und Buchstabier-Diktat (Nachtlauf 22.10.2026).
// Die Wortfelder tragen sich beim Laden selbst ein (englisch.ts, extra.ts, extra3.ts).
import type { Task, Visual } from '../engine/types';
import { boxCounts, cardStates, pickCards, stateOf } from '../engine/cards';
import type { Progress } from '../engine/learning';

export type VocabWord = { en: string; de: string; e?: string; hex?: string; txt?: string };

/** Themen-ID → Wörter */
export const WORDS: Record<string, VocabWord[]> = {};
export const registerWords = (id: string, words: VocabWord[]) => {
  WORDS[id] = words;
};

export const visualOf = (w: VocabWord): Visual => (w.hex ? { kind: 'color', hex: w.hex } : w.e ? { kind: 'emoji', chars: w.e } : { kind: 'text', text: w.txt ?? w.de });

/** Fürs Diktat geeignet: kurz genug zum Schreiben, höchstens zwei Wörter, nicht gleich wie im Deutschen */
export const dictatable = (w: VocabWord) => w.en.length <= 13 && w.en.split(' ').length <= 2 && w.en.toLowerCase() !== w.de.toLowerCase();

/** Vokabel-Aufgabe (Schlüssel „b-dog“, „s-dog“ …) mit ihrem Wort kennzeichnen – zählt dann auch für die Vokabelkarten */
export const withWord = <T extends { key: string; word?: string }>(g: T, words: VocabWord[]): T => {
  const en = g.key.replace(/^[a-z]-/, '');
  return words.some((w) => w.en === en) ? { ...g, word: en } : g;
};

/** Buchstabier-Diktat: das englische Wort hören und aufschreiben */
export function dictationTask(skillId: string, w: VocabWord): Task {
  const say = { text: w.en, lang: 'en' as const };
  return {
    key: `d-${w.en}`,
    skillId,
    prompt: 'Hör gut zu und schreibe das Wort auf Englisch.',
    speak: 'Hör gut zu und schreib das Wort auf Englisch.',
    listen: say,
    answer: { type: 'text', value: w.en, lang: 'en' },
    tags: ['schreiben'],
    solution: [`Das Wort heißt: ${w.en} (${w.de})`, `Buchstabiert: ${w.en.toUpperCase().split('').join(' – ')}`],
    solutionVisual: visualOf(w),
    pronounce: say,
    word: w.en,
  };
}

export type CardWord = VocabWord & { skillId: string };
/** alle Karten der gewählten Wortfelder */
export const cardsOf = (skillIds: string[]): CardWord[] => skillIds.flatMap((id) => (WORDS[id] ?? []).map((w) => ({ ...w, skillId: id })));

/** Diktat-Runde: zuerst Wörter, die noch nicht sitzen (nicht gewusst, niedriges Fach), dann zufällig gemischt */
export function buildDictation(skillIds: string[], p: Progress, n: number, r: () => number = Math.random): Task[] {
  const st = cardStates(p.log);
  const pool = cardsOf(skillIds).filter(dictatable);
  const score = (c: CardWord) => {
    const s = stateOf(st, c);
    return (s.seen ? s.box : 2.5) + r() * 2;
  };
  const picked = pool
    .map((c) => ({ c, k: score(c) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, n)
    .map((x) => x.c);
  // gemischte Reihenfolge, damit nicht alle schweren Wörter am Anfang stehen
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }
  return picked.map((c) => dictationTask(c.skillId, c));
}

/** Karteikasten in Zahlen (Eltern-Bereich, Wochenbericht) – null, solange noch keine Vokabel geübt wurde */
export function vocabSummary(p: Progress, now = Date.now()) {
  const states = cardStates(p.log);
  const ids = [...new Set([...states.keys()].map((k) => k.split('|')[0]))].filter((id) => WORDS[id]);
  if (!ids.length) return null;
  const cards = cardsOf(ids);
  const counts = boxCounts(cards, states);
  return { counts, total: cards.length, sure: counts[4] + counts[5], due: pickCards(cards, states, 9999, now).due.length, fields: ids.length };
}
