// Mitteilungen (Sascha 23.10.2026: „Push genauso wie bei GolfOS Rounds“): Lern-Erinnerung, Klassenarbeit naht,
// Vokabelkarten fällig. Die Server-Seite ist die Funktion supabase/functions/schlaufuchs-push (mit
// supabase/schlaufuchs-push.sql); dieses Gerät abonniert mit dem Schlüssel der Funktion, der Service Worker
// (public/push-sw.js) zeigt an, was ankommt, und öffnet beim Antippen die App beim richtigen Kind.
// Auf iPhone und iPad geht das nur für die App auf dem Home-Bildschirm (ab iOS 16.4) – die Einstellungen sagen das.
//
// Für die ganze Familie (Sascha 23.10.2026: „auf dem iPhone eingeschaltet – auch auf dem iPad, und umgekehrt“):
// an/aus und die Arten stehen im Eltern-Datensatz (parent.push) und werden abgeglichen. Jedes Gerät zieht nach
// (followFamily): aus → abmelden, Arten → übernehmen, an → selbst abonnieren, wenn es Mitteilungen schon erlaubt hat.
// Erlauben muss jedes Gerät einmal selbst (ein Tippen) – das verlangen Apple und die Browser.
import { authToken, SUPABASE_KEY, SUPABASE_URL, syncConfigured } from './sync';
import { getData, update, type FamilyPush } from './store';

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

/** die Einstellung der Familie (abgeglichen) – undefined, solange noch kein Gerät sie gesetzt hat */
export const familyPush = (): FamilyPush | undefined => getData().parent?.push;
function setFamily(p: FamilyPush): void {
  const f = familyPush();
  if (f && f.on === p.on && sameKinds(f.kinds, p.kinds)) return;
  update((d) => void (d.parent = { ...d.parent, push: { on: p.on, kinds: { ...p.kinds } } }));
}
const sameKinds = (a: PushKinds, b: PushKinds) => a.learn === b.learn && a.tests === b.tests && a.cards === b.cards;

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

/** Dieses Gerät abonnieren (Erlaubnis muss schon da sein oder hier erfragt werden). quiet: ohne Gruß (beim Nachziehen). */
async function subscribeHere(kinds: PushKinds, quiet: boolean): Promise<PushState> {
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
  const state: PushState = { on: true, endpoint: sub.endpoint, kinds };
  const r = await call({ action: 'subscribe', subscription: sub.toJSON(), kinds, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, ...(quiet ? { quiet: true } : {}) });
  if (!r.ok) {
    await sub.unsubscribe().catch(() => false);
    throw new PushError(r.status === 404 ? 'setup' : 'failed', String(r.status));
  }
  savePush(state);
  return state;
}

/** Mitteilungen einschalten (Tippen auf den Schalter): um Erlaubnis fragen, abonnieren, für die Familie an. */
export async function enablePush(): Promise<PushState> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new PushError('denied', 'denied');
  const kinds = familyPush()?.kinds ?? loadPush().kinds;
  const state = await subscribeHere(kinds, false);
  setFamily({ on: true, kinds });
  return state;
}

/** Nur dieses Gerät abmelden (die Familien-Einstellung bleibt). */
async function unsubscribeHere(): Promise<PushState> {
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

/** Ausschalten (Tippen auf den Schalter): dieses Gerät abmelden und für die ganze Familie aus – die anderen ziehen nach. */
export async function disablePush(): Promise<PushState> {
  const next = await unsubscribeHere();
  setFamily({ on: false, kinds: familyPush()?.kinds ?? next.kinds });
  return next;
}

/** Eine Art an oder aus – für die ganze Familie. */
export async function setPushKind(kind: PushKind, on: boolean): Promise<PushState> {
  const s = loadPush();
  const kinds = { ...(familyPush()?.kinds ?? s.kinds), [kind]: on };
  const next = { ...s, kinds };
  savePush(next);
  setFamily({ on: familyPush()?.on ?? s.on, kinds });
  if (s.on && s.endpoint) await call({ action: 'settings', endpoint: s.endpoint, kinds }).catch(() => null);
  return next;
}

let following: Promise<void> = Promise.resolve();
/** Dieses Gerät der Familien-Einstellung anpassen – beim Start und nach jedem Abgleich. Fragt nie selbst um Erlaubnis.
 *  Aufrufe laufen nacheinander (nie zwei Abos zugleich), jeder mit dem Stand von dann. */
export function followFamily(signedIn: boolean): Promise<void> {
  following = following
    .then(async () => {
      const f = familyPush();
      const s = loadPush();
      if (!signedIn) return;
      // noch keine Familien-Einstellung (vor dem Abgleich eingeschaltet): dieses Gerät gibt sie vor
      if (!f) {
        if (s.on) setFamily({ on: true, kinds: s.kinds });
        return;
      }
      if (!f.on) {
        if (s.on) await unsubscribeHere();
        else if (!sameKinds(s.kinds, f.kinds)) savePush({ ...s, kinds: { ...f.kinds } });
        return;
      }
      if (s.on) {
        if (!sameKinds(s.kinds, f.kinds)) {
          savePush({ ...s, kinds: { ...f.kinds } });
          if (s.endpoint) await call({ action: 'settings', endpoint: s.endpoint, kinds: f.kinds }).catch(() => null);
        }
        return;
      }
      // an in der Familie, hier noch nicht: selbst abonnieren, wenn dieses Gerät Mitteilungen schon erlaubt hat
      if (pushAvailability(signedIn) === 'ok' && Notification.permission === 'granted') await subscribeHere({ ...f.kinds }, true).catch(() => null);
    })
    .catch(() => undefined);
  return following;
}

/** Wohin eine angetippte Mitteilung führt: „#kind=<id>“ (dieses Kind), „#karten=<id>“ (seine Vokabelkarten).
 *  Einmal gelesen, dann aus der Adresse entfernt. */
export function takePushTarget(): { kid: string; cards: boolean } | null {
  const m = /^#(kind|karten)=(.+)$/.exec(location.hash);
  if (!m) return null;
  history.replaceState(history.state, '', location.pathname + location.search);
  return { kid: decodeURIComponent(m[2]), cards: m[1] === 'karten' };
}
