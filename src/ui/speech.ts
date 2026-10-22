// Vorlesen mit der Sprachausgabe des Geräts (Deutsch und Englisch).
import type { Lang } from '../engine/types';
import { SUPABASE_URL } from '../data/sync';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
let voices: SpeechSynthesisVoice[] = [];
const loadVoices = () => (voices = synth?.getVoices() ?? []);
loadVoices();
synth?.addEventListener?.('voiceschanged', loadVoices);

export const canSpeak = () => !!synth || cloudUsable();

// iPhone/iPad: Vorlese-Ton gilt in Safari sonst als „Umgebungston“ und verstummt im Stummmodus (Glocke/Aktionstaste).
// Die Audio-Session „playback“ (Safari 17+) behandelt ihn wie Medien – dann ist er auch im Stummmodus zu hören.
type AudioSessionNav = Navigator & { audioSession?: { type: string } };
function playbackSession() {
  try {
    const n = navigator as AudioSessionNav;
    if (n.audioSession && n.audioSession.type !== 'playback') n.audioSession.type = 'playback';
  } catch {
    /* ältere Browser */
  }
}
if (typeof navigator !== 'undefined') playbackSession();
export const audioSessionType = () => {
  try {
    return (navigator as AudioSessionNav).audioSession?.type ?? '—';
  } catch {
    return '—';
  }
};

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
// Protokoll der letzten Ereignisse – für die Ton-Diagnose in den Einstellungen
const LOG: string[] = [];
const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
export function slog(m: string) {
  LOG.push(`${((performance.now() - t0) / 1000).toFixed(1)} s  ${m}`);
  if (LOG.length > 14) LOG.shift();
}
export const speechLog = () => [...LOG];
/** was das Gerät zur Sprachausgabe meldet */
export function speechInfo() {
  if (!voices.length) loadVoices();
  return {
    vorhanden: !!synth,
    stimmen: voices.length,
    deutsch: voices.filter((v) => /^de/i.test(v.lang)).length,
    englisch: voices.filter((v) => /^en/i.test(v.lang)).length,
    spricht: !!synth?.speaking,
    wartet: !!synth?.pending,
    pausiert: !!synth?.paused,
    homeBildschirm: typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true),
    freigeschaltet: unlocked,
    audioSitzung: audioSessionType(),
  };
}

let unlocked = false;
const UNLOCK_EVENTS = ['touchend', 'click', 'keydown'] as const;
function unlock() {
  if (unlocked) return;
  unlocked = true;
  unlockPlayer();
  playbackSession();
  slog(`freigeschaltet (erstes Antippen, Audio-Sitzung: ${audioSessionType()})`);
  for (const ev of UNLOCK_EVENTS) window.removeEventListener(ev, unlock, true);
  if (!synth) return;
  try {
    if (synth.paused) synth.resume();
    // Leerzeichen bei normaler Lautstärke: nicht zu hören. Lautstärke 0 bleibt auf iOS für ALLE folgenden Ausgaben hängen.
    const u = new SpeechSynthesisUtterance(' ');
    synth.speak(u);
  } catch {
    /* egal */
  }
}
if (typeof window !== 'undefined') for (const ev of UNLOCK_EVENTS) window.addEventListener(ev, unlock, true);

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

/** Gerätestimme (Web Speech) – Rückfall, wenn die Cloud-Stimme nicht verfügbar ist */
function speakDevice(text: string, lang: Lang = 'de', onEnd?: () => void, slow = false) {
  if (!synth) return;
  // ein Antippen des Lautsprechers ist selbst eine Berührung – also gilt die Ausgabe als aufgeschlossen
  const wasUnlocked = unlocked;
  unlocked = true;
  playbackSession();
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
    u.volume = 1; // ausdrücklich: iOS übernimmt sonst eine früher gesetzte Lautstärke
    return u;
  };
  let tries = 0;
  const go = () => {
    const u = make();
    let started = false;
    u.onstart = () => {
      started = true;
      slog('✓ Ton startet');
      setState('start');
    };
    u.onend = () => {
      if (current === u) current = null;
      setState('end');
      onEnd?.();
    };
    u.onerror = (e) => {
      slog(`Fehler: ${e.error}`);
      if (current === u) current = null;
      // „interrupted“/„canceled“ heißt nur: eine neue Ausgabe hat diese abgelöst
      if (e.error !== 'interrupted' && e.error !== 'canceled') setState('problem', e.error);
      onEnd?.();
    };
    current = u;
    slog(`sprechen (${u.lang}, Stimme: ${u.voice?.name ?? 'Standard'}${tries ? ', 2. Versuch' : ''})`);
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
        slog('✗ kein Ton nach zwei Versuchen');
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
  seq++;
  if (player && !player.paused) player.pause();
  if (current && synth && (synth.speaking || synth.pending)) synth.cancel();
  current = null;
}

