import { describe, expect, it } from 'vitest';
import { isCubeNet } from './extra2';

type Cell = [number, number];
const norm = (cells: Cell[]) => {
  const variants: string[] = [];
  let cur = cells;
  for (let flip = 0; flip < 2; flip++) {
    for (let rot = 0; rot < 4; rot++) {
      cur = cur.map(([x, y]) => [y, -x] as Cell);
      const mx = Math.min(...cur.map((c) => c[0]));
      const my = Math.min(...cur.map((c) => c[1]));
      variants.push(cur.map(([x, y]) => `${x - mx},${y - my}`).sort().join(' '));
    }
    cur = cur.map(([x, y]) => [-x, y] as Cell);
  }
  return variants.sort()[0];
};

describe('Würfelnetze', () => {
  it('es gibt genau 11 Würfelnetze unter den 35 Sechs-Quadrat-Formen', () => {
    // alle Hexominos durch Wachstum erzeugen
    let shapes = new Map<string, Cell[]>([[norm([[0, 0]]), [[0, 0]]]]);
    for (let n = 2; n <= 6; n++) {
      const next = new Map<string, Cell[]>();
      for (const s of shapes.values())
        for (const [x, y] of s)
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const c: Cell = [x + dx, y + dy];
            if (s.some((q) => q[0] === c[0] && q[1] === c[1])) continue;
            const t = [...s, c];
            next.set(norm(t), t);
          }
      shapes = next;
    }
    expect(shapes.size).toBe(35);
    expect([...shapes.values()].filter(isCubeNet).length).toBe(11);
  });
  it('Beispiele', () => {
    expect(isCubeNet([[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]])).toBe(true); // Kreuz
    expect(isCubeNet([[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]])).toBe(false); // 2×3
    expect(isCubeNet([[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]])).toBe(false); // Reihe
  });
});
