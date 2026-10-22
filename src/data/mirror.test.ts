import { describe, expect, it } from 'vitest';
import { choose } from './mirror';

describe('Zweitspeicher: welcher Stand gilt beim Start', () => {
  it('ohne Kopie: der normale Speicher', () => expect(choose({ has: true, at: 5 }, null)).toBe('local'));
  it('normaler Speicher leer: die Kopie', () => expect(choose({ has: false, at: 0 }, { json: '{}', at: 1 })).toBe('mirror'));
  it('Kopie neuer (Speicher war voll): die Kopie', () => expect(choose({ has: true, at: 10_000 }, { json: '{}', at: 20_000 })).toBe('mirror'));
  it('gleich alt oder älter: der normale Speicher', () => {
    expect(choose({ has: true, at: 10_000 }, { json: '{}', at: 10_500 })).toBe('local');
    expect(choose({ has: true, at: 10_000 }, { json: '{}', at: 5_000 })).toBe('local');
  });
});
