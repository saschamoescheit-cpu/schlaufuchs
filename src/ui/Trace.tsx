// Buchstaben nachspuren: grauer Buchstabe in Schulschrift auf Schreiblinien, das Kind fährt ihn mit dem Finger nach.
// Bewertung: Wie viel vom Buchstaben ist bedeckt – und wie viel wurde daneben gemalt?
import { useEffect, useMemo, useRef, useState } from 'react';

const S = 300; // innere Zeichenfläche (Koordinaten unabhängig von der Bildschirmgröße)
const FONT = `400 220px Andika, 'Nunito', sans-serif`;
const BASE = 205;
const INK = 16;

type Pt = [number, number];

function glyphMask(letter: string, grow = 0): Uint8ClampedArray {
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.font = FONT;
  g.textAlign = 'center';
  g.fillText(letter, S / 2, BASE);
  if (grow) {
    g.lineWidth = grow;
    g.lineJoin = 'round';
    g.strokeText(letter, S / 2, BASE);
  }
  return g.getImageData(0, 0, S, S).data;
}

function inkMask(strokes: Pt[][], width: number): Uint8ClampedArray {
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  drawStrokes(g, strokes, width, '#000');
  return g.getImageData(0, 0, S, S).data;
}

function drawStrokes(g: CanvasRenderingContext2D, strokes: Pt[][], width: number, color: string) {
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = width;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const st of strokes) {
    if (st.length === 1) {
      g.beginPath();
      g.arc(st[0][0], st[0][1], width / 2, 0, Math.PI * 2);
      g.fill();
      continue;
    }
    g.beginPath();
    g.moveTo(st[0][0], st[0][1]);
    for (const p of st.slice(1)) g.lineTo(p[0], p[1]);
    g.stroke();
  }
}

/** Anteil des Buchstabens, der bedeckt ist, und Anteil der Striche, die auf dem Buchstaben liegen */
export function traceScore(letter: string, strokes: Pt[][]): { cover: number; inside: number } {
  if (!strokes.length) return { cover: 0, inside: 0 };
  const glyph = glyphMask(letter);
  const glyphWide = glyphMask(letter, 26);
  const wide = inkMask(strokes, 30);
  const thin = inkMask(strokes, 4);
  let g = 0, gc = 0, t = 0, ti = 0;
  for (let i = 3; i < glyph.length; i += 4 * 3) {
    if (glyph[i] > 128) {
      g++;
      if (wide[i] > 128) gc++;
    }
    if (thin[i] > 128) {
      t++;
      if (glyphWide[i] > 128) ti++;
    }
  }
  return { cover: g ? gc / g : 0, inside: t ? ti / t : 0 };
}

export const tracePassed = (s: { cover: number; inside: number }) => s.cover >= 0.7 && s.inside >= 0.75;

// Schreibrichtung der Großbuchstaben (Druckschrift): Striche in Reihenfolge, Punkte relativ zum Buchstaben (0..1, oben links = 0,0)
type Rel = [number, number][];
const DEMO: Record<string, Rel[]> = {
  A: [[[0.5, 0], [0, 1]], [[0.5, 0], [1, 1]], [[0.2, 0.68], [0.8, 0.68]]],
  B: [[[0, 0], [0, 1]], [[0, 0], [0.6, 0], [0.85, 0.1], [0.85, 0.38], [0.6, 0.48], [0, 0.48]], [[0, 0.48], [0.65, 0.48], [0.97, 0.62], [0.97, 0.88], [0.65, 1], [0, 1]]],
  D: [[[0, 0], [0, 1]], [[0, 0], [0.5, 0], [0.88, 0.18], [1, 0.5], [0.88, 0.82], [0.5, 1], [0, 1]]],
  E: [[[0, 0], [0, 1]], [[0, 0], [1, 0]], [[0, 0.5], [0.85, 0.5]], [[0, 1], [1, 1]]],
  F: [[[0, 0], [0, 1]], [[0, 0], [1, 0]], [[0, 0.5], [0.85, 0.5]]],
  G: [[[0.95, 0.14], [0.7, 0], [0.35, 0], [0.08, 0.2], [0, 0.5], [0.08, 0.8], [0.35, 1], [0.7, 1], [1, 0.85], [1, 0.55], [0.6, 0.55]]],
  H: [[[0, 0], [0, 1]], [[1, 0], [1, 1]], [[0, 0.5], [1, 0.5]]],
  I: [[[0.5, 0], [0.5, 1]]],
  J: [[[0.8, 0], [0.8, 0.75], [0.6, 1], [0.3, 1], [0.05, 0.85]]],
  K: [[[0, 0], [0, 1]], [[1, 0], [0, 0.55]], [[0.3, 0.4], [1, 1]]],
  L: [[[0, 0], [0, 1], [1, 1]]],
  M: [[[0, 1], [0, 0], [0.5, 0.75], [1, 0], [1, 1]]],
  N: [[[0, 1], [0, 0], [1, 1], [1, 0]]],
  O: [[[0.5, 0], [0.15, 0.12], [0, 0.5], [0.15, 0.88], [0.5, 1], [0.85, 0.88], [1, 0.5], [0.85, 0.12], [0.5, 0]]],
  P: [[[0, 0], [0, 1]], [[0, 0], [0.6, 0], [0.95, 0.15], [0.95, 0.4], [0.6, 0.55], [0, 0.55]]],
  R: [[[0, 0], [0, 1]], [[0, 0], [0.6, 0], [0.95, 0.15], [0.95, 0.4], [0.6, 0.55], [0, 0.55]], [[0.45, 0.55], [1, 1]]],
  S: [[[0.95, 0.12], [0.7, 0], [0.3, 0], [0.05, 0.15], [0.05, 0.35], [0.3, 0.48], [0.7, 0.52], [0.95, 0.65], [0.95, 0.85], [0.7, 1], [0.3, 1], [0.05, 0.88]]],
  T: [[[0.5, 0], [0.5, 1]], [[0, 0], [1, 0]]],
  U: [[[0, 0], [0, 0.7], [0.2, 0.95], [0.5, 1], [0.8, 0.95], [1, 0.7], [1, 0]]],
  W: [[[0, 0], [0.25, 1], [0.5, 0], [0.75, 1], [1, 0]]],
  Z: [[[0, 0], [1, 0], [0, 1], [1, 1]]],
};

