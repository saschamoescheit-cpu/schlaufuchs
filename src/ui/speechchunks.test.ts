import { describe, expect, it } from 'vitest';
import { cloudChunks, speakable } from './speech';
import { ALL_SKILLS } from '../content/curriculum';

// Erklärungen sind oft länger als die 400 Zeichen der Cloud-Stimme: sie werden an Satzenden in Stücke geteilt.
describe('Cloud-Stimme: lange Texte teilen', () => {
  it('kurze Texte bleiben ein Stück', () => {
    expect(cloudChunks('Hallo Mia.', 'de')).toEqual(['Hallo Mia.']);
  });
  it('alle Erklärungen passen in Stücke ≤ 380 Zeichen, nichts geht verloren', () => {
    for (const s of ALL_SKILLS) {
      const text = `${s.title}. ${s.explain.text.join(' ')}`;
      const chunks = cloudChunks(text, 'de');
      for (const c of chunks) expect(speakable(c).length, s.id).toBeLessThanOrEqual(380);
      expect(chunks.join(' ').replace(/\s+/g, ' '), s.id).toBe(text.replace(/\s+/g, ' '));
    }
  });
  it('keine Regex mit Lookbehind im Quelltext (ältere iPads)', () => {
    expect(String(cloudChunks)).not.toMatch(/\(\?<[=!]/);
  });
});
