// Zeichnet die Bilder zu Aufgaben und Erklärungen (alles SVG, offline-fähig).
import type { ReactNode } from 'react';
import type { Visual as V } from '../engine/types';

const C = {
  a: '#3D7BF7',
  b: '#F7862A',
  ink: '#2B2340',
  soft: '#E9E6F2',
  line: '#B9B3CC',
  green: '#2FA868',
  red: '#E5484D',
  paper: '#FFFFFF',
};

const Svg = ({ w, h, children, label, max = 360 }: { w: number; h: number; children: ReactNode; label?: string; max?: number }) => (
  <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} style={{ width: '100%', maxWidth: Math.min(max, w * 1.4), height: 'auto', display: 'block', margin: '0 auto' }}>
    {children}
  </svg>
);

function TenFrames({ n, m = 0, crossOut = 0 }: { n: number; m?: number; crossOut?: number }) {
  const total = n + m;
  const frames = Math.max(1, Math.ceil(total / 10));
  const cell = 30;
  const fw = 5 * cell + 8;
  const W = frames * fw + (frames - 1) * 14;
  return (
    <Svg w={W} h={2 * cell + 8} label={`${total} Punkte`} max={frames > 1 ? 380 : 220}>
      {Array.from({ length: frames }, (_, f) => (
        <g key={f} transform={`translate(${f * (fw + 14)},0)`}>
          <rect x={1} y={1} width={fw - 2} height={2 * cell + 6} rx={6} fill={C.paper} stroke={C.ink} strokeWidth={2} />
          {Array.from({ length: 10 }, (_, i) => {
            const idx = f * 10 + i;
            const x = 4 + (i % 5) * cell + cell / 2;
            const y = 4 + Math.floor(i / 5) * cell + cell / 2;
            const crossed = idx >= n - crossOut && idx < n;
            return (
              <g key={i}>
                <rect x={x - cell / 2} y={y - cell / 2} width={cell} height={cell} fill="none" stroke={C.line} strokeWidth={1} />
                {idx < total && <circle cx={x} cy={y} r={11} fill={idx < n ? C.a : C.b} opacity={crossed ? 0.35 : 1} />}
                {crossed && <path d={`M${x - 9} ${y - 9} L${x + 9} ${y + 9} M${x + 9} ${y - 9} L${x - 9} ${y + 9}`} stroke={C.red} strokeWidth={3} strokeLinecap="round" />}
              </g>
            );
          })}
        </g>
      ))}
    </Svg>
  );
}

function NumberLine({ from, to, start, jumps, step, minor, ask }: { from: number; to: number; start: number; jumps: number[]; step?: number; minor?: number; ask?: boolean }) {
  const W = 360;
  const pad = 18;
  const span = Math.max(1, to - from);
  const x = (v: number) => pad + ((v - from) / span) * (W - 2 * pad);
  const labelStep = step ?? (span <= 20 ? 1 : span <= 60 ? 5 : span <= 200 ? 10 : 100);
  const tickStep = minor ?? (span <= 60 ? 1 : span <= 200 ? labelStep / 2 || 1 : labelStep / 10);
  const ticks: number[] = [];
  for (let v = Math.ceil(from / tickStep) * tickStep; v <= to; v += tickStep) ticks.push(Math.round(v * 100) / 100);
  let cur = start;
  const arcs = jumps.map((j) => {
    const a = cur;
    cur += j;
    return { a, b: cur, j };
  });
  const y = 78;
  const fs = span > 20 && labelStep < 10 ? 10 : 13;
  return (
    <Svg w={W} h={104} label="Zahlenstrahl" max={420}>
      <line x1={pad - 8} y1={y} x2={W - pad + 8} y2={y} stroke={C.ink} strokeWidth={2} />
      <path d={`M${W - pad + 8} ${y} l-7 -5 v10 z`} fill={C.ink} />
      {ticks.map((v) => {
        const major = Math.abs(v / labelStep - Math.round(v / labelStep)) < 1e-6;
        return (
          <g key={v}>
            <line x1={x(v)} y1={y - (major ? 8 : 4)} x2={x(v)} y2={y + (major ? 8 : 4)} stroke={C.ink} strokeWidth={major ? 2 : 1} />
            {major && (
              <text x={x(v)} y={y + 22} fontSize={fs} textAnchor="middle" fill={C.ink} fontFamily="Fredoka, sans-serif">
                {v}
              </text>
            )}
          </g>
        );
      })}
      {arcs.map(({ a, b, j }, i) => {
        const mx = (x(a) + x(b)) / 2;
        const h = Math.min(46, 16 + Math.abs(x(b) - x(a)) / 3);
        const col = i % 2 ? C.b : C.a;
        return (
          <g key={i}>
            <path d={`M${x(a)} ${y - 4} Q${mx} ${y - 4 - h * 1.6} ${x(b)} ${y - 4}`} fill="none" stroke={col} strokeWidth={2.5} />
            <path d={`M${x(b)} ${y - 4} l${j > 0 ? -7 : 7} -6 l${j > 0 ? 1 : -1} 7 z`} fill={col} />
            <text x={mx} y={y - 8 - h * 0.85} fontSize={13} fontWeight={700} textAnchor="middle" fill={col} fontFamily="Fredoka, sans-serif">
              {j > 0 ? `+${j}` : `−${-j}`}
            </text>
          </g>
        );
      })}
      <circle cx={x(start)} cy={y} r={ask ? 7 : 5.5} fill={C.b} stroke={C.paper} strokeWidth={1.5} />
      {jumps.length === 0 && (
        <text x={x(start)} y={y - (ask ? 16 : 14)} fontSize={ask ? 24 : 13} fontWeight={700} textAnchor="middle" fill={C.b} fontFamily="Fredoka, sans-serif">
          {ask ? '?' : start}
        </text>
      )}
    </Svg>
  );
}

