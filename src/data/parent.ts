// Eltern-Bereich: PIN (nur als Kindersicherung, kein echter Schutz) und Freischaltung für ein paar Minuten.
import { getData, update } from './store';

/** einfacher Hash (FNV-1a) – reicht als Kindersicherung, die PIN steht nie im Klartext im Speicher */
export function hashPin(pin: string): string {
  let h = 0x811c9dc5;
  for (const ch of `schlaufuchs:${pin}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return 'f1:' + h.toString(16);
}

export const hasPin = () => !!getData().parent?.pin;
export const checkPin = (pin: string) => getData().parent?.pin === hashPin(pin);
export const setPin = (pin: string | null) => update((d) => void (d.parent = { ...d.parent, pin: pin ? hashPin(pin) : null }));

const UNLOCK_MS = 10 * 60 * 1000;
let unlockedUntil = 0;
export const unlock = () => void (unlockedUntil = Date.now() + UNLOCK_MS);
export const lock = () => void (unlockedUntil = 0);
export const isUnlocked = () => Date.now() < unlockedUntil;