/** Striche der Schreibrichtung in Zeichenflächen-Koordinaten (an den echten Umriss des Buchstabens angepasst) */
export function demoStrokes(letter: string): Pt[][] | null {
  const rel = DEMO[letter];
  if (!rel) return null;
  const m = glyphMask(letter);
  let x0 = S, x1 = 0, y0 = S, y1 = 0;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++)
      if (m[(y * S + x) * 4 + 3] > 128) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 <= x0) return null;
  const inset = 12; // halbe Strichbreite: die Linie läuft in der Mitte des Strichs
  const W = Math.max(0, x1 - x0 - 2 * inset), H = Math.max(0, y1 - y0 - 2 * inset);
  return rel.map((st) => st.map(([u, v]) => [x0 + inset + u * W, y0 + inset + v * H] as Pt));
}

const DEMO_SPEED = 170; // Punkte je Sekunde
const DEMO_PAUSE = 0.4; // Pause zwischen zwei Strichen (s)

/** Schreibrichtung bis zum Zeitpunkt t: fertige Striche, angefangener Strich und Position des Stifts */
function demoAt(strokes: Pt[][], t: number): { parts: Pt[][]; pen: Pt | null; finished: boolean } {
  const parts: Pt[][] = [];
  let left = t;
  for (const st of strokes) {
    const part: Pt[] = [st[0]];
    parts.push(part);
    for (let i = 1; i < st.length; i++) {
      const [ax, ay] = st[i - 1], [bx, by] = st[i];
      const d = Math.hypot(bx - ax, by - ay) / DEMO_SPEED;
      if (left >= d) {
        part.push(st[i]);
        left -= d;
      } else {
        const k = d ? left / d : 1;
        const pen: Pt = [ax + (bx - ax) * k, ay + (by - ay) * k];
        part.push(pen);
        return { parts, pen, finished: false };
      }
    }
    if (left < DEMO_PAUSE) return { parts, pen: st[st.length - 1], finished: false };
    left -= DEMO_PAUSE;
  }
  return { parts, pen: null, finished: true };
}

/** Startpunkt: Anfang des ersten Strichs – sonst der oberste Punkt des Buchstabens */
function startPoint(letter: string): Pt {
  const demo = demoStrokes(letter);
  if (demo) return demo[0][0];
  const m = glyphMask(letter);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++)
      if (m[(y * S + x) * 4 + 3] > 128) {
        // Mitte des obersten Strichs
        let x2 = x;
        while (x2 < S && m[(y * S + x2) * 4 + 3] > 128) x2++;
        return [(x + x2) / 2, y + 8];
      }
  return [S / 2, 60];
}

