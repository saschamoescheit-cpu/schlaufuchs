import { describe, expect, it } from 'vitest';
import { align, analyze, wordPatterns } from './spelling';
import { spellFeatures } from '../content/diktat';

describe('Rechtschreib-Fehlermuster', () => {
  const cases: [string, string, string][] = [
    ['Biene', 'Bine', 'ie'],
    ['Tiger', 'Tieger', 'i-statt-ie'],
    ['Zucker', 'Zuker', 'ck'],
    ['Katze', 'Kaze', 'tz'],
    ['Katze', 'katze', 'gross-klein'],
    ['spielen', 'Spielen', 'gross-klein'],
    ['Sonne', 'Sone', 'doppel'],
    ['Zahl', 'Zal', 'dehnungs-h'],
    ['Name', 'Nahme', 'h-zu-viel'],
    ['Hund', 'Hunt', 'auslaut'],
    ['Berg', 'Berk', 'auslaut'],
    ['Hände', 'Hende', 'ae-e'],
    ['Bäume', 'Beume', 'aeu-eu'],
    ['Straße', 'Strasse', 'ss-sz'],
    ['Vogel', 'Fogel', 'v-f'],
    ['Apfel', 'Afel', 'pf'],
    ['Spiel', 'Schpiel', 'sp-st'],
  ];
  for (const [c, g, tag] of cases) it(`${g} statt ${c} → ${tag}`, () => expect(wordPatterns(c, g)).toContain(tag));

  it('zwei Fehler auf einmal', () => {
    const t = wordPatterns('Biene', 'bine');
    expect(t).toContain('ie');
    expect(t).toContain('gross-klein');
  });
  it('unbekannter Fehler → sonstige', () => expect(wordPatterns('Fenster', 'Fnstr')).toEqual(['sonstige']));
  it('Satz: Komma und Wortfehler', () => {
    const a = analyze('Ich weiß, dass du kommst.', 'Ich weiss dass du kommst');
    expect(a.tags).toContain('ss-sz');
    expect(a.tags).toContain('komma');
  });
  it('Satz: fehlendes Wort', () => expect(analyze('Wir gehen heute in den Zoo.', 'Wir gehen in den Zoo.').tags).toContain('wort-fehlt'));
  it('Buchstaben-Abgleich', () => {
    const s = align('Biene', 'Bine');
    expect(s.filter((x) => x.t === 'del').map((x) => x.c)).toEqual(['e']);
    expect(s.filter((x) => x.t === 'ok').length).toBe(4);
  });
  it('Merkmale eines Wortes', () => {
    expect(spellFeatures('Zucker')).toContain('ck');
    expect(spellFeatures('Biene')).toContain('ie');
    expect(spellFeatures('Hund')).toContain('auslaut');
    expect(spellFeatures('Mama', false)).toEqual([]);
  });
});
