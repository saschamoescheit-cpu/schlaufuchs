// Kinderprofile: anlegen, bearbeiten, wechseln, auf allen Geräten gleich halten.
import { useEffect, useState } from 'react';
import type { Grade } from '../engine/types';
import { STATES, stateInfo } from '../content/curriculum';
import { deleteProfile, duplicateProfiles, mergeProfiles, newProfile, saveProfile, schoolYear, setActive, type AppData, type Profile } from '../data/store';
import { forgetRemoved, PASSWORD_MIN, removedList, restoreRemoved, setLogin, signIn, signInWithPassword, signOut, signUp, syncNow, useSyncStatus } from '../data/sync';
import { PACES } from '../engine/session';
import { DEFAULT_KEY } from '../engine/grading';
import { Confirm, Fox, TopBar, Wordmark } from '../ui/common';
import { GradeKeyEditor } from './Tests';
import { canSpeak, chooseVoice, chosenVoice, onVoicesChanged, speak, voicesFor } from '../ui/speech';
import { hasPin } from '../data/parent';

const AVATARS = ['🦊', '🐼', '🦁', '🐯', '🐨', '🐸', '🐵', '🦄', '🐶', '🐱', '🐰', '🐻', '🐧', '🦉', '🐢', '🐬', '🦖', '🐝'];

export function Welcome({ data, onNew, onParent }: { data: AppData; onNew: () => void; onParent: () => void }) {
  const sync = useSyncStatus();
  const [login, setLoginOpen] = useState(false);
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
            ) : !sync.configured ? null : login ? (
              <div className="card stack" style={{ gap: 12, width: '100%', textAlign: 'left' }}>
                <AccountForm />
              </div>
            ) : (
              <button className="btn ghost block small" onClick={() => setLoginOpen(true)}>
                Schon auf einem anderen Gerät? Anmelden
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

const typing = { autoCapitalize: 'none', autoCorrect: 'off', spellCheck: false } as const;

/** Anmelden (Benutzername oder E-Mail + Passwort) oder einmal ein Konto anlegen; Google als zweiter Weg. */
function AccountForm() {
  const { google } = useSyncStatus();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      if (mode === 'login') await signInWithPassword(name, pw);
      else await signUp(name, email, pw);
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const ready = mode === 'login' ? name.trim() && pw : name.trim() && email.includes('@') && pw.length >= PASSWORD_MIN;
  return (
    <form className="stack" style={{ gap: 12 }} onSubmit={submit}>
      <div className="chips" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'login'} className={`chip ${mode === 'login' ? 'on' : ''}`} onClick={() => setMode('login')}>
          Anmelden
        </button>
        <button type="button" role="tab" aria-selected={mode === 'signup'} className={`chip ${mode === 'signup' ? 'on' : ''}`} onClick={() => setMode('signup')}>
          Konto anlegen
        </button>
      </div>
      <div className="field">
        <label htmlFor="acc-name">{mode === 'login' ? 'Benutzername oder E-Mail' : 'Benutzername'}</label>
        <input id="acc-name" className="input" value={name} maxLength={mode === 'login' ? 120 : 20} autoComplete="username" {...typing} onChange={(e) => setName(e.target.value)} />
        {mode === 'signup' && <div className="small muted">3–20 Zeichen: Buchstaben a–z, Ziffern, Punkt oder Strich. Damit meldest du dich auf den anderen Geräten an.</div>}
      </div>
      {mode === 'signup' && (
        <div className="field">
          <label htmlFor="acc-email">E-Mail</label>
          <input id="acc-email" className="input" type="email" value={email} autoComplete="email" {...typing} onChange={(e) => setEmail(e.target.value)} />
        </div>
      )}
      <div className="field">
        <label htmlFor="acc-pw">Passwort</label>
        <input id="acc-pw" className="input" type="password" value={pw} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} onChange={(e) => setPw(e.target.value)} />
        {mode === 'signup' && <div className="small muted">Mindestens {PASSWORD_MIN} Zeichen.</div>}
      </div>
      {err && (
        <div className="small" role="alert" style={{ color: 'var(--bad)' }}>
          {err}
        </div>
      )}
      <button className="btn block" type="submit" disabled={busy || !ready}>
        {busy ? 'Einen Moment …' : mode === 'login' ? 'Anmelden' : 'Konto anlegen'}
      </button>
      {google && (
        <>
          <div className="small muted center">oder</div>
          <button className="btn ghost block small" type="button" onClick={signIn}>
            Mit Google anmelden
          </button>
        </>
      )}
    </form>
  );
}

/** Angemeldet: Benutzername und Passwort festlegen oder ändern (z. B. nach der Anmeldung mit Google). */
function LoginEditor({ current, onDone }: { current: string | null; onDone: () => void }) {
  const [name, setName] = useState(current ?? '');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const needPw = !current; // ohne Benutzernamen bisher: das Passwort gehört dazu
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await setLogin(name, pw ? pw : null);
      onDone();
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="stack" style={{ gap: 12 }} onSubmit={submit}>
      <div className="field">
        <label htmlFor="ed-name">Benutzername</label>
        <input id="ed-name" className="input" value={name} maxLength={20} autoComplete="username" {...typing} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="ed-pw">{current ? 'Neues Passwort (leer lassen = bleibt)' : 'Passwort'}</label>
        <input id="ed-pw" className="input" type="password" value={pw} autoComplete="new-password" onChange={(e) => setPw(e.target.value)} />
        <div className="small muted">Mindestens {PASSWORD_MIN} Zeichen.</div>
      </div>
      {err && (
        <div className="small" role="alert" style={{ color: 'var(--bad)' }}>
          {err}
        </div>
      )}
      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn small" type="submit" disabled={busy || !name.trim() || (needPw && pw.length < PASSWORD_MIN)}>
          {busy ? 'Einen Moment …' : 'Speichern'}
        </button>
        <button className="btn ghost small" type="button" onClick={onDone}>
          Abbrechen
        </button>
      </div>
    </form>
  );
}