export function TraceInput({ letter, onDone, reveal, ok }: { letter: string; onDone: (v: string) => void; reveal?: boolean; ok?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Pt[][]>([]);
  const drawing = useRef<Pt[] | null>(null);
  const [fontReady, setFontReady] = useState(false);
  // „Zeig's mir“: Zeit seit Start der Vorführung (s), null = aus
  const [demoT, setDemoT] = useState<number | null>(null);
  const [demoRun, setDemoRun] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const demo = useMemo(() => (fontReady ? demoStrokes(letter) : null), [letter, fontReady]);

  useEffect(() => {
    if (!demoRun || !demo) return;
    const start = performance.now();
    let id = requestAnimationFrame(function tick(now) {
      const t = (now - start) / 1000;
      setDemoT(t);
      if (!demoAt(demo, t).finished) id = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [demoRun, demo]);

  useEffect(() => {
    let alive = true;
    document.fonts?.load(FONT, letter).then(() => alive && setFontReady(true), () => alive && setFontReady(true));
    if (!document.fonts) setFontReady(true);
    return () => {
      alive = false;
    };
  }, [letter]);

  useEffect(() => {
    setStrokes([]);
    setDemoT(null);
    setDemoRun(0);
  }, [letter]);

  // Zeichnen
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    c.width = S * dpr;
    c.height = S * dpr;
    const g = c.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, S, S);
    g.font = FONT;
    g.textAlign = 'center';
    // Schreiblinien: Oberlinie, Mittellinie (gestrichelt), Grundlinie, Unterlinie
    const cap = g.measureText('H').actualBoundingBoxAscent || 150;
    const xh = g.measureText('x').actualBoundingBoxAscent || 100;
    const desc = g.measureText('g').actualBoundingBoxDescent || 55;
    g.strokeStyle = '#C9D7F2';
    g.lineWidth = 2;
    for (const [y, dash] of [[BASE - cap, false], [BASE - xh, true], [BASE, false], [BASE + desc, false]] as [number, boolean][]) {
      g.setLineDash(dash ? [8, 8] : []);
      g.beginPath();
      g.moveTo(10, y);
      g.lineTo(S - 10, y);
      g.stroke();
    }
    g.setLineDash([]);
    g.fillStyle = reveal ? (ok ? '#BFEBD1' : '#FFD4D1') : '#E6E2EE';
    g.fillText(letter, S / 2, BASE);
    if (!reveal && !strokes.length && demoT === null) {
      const [sx, sy] = startPoint(letter);
      g.fillStyle = '#2FA868';
      g.beginPath();
      g.arc(sx, sy, 9, 0, Math.PI * 2);
      g.fill();
    }
    if (demo && demoT !== null && !reveal) {
      const { parts, pen } = demoAt(demo, demoT);
      g.globalAlpha = 0.85;
      drawStrokes(g, parts, 9, '#3D7BF7');
      g.globalAlpha = 1;
      // Nummern an den Strich-Anfängen: in dieser Reihenfolge schreiben
      parts.forEach((st, i) => {
        if (demo.length < 2) return;
        g.fillStyle = '#3D7BF7';
        g.beginPath();
        g.arc(st[0][0], st[0][1], 11, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#fff';
        g.font = "700 14px Nunito, sans-serif";
        g.textAlign = 'center';
        g.fillText(String(i + 1), st[0][0], st[0][1] + 5);
      });
      if (pen) {
        g.fillStyle = '#2FA868';
        g.strokeStyle = '#fff';
        g.lineWidth = 3;
        g.beginPath();
        g.arc(pen[0], pen[1], 12, 0, Math.PI * 2);
        g.fill();
        g.stroke();
      }
    }
    drawStrokes(g, strokes, INK, reveal ? (ok ? '#2FA868' : '#F7862A') : '#F7862A');
  }, [letter, strokes, reveal, ok, fontReady, demo, demoT]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * S, ((e.clientY - r.top) / r.height) * S];
  };

  return (
    <div className="trace">
      <div className="trace-wrap">
      <canvas
        ref={ref}
        className="trace-canvas"
        aria-label={`Buchstabe ${letter} zum Nachspuren`}
        onPointerDown={(e) => {
          if (reveal) return;
          setDemoT(null);
          setDemoRun(0);
          e.currentTarget.setPointerCapture(e.pointerId);
          // Strich lokal festhalten: der Updater läuft erst später, dann kann drawing.current schon null sein
          const st: Pt[] = [pos(e)];
          drawing.current = st;
          setStrokes((s) => [...s, st]);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const p = pos(e);
          const last = drawing.current[drawing.current.length - 1];
          if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 2) return;
          drawing.current.push(p);
          const copy = [...drawing.current];
          setStrokes((s) => [...s.slice(0, -1), copy]);
        }}
        onPointerUp={() => (drawing.current = null)}
        onPointerCancel={() => (drawing.current = null)}
      />
      {demo && !reveal && (
        <button className="trace-play" aria-label={`Zeig mir, wie man ${letter} schreibt`} onClick={() => {
          setDemoT(0);
          setDemoRun((n) => n + 1);
        }}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="#fff" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      )}
      </div>
      {!reveal && (
        <div className="row trace-btns">
          <button className="btn ghost" disabled={!strokes.length} onClick={() => setStrokes([])}>
            Nochmal
          </button>
          <button
            className="btn ok grow"
            disabled={!strokes.length}
            onClick={() => onDone(tracePassed(traceScore(letter, strokes)) ? 'ok' : 'daneben')}
          >
            Fertig
          </button>
        </div>
      )}
    </div>
  );
}
