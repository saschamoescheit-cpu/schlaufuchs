import { describe, expect, it } from 'vitest';
import { sameSpoken } from './SayIt';

describe('Sprich nach: gehört vs. Zielwort', () => {
  it('erkennt gleiche Wörter trotz Groß/Klein und Satzzeichen', () => {
    expect(sameSpoken('Elephant', 'elephant')).toBe(true);
    expect(sameSpoken("It's quarter to eight.", 'It’s quarter to eight.')).toBe(true);
    expect(sameSpoken('the cat is under the box', 'The cat is under the box.')).toBe(true);
  });
  it('verzeiht kleine Erkennungsfehler', () => {
    expect(sameSpoken('grand mother', 'grandmother')).toBe(true);
    expect(sameSpoken('color', 'colour')).toBe(true);
    expect(sameSpoken('gray', 'grey')).toBe(true);
  });
  it('lehnt andere Wörter ab', () => {
    expect(sameSpoken('dog', 'cat')).toBe(false);
    expect(sameSpoken('hat', 'cat')).toBe(false);
    expect(sameSpoken('', 'cat')).toBe(false);
    expect(sameSpoken('Thursday', 'Tuesday')).toBe(false);
  });
});
