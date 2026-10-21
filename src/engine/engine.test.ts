import { describe, expect, it } from 'vitest';
import { check } from './check';
import { gradeFor } from './grading';
import { dueReviews, emptyProgress, level, patterns, record, REVIEW_GAP_MS, weaknesses } from './learning';
import { buildMix, buildPractice, buildReview, buildTest } from './session';
import { skillById } from '../content/curriculum';
import { mulberry32 } from './rng';
import type { Task } from './types';

const task = (key: string, value = 5, skillId = 'm1-plus10'): Task => ({ key, skillId, prompt: `${key}`, answer: { type: 'number', value }, solution: ['x'], tags: ['plus'] });

describe('Fehler-Kiste', () => {
  it('falsche Aufgabe kommt rein und bleibt, bis sie zweimal hintereinander richtig ist', () => {
    const p = emptyProgress();
    const t0 = 1_000_000;
    record(p, task('a'), false, 'übung', t0);
    expect(p.review).toHaveLength(1);
    expect(dueReviews(p, t0)).toHaveLength(1);
    record(p, task('a'), true, 'übung', t0 + 1000);
    expect(p.review).toHaveLength(1);
    expect(dueReviews(p, t0 + 2000)).toHaveLength(0); // wartet bis zur Kontrolle
    expect(dueReviews(p, t0 + 1000 + REVIEW_GAP_MS)).toHaveLength(1);
    record(p, task('a'), false, 'übung', t0 + REVIEW_GAP_MS * 2); // wieder falsch → Serie von vorn
    expect(p.review[0].streak).toBe(0);
    record(p, task('a'), true, 'übung', t0 + REVIEW_GAP_MS * 3);
    const r = record(p, task('a'), true, 'übung', t0 + REVIEW_GAP_MS * 4);
    expect(r.reviewSolved).toBe(true);
    expect(p.review).toHaveLength(0);
    expect(p.solved).toBe(1);
  });
});

describe('Lernstand', () => {
  it('Stufen Neu → Angefangen → Geübt → Sicher', () => {
    const p = emptyProgress();
    expect(level(p, 'm1-plus10')).toBe(0);
    record(p, task('a'), true, 'übung', 1);
    expect(level(p, 'm1-plus10')).toBe(1);
    for (let i = 0; i < 4; i++) record(p, task(`b${i}`), true, 'übung', 2 + i);
    expect(level(p, 'm1-plus10')).toBe(2);
    for (let i = 0; i < 4; i++) record(p, task(`c${i}`), true, 'übung', 10 + i);
    expect(level(p, 'm1-plus10')).toBe(3);
  });
  it('offene Fehler-Aufgabe verhindert „Sicher“', () => {
    const p = emptyProgress();
    record(p, task('x'), false, 'übung', 1);
    for (let i = 0; i < 11; i++) record(p, task(`ok${i}`), true, 'übung', 2 + i);
    expect(level(p, 'm1-plus10')).toBe(2);
  });
  it('erkennt Schwächen und Fehlermuster', () => {
    const p = emptyProgress();
    const s = skillById('m1-plus20')!;
    for (let i = 0; i < 6; i++) record(p, { ...task(`z${i}`, 13, s.id), tags: ['zehnerübergang'] }, false, 'übung', i, 'übertrag-vergessen');
    for (let i = 0; i < 4; i++) record(p, { ...task(`o${i}`, 13, s.id), tags: ['ohne-übergang'] }, true, 'übung', 10 + i);
    const w = weaknesses(p, [s, skillById('m1-plus10')!]);
    expect(w[0].skill.id).toBe('m1-plus20');
    const pat = patterns(p, [s]);
    expect(pat.map((x) => x.tag)).toContain('zehnerübergang');
    expect(pat.map((x) => x.tag)).toContain('übertrag-vergessen');
  });
});

