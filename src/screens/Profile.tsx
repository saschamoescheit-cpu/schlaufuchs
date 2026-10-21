// Kinderprofile: anlegen, bearbeiten, wechseln, sichern.
import { useRef, useState } from 'react';
import type { Grade } from '../engine/types';
import { STATES, stateInfo } from '../content/curriculum';
import { deleteProfile, exportJson, importJson, newProfile, saveProfile, setActive, type AppData, type Profile } from '../data/store';
import { PACES } from '../engine/session';
import { DEFAULT_KEY } from '../engine/grading';
import { Confirm, Fox, TopBar, Wordmark } from '../ui/common';
import { GradeKeyEditor } from './Tests';
import { canSpeak, speak } from '../ui/speech';

const AVATARS = ['🦊', '🐼', '🦁', '🐯', '🐨', '🐸', '🐵', '🦄', '🐶', '🐱', '🐰', '🐻', '🐧', '🦉', '🐢', '🐬', '🦖', '🐝'];

export function Welcome({ data, onNew }: { data: AppData; onNew: () => void }) {
  const [imp, setImp] = useState<string | null>(null);
  return (
    <div className="app full">
      <div className="stack center" style={{ paddingTop: 48 }}>
        <Wordmark size={1.3} />
        <p className="muted" style={{ fontSize: '1.1rem' }}>
          Mathe, Deutsch und Englisch
          <br />
          für die Grundschule
        </p>
        {data.profiles.length > 0 ? (
          <>
            <h2 style={{ marginTop: 16 }}>Wer lernt heute?</h2>
            <div className="profiles">
              {data.profiles.map((p) => (
                <button key={p.id} className="profile-tile" onClick={() => setActive(p.id)}>
                  <span className="av">{p.avatar}</span>
                  <b>{p.name}</b>
                  <span className="small muted">Klasse {p.grade}</span>
                </button>
              ))}
              <button className="profile-tile" onClick={onNew}>
                <span className="av">➕</span>
                <span>Neues Kind</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ marginTop: 24 }}>
              <Fox size={150} mood="happy" />
            </div>
            <button className="btn block" onClick={onNew}>
              Los geht&apos;s!
            </button>
            <ImportButton onDone={(n) => setImp(`${n} ${n === 1 ? 'Kind' : 'Kinder'} aus der Sicherung geladen.`)} onError={setImp} />
            {imp && <p className="small">{imp}</p>}
          </>
        )}
      </div>
    </div>
  );
}

function ImportButton({ onDone, onError }: { onDone: (n: number) => void; onError: (msg: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button className="btn ghost block small" onClick={() => ref.current?.click()}>
        Sicherung laden
      </button>
      <input
        ref={ref}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try {
            onDone(importJson(await f.text()));
          } catch (err) {
            onError(err instanceof Error ? err.message : 'Die Datei konnte nicht gelesen werden.');
          }
          e.target.value = '';
        }}
      />
    </>
  );
}

