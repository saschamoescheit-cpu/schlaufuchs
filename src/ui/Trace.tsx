// Buchstaben nachspuren: grauer Buchstabe in Schulschrift auf Schreiblinien, das Kind fährt ihn mit dem Finger nach.
// Bewertung: Wie viel vom Buchstaben ist bedeckt – und wie viel wurde daneben gemalt?
import { useEffect, useRef, useState } from 'react';

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

/** oberster Punkt des Buchstabens: dort fängt man (fast immer) an */
function startPoint(letter: string): Pt {
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

  useEffect(() => {
    let alive = true;
    document.fonts?.load(FONT, letter).then(() => alive && setFontReady(true), () => alive && setFontReady(true));
    if (!document.fonts) setFontReady(true);
    return () => {
      alive = false;
    };
  }, [letter]);

  useEffect(() => setStrokes([]), [letter]);

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
    if (!reveal && !strokes.length) {
      const [sx, sy] = startPoint(letter);
      g.fillStyle = '#2FA868';
      g.beginPath();
      g.arc(sx, sy, 9, 0, Math.PI * 2);
      g.fill();
    }
    drawStrokes(g, strokes, INK, reveal ? (ok ? '#2FA868' : '#F7862A') : '#F7862A');
  }, [letter, strokes, reveal, ok, fontReady]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * S, ((e.clientY - r.top) / r.height) * S];
  };

  return (
    <div className="trace">
      <canvas
        ref={ref}
        className="trace-canvas"
        aria-label={`Buchstabe ${letter} zum Nachspuren`}
        onPointerDown={(e) => {
          if (reveal) return;
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
