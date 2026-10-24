// Lernstand-Rettung (24.10.2026): Findet die App auf diesem Gerät eine aufgehobene Kopie, die mehr enthält als der Stand
// jetzt, bietet sie oben an, sie zurückzuholen (data/rescue.ts – zusammenführen, nichts geht verloren).
import { useEffect, useState } from 'react';
import { applyRescue, dismissRescue, findRescues, type Rescue } from '../data/rescue';
import { useData } from '../data/store';

export function RescueCard() {
  const data = useData();
  const [list, setList] = useState<Rescue[]>([]);
  const [done, setDone] = useState<string | null>(null);
  const kids = data.profiles.length;
  useEffect(() => {
    let alive = true;
    void findRescues()
      .then((r) => alive && setList(r))
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
        const here = r.into ? data.progress[r.into] : undefined;
        return (
          <div key={r.sig} className="card stack" role="alert" style={{ gap: 8 }}>
            <div>
              <b>
                {r.profile.avatar} Lernstand von {r.profile.name} gefunden
              </b>
              <div className="small">
                Auf diesem Gerät ist ein Stand mit {r.progress.solved} gelösten Aufgaben, {r.progress.stars} Sternen
                {r.progress.tests.length ? ` und ${r.progress.tests.length} Tests` : ''} aufgehoben
                {here ? ` – im Moment sind es nur ${here.solved} Aufgaben und ${here.stars} Sterne` : ''}. Beim Zurückholen bleibt alles, was seitdem geübt wurde.
              </div>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn ok"
                onClick={() => {
                  applyRescue(r);
                  setDone(r.profile.name);
                  void findRescues().then(setList);
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
