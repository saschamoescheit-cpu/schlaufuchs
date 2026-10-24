import { describe, expect, it, vi } from 'vitest';
import { emptyProgress, type Attempt, type Progress } from '../engine/learning';
import type { AppData, Profile } from './store';

// curriculum nicht laden (langsam) – rescue.ts braucht nur die reine Auswahl
vi.mock('./store', () => ({ getData: () => null, update: () => undefined }));
const { pickRescues, hasMore } = await import('./rescue');
const { mergeRescue } = await import('./merge');

// 24.10.2026: Leanas Lernstand war weg – eine aufgehobene Kopie muss gefunden und verlustfrei zurückgeholt werden
const kid = (id: string, name: string): Profile => ({ id, name, avatar: '🦊', age: 8, grade: 3, state: 'NW', englishFrom: 3, gradesFrom: 3, gradeKey: [92, 81, 67, 50, 30], autoRead: false, sound: true, pace: 'schule', created: 1 });
const att = (t: number): Attempt => ({ t, s: 'm3-plus', ok: 1, m: 'übung' });
const prog = (solved: number, from = 0): Progress => ({ ...emptyProgress(), solved, stars: solved, log: Array.from({ length: solved }, (_, i) => att(from + i)) });
const data = (profiles: Profile[], progress: Record<string, Progress>): AppData => ({ schema: 1, profiles, progress, activeId: profiles[0]?.id ?? null, parent: { pin: null } });

describe('Lernstand-Rettung', () => {
  it('findet die Kopie mit dem meisten Inhalt, wenn das Kind fehlt', () => {
    const d = data([], {});
    const r = pickRescues(d, [
      { profile: kid('leana', 'Leana'), progress: prog(40), source: 'Abgleich' },
      { profile: kid('leana', 'Leana'), progress: prog(120), source: 'Speicher' },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].progress.solved).toBe(120);
    expect(r[0].into).toBeNull();
  });

  it('Kind neu angelegt (andere Id, gleicher Name): Kopie wird diesem Kind zugeordnet', () => {
    const d = data([kid('neu1', 'leana ')], { neu1: prog(3, 1000) });
    const r = pickRescues(d, [{ profile: kid('leana', 'Leana'), progress: prog(120), source: 'Abgleich' }]);
    expect(r[0].into).toBe('neu1');
  });

  it('bietet nichts an, wenn der Stand jetzt schon alles hat – oder wenn „Nicht nötig“ gewählt wurde', () => {
    const d = data([kid('leana', 'Leana')], { leana: prog(120) });
    expect(pickRescues(d, [{ profile: kid('leana', 'Leana'), progress: prog(120), source: 'Speicher' }])).toEqual([]);
    const d2 = data([kid('leana', 'Leana')], { leana: prog(5) });
    const [r] = pickRescues(d2, [{ profile: kid('leana', 'Leana'), progress: prog(120), source: 'Speicher' }]);
    expect(pickRescues(d2, [{ profile: kid('leana', 'Leana'), progress: prog(120), source: 'Speicher' }], [r.sig])).toEqual([]);
    expect(hasMore(emptyProgress(), undefined)).toBe(false);
  });

  it('zurückholen zählt nichts doppelt und verliert nichts von heute', () => {
    const old = prog(120);
    const now = { ...prog(122), log: [...prog(120).log, att(5000), att(5001)] };
    const m = mergeRescue(now, old);
    expect(m.solved).toBe(122);
    expect(m.stars).toBe(122);
    expect(m.log).toHaveLength(122);
    const fresh = prog(2, 9000);
    const m2 = mergeRescue(fresh, old);
    expect(m2.log).toHaveLength(122);
    expect(m2.solved).toBe(120);
  });
});
