// Eine Aufgabe anzeigen und beantworten (Übung und Lernzielkontrolle).
import { useEffect, useRef } from 'react';
import type { Task } from '../engine/types';
import { Rich, Speak, SpeakerIcon } from './common';
import { canSpeak, prefetchSpeech, speak } from './speech';
import { Visual } from './Visual';
import { ColumnWork } from './ColumnWork';
import { TraceInput } from './Trace';

interface Props {
  task: Task;
  value: string;
  onChange: (v: string) => void;
  /** Übung: Antwort prüfen (bei Auswahl sofort mit dem gewählten Wert) */
  onSubmit?: (v: string) => void;
  /** nach dem Prüfen: richtig/falsch einfärben */
  reveal?: boolean;
  autoRead?: boolean;
  submitLabel?: string;
}

const groupDigits = (s: string) => (/^\d{5,}$/.test(s) ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : s);

export function TaskView({ task, value, onChange, onSubmit, reveal, autoRead, submitLabel = 'Prüfen' }: Props) {
  const a = task.answer;
  const speakText = task.speak ?? task.prompt;

  // Cloud-Stimme: Hör-Satz (und bei „automatisch vorlesen“ die Aufgabe) vorab laden
  useEffect(() => {
    if (task.listen) prefetchSpeech(task.listen.text, task.listen.lang, task.listen.slow);
    if (autoRead) prefetchSpeech(speakText, 'de');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.key, task.skillId]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (task.listen && !autoRead) speak(task.listen.text, task.listen.lang, undefined, task.listen.slow);
      else if (autoRead) speak(speakText, 'de', task.listen ? () => setTimeout(() => speak(task.listen!.text, task.listen!.lang, undefined, task.listen!.slow), 250) : undefined);
    }, 350);
    return () => clearTimeout(t);
    // nur beim Wechsel der Aufgabe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.key, task.skillId]);

  const longPrompt = task.prompt.length > 70;
  return (
    <div className="task">
      <div className="prompt-row">
        <div className={`prompt ${longPrompt ? 'long' : ''}`}>
          <Rich text={task.prompt} />
        </div>
        <Speak text={speakText} label="Aufgabe vorlesen" />
      </div>
      {task.listen && (
        <div className="listen-wrap">
          <Speak big text={task.listen.text} lang={task.listen.lang} slow={task.listen.slow} label="Anhören" />
          {!canSpeak() && (
            <details className="no-voice small">
              <summary>Dieses Gerät kann nicht vorlesen – für Erwachsene: zum Vorlesen anzeigen</summary>
              <b>{task.listen.text}</b>
            </details>
          )}
        </div>
      )}
      {task.work && <ColumnWork work={task.work} value={value} onChange={onChange} onSubmit={onSubmit} reveal={reveal} guided={!!onSubmit} />}
      {task.visual && !task.work && (
        <div className="visual-box">
          <Visual v={task.visual} />
        </div>
      )}
      {a.type === 'choice' && <Choices task={task} value={value} onPick={(v) => (onSubmit ? onSubmit(v) : onChange(v))} reveal={reveal} />}
      {a.type === 'number' && !task.work && <NumberInput value={value} unit={a.unit} onChange={onChange} onSubmit={onSubmit ? () => onSubmit(value) : undefined} reveal={reveal ? (Number(value.replace(',', '.')) === a.value ? 'right' : 'wrong') : undefined} submitLabel={submitLabel} />}
      {a.type === 'trace' && <TraceInput letter={a.value} onDone={(v) => (onSubmit ? onSubmit(v) : onChange(v))} reveal={reveal} ok={value === 'ok'} test={!onSubmit} saved={!onSubmit && !!value} />}
      {a.type === 'text' && !task.work && <TextInput value={value} lang={a.lang} onChange={onChange} onSubmit={onSubmit ? () => onSubmit(value) : undefined} reveal={reveal} submitLabel={submitLabel} />}
    </div>
  );
}

