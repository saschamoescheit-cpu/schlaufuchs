import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Ältere iPads (iOS 15) sollen die App weiter starten können: keine Regex-Lookbehinds (Safari < 16.4 bricht beim
// Laden ab) und keine Array-Methoden, die es erst ab iOS 16 gibt.
const files = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? files(join(d, f)) : /\.tsx?$/.test(f) && !f.endsWith('.test.ts') ? [join(d, f)] : []));

describe('Kompatibilität mit älteren iPads', () => {
  for (const f of files('src'))
    it(`${f}: keine Lookbehinds, kein toSorted/findLast/at()`, () => {
      const t = readFileSync(f, 'utf8');
      expect(t.match(/\(\?<[=!]/g) ?? []).toEqual([]);
      expect(t.match(/\.(toSorted|toReversed|toSpliced|findLast|findLastIndex)\(|\.at\(-?\d/g) ?? []).toEqual([]);
    });
});