/** Alle Geräte gleich: ein Elternteil meldet sich auf jedem Gerät mit demselben Konto an. */
function SyncCard({ data }: { data: AppData }) {
  const sync = useSyncStatus();
  const [ask, setAsk] = useState<[Profile, Profile] | null>(null);
  const [edit, setEdit] = useState(false);
  const removed = sync.removed ? removedList() : [];
  const dups = duplicateProfiles(data);
  return (
    <>
      {sync.configured && <h3 style={{ marginTop: 8 }}>Auf allen Geräten</h3>}
      {!sync.configured ? null : sync.signedIn ? (
        <div className="card stack" style={{ gap: 10 }}>
          <div>
            <b>☁️ Angemeldet{sync.name ? ` als ${sync.name}` : sync.email ? ` als ${sync.email}` : ''}</b>
            <div className="small muted">
              {sync.running ? 'Gleicht gerade ab …' : sync.last ? `Zuletzt abgeglichen ${timeOf(sync.last)}` : 'Noch nicht abgeglichen'} · Kinder und Lernstand sind auf iPad, iPhone und PC gleich.
            </div>
          </div>
          {sync.error && <div className="small" style={{ color: 'var(--bad)' }}>{sync.error}</div>}
          {edit ? (
            <LoginEditor current={sync.name} onDone={() => setEdit(false)} />
          ) : (
            <>
              <div className="small">
                {sync.name ? (
                  <>
                    Auf einem anderen Gerät anmelden mit dem Benutzernamen <b>{sync.name}</b> und deinem Passwort.
                  </>
                ) : (
                  'Lege einen Benutzernamen und ein Passwort fest – dann geht die Anmeldung auf den anderen Geräten auch ohne Google.'
                )}
              </div>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <button className="btn ghost small" disabled={sync.running} onClick={() => void syncNow()}>
                  Jetzt abgleichen
                </button>
                <button className="btn ghost small" onClick={() => setEdit(true)}>
                  {sync.name ? 'Benutzername & Passwort' : 'Benutzername festlegen'}
                </button>
                <button className="btn ghost small" onClick={signOut}>
                  Abmelden
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="card stack" style={{ gap: 12 }}>
          <div className="small">Melde dich als Elternteil auf jedem Gerät mit demselben Konto an. Dann sind alle Kinder und ihr Lernstand auf iPad, iPhone und PC gleich, auch wenn ein Gerät mal offline geübt hat.</div>
          <AccountForm />
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
              <button key={g} className={`chip ${p.grade === g ? 'on' : ''}`} style={{ minWidth: 64, fontSize: '1.2rem' }} onClick={() => set({ grade: g as Grade, gradeYear: schoolYear(), ...(isNew ? { age: 5 + g, autoRead: g === 1 } : {}) })}>
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

        <VoicePicker />

        <SyncCard data={data} />

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

/** Vorlese-Stimmen wählen (je Gerät) – viele iPads haben bessere „verbesserte“ Stimmen */
function VoicePicker() {
  const [, setTick] = useState(0);
  useEffect(() => onVoicesChanged(() => setTick((t) => t + 1)), []);
  if (!canSpeak()) return null;
  const row = (lang: 'de' | 'en', label: string, sample: string) => {
    const list = voicesFor(lang);
    const cur = chosenVoice(lang) ?? '';
    return (
      <div className="field">
        <label className="label" htmlFor={`voice-${lang}`}>
          {label}
        </label>
        <div className="row">
          <select
            id={`voice-${lang}`}
            className="input grow"
            value={cur}
            onChange={(e) => {
              chooseVoice(lang, e.target.value || null);
              setTick((t) => t + 1);
              speak(sample, lang);
            }}
          >
            <option value="">Automatisch (beste Stimme)</option>
            {list.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
          <button className="icon-btn" aria-label={`${label} testen`} onClick={() => speak(sample, lang)}>
            🔊
          </button>
        </div>
        {list.length === 0 && <div className="small muted">Auf diesem Gerät ist keine passende Stimme installiert.</div>}
      </div>
    );
  };
  return (
    <details className="more">
      <summary>🔊 Vorlese-Stimme</summary>
      <div className="inner">
        {row('de', 'Deutsch', 'Hallo! Ich bin der Schlaufuchs. So klinge ich, wenn ich vorlese.')}
        {row('en', 'Englisch', 'Hello! I am the clever fox. This is how I sound in English.')}
        <div className="small muted">Tipp fürs iPad: Unter Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen kannst du eine „verbesserte“ Stimme laden. Sie klingt viel natürlicher.</div>
      </div>
    </details>
  );
}
