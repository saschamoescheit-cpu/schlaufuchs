// Vorlesen mit der Sprachausgabe des Geräts (Deutsch und Englisch).
import type { Lang } from '../engine/types';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
let voices: SpeechSynthesisVoice[] = [];
const loadVoices = () => (voices = synth?.getVoices() ?? []);
loadVoices();
synth?.addEventListener?.('voiceschanged', loadVoices);

export const canSpeak = () => !!synth;

const PREFER: Record<Lang, RegExp[]> = {
  de: [/^de-DE$/i, /^de/i],
  en: [/^en-GB$/i, /^en-US$/i, /^en/i],
};
const NICE = /(Google|Anna|Helena|Katja|Petra|Vicki|Siri|Natural|Enhanced|Premium|Daniel|Serena|Kate|Martha|Libby|Sonia)/i;

const VOICE_KEY = (lang: Lang) => `schlaufuchs:voice:${lang}`;
/** gewählte Stimme (je Gerät gemerkt) */
export function chosenVoice(lang: Lang): string | null {
  try {
    return localStorage.getItem(VOICE_KEY(lang));
  } catch {
    return null;
  }
}
export function chooseVoice(lang: Lang, uri: string | null) {
  try {
    if (uri) localStorage.setItem(VOICE_KEY(lang), uri);
    else localStorage.removeItem(VOICE_KEY(lang));
  } catch {
    /* egal */
  }
}
/** Stimmen einer Sprache, die besten zuerst */
export function voicesFor(lang: Lang): SpeechSynthesisVoice[] {
  if (!voices.length) loadVoices();
  const re = PREFER[lang][PREFER[lang].length - 1];
  return voices.filter((v) => re.test(v.lang.replace('_', '-'))).sort((a, b) => Number(NICE.test(b.name)) - Number(NICE.test(a.name)) || a.name.localeCompare(b.name));
}
export function onVoicesChanged(fn: () => void) {
  synth?.addEventListener?.('voiceschanged', fn);
  return () => synth?.removeEventListener?.('voiceschanged', fn);
}

function voiceFor(lang: Lang) {
  if (!voices.length) loadVoices();
  const pick = chosenVoice(lang);
  if (pick) {
    const v = voices.find((x) => x.voiceURI === pick);
    if (v) return v;
  }
  for (const re of PREFER[lang]) {
    const vs = voices.filter((v) => re.test(v.lang.replace('_', '-')));
    if (vs.length) return vs.find((v) => NICE.test(v.name)) ?? vs[0];
  }
  return undefined;
}

const UNITS: [RegExp, string][] = [
  [/(\d)\s?km\b/g, '$1 Kilometer'], [/(\d)\s?cm\b/g, '$1 Zentimeter'], [/(\d)\s?mm\b/g, '$1 Millimeter'], [/(\d)\s?ml\b/g, '$1 Milliliter'],
  [/(\d)\s?kg\b/g, '$1 Kilogramm'], [/(\d)\s?g\b/g, '$1 Gramm'], [/(\d)\s?m\b/g, '$1 Meter'], [/(\d)\s?l\b/g, '$1 Liter'], [/(\d)\s?min\b/g, '$1 Minuten'],
  [/(\d)\s?h\b/g, '$1 Stunden'], [/(\d)\s?s\b/g, '$1 Sekunden'], [/(\d)\s?ct\b/g, '$1 Cent'], [/(\d),(\d\d)\s?€/g, '$1 Euro $2'], [/(\d)\s?€/g, '$1 Euro'],
];

/** Mathe-Zeichen und Abkürzungen in sprechbaren Text verwandeln */
export function speakable(text: string): string {
  let t = text.replace(/\*\*/g, '').replace(/(\d)[ .](\d{3})/g, '$1$2').replace(/(\d)[ .](\d{3})/g, '$1$2');
  t = t.replace(/☐/g, ' wie viel ').replace(/_/g, ' Lücke ');
  t = t.replace(/(\d+):(\d\d) Uhr/g, '$1 Uhr $2').replace(/\b(\d{1,2}):(\d\d)\b(?!\s*=)/g, '$1 Uhr $2');
  t = t.replace(/(\d)\s*·\s*(\d)/g, '$1 mal $2').replace(/(\d)\s*:\s*(\d)/g, '$1 geteilt durch $2');
  t = t.replace(/\s−\s|−/g, ' minus ').replace(/(\d)\s*\+\s*(\d)/g, '$1 plus $2').replace(/\s\+\s/g, ' plus ');
  t = t.replace(/\s=\s|=/g, ' ist gleich ').replace(/\s<\s/g, ' ist kleiner als ').replace(/\s>\s/g, ' ist größer als ');
  for (const [re, s] of UNITS) t = t.replace(re, s);
  t = t.replace(/→/g, ', ').replace(/✓/g, '').replace(/\n+/g, '. ');
  return t;
}