/** Würfelgebäude im Schrägbild (Kavalierperspektive wie im Schulbuch): Tiefe nach rechts oben, halbe Länge */
function Cubes({ h }: { h: number[][] }) {
  const s = 34;
  const k = s / 2;
  const D = h.length;
  const W = Math.max(...h.map((r) => r.length));
  const maxH = Math.max(1, ...h.flat());
  const w = W * s + D * k + 8;
  const ht = maxH * s + D * k + 8;
  const ox = 4;
  const oy = ht - 4;
  const faces: ReactNode[] = [];
  // hinten zuerst, unten zuerst, links zuerst – dann verdecken vordere Würfel die hinteren
  for (let row = 0; row < D; row++) {
    const d = D - 1 - row;
    for (let z = 0; z < maxH; z++)
      for (let c = 0; c < W; c++) {
        if ((h[row][c] ?? 0) <= z) continue;
        const x = ox + c * s + d * k;
        const y = oy - z * s - d * k;
        const key = `${row}-${c}-${z}`;
        faces.push(
          <g key={key} stroke={C.ink} strokeWidth={1.4} strokeLinejoin="round">
            <polygon points={`${x + s},${y} ${x + s + k},${y - k} ${x + s + k},${y - s - k} ${x + s},${y - s}`} fill="#E07A1F" />
            <polygon points={`${x},${y - s} ${x + k},${y - s - k} ${x + s + k},${y - s - k} ${x + s},${y - s}`} fill="#FFC27A" />
            <rect x={x} y={y - s} width={s} height={s} fill="#F7A04B" />
          </g>,
        );
      }
  }
  return (
    <Svg w={w} h={ht} label={`Würfelgebäude`} max={300}>
      {faces}
    </Svg>
  );
}

