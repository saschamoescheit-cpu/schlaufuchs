import { describe, expect, it } from 'vitest';
import { zahlwort, zahlwortTeile } from './extra3';

describe('Zahlwörter (m3-zahlwoerter)', () => {
  it('Beispiele', () => {
    expect(zahlwort(354)).toBe('dreihundertvierundfünfzig');
    expect(zahlwortTeile(354)).toBe('drei-hundert-vier-und-fünfzig');
    expect(zahlwortTeile(240)).toBe('zwei-hundert-vierzig');
    expect(zahlwortTeile(111)).toBe('ein-hundert-elf');
    expect(zahlwortTeile(101)).toBe('ein-hundert-eins');
    expect(zahlwortTeile(21)).toBe('ein-und-zwanzig');
    expect(zahlwortTeile(700)).toBe('sieben-hundert');
  });
  it('die Sprechteile ergeben zusammen immer genau das Zahlwort (1 bis 999)', () => {
    for (let n = 1; n <= 999; n++) expect(zahlwortTeile(n).replace(/-/g, ''), String(n)).toBe(zahlwort(n));
  });
});
