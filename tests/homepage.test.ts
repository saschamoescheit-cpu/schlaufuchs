import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ALL_SKILLS } from '../src/content/curriculum';

// Die Homepage nennt je Fach die Zahl der Themen – sie muss zum Inhalt der App passen.
describe('Homepage', () => {
  it('Themenzahlen je Fach stimmen', () => {
    const html = readFileSync('home/index.html', 'utf8');
    const shown = [...html.matchAll(/<article class="subject (\w+)">[\s\S]*?<p class="count">(\d+) Themen<\/p>/g)].map((m) => [m[1], Number(m[2])]);
    expect(shown.length).toBe(3);
    for (const [subject, n] of shown) expect(n, String(subject)).toBe(ALL_SKILLS.filter((s) => s.subject === subject).length);
  });
});
