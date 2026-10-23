// Mitteilungen in den Einstellungen (Sascha 23.10.2026, wie bei GolfOS Rounds): ein Schalter für dieses Gerät, danach je
// Art ein Schalter. Wo es nicht geht, sagt eine Zeile warum. Aufbau und Schalter wie bei der Vorlese-Stimme.
import { useState } from 'react';
import { useSyncStatus } from '../data/sync';
import { disablePush, enablePush, loadPush, pushAvailability, PushError, setPushKind, type PushKind } from '../data/push';

const KINDS: { kind: PushKind; label: string; hint: string }[] = [
  { kind: 'learn', label: 'Lern-Erinnerung', hint: 'Nachmittags, wenn ein Kind heute noch nicht geübt hat' },
  { kind: 'tests', label: 'Klassenarbeit naht', hint: 'Eingetragene Arbeiten: 3 Tage vorher und am Tag davor' },
  { kind: 'cards', label: 'Vokabelkarten fällig', hint: 'Wenn im Karteikasten mindestens 5 Karten dran sind' },
];

export function PushCard() {
  const sync = useSyncStatus();
  const [state, setState] = useState(loadPush);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const why = pushAvailability(sync.signedIn);
  if (!sync.configured) return null;

  const turnOn = async () => {
    setBusy(true);
    setMsg(null);
    try {
      setState(await enablePush());
      setMsg('Mitteilungen sind an – eine erste ist unterwegs.');
    } catch (e) {
      const reason = e instanceof PushError ? e.reason : 'failed';
      setMsg(
        reason === 'denied'
          ? 'Mitteilungen sind für den Schlaufuchs gesperrt – in den Einstellungen des Geräts erlauben.'
          : reason === 'setup'
            ? 'Auf dem Server noch nicht eingerichtet.'
            : 'Das hat nicht geklappt – mit Internet noch einmal versuchen.',
      );
    } finally {
      setBusy(false);
    }
  };
  const turnOff = async () => {
    setBusy(true);
    setMsg(null);
    setState(await disablePush());
    setBusy(false);
  };

  return (
    <details className="more push-card">
      <summary>🔔 Mitteilungen</summary>
      <div className="inner">
        {why === 'homescreen' && (
          <div className="small muted">
            Auf iPhone und iPad kommen Mitteilungen nur zum Schlaufuchs auf dem Home-Bildschirm: Teilen → Zum Home-Bildschirm, dann den Schlaufuchs von dort öffnen.
          </div>
        )}
        {why === 'unsupported' && <div className="small muted">Dieser Browser kann keine Mitteilungen empfangen.</div>}
        {why === 'signin' && <div className="small muted">Mitteilungen gehen mit einem Eltern-Konto – oben bei „Auf allen Geräten“ anmelden.</div>}
        {why === 'ok' && (
          <label className="switch">
            <input type="checkbox" checked={state.on} disabled={busy} onChange={() => (state.on ? turnOff() : turnOn())} aria-label="Mitteilungen auf diesem Gerät" />
            <span>
              <b>Mitteilungen auf diesem Gerät</b>
              <div className="small muted">Lern-Erinnerung, Klassenarbeit naht, Vokabelkarten fällig – für alle Kinder der Familie. Jedes Gerät schaltet für sich ein.</div>
            </span>
          </label>
        )}
        {why === 'ok' &&
          state.on &&
          KINDS.map((k) => (
            <label key={k.kind} className="switch">
              <input type="checkbox" checked={state.kinds[k.kind]} onChange={async () => setState(await setPushKind(k.kind, !state.kinds[k.kind]))} aria-label={k.label} />
              <span>
                <b>{k.label}</b>
                <div className="small muted">{k.hint}</div>
              </span>
            </label>
          ))}
        {msg && (
          <div className="small" role="status">
            {msg}
          </div>
        )}
      </div>
    </details>
  );
}
