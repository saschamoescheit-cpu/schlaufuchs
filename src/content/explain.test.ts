import { describe, expect, it } from 'vitest';
import { ALL_SKILLS } from './curriculum';

// Projektregel: zu jedem Erklärtext gehört ein Bild
describe('Erklärungen', () => {
  it('jedes Thema hat ein Erklärbild', () => {
    expect(ALL_SKILLS.filter((s) => !s.explain.visual).map((s) => s.id)).toEqual([]);
  });
});