let current: SpeechSynthesisUtterance | null = null;

// --- Robustheit (iPad/iPhone/Safari, Chrome) -------------------------------------------------------
// 1) Safari spricht erst, nachdem eine Sprachausgabe direkt durch Antippen ausgelöst wurde. Beim ersten
//    Tippen irgendwo in der App wird sie deshalb einmal stumm „aufgeschlossen“ – danach klappt auch das
//    automatische Vorlesen (z. B. bei Hör-Aufgaben).
// 2) Abbrechen und sofort neu sprechen bleibt auf iOS manchmal stumm: nur abbrechen, wenn wirklich etwas
//    läuft, und dann kurz versetzt sprechen.
// 3) Startet die Ausgabe nicht, wird es einmal neu versucht; klappt es dann noch nicht, erfahren es die
//    Zuhörer von onSpeechProblem (Hinweis „Kein Ton?“).
let unlocked = false;
const UNLOCK_EVENTS = ['touchend', 'click', 'keydown'] as const;
function unlock() {
  if (unlocked || !synth) return;
  unlocked = true;
  for (const ev of UNLOCK_EVENTS) window.removeEventListener(ev, unlock, true);
  try {
    if (synth.paused) synth.resume();
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    synth.speak(u);
  } catch {
    /* egal */
  }
}
if (synth && typeof window !== 'undefined') for (const ev of UNLOCK_EVENTS) window.addEventListener(ev, unlock, true);

export type SpeechState = 'idle' | 'start' | 'end' | 'problem';
let state: SpeechState = 'idle';
const listeners = new Set<(s: SpeechState, info?: string) => void>();
function setState(s: SpeechState, info?: string) {
  state = s;
  listeners.forEach((fn) => fn(s, info));
}
/** Zustand der Sprachausgabe beobachten (z. B. für „Ton testen“ oder den Hinweis „Kein Ton?“) */
export function onSpeech(fn: (s: SpeechState, info?: string) => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
export const speechState = () => state;

export function speak(text: string, lang: Lang = 'de', onEnd?: () => void, slow = false) {
  if (!synth) return;
  // ein Antippen des Lautsprechers ist selbst eine Berührung – also gilt die Ausgabe als aufgeschlossen
  const wasUnlocked = unlocked;
  unlocked = true;
  const busy = !!current && (synth.speaking || synth.pending);
  if (busy) synth.cancel();
  if (synth.paused) synth.resume();
  const make = () => {
    const u = new SpeechSynthesisUtterance(lang === 'de' ? speakable(text) : text.replace(/\*\*/g, ''));
    u.lang = lang === 'de' ? 'de-DE' : 'en-GB';
    const v = voiceFor(lang);
    if (v) u.voice = v;
    u.rate = slow ? 0.75 : lang === 'en' ? 0.85 : 0.95;
    u.pitch = 1.05;
    return u;
  };
  let tries = 0;
  const go = () => {
    const u = make();
    let started = false;
    u.onstart = () => {
      started = true;
      setState('start');
    };
    u.onend = () => {
      if (current === u) current = null;
      setState('end');
      onEnd?.();
    };
    u.onerror = (e) => {
      if (current === u) current = null;
      // „interrupted“/„canceled“ heißt nur: eine neue Ausgabe hat diese abgelöst
      if (e.error !== 'interrupted' && e.error !== 'canceled') setState('problem', e.error);
      onEnd?.();
    };
    current = u;
    synth.speak(u);
    // Wächter: nichts zu hören? einmal neu versuchen, dann Bescheid geben
    setTimeout(() => {
      if (started || current !== u) return;
      if (tries++ === 0) {
        synth.cancel();
        synth.resume();
        setTimeout(go, 80);
      } else {
        current = null;
        setState('problem', 'nostart');
        onEnd?.();
      }
    }, 4000);
  };
  // nach einem Abbruch kurz warten (iOS), sonst sofort – so bleibt ein Antippen eine Berührung für Safari
  if (busy && wasUnlocked) setTimeout(go, 60);
  else go();
}

export function stopSpeaking() {
  if (current && synth && (synth.speaking || synth.pending)) synth.cancel();
  current = null;
}