describe('Runden', () => {
  it('Übung mischt fällige Fehler-Aufgaben ein', () => {
    const p = emptyProgress();
    const s = skillById('m1-plus10')!;
    record(p, task('alt'), false, 'übung', 1);
    const tasks = buildPractice(s, p, 2, 7);
    expect(tasks).toHaveLength(10);
    expect(tasks.some((t) => t.key === 'alt')).toBe(true);
  });
  it('Mix und Fehler-Training liefern Aufgaben', () => {
    const p = emptyProgress();
    const skills = [skillById('m1-plus10')!, skillById('m1-minus10')!];
    expect(buildMix(skills, p, 1, 3)).toHaveLength(10);
    record(p, task('alt'), false, 'übung', 1);
    expect(buildReview(skills, p, 2, 3).some((t) => t.key === 'alt')).toBe(true);
  });
  it('Test: Anzahl und Zeit nach Tempo', () => {
    const skills = [skillById('m3-schriftlich-plus')!, skillById('m3-runden')!];
    const a = buildTest(skills, 10, 'schule', 1);
    const b = buildTest(skills, 10, 'entspannt', 1);
    expect(a.tasks).toHaveLength(10);
    expect(b.limit).toBeGreaterThan(a.limit);
    expect(a.limit % 60).toBe(0);
  });
});

describe('Noten und Prüfen', () => {
  it('Notenschlüssel', () => {
    expect(gradeFor(100)).toBe(1);
    expect(gradeFor(95)).toBe(1);
    expect(gradeFor(94)).toBe(2);
    expect(gradeFor(65)).toBe(3);
    expect(gradeFor(50)).toBe(4);
    expect(gradeFor(25)).toBe(5);
    expect(gradeFor(24)).toBe(6);
  });
  it('Zahlen mit Punkten/Leerzeichen, Text ohne Groß-/Kleinschreibung, Fallen', () => {
    expect(check(task('n', 12500), '12.500').ok).toBe(true);
    expect(check(task('n', 12500), '12 500').ok).toBe(true);
    const t: Task = { key: 't', skillId: 'e1-animals', prompt: '', answer: { type: 'text', value: 'dog' }, solution: [] };
    expect(check(t, ' Dog ').ok).toBe(true);
    const trap: Task = { ...task('f', 13), traps: [{ answer: '3', tag: 'übertrag-vergessen', hint: 'h' }] };
    expect(check(trap, '3').trap?.tag).toBe('übertrag-vergessen');
  });
});

describe('Stufen (leicht – mittel – schwer)', () => {
  const st = (key: string, stage: 1 | 2 | 3): Task => ({ ...task(key), stage });
  it('steigt nach 4 von 5 richtig, fällt bei vielen Fehlern', () => {
    const p = emptyProgress();
    const res = [true, false, true, true, true].map((ok, i) => record(p, st(`a${i}`, 1), ok, 'übung', i + 1).stageChange);
    expect(res[4]).toBe('up');
    expect(p.skills['m1-plus10'].stage).toBe(2);
    // Aufgaben der alten Stufe zählen nicht mehr
    expect(record(p, st('alt', 1), false, 'übung', 10).stageChange).toBeUndefined();
    const down = [false, false, true, false].map((ok, i) => record(p, st(`b${i}`, 2), ok, 'übung', 20 + i).stageChange);
    expect(down[3]).toBe('down');
    expect(p.skills['m1-plus10'].stage).toBe(1);
  });
  it('Tests verändern die Stufe nicht', () => {
    const p = emptyProgress();
    for (let i = 0; i < 6; i++) record(p, st(`t${i}`, 1), true, 'test', i);
    expect(p.skills['m1-plus10'].stage).toBeUndefined();
  });
  it('Stufe 1 hat eine Antwort weniger', () => {
    const s = skillById('m1-formen')!;
    const r = mulberry32(3);
    for (let i = 0; i < 20; i++) {
      const t = s.generate(r, 1);
      if (t.answer.type === 'choice') expect(t.answer.options.length).toBe(3);
    }
  });
});
