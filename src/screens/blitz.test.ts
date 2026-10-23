import { describe, expect, it } from 'vitest';
import { ALL_SKILLS, skillById } from '../content/curriculum';
import { blitzable } from './Blitz';

// Blitzrunde: Die Themenauswahl hängt nicht vom Zufall ab (Themen flackerten sonst rein und raus)
describe('Blitzrunde-Themen', () => {
  it('Kopfrechnen ja, Diktat nein', () => {
    expect(blitzable(skillById('m2-einmaleins')!)).toBe(true);
    expect(blitzable(skillById('m1-plus10')!)).toBe(true);
    expect(blitzable(skillById('d2-diktat')!)).toBe(false);
  });
  it('gleiches Ergebnis bei jedem Aufruf', () => {
    const a = ALL_SKILLS.map(blitzable);
    for (let i = 0; i < 3; i++) expect(ALL_SKILLS.map(blitzable)).toEqual(a);
  });
});
