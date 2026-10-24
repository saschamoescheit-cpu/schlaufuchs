// Lernstand-Rettung (24.10.2026): Findet die App eine aufgehobene Kopie (Gerät oder Cloud), die mehr enthält als der
// Stand jetzt, bietet sie oben an, sie zurückzuholen (data/rescue.ts – zusammenführen, nichts geht verloren).
import { useEffect, useState } from 'react';
import { applyRescue, dismissRescue, findRescues, type Rescue } from '../data/rescue';
import { useData } from '../data/store';

/** Ergebnis einer Suche von außen (Eltern-Bereich „Lernstand suchen“) */
let pushList: ((l: Rescue[]) => void) | null = null;
export const showRescues = (l: Rescue[]) => pushList?.(l);

export function RescueCard() {
  const data = useData();
  const [list, setList] = useState<Rescue[]>([]);
  const [done, setDone] = useState<string | null>(null);
  const [pick, setPick] = useState<Record<string, string>>({});
  const kids = data.profiles.length;
  useEffect(() => {
    pushList = setList;
    return () => {
      pushList = null;
    };
  }, []);
  useEffect(() => {
    let alive = true;
    void findRescues()
      .then((r) => alive && setList((cur) => [...cur.filter((x) => !r.some((y) => y.sig === x.sig)), ...r]))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [kids]);
  if (!list.length && !done) return null;
  return (
    <div className="stack" style={{ gap: 10, marginBottom: 12 }}>
      {done && (
        <div className="card" role="status">
          <b>✓ Der Lernstand von {done} ist wieder da.</b>
        </div>
      )}
      {list.map((r) => {
        const named = !!r.profile.name;
        const target = r.into ?? pick[r.sig] ?? null;
        const here = target ? data.progress[target] : undefined;
        const who = named ? r.profile.name : (data.profiles.find((p) => p.id === target)?.name ?? 'einem Kind');
        return (
          <div key={r.sig} className="card stack" role="alert" style={{ gap: 8 }}>
            <div>
              <b>
                {r.profile.avatar} Lernstand {named ? `von ${r.profile.name}` : ''} gefunden{r.source === 'Cloud' ? ' (in der Cloud)' : ''}
              </b>
              <div className="small">
                Aufgehoben ist ein Stand mit {r.progress.log.length || r.progress.solved} Aufgaben, {r.progress.stars} Sternen
                {r.progress.tests.length ? ` und ${r.progress.tests.length} Tests` : ''}
                {here ? ` – im Moment sind es nur ${here.log.length} Aufgaben und ${here.stars} Sterne` : ''}. Beim Zurückholen bleibt alles, was seitdem geübt wurde.
              </div>
            </div>
            {!named && !r.into && data.profiles.length > 0 && (
              <label className="small stack" style={{ gap: 4 }}>
                Zu welchem Kind gehört dieser Lernstand?
                <select value={pick[r.sig] ?? ''} onChange={(e) => setPick((p) => ({ ...p, [r.sig]: e.target.value }))}>
                  <option value="">– bitte wählen –</option>
                  {data.profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn ok"
                disabled={!named && !target && data.profiles.length > 0}
                onClick={() => {
                  applyRescue(r, target ?? undefined);
                  setDone(who);
                  setList((l) => l.filter((x) => x.sig !== r.sig));
                }}
              >
                Zurückholen
              </button>
              <button
                className="btn ghost small"
                onClick={() => {
                  dismissRescue(r);
                  setList((l) => l.filter((x) => x.sig !== r.sig));
                }}
              >
                Nicht nötig
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
