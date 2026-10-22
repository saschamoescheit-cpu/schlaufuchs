import { describe, expect, it } from 'vitest';
import { ALL_SKILLS } from './curriculum';
import { VIDEOS } from './videos';

// „Mehr erklären (mit Video)“ soll bei jedem Thema ein geprüftes Video zeigen
describe('Erklärvideos', () => {
  it('jedes Thema hat mindestens ein Video', () => {
    const v = VIDEOS as Record<string, { id: string }[]>;
    expect(ALL_SKILLS.filter((s) => !v[s.id]?.length).map((s) => s.id)).toEqual([]);
  });
  it('Video-IDs sehen wie YouTube-IDs aus', () => {
    for (const list of Object.values(VIDEOS as Record<string, { id: string }[]>)) for (const x of list) expect(x.id).toMatch(/^[\w-]{11}$/);
  });
});
