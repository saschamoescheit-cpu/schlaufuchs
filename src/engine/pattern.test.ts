import { describe, expect, it } from 'vitest';
import { skillById } from '../content/curriculum';
import { buildPattern } from './session';
import { emptyProgress } from './learning';

const fits = (tag: string) => (t: { tags?: string[]; traps?: { tag: string }[] }) => !!t.tags?.includes(tag) || !!t.traps?.some((x) => x.tag === tag);

describe('Fehlermuster gezielt üben', () => {
  it('schriftliche Addition „Übertrag vergessen“: nur Aufgaben mit Übertrag', () => {
    const tasks = buildPattern(skillById('m3-schriftlich-plus')!, 'übertrag-vergessen', emptyProgress(), 0, 11);
    expect(tasks).toHaveLength(10);
    expect(tasks.every(fits('übertrag-vergessen'))).toBe(true);
  });
  it('ie oder i: nur Wörter mit ie', () => {
    const tasks = buildPattern(skillById('d2-ie')!, 'ie', emptyProgress(), 0, 12);
    expect(tasks.filter(fits('ie')).length).toBeGreaterThanOrEqual(8);
  });
  it('unbekanntes Muster: trotzdem eine volle Runde', () => {
    expect(buildPattern(skillById('m2-einmaleins')!, 'gibt-es-nicht', emptyProgress(), 0, 13)).toHaveLength(10);
  });
});