/** Bilder-Raster für oben/unten/links/rechts */
function Grid({ rows, mark }: { rows: string[][]; mark?: [number, number] }) {
  return (
    <div className="vis-grid" role="img" aria-label={rows.map((r) => r.join(' ')).join(', ')}>
      {rows.map((r, i) => (
        <div key={i} className="vis-grid-row">
          {r.map((c, j) => (
            <span key={j} className={`vis-grid-cell ${mark && mark[0] === i && mark[1] === j ? 'mark' : ''}`}>
              {c}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function Blocks({ th = 0, h = 0, t, o }: { th?: number; h?: number; t: number; o: number }) {
  const u = 7;
  const items: ReactNode[] = [];
  let x = 4;
  for (let i = 0; i < th; i++) {
    items.push(<rect key={`th${i}`} x={x} y={4} width={10 * u} height={10 * u} fill="#C9B6F2" stroke={C.ink} />, <text key={`tt${i}`} x={x + 5 * u} y={5 * u + 9} textAnchor="middle" fontSize={14} fontWeight={700} fill={C.ink}>1000</text>);
    x += 10 * u + 8;
  }
  for (let i = 0; i < h; i++) {
    items.push(
      <g key={`h${i}`}>
        <rect x={x} y={4} width={10 * u} height={10 * u} fill="#FBD38D" stroke={C.ink} />
        {Array.from({ length: 9 }, (_, k) => <line key={k} x1={x + (k + 1) * u} y1={4} x2={x + (k + 1) * u} y2={4 + 10 * u} stroke="#C28B2C" strokeWidth={0.6} />)}
        {Array.from({ length: 9 }, (_, k) => <line key={`r${k}`} x1={x} y1={4 + (k + 1) * u} x2={x + 10 * u} y2={4 + (k + 1) * u} stroke="#C28B2C" strokeWidth={0.6} />)}
      </g>,
    );
    x += 10 * u + 6;
  }
  for (let i = 0; i < t; i++) {
    items.push(
      <g key={`t${i}`}>
        <rect x={x} y={4} width={u} height={10 * u} fill="#8FB8FF" stroke={C.ink} />
        {Array.from({ length: 9 }, (_, k) => <line key={k} x1={x} y1={4 + (k + 1) * u} x2={x + u} y2={4 + (k + 1) * u} stroke="#3D6CC0" strokeWidth={0.6} />)}
      </g>,
    );
    x += u + 4;
  }
  x += 6;
  for (let i = 0; i < o; i++) {
    items.push(<rect key={`o${i}`} x={x + (i % 2) * (u + 3)} y={4 + 10 * u - (Math.floor(i / 2) + 1) * (u + 3)} width={u} height={u} fill="#FFB27A" stroke={C.ink} />);
  }
  x += 2 * (u + 3) + 4;
  return (
    <Svg w={Math.max(x, 60)} h={10 * u + 8} label="Stellenwert-Material" max={Math.min(420, x * 2.2)}>
      {items}
    </Svg>
  );
}

function PlaceTable({ digits, labels, highlight }: { digits: number[]; labels: string[]; highlight?: number }) {
  const cw = 46;
  const W = digits.length * cw + 4;
  return (
    <Svg w={W} h={88} label="Stellenwerttafel" max={Math.min(380, W * 1.6)}>
      {digits.map((d, i) => (
        <g key={i} transform={`translate(${2 + i * cw},2)`}>
          <rect width={cw} height={34} fill={i === highlight ? '#FFE3C7' : C.soft} stroke={C.ink} />
          <text x={cw / 2} y={23} textAnchor="middle" fontSize={16} fontWeight={700} fill={C.ink} fontFamily="Fredoka, sans-serif">{labels[i]}</text>
          <rect y={34} width={cw} height={48} fill={i === highlight ? '#FFF1E3' : C.paper} stroke={C.ink} />
          <text x={cw / 2} y={68} textAnchor="middle" fontSize={28} fontWeight={600} fill={i === highlight ? C.b : C.ink} fontFamily="Fredoka, sans-serif">{d}</text>
        </g>
      ))}
    </Svg>
  );
}

function Clock({ h, m }: { h: number; m: number }) {
  const R = 90;
  const c = 100;
  const ha = ((h % 12) + m / 60) * 30;
  const ma = m * 6;
  const hand = (deg: number, len: number) => [c + len * Math.sin((deg * Math.PI) / 180), c - len * Math.cos((deg * Math.PI) / 180)];
  const [hx, hy] = hand(ha, 48);
  const [mx, my] = hand(ma, 74);
  return (
    <Svg w={200} h={200} label="Uhr" max={220}>
      <circle cx={c} cy={c} r={R + 6} fill="#FFE3C7" />
      <circle cx={c} cy={c} r={R} fill={C.paper} stroke={C.ink} strokeWidth={4} />
      {Array.from({ length: 60 }, (_, i) => {
        const [x1, y1] = hand(i * 6, R - (i % 5 ? 5 : 10));
        const [x2, y2] = hand(i * 6, R - 2);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.ink} strokeWidth={i % 5 ? 1 : 2.5} />;
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const [x, y] = hand((i + 1) * 30, R - 24);
        return <text key={i} x={x} y={y + 6} textAnchor="middle" fontSize={17} fontWeight={600} fill={C.ink} fontFamily="Fredoka, sans-serif">{i + 1}</text>;
      })}
      <line x1={c} y1={c} x2={hx} y2={hy} stroke={C.ink} strokeWidth={8} strokeLinecap="round" />
      <line x1={c} y1={c} x2={mx} y2={my} stroke={C.a} strokeWidth={5} strokeLinecap="round" />
      <circle cx={c} cy={c} r={6} fill={C.b} />
    </Svg>
  );
}

const coinStyle = (v: number) =>
  v >= 500 ? null : v === 200 ? { r: 27, fill: '#E7C45A', ring: '#C9CCD3', label: '2 €' } : v === 100 ? { r: 25, fill: '#C9CCD3', ring: '#E7C45A', label: '1 €' } : v >= 10 ? { r: 18 + (v / 50) * 6, fill: '#E7C45A', ring: '#C9A23A', label: `${v} ct` } : { r: 13 + v * 1.4, fill: '#D08A5A', ring: '#A9643A', label: `${v} ct` };
const NOTE = { 500: '#A9A9A9', 1000: '#E7837A', 2000: '#7FA8E8', 5000: '#E8A35F' } as Record<number, string>;
function Money({ items }: { items: number[] }) {
  let x = 4;
  const parts = items.map((v, i) => {
    const s = coinStyle(v);
    if (!s) {
      const el = (
        <g key={i} transform={`translate(${x},6)`}>
          <rect width={86} height={50} rx={5} fill={NOTE[v] ?? '#BBB'} stroke={C.ink} />
          <rect x={6} y={6} width={74} height={38} rx={3} fill="none" stroke="#fff" strokeOpacity={0.6} />
          <text x={43} y={33} textAnchor="middle" fontSize={17} fontWeight={700} fill={C.ink} fontFamily="Fredoka, sans-serif">{v / 100} €</text>
        </g>
      );
      x += 92;
      return el;
    }
    const el = (
      <g key={i} transform={`translate(${x + s.r},${31})`}>
        <circle r={s.r} fill={s.ring} stroke={C.ink} />
        <circle r={s.r * 0.78} fill={s.fill} />
        <text y={4} textAnchor="middle" fontSize={s.r > 20 ? 12 : 10} fontWeight={700} fill={C.ink} fontFamily="Fredoka, sans-serif">{s.label}</text>
      </g>
    );
    x += 2 * s.r + 6;
    return el;
  });
  return (
    <Svg w={x} h={62} label="Geld" max={Math.min(420, x * 1.3)}>
      {parts}
    </Svg>
  );
}

function Column({ op, rows, result, carries, steps }: { op: string; rows: number[]; result?: number; carries?: number[]; steps?: string[] }) {
  if (op === ':') {
    return (
      <div className="vis-column mono">
        <div className="col-row">
          {rows[0]} : {rows[1]} = <b>{result ?? '?'}</b>
        </div>
      </div>
    );
  }
  const strs = rows.map(String);
  const allLines = [...strs, ...(steps ?? []), result !== undefined ? String(result) : ''];
  const width = Math.max(...allLines.map((s) => s.length)) + 1;
  const cells = (s: string, pad = width) => s.padStart(pad, ' ').split('');
  return (
    // --n: Kästchen pro Zeile – die Schrift schrumpft auf schmalen Bildschirmen mit, damit nichts übersteht
    <div className="vis-column mono" aria-label="schriftliche Rechnung" style={{ ['--n' as string]: op === '·' ? width + 2 : width + 1 }}>
      {op === '·' ? (
        <div className="col-row">
          {cells(`${rows[0]}·${rows[1]}`, width + 2).map((ch, i) => <span key={i}>{ch === ' ' ? '' : ch}</span>)}
        </div>
      ) : (
        strs.map((s, r) => (
          <div className="col-row" key={r}>
            <span className="col-op">{r === strs.length - 1 ? op : ''}</span>
            {cells(s).map((ch, i) => <span key={i}>{ch === ' ' ? '' : ch}</span>)}
          </div>
        ))
      )}
      {op === '·' && steps?.map((s, r) => (
        <div className="col-row" key={`s${r}`}>
          {cells(s.padEnd(s.length + (steps.length - 1 - r), ' '), width + 2).map((ch, i) => <span key={i}>{ch === ' ' ? '' : ch}</span>)}
        </div>
      ))}
      {carries && op === '+' && (
        <div className="col-row carries">
          <span className="col-op" />
          {cells(carries.map((c) => (c ? String(c) : ' ')).reverse().join(''), width).map((ch, i) => <span key={i}>{ch === ' ' ? '' : ch}</span>)}
        </div>
      )}
      <div className="col-line" />
      <div className="col-row result">
        {op !== '·' && <span className="col-op" />}
        {cells(result !== undefined ? String(result) : '?', op === '·' ? width + 2 : width).map((ch, i) => <span key={i}>{ch === ' ' ? '' : ch}</span>)}
      </div>
    </div>
  );
}

function ArrayDots({ rows, cols, split }: { rows: number; cols: number; split?: number }) {
  const s = Math.min(24, 300 / Math.max(cols, 1));
  const W = cols * s + 8 + (split ? 0 : 0);
  const H = rows * s + 8 + (split && split < rows ? 8 : 0);
  return (
    <Svg w={W} h={H} label={`${rows} mal ${cols}`} max={Math.min(360, W * 1.5)}>
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => (
          <circle key={`${r}-${c}`} cx={4 + c * s + s / 2} cy={4 + r * s + s / 2 + (split && r >= split ? 8 : 0)} r={s * 0.36} fill={split && r >= split ? C.b : C.a} />
        )),
      )}
    </Svg>
  );
}

function Shape({ shape, rot = 0, fill }: { shape: string; rot?: number; fill?: string }) {
  const st = { fill: fill ?? '#CFE0FF', stroke: C.ink, strokeWidth: 3, strokeLinejoin: 'round' as const };
  const side = { fill: '#9DBDF5', stroke: C.ink, strokeWidth: 3, strokeLinejoin: 'round' as const };
  const top = { fill: '#E4EEFF', stroke: C.ink, strokeWidth: 3, strokeLinejoin: 'round' as const };
  const dash = { fill: 'none', stroke: C.ink, strokeWidth: 1.5, strokeDasharray: '5 4' };
  const g: Record<string, ReactNode> = {
    Kreis: <circle cx={80} cy={70} r={55} {...st} />,
    Dreieck: <path d="M80 12 L145 125 L15 125 Z" {...st} />,
    Quadrat: <rect x={25} y={15} width={110} height={110} {...st} />,
    Rechteck: <rect x={8} y={35} width={144} height={75} {...st} />,
    Würfel: (
      <>
        <path d="M30 50 L100 50 L100 120 L30 120 Z" {...st} />
        <path d="M30 50 L58 22 L128 22 L100 50 Z" {...top} />
        <path d="M100 50 L128 22 L128 92 L100 120 Z" {...side} />
      </>
    ),
    Quader: (
      <>
        <path d="M10 60 L110 60 L110 120 L10 120 Z" {...st} />
        <path d="M10 60 L40 32 L140 32 L110 60 Z" {...top} />
        <path d="M110 60 L140 32 L140 92 L110 120 Z" {...side} />
      </>
    ),
    Kugel: (
      <>
        <circle cx={80} cy={70} r={55} {...st} />
        <ellipse cx={80} cy={70} rx={55} ry={16} {...dash} />
        <ellipse cx={62} cy={50} rx={14} ry={9} fill="#fff" opacity={0.7} />
      </>
    ),
    Zylinder: (
      <>
        <path d="M35 30 L35 115 A45 13 0 0 0 125 115 L125 30" {...st} />
        <ellipse cx={80} cy={30} rx={45} ry={13} {...top} />
      </>
    ),
    Kegel: (
      <>
        <path d="M80 12 L35 112 A45 13 0 0 0 125 112 Z" {...st} />
        <ellipse cx={80} cy={112} rx={45} ry={13} {...dash} />
      </>
    ),
    Pyramide: (
      <>
        <path d="M80 12 L20 110 L100 128 Z" {...st} />
        <path d="M80 12 L100 128 L142 100 Z" {...side} />
        <path d="M20 110 L62 86 L142 100" {...dash} />
        <path d="M80 12 L62 86" {...dash} />
      </>
    ),
  };
  // gedreht: größere Zeichenfläche, damit nichts abgeschnitten wird
  if (rot)
    return (
      <Svg w={180} h={180} label="Form" max={210}>
        <g transform={`translate(10 20) rotate(${rot} 80 70)`}>{g[shape]}</g>
      </Svg>
    );
  return (
    <Svg w={160} h={140} label={shape} max={200}>
      {g[shape]}
    </Svg>
  );
}

/** zwei Strecken (z. B. parallel oder senkrecht) auf Kästchenpapier */
function Lines({ a, b, right }: { a: [number, number, number, number]; b: [number, number, number, number]; right?: boolean }) {
  // Schnittpunkt für das Winkelzeichen
  let mark: ReactNode = null;
  if (right) {
    const [x1, y1, x2, y2] = a, [x3, y3, x4, y4] = b;
    const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(d) > 1e-6) {
      const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d;
      const px = x1 + t * (x2 - x1), py = y1 + t * (y2 - y1);
      const la = Math.hypot(x2 - x1, y2 - y1), lb = Math.hypot(x4 - x3, y4 - y3);
      // in Richtung der weiter entfernten Enden, damit das Zeichen im Winkel liegt
      const ua = Math.hypot(x2 - px, y2 - py) > Math.hypot(x1 - px, y1 - py) ? [(x2 - x1) / la, (y2 - y1) / la] : [(x1 - x2) / la, (y1 - y2) / la];
      const ub = Math.hypot(x4 - px, y4 - py) > Math.hypot(x3 - px, y3 - py) ? [(x4 - x3) / lb, (y4 - y3) / lb] : [(x3 - x4) / lb, (y3 - y4) / lb];
      const k = 14;
      mark = <path d={`M${px + ua[0] * k} ${py + ua[1] * k} L${px + (ua[0] + ub[0]) * k} ${py + (ua[1] + ub[1]) * k} L${px + ub[0] * k} ${py + ub[1] * k}`} fill="none" stroke={C.green} strokeWidth={2.5} />;
    }
  }
  return (
    <Svg w={200} h={160} label="zwei Linien" max={280}>
      {Array.from({ length: 11 }, (_, i) => <line key={`v${i}`} x1={i * 20} y1={0} x2={i * 20} y2={160} stroke="#E3EBF8" />)}
      {Array.from({ length: 9 }, (_, i) => <line key={`h${i}`} x1={0} y1={i * 20} x2={200} y2={i * 20} stroke="#E3EBF8" />)}
      <line x1={a[0]} y1={a[1]} x2={a[2]} y2={a[3]} stroke={C.a} strokeWidth={4} strokeLinecap="round" />
      <line x1={b[0]} y1={b[1]} x2={b[2]} y2={b[3]} stroke={C.b} strokeWidth={4} strokeLinecap="round" />
      {mark}
    </Svg>
  );
}

/** Bilder in einer Zeile (z. B. Muster) – schrumpft statt umzubrechen */
function Row({ items }: { items: string[] }) {
  const w = 40;
  return (
    <Svg w={items.length * w} h={44} label={items.join(' ')} max={items.length * 52}>
      {items.map((e, i) => (
        <text key={i} x={i * w + w / 2} y={24} fontSize={30} textAnchor="middle" dominantBaseline="central">
          {e}
        </text>
      ))}
    </Svg>
  );
}

/** ungeordnete Menge (Streubild) zum Zählen */
function Scatter({ emoji, pts }: { emoji: string; pts: [number, number][] }) {
  return (
    <Svg w={240} h={150} label={`${pts.length} Bilder`} max={340}>
      {pts.map(([x, y], i) => (
        <text key={i} x={x} y={y} fontSize={24} textAnchor="middle" dominantBaseline="central">
          {emoji}
        </text>
      ))}
    </Svg>
  );
}

const MIX_COLORS = ['#CFE0FF', '#FFD9B8', '#C9F0D6', '#F6C9E4', '#FFF0A8'];
/** Mehrere kleine Formen in einer Reihe (bunt, verschieden groß, gedreht) – zum Zählen einer Form */
function ShapeMix({ items }: { items: { s: string; rot: number; c: number; big: boolean }[] }) {
  const cell = 64;
  const perRow = Math.min(items.length, 5);
  const rows = Math.ceil(items.length / perRow);
  return (
    <Svg w={perRow * cell} h={rows * cell} label="Formen" max={perRow * 80}>
      {items.map((it, i) => {
        const cx = (i % perRow) * cell + cell / 2;
        const cy = Math.floor(i / perRow) * cell + cell / 2;
        const k = it.big ? 1 : 0.72;
        const st = { fill: MIX_COLORS[it.c % MIX_COLORS.length], stroke: C.ink, strokeWidth: 2.5 / k, strokeLinejoin: 'round' as const };
        const el =
          it.s === 'Kreis' ? <circle r={24} {...st} /> :
          it.s === 'Dreieck' ? <path d="M0 -25 L27 21 L-27 21 Z" {...st} /> :
          it.s === 'Quadrat' ? <rect x={-21} y={-21} width={42} height={42} {...st} /> :
          <rect x={-28} y={-15} width={56} height={30} {...st} />;
        return (
          <g key={i} transform={`translate(${cx} ${cy}) scale(${k}) rotate(${it.rot})`}>
            {el}
          </g>
        );
      })}
    </Svg>
  );
}

function Rect({ w, h, show }: { w: number; h: number; show?: 'umfang' | 'flaeche' }) {
  const s = Math.min(30, 300 / (w + 2));
  const W = (w + 2) * s;
  const H = (h + 2) * s;
  return (
    <Svg w={W} h={H} label={`Rechteck ${w} mal ${h}`} max={360}>
      {Array.from({ length: w + 3 }, (_, i) => <line key={`v${i}`} x1={i * s} y1={0} x2={i * s} y2={H} stroke="#D6E4F7" />)}
      {Array.from({ length: h + 3 }, (_, i) => <line key={`h${i}`} x1={0} y1={i * s} x2={W} y2={i * s} stroke="#D6E4F7" />)}
      {show === 'flaeche' &&
        Array.from({ length: w * h }, (_, i) => <rect key={i} x={s + (i % w) * s + 2} y={s + Math.floor(i / w) * s + 2} width={s - 4} height={s - 4} rx={3} fill="#9EE0B9" />)}
      <rect x={s} y={s} width={w * s} height={h * s} fill={show === 'flaeche' ? 'none' : '#CFE0FF'} fillOpacity={0.6} stroke={show === 'umfang' ? C.b : C.ink} strokeWidth={show === 'umfang' ? 5 : 3} />
      {show === 'umfang' && (
        <>
          <text x={s + (w * s) / 2} y={s - 6} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.b}>{w} cm</text>
          <text x={s + w * s + 6} y={s + (h * s) / 2 + 4} fontSize={13} fontWeight={700} fill={C.b}>{h} cm</text>
        </>
      )}
    </Svg>
  );
}

function Syllables({ parts, emoji }: { parts: string[]; emoji?: string }) {
  return (
    <div className="vis-syll">
      {emoji && <div className="vis-emoji small">{emoji}</div>}
      <div className="syll-row">
        {parts.map((p, i) => (
          <span key={i} className={`syll ${i % 2 ? 'b' : 'a'}`}>
            {i === 0 ? p[0].toUpperCase() + p.slice(1) : p}
          </span>
        ))}
      </div>
    </div>
  );
}

function Word({ word, mark }: { word: string; mark?: [number, number][] }) {
  return (
    <div className="vis-word">
      {[...word].map((ch, i) => (
        <span key={i} className={mark?.some(([a, b]) => i >= a && i < b) ? 'mark' : ''}>
          {ch}
        </span>
      ))}
    </div>
  );
}

const MARBLE: Record<string, string> = { rot: '#E5484D', blau: '#3E7BFA', grün: '#30A46C', gelb: '#F5C518' };
function Marbles({ colors }: { colors: Record<string, number> }) {
  const list = Object.entries(colors).flatMap(([c, n]) => Array.from({ length: n }, () => c));
  const per = 5;
  return (
    <Svg w={200} h={150} label="Beutel mit Kugeln" max={240}>
      <path d="M40 40 Q20 140 100 145 Q180 140 160 40 Z" fill="#E9D7B9" stroke={C.ink} strokeWidth={3} />
      <path d="M40 40 Q100 22 160 40" fill="none" stroke={C.ink} strokeWidth={3} />
      {list.map((c, i) => (
        <circle key={i} cx={62 + (i % per) * 19 + (Math.floor(i / per) % 2) * 9} cy={128 - Math.floor(i / per) * 19} r={8.5} fill={MARBLE[c]} stroke={C.ink} strokeWidth={1.2} />
      ))}
    </Svg>
  );
}

function Compare({ a, b }: { a: number; b: number }) {
  const row = (n: number, col: string, y: number) => Array.from({ length: n }, (_, i) => <circle key={i} cx={14 + (i % 10) * 15 + (i >= 5 && i < 10 ? 4 : 0) + (i % 10 >= 5 ? 4 : 0)} cy={y + Math.floor(i / 10) * 15} r={6} fill={col} />);
  return (
    <div className="vis-compare">
      <div>
        <Svg w={170} h={40} max={170}>{row(a, C.a, 12)}</Svg>
        <b>{a}</b>
      </div>
      <div>
        <Svg w={170} h={40} max={170}>{row(b, C.b, 12)}</Svg>
        <b>{b}</b>
      </div>
    </div>
  );
}

function Ruler({ cm }: { cm: number }) {
  const u = 22;
  const W = 15 * u + 20;
  return (
    <Svg w={W} h={96} label="Lineal" max={420}>
      <rect x={10} y={8} width={cm * u} height={18} rx={9} fill="#F7C548" stroke={C.ink} strokeWidth={2} />
      <path d={`M${10 + cm * u} 8 l14 9 l-14 9 z`} fill="#F2D7B0" stroke={C.ink} strokeWidth={2} />
      <rect x={10} y={8} width={14} height={18} rx={4} fill="#F497A8" stroke={C.ink} strokeWidth={2} />
      <rect x={4} y={38} width={W - 8} height={50} rx={4} fill="#FFF7DE" stroke={C.ink} strokeWidth={2} />
      {Array.from({ length: 15 * 2 + 1 }, (_, i) => (
        <line key={i} x1={10 + (i * u) / 2} y1={38} x2={10 + (i * u) / 2} y2={38 + (i % 2 ? 8 : 15)} stroke={C.ink} strokeWidth={i % 2 ? 1 : 1.6} />
      ))}
      {Array.from({ length: 16 }, (_, i) => (
        <text key={i} x={10 + i * u} y={70} fontSize={11} textAnchor="middle" fill={C.ink} fontFamily="Fredoka, sans-serif">{i}</text>
      ))}
      <text x={W - 20} y={82} fontSize={10} textAnchor="end" fill={C.ink}>cm</text>
    </Svg>
  );
}

function Prep({ pos, animal = '🐱' }: { pos: string; animal?: string }) {
  const box = { x: 70, y: 60, w: 90, h: 64 };
  const cat: Record<string, [number, number, number]> = {
    in: [115, 80, 34], on: [115, 54, 40], under: [215, 140, 0], 'next to': [195, 118, 40], behind: [132, 70, 34], 'in front of': [104, 140, 46],
  };
  const [cx, cy, size] = cat[pos] ?? [115, 54, 40];
  const under = pos === 'under';
  return (
    <Svg w={240} h={160} label={`${animal} ${pos} the box`} max={260}>
      <line x1={10} y1={148} x2={230} y2={148} stroke={C.line} strokeWidth={2} />
      {pos === 'behind' && <text x={cx} y={cy} fontSize={size} textAnchor="middle">{animal}</text>}
      {under ? (
        <>
          <rect x={box.x} y={box.y - 30} width={box.w} height={box.h} rx={4} fill="#C99A63" stroke={C.ink} strokeWidth={2.5} />
          <line x1={box.x + 6} y1={box.y + box.h - 30} x2={box.x + 6} y2={148} stroke={C.ink} strokeWidth={5} />
          <line x1={box.x + box.w - 6} y1={box.y + box.h - 30} x2={box.x + box.w - 6} y2={148} stroke={C.ink} strokeWidth={5} />
          <text x={box.x + box.w / 2} y={144} fontSize={34} textAnchor="middle">{animal}</text>
        </>
      ) : (
        <>
          {pos === 'in' && <text x={cx} y={cy} fontSize={size} textAnchor="middle">{animal}</text>}
          <path d={`M${box.x} ${box.y + 20} h${box.w} v${box.h} h-${box.w} z`} fill="#C99A63" stroke={C.ink} strokeWidth={2.5} />
          <path d={`M${box.x} ${box.y + 20} l-14 -16 h${box.w} l14 16`} fill="#DDB27E" stroke={C.ink} strokeWidth={2.5} opacity={pos === 'in' ? 0.9 : 1} />
          {pos !== 'in' && pos !== 'behind' && <text x={cx} y={cy} fontSize={size} textAnchor="middle">{animal}</text>}
        </>
      )}
    </Svg>
  );
}

function Wall({ rows }: { rows: (number | null)[][] }) {
  const bw = 64;
  const bh = 40;
  const base = rows[0].length;
  const W = base * bw + 8;
  const H = rows.length * bh + 8;
  return (
    <Svg w={W} h={H} label="Zahlenmauer" max={Math.min(380, W * 1.3)}>
      {rows.map((row, ri) =>
        row.map((v, i) => {
          const x = 4 + (ri * bw) / 2 + i * bw;
          const y = H - 4 - (ri + 1) * bh;
          return (
            <g key={`${ri}-${i}`}>
              <rect x={x + 1} y={y + 1} width={bw - 2} height={bh - 2} rx={4} fill={v === null ? '#FFE3C7' : '#F6E3D3'} stroke={C.ink} strokeWidth={2} />
              <text x={x + bw / 2} y={y + bh / 2 + 7} textAnchor="middle" fontSize={20} fontWeight={600} fill={v === null ? C.b : C.ink} fontFamily="Fredoka, sans-serif">
                {v === null ? '?' : v}
              </text>
            </g>
          );
        }),
      )}
    </Svg>
  );
}

function Net({ cells }: { cells: [number, number][] }) {
  const u = 40;
  const W = (Math.max(...cells.map((c) => c[0])) + 1) * u + 8;
  const H = (Math.max(...cells.map((c) => c[1])) + 1) * u + 8;
  return (
    <Svg w={W} h={H} label="Netz aus Quadraten" max={Math.min(300, W * 1.6)}>
      {cells.map(([x, y], i) => (
        <rect key={i} x={4 + x * u} y={4 + y * u} width={u} height={u} fill="#CFE0FF" stroke={C.ink} strokeWidth={2.5} />
      ))}
    </Svg>
  );
}

function Bars({ title, items, unit, step, top: topIn }: { title: string; items: { label: string; value: number; emoji?: string }[]; unit?: string; step?: number; top?: number }) {
  const max = Math.max(...items.map((i) => i.value));
  // ohne step: Linie bei jeder Einheit (kleine Zahlen); mit step (z. B. Prozent): nur alle step Einheiten
  const top = topIn ?? (step ? Math.ceil(max / step) * step : Math.ceil(max / 2) * 2 + 2);
  const W = 320;
  const H = 220;
  const left = 30;
  const bottom = 46;
  const bw = (W - left - 10) / items.length;
  const y = (v: number) => H - bottom - (v / top) * (H - bottom - 24);
  const COLS = [C.a, C.b, C.green, '#8E5BE8', C.red];
  return (
    <Svg w={W} h={H} label={title} max={400}>
      <text x={W / 2} y={14} textAnchor="middle" fontSize={13} fontWeight={700} fill={C.ink} fontFamily="Nunito, sans-serif">
        {title}
        {unit ? ` (${unit})` : ''}
      </text>
      {(step ? Array.from({ length: Math.floor(top / step) + 1 }, (_, k) => k * step) : Array.from({ length: top + 1 }, (_, v) => v)).map((v) => (
        <g key={v}>
          <line x1={left} x2={W - 6} y1={y(v)} y2={y(v)} stroke={v ? (!step && v % 2 ? '#F1EEF7' : '#E2DCEE') : C.ink} strokeWidth={v ? 1 : 2} />
          <text x={left - 6} y={y(v) + 4} textAnchor="end" fontSize={!step && v % 2 ? 8 : 10} fill={!step && v % 2 ? '#9A93AE' : C.ink} fontFamily="Fredoka, sans-serif">
            {v}
          </text>
        </g>
      ))}
      {items.map((it, i) => (
        <g key={it.label}>
          <rect x={left + 6 + i * bw} y={y(it.value)} width={bw - 12} height={y(0) - y(it.value)} rx={4} fill={COLS[i % COLS.length]} />
          {step && (
            <text x={left + i * bw + bw / 2} y={y(it.value) - 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.ink} fontFamily="Fredoka, sans-serif">
              {it.value}
            </text>
          )}
          {it.emoji && (
            <text x={left + i * bw + bw / 2} y={H - bottom + 20} textAnchor="middle" fontSize={16}>
              {it.emoji}
            </text>
          )}
          <text x={left + i * bw + bw / 2} y={H - bottom + (it.emoji ? 38 : 18)} textAnchor="middle" fontSize={11} fill={C.ink} fontFamily="Nunito, sans-serif">
            {it.label}
          </text>
        </g>
      ))}
    </Svg>
  );
}

export function Visual({ v }: { v: V }) {
  switch (v.kind) {
    case 'dots':
      return <TenFrames n={v.n} m={v.m} />;
    case 'tenframe':
      return <TenFrames n={v.a} m={v.b} crossOut={v.crossOut} />;
    case 'numberline':
      return <NumberLine {...v} />;
    case 'table':
      return (
        <div className="vis-table-wrap">
          {v.title && <div className="vis-text-title">{v.title}</div>}
          <table className="vis-table">
            <thead>
              <tr>
                {v.head.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {v.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((c, j) => (
                    <td key={j} className={v.mark && v.mark[0] === i && v.mark[1] === j ? 'mark' : ''}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'cubes':
      return <Cubes h={v.h} />;
    case 'grid':
      return <Grid rows={v.rows} mark={v.mark} />;
    case 'blocks':
      return <Blocks {...v} />;
    case 'placetable':
      return <PlaceTable {...v} />;
    case 'clock':
      return <Clock h={v.h} m={v.m} />;
    case 'money':
      return <Money items={v.items} />;
    case 'emoji':
      return (
        <div className="vis-emoji-wrap">
          <div className={`vis-emoji ${[...v.chars].length > 4 ? 'small' : ''}`}>{v.chars}</div>
          {v.label && <div className="vis-label">{v.label}</div>}
        </div>
      );
    case 'column':
      return <Column {...v} />;
    case 'array':
      return <ArrayDots {...v} />;
    case 'shape':
      return <Shape shape={v.shape} rot={v.rot} fill={v.fill} />;
    case 'lines':
      return <Lines a={v.a} b={v.b} right={v.right} />;
    case 'row':
      return <Row items={v.items} />;
    case 'scatter':
      return <Scatter emoji={v.emoji} pts={v.pts} />;
    case 'shapemix':
      return <ShapeMix items={v.items} />;
    case 'rect':
      return <Rect {...v} />;
    case 'syllables':
      return <Syllables {...v} />;
    case 'word':
      return <Word {...v} />;
    case 'color':
      return <div className="vis-color" style={{ background: v.hex }} aria-label="Farbe" />;
    case 'marbles':
      return <Marbles colors={v.colors} />;
    case 'compare':
      return <Compare a={v.a} b={v.b} />;
    case 'text':
      return (
        <div className="vis-text">
          {v.title && <div className="vis-text-title">{v.title}</div>}
          <div className={v.text.length > 60 ? 'reading' : 'big'}>{v.text}</div>
        </div>
      );
    case 'ruler':
      return <Ruler cm={v.cm} />;
    case 'prep':
      return <Prep pos={v.pos} animal={v.animal} />;
    case 'wall':
      return <Wall rows={v.rows} />;
    case 'bars':
      return <Bars {...v} />;
    case 'net':
      return <Net cells={v.cells} />;
  }
}
