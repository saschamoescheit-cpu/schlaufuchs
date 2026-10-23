// Mitteilungen (Sascha 23.10.2026: „Push genauso wie bei GolfOS Rounds“): Lern-Erinnerung, Klassenarbeit naht,
// Vokabelkarten fällig. Die Server-Seite ist die Funktion supabase/functions/schlaufuchs-push (mit
// supabase/schlaufuchs-push.sql); dieses Gerät abonniert mit dem Schlüssel der Funktion, der Service Worker
// (public/push-sw.js) zeigt an, was ankommt, und öffnet beim Antippen die App beim richtigen Kind.
// Auf iPhone und iPad geht das nur für die App auf dem Home-Bildschirm (ab iOS 16.4) – die Einstellungen sagen das.
import { authToken, SUPABASE_KEY, SUPABASE_URL, syncConfigured } from './sync';

export type PushKind = 'learn' | 'tests' | 'cards';
export type PushKinds = Record<PushKind, boolean>;
export interface PushState {
  on: boolean;
  endpoint?: string;
  kinds: PushKinds;
}

const KEY = 'schlaufuchs:push'; // nur dieses Gerät – jedes Gerät abonniert für sich
const ALL_ON: PushKinds = { learn: true, tests: true, cards: true };
const fn = () => `${SUPABASE_URL}/functions/v1/schlaufuchs-push`;

export function loadPush(): PushState {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as PushState | null;
    return s ? { ...s, kinds: { ...ALL_ON, ...s.kinds } } : { on: false, kinds: ALL_ON };
  } catch {
    return { on: false, kinds: ALL_ON };
  }
}
function savePush(s: PushState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* Speicher voll – der Schalter steht beim nächsten Mal wieder auf aus */
  }
}

/** Kann dieser Browser überhaupt Mitteilungen empfangen? (Service Worker, Push, Notifications) */
export const pushSupported = (): boolean => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
/** iPhone oder iPad (iPadOS meldet sich als Mac mit Touch) */
export const isIos = (): boolean => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
/** vom Home-Bildschirm geöffnet */
export const standalone = (): boolean =>
  (navigator as Navigator & { standalone?: boolean }).standalone === true || (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches);

/** Was die Einstellungen anbieten: den Schalter – oder warum nicht. */
export function pushAvailability(signedIn: boolean): 'ok' | 'signin' | 'homescreen' | 'unsupported' {
  if (!syncConfigured()) return 'unsupported';
  if (isIos() && !standalone()) return 'homescreen';
  if (!pushSupported()) return 'unsupported';
  if (!signedIn) return 'signin';
  return 'ok';
}

async function call(body: Record<string, unknown>): Promise<Response> {
  const t = await authToken();
  return fetch(fn(), { method: 'POST', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${t ?? SUPABASE_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

const toBytes = (s: string): Uint8Array => {
  const t = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(t, (c) => c.charCodeAt(0));
};

export class PushError extends Error {
  constructor(
    public readonly reason: 'denied' | 'setup' | 'failed',
    message: string,
  ) {
    super(message);
  }
}

/** Mitteilungen auf diesem Gerät einschalten: um Erlaubnis fragen, abonnieren, dem Server sagen (der grüßt zurück). */
export async function enablePush(): Promise<PushState> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new PushError('denied', 'denied');
  let publicKey: string;
  try {
    const r = await call({ action: 'key' });
    if (!r.ok) throw new Error(String(r.status));
    publicKey = ((await r.json()) as { publicKey: string }).publicKey;
  } catch (e) {
    throw new PushError('setup', String(e));
  }
  const reg = await navigator.serviceWorker.ready;
  const old = await reg.pushManager.getSubscription();
  if (old) await old.unsubscribe().catch(() => false); // mit einem anderen Schlüssel (oder für ein anderes Konto) gemacht: neu
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(publicKey) as BufferSource });
  const state: PushState = { on: true, endpoint: sub.endpoint, kinds: loadPush().kinds };
  const r = await call({ action: 'subscribe', subscription: sub.toJSON(), kinds: state.kinds, tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
  if (!r.ok) {
    await sub.unsubscribe().catch(() => false);
    throw new PushError(r.status === 404 ? 'setup' : 'failed', String(r.status));
  }
  savePush(state);
  return state;
}

/** Auf diesem Gerät ausschalten. */
export async function disablePush(): Promise<PushState> {
  const s = loadPush();
  try {
    const reg = await navigator.serviceWorker.ready;
    await (await reg.pushManager.getSubscription())?.unsubscribe();
  } catch {
    /* kein Service Worker – nichts abzumelden */
  }
  if (s.endpoint) await call({ action: 'unsubscribe', endpoint: s.endpoint }).catch(() => null);
  const next = { on: false, kinds: s.kinds };
  savePush(next);
  return next;
}

/** Eine Art an oder aus. */
export async function setPushKind(kind: PushKind, on: boolean): Promise<PushState> {
  const s = loadPush();
  const next = { ...s, kinds: { ...s.kinds, [kind]: on } };
  savePush(next);
  if (s.on && s.endpoint) await call({ action: 'settings', endpoint: s.endpoint, kinds: next.kinds }).catch(() => null);
  return next;
}

/** Wohin eine angetippte Mitteilung führt: „#kind=<id>“ (dieses Kind), „#karten=<id>“ (seine Vokabelkarten).
 *  Einmal gelesen, dann aus der Adresse entfernt. */
export function takePushTarget(): { kid: string; cards: boolean } | null {
  const m = /^#(kind|karten)=(.+)$/.exec(location.hash);
  if (!m) return null;
  history.replaceState(history.state, '', location.pathname + location.search);
  return { kid: decodeURIComponent(m[2]), cards: m[1] === 'karten' };
}
