// Vokabelkarten: Karte ansehen, umdrehen, selbst sagen ob gewusst. Nicht gewusste Karten kommen in dieser Runde nochmal.
import { useEffect, useMemo, useRef, useState } from 'react';
import { cardsOf, visualOf, type CardWord } from '../content/words';
import { skillById } from '../content/curriculum';
import { boxCounts, cardStates, nextDue, pickCards, recordCard, stateOf } from '../engine/cards';
import type { Progress } from '../engine/learning';
import { updateProgress, type Profile } from '../data/store';
import { CloseIcon, Confetti, Fox, Speak } from '../ui/common';
import { Visual } from '../ui/Visual';
import { sounds } from '../ui/sound';
import { prefetchSpeech, speak, stopSpeaking } from '../ui/speech';
import { normText } from '../engine/check';
import { CardBoxes, type CardDir } from './Vocab';

/** Wie oft eine nicht gewusste Karte in derselben Runde höchstens wiederkommt */
const AGAIN_MAX = 2;

export function VocabCards({ profile, progress, skillIds, n, dir, onExit, onRestart }: { profile: Profile; progress: Progress; skillIds: string[]; n: number; dir: CardDir; onExit: () => void; onRestart: () => void }) {
  const all = useMemo(() => cardsOf(skillIds), [skillIds]);
  // Stapel einmal beim Start festlegen; ist nichts fällig, die Karten mit dem nächsten Termin („Trotzdem üben“)
  // Extra-Runde („Trotzdem üben“, nichts fällig): zählt für den Karteikasten, gibt aber keine Sterne – sonst ließen sich
  // mit „Gewusst“ beliebig viele Sterne sammeln
  const [extra] = useState(() => pickCards(all, cardStates(progress.log), n).cards.length === 0);
  const [queue, setQueue] = useState<CardWord[]>(() => {
    const st = cardStates(progress.log);
    const { cards } = pickCards(all, st, n);
    if (cards.length) return cards;
    return [...all].sort((a, b) => stateOf(st, a).due - stateOf(st, b).due).slice(0, n);
  });
  const total = useRef(queue.length);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  // Schreib-Karten: getippte Antwort und ob sie stimmt (die App bewertet selbst)
  const write = dir === 'write';
  const [typed, setTyped] = useState('');
  const [checked, setChecked] = useState<boolean | null>(null);
  const [known, setKnown] = useState(0);
  const [again, setAgain] = useState(0);
  const tries = useRef(new Map<string, number>());
  const card = queue[idx];
  const done = idx >= queue.length;

  // Englisch vorne: Wort gleich vorlesen; Deutsch vorne: beim Umdrehen
  useEffect(() => {
    if (!card) return;
    prefetchSpeech(card.en, 'en');
    if (dir === 'en-de') speak(card.en, 'en');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, dir]);
  useEffect(() => () => stopSpeaking(), []);
  useEffect(() => {
    if (done && profile.sound) sounds.done();
  }, [done, profile.sound]);

  const flip = () => {
    if (flipped) return;
    setFlipped(true);
    if (dir !== 'en-de') speak(card.en, 'en');
  };
  const submit = () => {
    if (!card || flipped || !typed.trim()) return;
    setChecked(normText(typed) === normText(card.en));
    setFlipped(true);
    speak(card.en, 'en');
  };
  const rate = (ok: boolean) => {
    if (!card || !flipped) return;
    stopSpeaking();
    updateProgress(profile.id, (p) => recordCard(p, card.skillId, card.en, ok, Date.now(), !extra));
    if (ok) {
      setKnown((k) => k + 1);
      if (profile.sound) sounds.right();
    } else {
      setAgain((a) => a + 1);
      const k = `${card.skillId}|${card.en}`;
      const t = tries.current.get(k) ?? 0;
      if (t < AGAIN_MAX) {
        tries.current.set(k, t + 1);
        setQueue((q) => [...q, card]);
      }
    }
    setFlipped(false);
    setTyped('');
    setChecked(null);
    setIdx((i) => i + 1);
  };

  // Tastatur: Leertaste/Enter dreht um, → oder J = gewusst, ← oder N = noch nicht
  const keys = useRef({ flip, rate, flipped, write, checked });
  keys.current = { flip, rate, flipped, write, checked };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('button, input, textarea')) return;
      if (keys.current.write && !keys.current.flipped) return;
      if (keys.current.write && keys.current.flipped && e.key === 'Enter') {
        e.preventDefault();
        keys.current.rate(keys.current.checked === true);
        return;
      }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        keys.current.flip();
      } else if (keys.current.flipped && (e.key === 'ArrowRight' || e.key === 'j')) keys.current.rate(true);
      else if (keys.current.flipped && (e.key === 'ArrowLeft' || e.key === 'n')) keys.current.rate(false);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  if (done) {
    const st = cardStates(progress.log);
    const counts = boxCounts(all, st);
    const next = pickCards(all, st, 1).cards.length ? null : nextDue(all, st);
    const pct = known / Math.max(1, known + again);
    return (
      <div role="main" className="app full narrow">
        {pct >= 0.8 && known > 0 && <Confetti />}
        <div className="stack center" style={{ paddingTop: 40 }}>
          <div>
            <Fox size={120} mood="happy" className="fox-wiggle" outfit={profile.outfit} />
          </div>
          <h1>{queue.length === 0 ? 'Keine Karten' : pct >= 0.8 ? 'Super gemacht!' : 'Gut geübt!'}</h1>
          <div className="tiles" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="tile">
              <b>✓ {known}</b>
              <span>gewusst</span>
            </div>
            <div className="tile">
              <b>↻ {again}</b>
              <span>noch nicht gewusst</span>
            </div>
          </div>
          <div className="card" style={{ display: 'grid', gap: 10, textAlign: 'left', width: '100%' }}>
            <b>🗃️ Dein Karteikasten</b>
            <CardBoxes counts={counts} />
            <span className="small muted">{next ? `Die nächsten Karten kommen ${new Date(next).toDateString() === new Date().toDateString() ? 'heute' : 'ab ' + new Date(next).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })} wieder.` : counts[0] ? `${counts[0]} neue Karten warten noch.` : 'Es sind noch Karten zum Wiederholen da.'}</span>
          </div>
          <button className="btn ok block" onClick={onRestart}>
            Noch eine Runde
          </button>
          <button className="btn ghost block" onClick={onExit}>
            Fertig
          </button>
        </div>
      </div>
    );
  }

  const skill = skillById(card.skillId);
  const front = dir === 'en-de' ? card.en : card.de;
  const back = dir === 'en-de' ? card.de : card.en;
  const box = stateOf(cardStates(progress.log), card);
  return (
    <div role="main" className="app full narrow">
      <h1 className="sr-only">Vokabelkarten</h1>
      <div className="session-top">
        <button className="icon-btn" aria-label="Karten beenden" onClick={onExit}>
          <CloseIcon />
        </button>
        <div className="progress" role="progressbar" aria-label="Fortschritt" aria-valuenow={Math.min(idx, total.current)} aria-valuemin={0} aria-valuemax={total.current}>
          <i style={{ width: `${(Math.min(idx, total.current) / Math.max(1, total.current)) * 100}%` }} />
        </div>
        <span className="pill">🗂️ {Math.min(idx + 1, queue.length)} / {queue.length}</span>
      </div>
      <div className="stack">
        <div className="row small muted" style={{ justifyContent: 'space-between' }}>
          <span>
            {skill?.icon} {skill?.title}
          </span>
          <span>{box.seen ? `Fach ${Math.max(1, box.box)}` : 'neue Karte'}</span>
        </div>
        <button type="button" className={`vcard ${flipped ? 'flipped' : ''}`} onClick={write ? undefined : flip} aria-label={flipped ? `${front} – ${back}` : write ? `${front}. Schreibe das englische Wort.` : `${front}. Tippe zum Umdrehen.`} aria-live="polite">
          <span className="vcard-face">
            {(dir !== 'en-de' || flipped) && (
              <span className="vcard-vis" aria-hidden>
                <Visual v={visualOf(card)} />
              </span>
            )}
            <span className="vcard-word" lang={dir === 'en-de' ? 'en' : 'de'}>
              {front}
            </span>
            {flipped ? (
              <span className="vcard-back" lang={dir === 'en-de' ? 'de' : 'en'}>
                {back}
              </span>
            ) : write ? null : (
              <span className="small muted">Tippe zum Umdrehen</span>
            )}
          </span>
        </button>
        {(!write || flipped) && (
          <div className="center">
            <Speak text={card.en} lang="en" label="Englisch anhören" />
          </div>
        )}
        {write && !flipped ? (
          <form
            className="stack"
            style={{ gap: 10 }}
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <input
              className="text-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              lang="en"
              placeholder="English …"
              aria-label="Englisches Wort"
              autoFocus
            />
            <button type="submit" className="btn block englisch" disabled={!typed.trim()}>
              Prüfen
            </button>
          </form>
        ) : write && flipped ? (
          <>
            <div className={`vcard-check ${checked ? 'ok' : 'bad'}`} role="status">
              {checked ? '✓ Richtig geschrieben!' : <>✗ Du hast „{typed.trim()}“ geschrieben. Richtig: <b lang="en">{card.en}</b></>}
            </div>
            <button className="btn block englisch" onClick={() => rate(checked === true)}>
              Weiter
            </button>
          </>
        ) : flipped ? (
          <div className="choices">
            <button className="btn vrate bad" onClick={() => rate(false)}>
              ✗ Noch nicht
            </button>
            <button className="btn vrate ok" onClick={() => rate(true)}>
              ✓ Gewusst
            </button>
          </div>
        ) : (
          <button className="btn block englisch" onClick={flip}>
            Umdrehen
          </button>
        )}
      </div>
    </div>
  );
}
