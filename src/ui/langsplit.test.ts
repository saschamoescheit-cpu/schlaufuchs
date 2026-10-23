import { beforeAll, describe, expect, it } from 'vitest';
import { ALL_SKILLS } from '../content/curriculum';
import { WORDS } from '../content/words';
import { addWords, hasEnglish, splitLangs, titleParts } from './langsplit';

beforeAll(() => addWords(Object.values(WORDS).flat()));
const show = (t: string) => splitLangs(t).map((p) => `${p.lang}:${p.text}`);

describe('gemischtes Vorlesen: Deutsch und Englisch auseinanderhalten', () => {
  it('Wortpaare „englisch = deutsch“: das deutsche Wort mit „heißt“', () => {
    expect(show('Hello = Hallo, Goodbye = Tschüss.')).toEqual(['en:Hello', 'de:heißt Hallo,', 'en:Goodbye', 'de:heißt Tschüss.']);
    expect(show('bus = Bus, pilot = Pilot.')).toEqual(['en:bus', 'de:heißt Bus,', 'en:pilot', 'de:heißt Pilot.']);
  });
  it('rein deutsche Sätze bleiben in einem Stück', () => {
    const p = splitLangs('Tipp: Tippe auf den Lautsprecher und sprich jedes Wort laut nach!');
    expect(p).toEqual([{ lang: 'de', text: 'Tipp: Tippe auf den Lautsprecher und sprich jedes Wort laut nach!' }]);
    expect(hasEnglish(p)).toBe(false);
    expect(show('Wochentage schreibt man im Englischen immer groß!')).toEqual(['de:Wochentage schreibt man im Englischen immer groß!']);
  });
  it('englische Sätze, Zahlwörter mit Bindestrich, Zahlen deutsch', () => {
    expect(show('So sagst du, was du magst: I like apples. I don\'t like cheese.')).toEqual(['de:So sagst du, was du magst:', "en:I like apples. I don't like cheese."]);
    expect(show('47 heißt forty-seven.')).toEqual(['de:47 heißt', 'en:forty-seven.']);
    expect(show('twenty = 20.')).toEqual(['en:twenty', 'de:heißt 20.']);
  });
  it('Lösungswege: buchstabierte Wörter englisch am Stück, „Puppe = doll“ ohne „equals“', () => {
    expect(show('Hase heißt auf Englisch: rabbit Buchstabiert: R – A – B – B – I – T')).toEqual(['de:Hase heißt auf Englisch:', 'en:rabbit', 'de:Buchstabiert:', 'en:R – A – B – B – I – T']);
    expect(show('Puppe = doll')).toEqual(['de:Puppe heißt', 'en:doll']);
    expect(show('orange heißt auf Englisch: orange')).toEqual(['de:orange heißt auf Englisch:', 'en:orange']);
    expect(show('Bus heißt auf Englisch: bus')).toEqual(['de:Bus heißt auf Englisch:', 'en:bus']);
    expect(show('park heißt auf Deutsch: Park')).toEqual(['en:park', 'de:heißt auf Deutsch: Park']);
  });
  it('Satzanfang: unbekanntes Wort geht mit dem nächsten (Steh auf / Stand up)', () => {
    expect(show('Stand up. – Steh auf. Open your book. – Öffne dein Buch.')).toEqual(['en:Stand up.', 'de:– Steh auf.', 'en:Open your book.', 'de:– Öffne dein Buch.']);
  });
  it('Titel: vorne Englisch, nach dem Strich Deutsch; ohne Strich ganz Englisch', () => {
    expect(titleParts('Colours – Farben')).toEqual([
      { text: 'Colours', lang: 'en' },
      { text: 'Farben.', lang: 'de' },
    ]);
    expect(titleParts('Numbers to 100')).toEqual([{ text: 'Numbers to 100.', lang: 'en' }]);
  });
  it('jede Erklärung der Englisch-Themen: kein Wort geht beim Aufteilen verloren', () => {
    for (const s of ALL_SKILLS.filter((x) => x.subject === 'englisch')) {
      const text = s.explain.text.join(' ');
      const parts = splitLangs(text);
      // alle Buchstaben des Texts kommen in den Abschnitten vor (nur „=“ wird zu „heißt“)
      const letters = (t: string) => t.replace(/heißt/g, '').replace(/[^A-Za-zÄÖÜäöüß]/g, '');
      expect(letters(parts.map((p) => p.text).join(' ')), s.id).toBe(letters(text));
    }
  });
});