// --- Cloud-Stimme ------------------------------------------------------------------------------------
// Die Browser-Stimme verstummt auf iPhone/iPad im Vibrations-/Stummmodus. Echte Audiodateien nicht: Die
// Supabase-Funktion „tts“ macht aus dem Text eine MP3 (Google Text-to-Speech), die App spielt sie über einen
// Audio-Player ab. Gehörtes bleibt im Service-Worker-Cache. Ohne Internet oder bei Fehlern: Gerätestimme.
const TTS_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/tts` : '';
const CLOUD_KEY = 'schlaufuchs:cloudvoice';
let cloudDown = false; // Funktion nicht eingerichtet/erreichbar → in dieser Sitzung Gerätestimme
export function cloudVoiceOn(): boolean {
  try {
    return localStorage.getItem(CLOUD_KEY) !== '0';
  } catch {
    return true;
  }
}
export function setCloudVoice(on: boolean) {
  try {
    localStorage.setItem(CLOUD_KEY, on ? '1' : '0');
  } catch {
    /* egal */
  }
  if (on) cloudDown = false;
}
export function cloudUsable(): boolean {
  return !!TTS_URL && cloudVoiceOn() && !cloudDown && typeof Audio !== 'undefined' && (typeof navigator === 'undefined' || navigator.onLine !== false);
}
export const cloudStatus = () => (!TTS_URL ? 'nicht eingerichtet' : !cloudVoiceOn() ? 'aus' : cloudDown ? 'nicht erreichbar' : 'an');

const player: HTMLAudioElement | null = typeof Audio !== 'undefined' ? new Audio() : null;
if (player) player.setAttribute('playsinline', '');
let seq = 0;
function silentWav(): string {
  const n = 800; // 0,1 s Stille, 8 kHz, 8 Bit
  const b = new Uint8Array(44 + n);
  const v = new DataView(b.buffer);
  const str = (o: number, t: string) => [...t].forEach((c, i) => (b[o + i] = c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  str(36, 'data'); v.setUint32(40, n, true);
  b.fill(128, 44);
  let bin = '';
  b.forEach((x) => (bin += String.fromCharCode(x)));
  return 'data:audio/wav;base64,' + btoa(bin);
}
/** iOS: ein Audio-Element darf später ohne Antippen spielen, wenn es einmal beim Antippen gespielt hat */
function unlockPlayer() {
  if (!player || !TTS_URL) return;
  try {
    player.src = silentWav();
    player.play().then(() => player.pause(), () => {});
  } catch {
    /* egal */
  }
}

const audioCache = new Map<string, string>(); // Abruf-Adresse → Blob-URL (zuletzt benutzte zuerst)
const cloudRate = (lang: Lang, slow: boolean) => (slow ? 0.75 : lang === 'en' ? 0.9 : 1);
const cloudUrl = (text: string, lang: Lang, slow: boolean) =>
  `${TTS_URL}?l=${lang}&r=${cloudRate(lang, slow)}&t=${encodeURIComponent(lang === 'de' ? speakable(text) : text.replace(/\*\*/g, ''))}`;
const inflight = new Map<string, Promise<string>>(); // laufende Abrufe (Vorab-Laden + Antippen gleichzeitig)
function getAudio(url: string): Promise<string> {
  const run = inflight.get(url);
  if (run) return run;
  const p = fetchAudio(url).finally(() => inflight.delete(url));
  inflight.set(url, p);
  return p;
}
async function fetchAudio(url: string): Promise<string> {
  const hit = audioCache.get(url);
  if (hit) {
    audioCache.delete(url);
    audioCache.set(url, hit);
    return hit;
  }
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  try {
    let r: Response;
    try {
      r = await fetch(url, { signal: ctl.signal });
    } catch (e) {
      // Netzwerk-/CORS-Fehler (z. B. Funktion noch nicht eingerichtet) → diese Sitzung Gerätestimme; Zeitüberschreitung nicht
      if ((e as Error)?.name !== 'AbortError') cloudDown = true;
      throw e;
    }
    if (!r.ok) {
      // 404/403/503: Funktion fehlt, Herkunft gesperrt oder Schlüssel fehlt → Gerätestimme für diese Sitzung
      if ([401, 403, 404, 503].includes(r.status)) cloudDown = true;
      throw new Error('HTTP ' + r.status);
    }
    const u = URL.createObjectURL(await r.blob());
    audioCache.set(url, u);
    if (audioCache.size > 60) {
      const [k, old] = audioCache.entries().next().value as [string, string];
      URL.revokeObjectURL(old);
      audioCache.delete(k);
    }
    return u;
  } finally {
    clearTimeout(timer);
  }
}
/** schon vorab laden (z. B. den Hör-Satz einer Aufgabe), damit das Vorlesen sofort startet */
export function prefetchSpeech(text: string, lang: Lang = 'de', slow = false) {
  if (!cloudUsable() || !text.trim()) return;
  getAudio(cloudUrl(text, lang, slow)).catch(() => {});
}

export function speak(text: string, lang: Lang = 'de', onEnd?: () => void, slow = false) {
  if (!cloudUsable() || !player) return speakDevice(text, lang, onEnd, slow);
  const my = ++seq;
  unlocked = true;
  if (current && synth && (synth.speaking || synth.pending)) synth.cancel();
  current = null;
  if (!player.paused) player.pause();
  slog(`Cloud-Stimme (${lang}) laden`);
  getAudio(cloudUrl(text, lang, slow)).then(
    (src) => {
      if (my !== seq) return; // inzwischen etwas anderes angetippt
      player.onplaying = () => {
        if (my !== seq) return;
        slog('✓ Ton startet (Cloud)');
        setState('start');
      };
      player.onended = () => {
        if (my !== seq) return;
        setState('end');
        onEnd?.();
      };
      player.onerror = () => {
        if (my !== seq) return;
        slog('Cloud-Wiedergabe fehlgeschlagen → Gerätestimme');
        speakDevice(text, lang, onEnd, slow);
      };
      player.src = src;
      player.play().catch((e) => {
        if (my !== seq) return;
        slog(`Cloud-Wiedergabe blockiert (${e?.name ?? e}) → Gerätestimme`);
        speakDevice(text, lang, onEnd, slow);
      });
    },
    (e) => {
      if (my !== seq) return;
      slog(`Cloud-Stimme nicht verfügbar (${e?.message ?? e}) → Gerätestimme`);
      speakDevice(text, lang, onEnd, slow);
    },
  );
}
