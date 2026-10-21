// Zeitumstellung: Tage zählen nach Kalender, nicht in 24-Stunden-Schritten.
(globalThis as unknown as { process: { env: Record<string, string> } }).process.env.TZ = 'Europe/Berlin';
import { describe, expect, it } from 'vitest';
import { addDays, dayKey, emptyProgress, streakDays } from './learning';

describe('Tage über die Zeitumstellung', () => {
  it('kurz nach Mitternacht vor dem Ende der Sommerzeit: +7 Tage ist wirklich eine Woche später', () => {
    const t = new Date(2026, 9, 22, 0, 45).getTime(); // Do 22.10.2026, 0:45 (Sommerzeit endet So 25.10.)
    expect(dayKey(addDays(t, 7))).toBe('2026-10-29');
    expect(dayKey(t + 7 * 86400000)).toBe('2026-10-28'); // so war es falsch
  });
  it('Beginn der Sommerzeit: Rückwärtszählen überspringt keinen Tag', () => {
    const t = new Date(2027, 2, 30, 0, 30).getTime(); // Di 30.3.2027, 0:30 (Sommerzeit begann So 28.3.)
    const keys = Array.from({ length: 4 }, (_, i) => dayKey(addDays(t, -i)));
    expect(keys).toEqual(['2027-03-30', '2027-03-29', '2027-03-28', '2027-03-27']);
  });
  it('Serie „Tage in Folge“ zählt über die Umstellung richtig', () => {
    const p = emptyProgress();
    for (const d of ['2027-03-26', '2027-03-27', '2027-03-28', '2027-03-29', '2027-03-30']) p.days[d] = 5;
    expect(streakDays(p, new Date(2027, 2, 30, 0, 30).getTime())).toBe(5);
  });
});
