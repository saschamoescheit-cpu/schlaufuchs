// Antworten prüfen und typische Fehler (Fallen) erkennen.
import type { Answer, Task } from './types';
import { analyze, spellHint } from './spelling';

export const normNumber = (s: string) => {
  const t = s.replace(/[\s  .]/g, '').replace(',', '.');
  return t === '' ? NaN : Number(t);
};
export const normText = (s: string, cs = false) => {
  const t = s.trim().replace(/\s+/g, ' ').replace(/[’‘`´]/g, "'").replace(/[.!?]$/, '');
  return cs ? t : t.toLowerCase();
};

/** die gegebene Antwort als Text (für Fallen und Anzeige) */
export function answerText(a: Answer, given: string): string {
  if (a.type === 'choice') return a.options[Number(given)] ?? '';
  return given;
}

export function correctText(a: Answer): string {
  if (a.type === 'choice') return a.options[a.correct];
  if (a.type === 'number') return `${a.prefix ?? ''}${formatNum(a.value)}${a.unit ? ' ' + a.unit : ''}`;
  return a.value;
}

const formatNum = (n: number) => {
  const s = String(n).replace('.', ',');
  const [i, d] = s.split(',');
  const ii = i.length > 4 ? i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : i;
  return d ? `${ii},${d}` : ii;
};

export interface CheckResult {
  ok: boolean;
  trap?: { tag: string; hint: string };
  /** Diktat: alle erkannten Fehlermuster */
  tags?: string[];
}

export function check(task: Task, given: string): CheckResult {
  const a = task.answer;
  let ok = false;
  if (a.type === 'number') ok = Math.abs(normNumber(given) - a.value) < 1e-9;
  else if (a.type === 'choice') ok = Number(given) === a.correct;
  else {
    const g = normText(given, a.caseSensitive);
    ok = [a.value, ...(a.accept ?? [])].some((v) => normText(v, a.caseSensitive) === g);
  }
  if (!ok && a.type === 'text' && a.dictation) {
    const tags = analyze(a.value, given).tags;
    return { ok, trap: { tag: tags[0], hint: tags.map(spellHint).filter(Boolean).join(' ') }, tags };
  }
  if (ok || !task.traps?.length) return { ok };
  const shown = answerText(a, given);
  const trap = task.traps.find((t) => (a.type === 'number' ? normNumber(t.answer) === normNumber(shown) : normText(t.answer) === normText(shown)));
  return { ok, trap: trap ? { tag: trap.tag, hint: trap.hint } : undefined };
}
