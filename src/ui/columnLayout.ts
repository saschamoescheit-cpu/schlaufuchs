// Aufbau der Rechenkästchen beim schriftlichen Rechnen (ohne React, damit testbar).
import type { ColumnWork } from '../engine/types';

export interface Cell {
  key: string;
  /** Spalte von rechts (0 = Einer) */
  col: number;
  /** erwartete Ziffer ('' = darf leer bleiben); undefined = wird nicht bewertet (z. B. Merkzahlen beim Minus) */
  expect?: string;
  small?: boolean;
}

export interface Row {
  kind: 'static' | 'input' | 'line';
  /** feste Zeichen von rechts nach links (Index = Spalte) */
  chars?: string[];
  op?: string;
  cells?: Cell[];
  label?: string;
}

export interface Layout {
  width: number;
  rows: Row[];
  /** Reihenfolge, in der das Kind schreibt */
  order: string[];
  /** Kästchen des Ergebnisses (für den Wert der Antwort), von links nach rechts */
  resultKeys: string[];
  /** Teilung: Ziffern des Dividenden und Startlänge */
  division?: { digits: number[]; divisor: number; startLen: number };
  /** Teilung mit Rest-Kästchen */
  hasRest?: boolean;
}

const rev = (n: number | string) => String(n).split('').reverse();

function carriesAdd(nums: number[]): number[] {
  const len = Math.max(...nums.map((n) => String(n).length));
  const out: number[] = [];
  let carry = 0;
  for (let i = 0; i < len; i++) {
    out[i] = carry;
    const s = nums.reduce((a, n) => a + (Math.floor(n / 10 ** i) % 10), 0) + carry;
    carry = Math.floor(s / 10);
  }
  out[len] = carry;
  return out;
}

function carriesMul(a: number, d: number): number[] {
  const ds = rev(a).map(Number);
  const out: number[] = [0];
  let carry = 0;
  ds.forEach((x, i) => {
    const p = x * d + carry;
    carry = Math.floor(p / 10);
    out[i + 1] = carry;
  });
  return out;
}

/** Ergebnis-Kästchen: `n` Kästchen ab Spalte `from`; führende Stellen dürfen leer bleiben */
function resultCells(prefix: string, value: number, n: number, from = 0, small = false): Cell[] {
  const ds = rev(value);
  return Array.from({ length: n }, (_, i) => ({ key: `${prefix}${i + from}`, col: i + from, expect: ds[i] ?? '', small }));
}

export function layoutOf(w: ColumnWork): Layout {
  const ord = (cells: Cell[]) => cells.filter((c) => !c.small).map((c) => c.key);
  if (w.op === '+' || w.op === '−') {
    const len = Math.max(...w.rows.map((n) => String(n).length), String(w.result).length);
    const res = resultCells('r', w.result, w.op === '+' ? len : String(w.rows[0]).length);
    const cr = w.op === '+' ? carriesAdd(w.rows) : [];
    const carries: Cell[] = Array.from({ length: res.length - 1 }, (_, i) => ({ key: `c${i + 1}`, col: i + 1, expect: w.op === '+' ? (cr[i + 1] ? String(cr[i + 1]) : '') : undefined, small: true }));
    const width = len + 1;
    return {
      width,
      rows: [
        ...w.rows.map((n, i): Row => ({ kind: 'static', chars: rev(n), op: i === w.rows.length - 1 ? w.op : undefined })),
        { kind: 'input', cells: carries, label: w.op === '+' ? 'Übertrag' : 'Merkzahlen' },
        { kind: 'line' },
        { kind: 'input', cells: res },
      ],
      order: ord(res),
      resultKeys: [...res].reverse().map((c) => c.key),
    };
  }
  if (w.op === '·') {
    const [a, b] = w.rows;
    const head = rev(`${a}·${b}`);
    const la = String(a).length;
    if (b < 10) {
      const res = resultCells('r', w.result, la + 1);
      const cm = carriesMul(a, b);
      const carries: Cell[] = Array.from({ length: la }, (_, i) => ({ key: `c${i + 1}`, col: i + 1, expect: cm[i + 1] ? String(cm[i + 1]) : '', small: true }));
      return { width: head.length, rows: [{ kind: 'static', chars: head }, { kind: 'line' }, { kind: 'input', cells: carries, label: 'Übertrag' }, { kind: 'input', cells: res }], order: ord(res), resultKeys: [...res].reverse().map((c) => c.key) };
    }
    const t = Math.floor(b / 10);
    const o = b % 10;
    const p0 = resultCells('p', a * t, la + 1, 1);
    const p1 = resultCells('q', a * o, la + 1, 0);
    const res = resultCells('r', w.result, la + 2);
    const ca = carriesAdd([a * t * 10, a * o]);
    const carries: Cell[] = Array.from({ length: la + 1 }, (_, i) => ({ key: `c${i + 1}`, col: i + 1, expect: ca[i + 1] ? String(ca[i + 1]) : '', small: true }));
    return {
      width: Math.max(head.length, la + 2),
      rows: [{ kind: 'static', chars: head }, { kind: 'line' }, { kind: 'input', cells: p0 }, { kind: 'input', cells: p1 }, { kind: 'input', cells: carries, label: 'Übertrag' }, { kind: 'line' }, { kind: 'input', cells: res }],
      order: [...ord(p0), ...ord(p1), ...ord(res)],
      resultKeys: [...res].reverse().map((c) => c.key),
    };
  }
  // Teilen: Quotient Ziffer für Ziffer von links
  const [n, d] = w.rows;
  const digits = String(n).split('').map(Number);
  let startLen = 1;
  while (startLen < digits.length && Number(digits.slice(0, startLen).join('')) < d) startLen++;
  const q = String(w.result);
  const cells: Cell[] = q.split('').map((ch, i) => ({ key: `r${i}`, col: q.length - 1 - i, expect: ch }));
  const rest: Cell[] = w.rest !== undefined ? [{ key: 'rest', col: -1, expect: String(w.rest) }] : [];
  return {
    width: q.length,
    rows: [{ kind: 'input', cells }, ...(rest.length ? [{ kind: 'input' as const, cells: rest, label: 'Rest' }] : [])],
    order: [...cells.map((c) => c.key), ...rest.map((c) => c.key)],
    resultKeys: cells.map((c) => c.key),
    division: { digits, divisor: d, startLen },
    hasRest: rest.length > 0,
  };
}

