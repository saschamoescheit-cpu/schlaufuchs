// Kinderprofile: anlegen, bearbeiten, wechseln, auf allen Geräten gleich halten.
import { useState } from 'react';
import type { Grade } from '../engine/types';
import { STATES, stateInfo } from '../content/curriculum';
import { deleteProfile, duplicateProfiles, exportJson, mergeProfiles, newProfile, saveProfile, setActive, type AppData, type Profile } from '../data/store';
import { forgetRemoved, removedList, restoreRemoved, signIn, signOut, syncNow, useSyncStatus } from '../data/sync';
import { PACES } from '../engine/session';
import { DEFAULT_KEY } from '../engine/grading';
import { Confirm, Fox, TopBar, Wordmark } from '../ui/common';
import { GradeKeyEditor } from './Tests';
import { canSpeak, speak } from '../ui/speech';
import { hasPin } from '../data/parent';

const AVATARS = ['🦊', '🐼', '🦁', '🐯', '🐨', '🐸', '🐵', '🦄', '🐶', '🐱', '🐰', '🐻', '🐧', '🦉', '🐢', '🐬', '🦖', '🐝'];

export function Welcome({ data, onNew, onParent }: { data: AppData; onNew: () => void; onParent: () => void }) {
  const sync = useSyncStatus();
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
            <button className="btn ghost small" onClick={onParent}>
              👨‍👩‍👧 Für Eltern
            </button>
          </>
        ) : (
          <>
            <div style={{ marginTop: 24 }}>
              <Fox size={150} mood="happy" />
            </div>
            <button className="btn block" onClick={onNew}>
              Los geht&apos;s!
            </button>
            {sync.signedIn ? (
              <p className="small muted">{sync.running || !sync.last ? 'Kinder von deinen anderen Geräten werden geladen …' : 'Auf deinen anderen Geräten ist noch kein Kind angelegt.'}</p>
            ) : (
              <button className="btn ghost block small" onClick={signIn}>
                Schon auf einem anderen Gerät? Mit Google anmelden
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const timeOf = (iso: string) => {
  const d = new Date(iso);
  const today = d.toDateString() === new Date().toDateString();
  return today ? `heute ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}` : d.toLocaleString('de-DE', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/** Alle Geräte gleich: ein Elternteil meldet sich einmal je Gerät mit Google an. */
function SyncCard({ data }: { data: AppData }) {
  const sync = useSyncStatus();
  const [ask, setAsk] = useState<[Profile, Profile] | null>(null);
  const removed = sync.removed ? removedList() : [];
  const dups = duplicateProfiles(data);
  return (
    <>
      <h3 style={{ marginTop: 8 }}>Auf allen Geräten</h3>
      {sync.signedIn ? (
        <div className="card stack" style={{ gap: 10 }}>
          <div>
            <b>☁️ Angemeldet{sync.email ? ` als ${sync.email}` : ''}</b>
            <div className="small muted">
              {sync.running ? 'Gleicht gerade ab …' : sync.last ? `Zuletzt abgeglichen ${timeOf(sync.last)}` : 'Noch nicht abgeglichen'} · Kinder und Lernstand sind auf iPad, iPhone und PC gleich.
            </div>
          </div>
          {sync.error && <div className="small" style={{ color: 'var(--bad)' }}>{sync.error}</div>}
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button className="btn ghost small" disabled={sync.running} onClick={() => void syncNow()}>
              Jetzt abgleichen
            </button>
            <button className="btn ghost small" onClick={signOut}>
              Abmelden
            </button>
          </div>
        </div>
      ) : (
        <div className="card stack" style={{ gap: 10 }}>
          <div className="small">Melde dich einmal mit Google an (als Elternteil) – auf jedem Gerät mit demselben Konto. Dann sind alle Kinder und ihr Lernstand auf iPad, iPhone und PC gleich, auch wenn ein Gerät mal offline geübt hat.</div>
          <button className="btn block" onClick={signIn}>
            Mit Google anmelden
          </button>
        </div>
      )}
      {dups.map(([a, b]) => (
        <div key={b.id} className="card stack" style={{ gap: 8 }}>
          <div className="small">
            <b>{a.name}</b> gibt es zweimal – wohl auf zwei Geräten getrennt angelegt.
          </div>
          <button className="btn ghost small" onClick={() => setAsk([a, b])}>
            Zu einem {a.name} zusammenführen
          </button>
        </div>
      ))}
      {removed.map((r) => (
        <div key={r.profile.id} className="card stack" style={{ gap: 8 }}>
          <div className="small">
            {r.profile.avatar} <b>{r.profile.name}</b> wurde auf einem anderen Gerät gelöscht. Der Lernstand ist hier noch aufgehoben.
          </div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button className="btn ghost small" onClick={() => restoreRemoved(r.profile.id)}>
              Wiederherstellen
            </button>
            <button className="btn ghost small" onClick={() => forgetRemoved(r.profile.id)}>
              Ist gut so
            </button>
          </div>
        </div>
      ))}
      {ask && (
        <Confirm
          title={`${ask[0].name} zusammenführen?`}
          text={`Beide Lernstände werden zu einem: alle geübten Aufgaben, Sterne, Tests und die Fehler-Kiste. Es bleibt das Profil „${ask[0].avatar} ${ask[0].name}, Klasse ${ask[0].grade}“.`}
          yes="Zusammenführen"
          onYes={() => {
            mergeProfiles(ask[0].id, ask[1].id);
            setAsk(null);
          }}
          onNo={() => setAsk(null)}
        />
      )}
    </>
  );
}

export function ProfileEdit({ profile, onDone, onCancel, limited }: { profile?: Profile; onDone: () => void; onCancel?: () => void; limited?: boolean }) {
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

        {limited && <div className="card small muted">Klasse, Alter, Bundesland und Schul-Einstellungen ändern Eltern im Eltern-Bereich.</div>}
        {!limited && (<>
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
        </>)}

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

        {!limited && (
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
        )}

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

export function Settings({ data, profile, onEdit, onNew, onParent, onBack }: { data: AppData; profile: Profile; onEdit: () => void; onNew: () => void; onParent: () => void; onBack: () => void }) {
  const [del, setDel] = useState(false);
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

        <button className="btn block" onClick={onParent}>
          👨‍👩‍👧 Eltern-Bereich
        </button>

        <SyncCard data={data} />

        <button className="btn ghost block small" onClick={download}>
          💾 Lernstand als Datei speichern
        </button>

        {!hasPin() && (
          <button className="btn ghost block small" style={{ marginTop: 16, color: 'var(--bad)' }} onClick={() => setDel(true)}>
            Profil von {profile.name} löschen
          </button>
        )}
        <p className="small muted center">Schlaufuchs · Version {__APP_VERSION__}</p>
      </div>
      {del && (
        <Confirm
          title={`${profile.name} wirklich löschen?`}
          text="Der ganze Lernstand dieses Kindes wird gelöscht – mit Google-Anmeldung auf allen Geräten. Das kann man nicht rückgängig machen."
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