function Choices({ task, value, onPick, reveal }: { task: Task; value: string; onPick: (v: string) => void; reveal?: boolean }) {
  const a = task.answer;
  if (a.type !== 'choice') return null;
  const maxLen = Math.max(...a.options.map((o) => o.length));
  const cls = maxLen > 16 || (a.options.length === 3 && maxLen > 6) ? 'one' : (a.options.length === 3 && maxLen <= 6) || (a.options.length === 5 && maxLen <= 3) ? 'three' : '';
  return (
    <div className={`choices ${cls}`} role="group" aria-label="Antworten">
      {a.options.map((o, i) => {
        const chosen = value === String(i);
        const state = reveal ? (i === a.correct ? 'right' : chosen ? 'wrong' : '') : chosen ? 'sel' : '';
        return (
          <button key={i} className={`choice ${a.big ? 'big' : ''} ${state}`} lang={a.speakOptions === 'en' ? 'en' : undefined} disabled={reveal} onClick={() => onPick(String(i))}>
            {o}
            {a.speakOptions && !reveal && (
              <span
                className="opt-say"
                // nur für Sehende zum Antippen – ein Knopf im Knopf verwirrt Bildschirmleser (die lesen die Antwort ohnehin vor)
                aria-hidden
                onClick={(e) => {
                  e.stopPropagation();
                  speak(o, a.speakOptions);
                }}
              >
                <SpeakerIcon size={16} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function NumberInput({ value, unit, onChange, onSubmit, reveal, submitLabel }: { value: string; unit?: string; onChange: (v: string) => void; onSubmit?: () => void; reveal?: 'right' | 'wrong'; submitLabel: string }) {
  const ref = useRef({ value, onChange, onSubmit, reveal });
  ref.current = { value, onChange, onSubmit, reveal };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const c = ref.current;
      if (c.reveal || e.target instanceof HTMLInputElement) return;
      if (/^[0-9]$/.test(e.key) && c.value.length < 9) c.onChange(c.value + e.key);
      else if (e.key === 'Backspace') c.onChange(c.value.slice(0, -1));
      else if (e.key === 'Enter' && c.value && c.onSubmit) {
        // sonst löst dieselbe Taste gleich den „Weiter“-Knopf aus und die Rückmeldung wäre weg
        e.preventDefault();
        c.onSubmit();
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  const press = (d: string) => {
    if (reveal) return;
    if (d === '⌫') onChange(value.slice(0, -1));
    else if (value.length < 9) onChange(value === '0' ? d : value + d);
  };
  return (
    <>
      <div className={`answer-field ${reveal ?? 'focus'}`} aria-live="polite">
        {value ? groupDigits(value) : <span className="ph">?</span>}
        {unit && <span className="unit">{unit}</span>}
      </div>
      {!reveal && (
        <div className="numpad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} onClick={() => press(d)}>
              {d}
            </button>
          ))}
          <button onClick={() => press('⌫')} aria-label="Löschen">
            ⌫
          </button>
          <button onClick={() => press('0')}>0</button>
          {onSubmit ? (
            <button className="ok-key" onClick={() => value && onSubmit()} disabled={!value} aria-label={submitLabel}>
              ✓
            </button>
          ) : (
            <button onClick={() => onChange('')} aria-label="Alles löschen">
              C
            </button>
          )}
        </div>
      )}
    </>
  );
}

function TextInput({ value, lang, onChange, onSubmit, reveal, submitLabel }: { value: string; lang?: 'de' | 'en'; onChange: (v: string) => void; onSubmit?: () => void; reveal?: boolean; submitLabel: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!reveal) ref.current?.focus({ preventScroll: true });
  }, [reveal]);
  return (
    <div className="stack" style={{ gap: 10 }}>
      <input
        ref={ref}
        className={`text-input ${reveal ? 'revealed' : ''}`}
        value={value}
        disabled={reveal}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim() && onSubmit) {
            e.preventDefault();
            onSubmit();
          }
        }}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        lang={lang === 'en' ? 'en' : 'de'}
        placeholder={lang === 'en' ? 'English …' : 'Schreibe hier …'}
        aria-label="Antwort"
      />
      {!reveal && lang !== 'en' && (
        <div className="extra-keys">
          {['ä', 'ö', 'ü', 'ß'].map((c) => (
            <button key={c} onClick={() => onChange(value + c)}>
              {c}
            </button>
          ))}
        </div>
      )}
      {!reveal && onSubmit && (
        <button className="btn ok block" disabled={!value.trim()} onClick={onSubmit}>
          {submitLabel}
        </button>
      )}
    </div>
  );
}
