import { describe, expect, it } from 'vitest';
import { boxCounts, cardStates, nextDue, pickCards } from './cards';
import type { Attempt } from './learning';

const H = 60 * 60 * 1000;
const D = 24 * H;
const a = (t: number, ok: 0 | 1, w = 'dog', m: Attempt['m'] = 'karten'): Attempt => ({ t, s: 'e1-animals', ok, m, w });

describe('Vokabelkarten', () => {
  it('rückt nur fällige Karten ein Fach weiter', () => {
    const s = cardStates([a(0, 1), a(1000, 1), a(2000, 1)]).get('e1-animals|dog')!;
    expect(s.box).toBe(1);
    expect(s.seen).toBe(3);
    const s2 = cardStates([a(0, 1), a(D, 1), a(D + 3 * D, 1)]).get('e1-animals|dog')!;
    expect(s2.box).toBe(3);
  });
  it('nicht gewusst: gleich wieder dran, danach wieder Fach 1', () => {
    const st = cardStates([a(0, 1), a(D, 1), a(5 * D, 0)]);
    const s = st.get('e1-animals|dog')!;
    expect(s.box).toBe(0);
    expect(s.due).toBe(5 * D);
    expect(boxCounts([{ skillId: 'e1-animals', en: 'dog' }], st)).toEqual([0, 1, 0, 0, 0, 0]);
    const s2 = cardStates([a(0, 1), a(D, 1), a(5 * D, 0), a(5 * D + 1000, 1)]).get('e1-animals|dog')!;
    expect(s2.box).toBe(1);
  });
  it('Tests zählen nicht, Aufgaben ohne Wort auch nicht', () => {
    const st = cardStates([a(0, 0, 'dog', 'test'), { t: 1, s: 'e1-animals', ok: 1, m: 'übung' }]);
    expect(st.size).toBe(0);
  });
  it('wählt zuerst fällige, dann neue Karten', () => {
    const all = ['dog', 'cat', 'pig'].map((en) => ({ skillId: 'e1-animals', en }));
    const st = cardStates([a(0, 1, 'cat'), a(0, 0, 'pig')]);
    const { cards, due, fresh } = pickCards(all, st, 10, 2 * H);
    expect(due.map((c) => c.en)).toEqual(['pig']);
    expect(fresh.map((c) => c.en)).toEqual(['dog']);
    expect(cards.map((c) => c.en)).toEqual(['pig', 'dog']);
    expect(nextDue(all, st, 2 * H)).toBe(D - 6 * H);
  });
});
