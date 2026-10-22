import { describe, expect, it } from 'vitest';
import { directionTip } from './Trace';

// Demo: ein senkrechter Strich von oben (100,50) nach unten (100,200)
const demo: [number, number][][] = [[[100, 50], [100, 200]]];
const line = (x1: number, y1: number, x2: number, y2: number): [number, number][] =>
  Array.from({ length: 12 }, (_, i) => [x1 + ((x2 - x1) * i) / 11, y1 + ((y2 - y1) * i) / 11]);

describe('Schreibrichtungs-Tipp beim Nachspuren', () => {
  it('kein Tipp, wenn am Startpunkt in Pfeilrichtung begonnen wird', () => {
    expect(directionTip(demo, [line(102, 55, 101, 200)])).toBe('');
  });
  it('Tipp, wenn weit weg vom grünen Punkt begonnen wird', () => {
    expect(directionTip(demo, [line(100, 200, 100, 50)])).toMatch(/grünen Punkt/);
  });
  it('Tipp, wenn der erste Strich andersherum gezogen wird', () => {
    expect(directionTip(demo, [line(100, 90, 100, 52), line(100, 90, 100, 200)])).toMatch(/andersherum/);
  });
  it('ohne Vorführung kein Tipp', () => {
    expect(directionTip(null, [line(0, 0, 10, 10)])).toBe('');
  });
});
