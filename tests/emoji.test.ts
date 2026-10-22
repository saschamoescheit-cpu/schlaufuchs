import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Emojis aus Unicode 14/15 fehlen auf älteren iPads/iPhones (iOS < 15.4) – dort erscheint ein leeres Kästchen.
const NEW_RANGES: [number, number][] = [
  [0x1f6dd, 0x1f6df], [0x1f7f0, 0x1f7f0], [0x1f9cc, 0x1f9cc], [0x1fa75, 0x1fa77], [0x1fa7b, 0x1fa7c], [0x1fa87, 0x1fa88],
  [0x1faa9, 0x1faaf], [0x1fab7, 0x1fabf], [0x1fac3, 0x1fac5], [0x1face, 0x1facf], [0x1fad7, 0x1fadb], [0x1fae0, 0x1fae8], [0x1faf0, 0x1faf8],
];
const isNew = (c: number) => NEW_RANGES.some(([a, b]) => c >= a && c <= b);
// Neue Emojis aus alten Bausteinen (Emoji 15/15.1, mit Verbinder ZWJ) – ältere Geräte zeigen zwei Zeichen nebeneinander
const NEW_SEQUENCES = ['🐦‍⬛', '🐦‍🔥', '🍋‍🟩', '🍄‍🟫', '⛓️‍💥', '🙂‍↔️', '🙂‍↕️', '🧑‍🧑‍🧒', '🧑‍🧒'];

describe('Emojis', () => {
  const dirs = ['src/content', 'src/ui', 'src/screens'];
  for (const d of dirs)
    for (const f of readdirSync(d).filter((x: string) => /\.tsx?$/.test(x) && !x.endsWith('.test.ts'))) {
      it(`${d}/${f}: keine Emojis aus Unicode 14/15`, () => {
        const text = readFileSync(join(d, f), 'utf8');
        const found = [...text].filter((ch) => isNew(ch.codePointAt(0)!));
        expect(found, found.join(' ')).toEqual([]);
        const seq = NEW_SEQUENCES.filter((x) => text.includes(x));
        expect(seq, seq.join(' ')).toEqual([]);
      });
    }
});