export function ProfileEdit({ profile, onDone, onCancel }: { profile?: Profile; onDone: () => void; onCancel?: () => void }) {
  const [p, setP] = useState<Profile>(() => profile ?? newProfile({}));
  const set = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }));
  const isNew = !profile;
  const st = stateInfo(p.state);
  return (
    <div className="app full">
      <TopBar title={isNew ? 'Neues Kind' : 'Profil'} onBack={onCancel} />
      <div className="stack">
        <div className="field">
          <label htmlFor="name">Wie heißt du?</label>
          <input id="name" className="input" value={p.name} maxLength={20} placeholder="Vorname" autoComplete="off" onChange={(e) => set({ name: e.target.value })} />
        </div>

        <div className="field">
          <span className="label">Such dir ein Tier aus</span>
          <div className="avatars">
            {AVATARS.map((a) => (
              <button key={a} className={p.avatar === a ? 'on' : ''} onClick={() => set({ avatar: a })} aria-label={`Tier ${a}`}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="label">In welche Klasse gehst du?</span>
          <div className="chips">
            {[1, 2, 3, 4].map((g) => (
              <button key={g} className={`chip ${p.grade === g ? 'on' : ''}`} style={{ minWidth: 64, fontSize: '1.2rem' }} onClick={() => set({ grade: g as Grade, ...(isNew ? { age: 5 + g, autoRead: g === 1 } : {}) })}>
                {g}.
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="label">Wie alt bist du?</span>
          <div className="chips">
            {[5, 6, 7, 8, 9, 10, 11].map((a) => (
              <button key={a} className={`chip ${p.age === a ? 'on' : ''}`} style={{ minWidth: 52 }} onClick={() => set({ age: a })}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="state">Bundesland</label>
          <select
            id="state"
            className="input"
            value={p.state}
            onChange={(e) => {
              const s = stateInfo(e.target.value);
              set({ state: s.code, englishFrom: s.englishFrom, gradesFrom: s.gradesFrom });
            }}
          >
            {STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="small muted">
            Englisch ab Klasse {p.englishFrom} · Noten ab Klasse {p.gradesFrom}
            {st.note ? ` · ${st.note}` : ''}
          </div>
        </div>

        <label className="switch">
          <input type="checkbox" checked={p.autoRead} onChange={(e) => set({ autoRead: e.target.checked })} />
          <span>
            <b>Aufgaben automatisch vorlesen</b>
            <div className="small muted">Gut für Leseanfänger. Der Lautsprecher ist immer da.</div>
          </span>
        </label>
        {canSpeak() && (
          <button className="btn ghost small" onClick={() => speak('Hallo! Ich bin der Schlaufuchs. So klinge ich, wenn ich vorlese.')}>
            🔊 Stimme testen
          </button>
        )}
        <label className="switch">
          <input type="checkbox" checked={p.sound} onChange={(e) => set({ sound: e.target.checked })} />
          <span>
            <b>Töne</b>
            <div className="small muted">Kurzer Klang bei richtig und falsch.</div>
          </span>
        </label>

        <details className="more">
          <summary>Schule anpassen</summary>
          <div className="inner">
            <div className="field">
              <span className="label">Englisch beginnt in Klasse</span>
              <div className="chips">
                {[1, 2, 3].map((g) => (
                  <button key={g} className={`chip ${p.englishFrom === g ? 'on' : ''}`} onClick={() => set({ englishFrom: g as Grade })}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span className="label">Noten in Lernzielkontrollen ab Klasse</span>
              <div className="chips">
                {[2, 3, 4].map((g) => (
                  <button key={g} className={`chip ${p.gradesFrom === g ? 'on' : ''}`} onClick={() => set({ gradesFrom: g as Grade })}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span className="label">Notenschlüssel (Prozent für die Note)</span>
              <GradeKeyEditor value={p.gradeKey} onChange={(k) => set({ gradeKey: k })} />
              <button className="btn ghost small" onClick={() => set({ gradeKey: [...DEFAULT_KEY] })}>
                Standard wiederherstellen
              </button>
            </div>
            <div className="field">
              <span className="label">Zeit bei Lernzielkontrollen (Vorgabe)</span>
              <div className="chips">
                {PACES.map((x) => (
                  <button key={x.id} className={`chip ${p.pace === x.id ? 'on' : ''}`} onClick={() => set({ pace: x.id })}>
                    {x.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </details>

        <button
          className="btn ok block"
          disabled={!p.name.trim()}
          onClick={() => {
            saveProfile({ ...p, name: p.name.trim() });
            onDone();
          }}
        >
          {isNew ? 'Fertig – los geht’s!' : 'Speichern'}
        </button>
      </div>
    </div>
  );
}

export function Settings({ data, profile, onEdit, onNew, onBack }: { data: AppData; profile: Profile; onEdit: () => void; onNew: () => void; onBack: () => void }) {
  const [del, setDel] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const download = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `schlaufuchs-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  return (
    <div className="app full">
      <TopBar title="Einstellungen" onBack={onBack} />
      <div className="stack">
        <div className="card row">
          <span style={{ fontSize: '2.6rem' }}>{profile.avatar}</span>
          <span className="grow">
            <b style={{ fontFamily: 'var(--head)', fontSize: '1.2rem' }}>{profile.name}</b>
            <div className="small muted">
              Klasse {profile.grade} · {profile.age} Jahre · {stateInfo(profile.state).name}
            </div>
          </span>
          <button className="btn small ghost" onClick={onEdit}>
            Ändern
          </button>
        </div>

        {data.profiles.length > 1 && (
          <>
            <h3>Kind wechseln</h3>
            <div className="profiles">
              {data.profiles
                .filter((x) => x.id !== profile.id)
                .map((x) => (
                  <button key={x.id} className="profile-tile" onClick={() => setActive(x.id)}>
                    <span className="av">{x.avatar}</span>
                    <b>{x.name}</b>
                  </button>
                ))}
            </div>
          </>
        )}
        <button className="btn ghost block" onClick={onNew}>
          ➕ Weiteres Kind anlegen
        </button>

        <h3 style={{ marginTop: 8 }}>Sicherung</h3>
        <p className="small muted" style={{ marginTop: -8 }}>
          Alles wird nur auf diesem Gerät gespeichert. Mit einer Sicherungsdatei kannst du den Lernstand auf ein anderes Gerät mitnehmen.
        </p>
        <button className="btn ghost block" onClick={download}>
          💾 Sicherung speichern
        </button>
        <ImportButton onDone={(n) => setMsg(`${n} ${n === 1 ? 'Kind' : 'Kinder'} geladen.`)} onError={setMsg} />
        {msg && <p className="small">{msg}</p>}

        <button className="btn ghost block small" style={{ marginTop: 16, color: 'var(--bad)' }} onClick={() => setDel(true)}>
          Profil von {profile.name} löschen
        </button>
        <p className="small muted center">Schlaufuchs · Version {__APP_VERSION__}</p>
      </div>
      {del && (
        <Confirm
          title={`${profile.name} wirklich löschen?`}
          text="Der ganze Lernstand dieses Kindes wird gelöscht. Das kann man nicht rückgängig machen. Tipp: Speichere vorher eine Sicherung."
          yes="Ja, endgültig löschen"
          danger
          onYes={() => {
            deleteProfile(profile.id);
            setDel(false);
          }}
          onNo={() => setDel(false)}
        />
      )}
    </div>
  );
}
