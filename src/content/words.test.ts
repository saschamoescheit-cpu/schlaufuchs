import { describe, expect, it } from 'vitest';
import { ALL_SKILLS, isVocab } from './curriculum';
import { buildDictation, cardsOf, WORDS } from './words';
import { mulberry32 } from '../engine/rng';
import { emptyProgress } from '../engine/learning';

// Vokabelkarten und Buchstabier-Diktat brauchen zu jedem Wortfeld die Wortliste – und Vokabel-Aufgaben ihr Wort,
// sonst zählen sie nicht für den Karteikasten.
describe('Wortlisten der Englisch-Wortfelder', () => {
  const vocab = ALL_SKILLS.filter(isVocab);
  it('jedes Vokabel-Wortfeld hat eine Wortliste (außer Zahlen bis 100)', () => {
    const missing = vocab.filter((s) => !WORDS[s.id]?.length && s.id !== 'e2-numbers100').map((s) => s.id);
    expect(missing).toEqual([]);
  });
  it('Wörter, Übersetzungen und Bilder sind je Wortfeld eindeutig (sonst wären Aufgaben mehrdeutig)', () => {
    for (const [id, words] of Object.entries(WORDS)) {
      const en = words.map((w) => w.en);
      expect(new Set(en).size, `${id}: englisch doppelt`).toBe(en.length);
      const de = words.map((w) => w.de);
      expect(new Set(de).size, `${id}: deutsch doppelt`).toBe(de.length);
      const pics = words.filter((w) => w.e).map((w) => w.e);
      expect(new Set(pics).size, `${id}: Bild doppelt`).toBe(pics.length);
    }
  });
  it('Aufgaben der Wortfelder mit Wortliste tragen ihr Wort (zählt für die Karteikarten)', () => {
    const r = mulberry32(5);
    for (const s of vocab.filter((x) => WORDS[x.id] && !['e1-numbers', 'e1-shapes', 'e1-festivals'].includes(x.id))) {
      let tagged = 0;
      for (let i = 0; i < 30; i++) if (s.generate(r, 2).word) tagged++;
      expect(tagged, s.id).toBeGreaterThan(20);
    }
  });
  it('Diktat: nur schreibbare Wörter, kein Wort doppelt', () => {
    const tasks = buildDictation(['e2-jobs', 'e1-animals'], emptyProgress(), 30, mulberry32(3));
    expect(tasks.length).toBeGreaterThan(10);
    expect(new Set(tasks.map((t) => t.key)).size).toBe(tasks.length);
    for (const t of tasks) expect(t.answer.type === 'text' && t.answer.value.split(' ').length <= 2).toBe(true);
    expect(cardsOf(['e2-jobs']).length).toBe(WORDS['e2-jobs'].length);
  });
});
