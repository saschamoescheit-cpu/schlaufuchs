// Vokabelkarten: Karteikasten mit fünf Fächern (Leitner). Gewusst → ein Fach weiter, die nächste Wiederholung kommt
// später (1, 3, 7, 14, 30 Tage). Nicht gewusst → gleich nochmal, danach wieder ab Fach 1. Fach und Termin werden aus dem
// Aufgaben-Verlauf berechnet (jede Vokabel-Antwort trägt ihr Wort) – dadurch zählt auch das normale Üben mit und alles
// wird ohne eigene Speicherzeile zwischen den Geräten abgeglichen.
import type { Attempt, Progress } from './learning';
import { dayKey, LOG_MAX } from './learning';

/** Tage bis zur nächsten Wiederholung, Index = Fach (1–5) */
export const BOX_DAYS = [0, 1, 3, 7, 14, 30];
export const BOXES = 5;
const DAY = 24 * 60 * 60 * 1000;
/** etwas Spielraum: wer abends lernt, bekommt die Karte am nächsten Morgen schon wieder */
const SLACK = 6 * 60 * 60 * 1000;

export interface CardState {
  /** 1–5 = Fach; 0 = neu (seen 0) oder zuletzt nicht gewusst (seen > 0, gleich wieder dran) */
  box: number;
  /** nächste Wiederholung (ms) */
  due: number;
  last: number;
  seen: number;
}

export type CardRef = { skillId: string; en: string };
export const cardKey = (skillId: string, en: string) => `${skillId}|${en}`;
const NEW: CardState = { box: 0, due: 0, last: 0, seen: 0 };

/** Stand jeder Karte aus dem Verlauf (Tests zählen nicht – dort gibt es keine Rückmeldung) */
export function cardStates(log: Attempt[]): Map<string, CardState> {
  const out = new Map<string, CardState>();
  for (const a of log) {
    if (!a.w || a.m === 'test') continue;
    const k = cardKey(a.s, a.w);
    const c = out.get(k) ?? { ...NEW };
    if (!a.ok) {
      c.box = 0;
      c.due = a.t;
    } else if (a.t >= c.due) {
      // nur eine fällige Karte rückt vor – fünfmal am selben Tag richtig heißt noch nicht „sitzt“
      c.box = Math.min(BOXES, c.box + 1);
      c.due = a.t + BOX_DAYS[c.box] * DAY - SLACK;
    }
    c.last = a.t;
    c.seen++;
    out.set(k, c);
  }
  return out;
}

export const stateOf = (states: Map<string, CardState>, c: CardRef) => states.get(cardKey(c.skillId, c.en)) ?? NEW;

/** Karten einer Runde: zuerst fällige (niedrigstes Fach zuerst), dann neue Wörter, höchstens n */
export function pickCards<T extends CardRef>(all: T[], states: Map<string, CardState>, n: number, now = Date.now()) {
  const due = all.filter((c) => stateOf(states, c).seen > 0 && stateOf(states, c).due <= now).sort((a, b) => stateOf(states, a).box - stateOf(states, b).box || stateOf(states, a).due - stateOf(states, b).due);
  const fresh = all.filter((c) => stateOf(states, c).seen === 0);
  return { due, fresh, cards: [...due, ...fresh].slice(0, n) };
}

/** Anzahl der Karten je Fach (Index 0 = neu; nicht gewusste zählen zu Fach 1) */
export function boxCounts(all: CardRef[], states: Map<string, CardState>): number[] {
  const n = Array(BOXES + 1).fill(0) as number[];
  for (const c of all) {
    const s = stateOf(states, c);
    n[s.seen ? Math.max(1, s.box) : 0]++;
  }
  return n;
}

/** nächster Termin, an dem eine der Karten wieder fällig ist */
export function nextDue(all: CardRef[], states: Map<string, CardState>, now = Date.now()): number | null {
  let best: number | null = null;
  for (const c of all) {
    const s = stateOf(states, c);
    if (s.seen > 0 && s.due > now && (best === null || s.due < best)) best = s.due;
  }
  return best;
}

/** Eine Karte selbst bewertet (gewusst / nicht gewusst) – kommt in den Verlauf wie jede Antwort. Sterne nur für fällige/neue Karten. */
export function recordCard(p: Progress, skillId: string, en: string, ok: boolean, now = Date.now(), star = true) {
  p.log.push({ t: now, s: skillId, ok: ok ? 1 : 0, m: 'karten', w: en });
  if (p.log.length > LOG_MAX) p.log.splice(0, p.log.length - LOG_MAX);
  const dk = dayKey(now);
  p.days[dk] = (p.days[dk] ?? 0) + 1;
  if (ok && star) p.stars++;
}
