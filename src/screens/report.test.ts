import { describe, expect, it } from 'vitest';
import { weekReport } from './Parent';
import { emptyProgress } from '../engine/learning';
import { newProfile } from '../data/store';

describe('Wochenbericht', () => {
  it('nennt den nächsten eingetragenen Test mit Vorbereitung', () => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const p = newProfile({ name: 'Mia', grade: 3, plannedTests: [{ id: 't1', subject: 'mathe', date, note: 'Kapitel 3', skills: ['m3-runden'] }] });
    const text = weekReport(p, emptyProgress());
    expect(text).toContain('Nächster Test: Mathe am');
    expect(text).toContain('(in 3 Tagen) – Kapitel 3, vorbereitet: 0 %');
  });
});