export interface DivStep {
  cur: number;
  q: number;
  prod: number;
  rest: number;
  next?: number;
  problem?: 'zu-gross' | 'rest-zu-gross';
}
/** Rechenschritte der Teilung mit den Ziffern, die das Kind eingetragen hat (bis zur ersten leeren Stelle) */
export function divSteps(div: NonNullable<Layout['division']>, qDigits: string[]): DivStep[] {
  const steps: DivStep[] = [];
  let cur = Number(div.digits.slice(0, div.startLen).join(''));
  let pos = div.startLen;
  for (const qd of qDigits) {
    if (qd === '' || qd === undefined) break;
    const q = Number(qd);
    const prod = q * div.divisor;
    const rest = cur - prod;
    const next = pos < div.digits.length ? div.digits[pos] : undefined;
    steps.push({ cur, q, prod, rest, next, problem: rest < 0 ? 'zu-gross' : rest >= div.divisor ? 'rest-zu-gross' : undefined });
    if (rest < 0 || rest >= div.divisor) break;
    cur = rest * 10 + (next ?? 0);
    pos++;
  }
  return steps;
}

/** Wert der Antwort aus den Ergebnis-Kästchen */
export function resultValue(l: Layout, vals: Record<string, string>): string {
  const q = l.resultKeys.map((k) => vals[k] ?? '').join('').replace(/^0+(?=\d)/, '');
  if (!l.hasRest) return q;
  return q || vals.rest ? `${q} Rest ${vals.rest ?? ''}`.trim() : '';
}

/** Kästchen, deren Inhalt nicht stimmt (für die Rückmeldung) */
export function wrongCells(l: Layout, vals: Record<string, string>): Set<string> {
  const bad = new Set<string>();
  for (const r of l.rows) for (const c of r.cells ?? []) {
    if (c.expect === undefined) continue;
    const v = vals[c.key] ?? '';
    const ok = v === c.expect || (c.expect === '' && (v === '' || v === '0')) || (c.small && c.expect === '' && v === '0');
    if (!ok && !(c.small && v === '' )) bad.add(c.key);
  }
  return bad;
}

/** Werte aus einer gespeicherten Antwort (nur Ergebnisziffern) wiederherstellen */
export function valsFromValue(l: Layout, value: string): Record<string, string> {
  const [main, restPart] = value.split(/\s*Rest\s*/i);
  const ds = (main ?? '').replace(/\D/g, '').split('');
  const keys = l.resultKeys;
  const out: Record<string, string> = {};
  const offset = l.division ? 0 : keys.length - ds.length;
  ds.forEach((ch, i) => {
    const k = keys[offset + i];
    if (k) out[k] = ch;
  });
  if (l.hasRest && restPart) out.rest = restPart.replace(/\D/g, '');
  return out;
}
