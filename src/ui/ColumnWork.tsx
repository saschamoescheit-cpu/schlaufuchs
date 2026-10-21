// Schriftliches Rechnen in Kästchen: das Kind schreibt jede Ziffer selbst – von rechts nach links wie auf Papier.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnWork as Work } from '../engine/types';
import { divSteps, layoutOf, resultValue, valsFromValue, wrongCells, type Cell } from './columnLayout';

interface Props {
  work: Work;
  value: string;
  onChange: (v: string) => void;
  onSubmit?: (v: string) => void;
  reveal?: boolean;
  /** Übung: Zwischenschritte beim Teilen zeigen */
  guided?: boolean;
}

export function ColumnWork({ work, value, onChange, onSubmit, reveal, guided }: Props) {
  const layout = useMemo(() => layoutOf(work), [work]);
  const [vals, setVals] = useState<Record<string, string>>(() => valsFromValue(layout, value));
  const [active, setActive] = useState<string>(() => layout.order.find((k) => !vals[k]) ?? layout.order[0]);
  const bad = useMemo(() => (reveal ? wrongCells(layout, vals) : new Set<string>()), [reveal, layout, vals]);

  const set = (next: Record<string, string>) => {
    setVals(next);
    onChange(resultValue(layout, next));
  };
  const allCells = useMemo(() => layout.rows.flatMap((r) => r.cells ?? []), [layout]);
  const isSmall = (k: string) => allCells.find((c) => c.key === k)?.small;

  const type = (d: string) => {
    if (reveal || !active) return;
    const next = { ...vals, [active]: d };
    set(next);
    if (isSmall(active)) {
      // nach der Merkzahl zurück zur nächsten leeren Ergebnisstelle
      setActive(layout.order.find((k) => !next[k]) ?? active);
      return;
    }
    const i = layout.order.indexOf(active);
    if (i >= 0 && i < layout.order.length - 1) setActive(layout.order[i + 1]);
  };
  const erase = () => {
    if (reveal || !active) return;
    if (vals[active]) set({ ...vals, [active]: '' });
    else {
      const i = layout.order.indexOf(active);
      if (i > 0) {
        const prev = layout.order[i - 1];
        set({ ...vals, [prev]: '' });
        setActive(prev);
      }
    }
  };
  const result = resultValue(layout, vals);

  const ref = useRef({ type, erase, result, onSubmit, reveal });
  ref.current = { type, erase, result, onSubmit, reveal };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const c = ref.current;
      if (c.reveal || e.target instanceof HTMLInputElement) return;
      if (/^[0-9]$/.test(e.key)) c.type(e.key);
      else if (e.key === 'Backspace') c.erase();
      else if (e.key === 'Enter' && c.result && c.onSubmit) {
        e.preventDefault();
        c.onSubmit(c.result);
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);

  const cellBtn = (c: Cell) => {
    const v = vals[c.key] ?? '';
    const state = reveal ? (bad.has(c.key) ? 'wrong' : v ? 'right' : '') : c.key === active ? 'active' : '';
    return (
      <button key={c.key} className={`cw-cell ${c.small ? 'small' : ''} ${state}`} disabled={reveal} onClick={() => setActive(c.key)} aria-label={`${c.small ? 'Merkzahl' : 'Ziffer'} Spalte ${c.col + 1}`}>
        {v}
      </button>
    );
  };

  const W = layout.width;
  const grid = (row: (col: number) => JSX.Element | null, key: string, op?: string, cls = '') => (
    <div className={`cw-row ${cls}`} key={key}>
      <span className="cw-op">{op ?? ''}</span>
      {Array.from({ length: W }, (_, i) => W - 1 - i).map((col) => row(col) ?? <span key={col} className="cw-empty" />)}
    </div>
  );

  const steps = layout.division && guided && !reveal ? divSteps(layout.division, layout.resultKeys.map((k) => vals[k] ?? '')) : [];

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="visual-box cw-box">
        {layout.division ? (
          <div className="cw-div">
            <span className="cw-static">
              {work.rows[0]} : {work.rows[1]} =
            </span>
            {layout.rows[0].cells!.map(cellBtn)}
            {layout.hasRest && (
              <>
                <span className="cw-static" style={{ fontSize: '1.4rem' }}>
                  Rest
                </span>
                {layout.rows[1].cells!.map(cellBtn)}
              </>
            )}
          </div>
        ) : (
          <div className="cw-grid">
            {layout.rows.map((r, ri) => {
              if (r.kind === 'line') return <div key={ri} className="cw-line" />;
              if (r.kind === 'static')
                return grid(
                  (col) =>
                    r.chars![col] !== undefined ? (
                      <span key={col} className={`cw-static ${r.chars![col] === '·' ? 'op' : ''}`}>
                        {r.chars![col]}
                      </span>
                    ) : null,
                  `s${ri}`,
                  r.op,
                );
              const byCol = new Map(r.cells!.map((c) => [c.col, c]));
              return grid((col) => (byCol.has(col) ? cellBtn(byCol.get(col)!) : null), `i${ri}`, undefined, r.cells![0]?.small ? 'small' : '');
            })}
          </div>
        )}
        {steps.length > 0 && (
          <div className="cw-steps">
            {steps.map((s, i) => (
              <div key={i} className={s.problem ? 'bad' : ''}>
                {s.cur} : {work.rows[1]} → {s.q} · {work.rows[1]} = {s.prod}, Rest {s.rest < 0 ? '?' : s.rest}
                {s.problem === 'zu-gross' && ' – zu viel! Nimm eine kleinere Zahl.'}
                {s.problem === 'rest-zu-gross' && ' – der Rest ist zu groß, da passt noch mehr hinein!'}
                {!s.problem && s.next !== undefined && i === steps.length - 1 && ` → hole die ${s.next} herunter: ${s.rest * 10 + s.next}`}
              </div>
            ))}
          </div>
        )}
        {!reveal && !layout.division && <div className="small muted center" style={{ marginTop: 6 }}>Schreibe von rechts nach links – wie im Heft. Die kleinen Kästchen sind für {work.op === '−' ? 'Merkzahlen' : 'den Übertrag'}.</div>}
      </div>
      {!reveal && (
        <div className="numpad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} onClick={() => type(d)}>
              {d}
            </button>
          ))}
          <button onClick={erase} aria-label="Löschen">
            ⌫
          </button>
          <button onClick={() => type('0')}>0</button>
          {onSubmit ? (
            <button className="ok-key" disabled={!result} onClick={() => result && onSubmit(result)} aria-label="Prüfen">
              ✓
            </button>
          ) : (
            <button
              onClick={() => {
                set({});
                setActive(layout.order[0]);
              }}
              aria-label="Alles löschen"
            >
              C
            </button>
          )}
        </div>
      )}
    </div>
  );
}
