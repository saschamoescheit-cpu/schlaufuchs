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

export function speak(text: string, lang: Lang = 'de', onEnd?: () => void, slow = false) {
  if (!synth) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(lang === 'de' ? speakable(text) : text.replace(/\*\*/g, ''));
  u.lang = lang === 'de' ? 'de-DE' : 'en-GB';
  const v = voiceFor(lang);
  if (v) u.voice = v;
  u.rate = slow ? 0.75 : lang === 'en' ? 0.85 : 0.95;
  u.pitch = 1.05;
  u.onend = () => {
    if (current === u) current = null;
    onEnd?.();
  };
  u.onerror = u.onend as never;
  current = u;
  synth.speak(u);
}

export function stopSpeaking() {
  synth?.cancel();
  current = null;
}
