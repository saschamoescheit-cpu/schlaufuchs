// Mitteilungen in den Einstellungen (Sascha 23.10.2026, wie bei GolfOS Rounds): ein Schalter für dieses Gerät, danach je
// Art ein Schalter. Wo es nicht geht, sagt eine Zeile warum. Aufbau und Schalter wie bei der Vorlese-Stimme.
// An/aus und die Arten gelten für die ganze Familie (abgeglichen); erlauben muss jedes Gerät einmal selbst.
import { useEffect, useRef, useState } from 'react';
import { useData } from '../data/store';
import { useSyncStatus } from '../data/sync';
import { disablePush, enablePush, followFamily, loadPush, pushAvailability, PushError, setPushKind, type PushKind } from '../data/push';

const KINDS: { kind: PushKind; label: string; hint: string }[] = [
  { kind: 'learn', label: 'Lern-Erinnerung', hint: 'Nachmittags, wenn ein Kind heute noch nicht geübt hat' },
  { kind: 'tests', label: 'Klassenarbeit naht', hint: 'Eingetragene Arbeiten: 3 Tage vorher und am Tag davor' },
  { kind: 'cards', label: 'Vokabelkarten fällig', hint: 'Wenn im Karteikasten mindestens 5 Karten dran sind' },
];

export function PushCard() {
  const sync = useSyncStatus();
  const family = useData().parent?.push;
  const [state, setState] = useState(loadPush);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const box = useRef<HTMLDetailsElement>(null);
  const why = pushAvailability(sync.signedIn);

  // ein anderes Gerät hat etwas geändert (Abgleich): hier nachziehen und anzeigen
  const familyKey = JSON.stringify(family ?? null);
  useEffect(() => {
    void followFamily(sync.signedIn).then(() => setState(loadPush()));
  }, [familyKey, sync.signedIn]);

  const familyOn = !!family?.on;
  const waitsHere = familyOn && !state.on;
  // hier noch zu erlauben: den Bereich einmal aufklappen (nie von selbst zuklappen)
  useEffect(() => {
    if (waitsHere && why !== 'unsupported' && box.current) box.current.open = true;
  }, [waitsHere, why]);

  if (!sync.configured) return null;
  const kinds = family?.kinds ?? state.kinds;

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
    setMsg('Mitteilungen sind aus – auf allen Geräten der Familie.');
    setBusy(false);
  };

  return (
    <details className="more push-card" ref={box}>
      <summary>
        🔔 Mitteilungen{familyOn && <span className="small muted"> · {waitsHere ? 'auf diesem Gerät noch erlauben' : 'an'}</span>}
      </summary>
      <div className="inner">
        {waitsHere && (
          <div className="small push-wait" role="note">
            In der Familie eingeschaltet – auf diesem Gerät noch nicht. {why === 'ok' ? 'Einmal einschalten und erlauben: Das verlangt das Gerät, ein anderes kann es nicht für dieses tun.' : ''}
          </div>
        )}
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
              <div className="small muted">Lern-Erinnerung, Klassenarbeit naht, Vokabelkarten fällig – für alle Kinder. An, aus und die Arten gelten für alle Geräte der Familie.</div>
            </span>
          </label>
        )}
        {why === 'ok' &&
          (state.on || familyOn) &&
          KINDS.map((k) => (
            <label key={k.kind} className="switch">
              <input type="checkbox" checked={kinds[k.kind]} onChange={async () => setState(await setPushKind(k.kind, !kinds[k.kind]))} aria-label={k.label} />
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
