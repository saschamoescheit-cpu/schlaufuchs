// Gemischtes Vorlesen (Nachtlauf 23.10.2026): Erklärungen der Englisch-Themen mischen Deutsch und Englisch
// („Hello = Hallo, Goodbye = Tschüss.“). Bisher las die deutsche Stimme alles – englische Wörter klangen falsch.
// splitLangs teilt den Text in Abschnitte je Sprache; speakMixed (speech.ts) liest sie nacheinander mit der passenden
// Stimme. Erkennung je Wort: Wortlisten (alle Vokabeln der App + häufige Wörter), Umlaute, großgeschriebene Nomen
// mitten im Satz (deutsch). Unklares (Zahlen, Namen, „in“) schließt sich den Nachbarn an.
import type { Lang } from '../engine/types';

export interface LangPart {
  text: string;
  lang: Lang;
}

// häufige englische Wörter, die in keiner Vokabelliste stehen (Funktionswörter, Satzbausteine der Erklärungen)
const EN_BASE =
  "a the and or but is are am was were be been i you he she it we they me him us them my your his her its our their this that these those what where when who why how which whose do does did don't doesn't didn't can can't could will won't would should must have has had haven't hasn't not no yes please thank thanks sorry hello hi bye goodbye good morning afternoon evening night fine ok okay name it's i'm i've you're he's she's we're they're what's where's there's that's let's isn't aren't wasn't there here with of to for from on at by up down out off over under into about like likes love loves want wants play plays go goes come comes see look looks get got make many much some any very too also again more most first last next only just say says said know think every each all both lot lots little big small new old one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand first second third fourth fifth teen ty colour colours color favourite favorite today tomorrow yesterday time o'clock half past quarter to please welcome nice meet you how old years year truck food fruit things children women men often open listen then garden kitten written eaten behind between front near opposite above below inside outside";
// häufige deutsche Wörter (auch kleingeschrieben und am Satzanfang)
const DE_BASE =
  'und oder aber ist sind war waren die der das den dem des ein eine einen einem einer eines kein keine mit ohne dann auf beim bei im zu zum zur vom von für wenn wie was wer wo wohin woher nicht nur auch so schon noch immer man sagt sagen heißt heißen fragen frage antwort antworten tipp tippe tippen zähle zählen sprich sprechen jedes jede jeder wort wörter laut leise nach vor hinter neben zwischen über unter höflich sein haben hast hat bist bin gibt es er sie wir ihr du ich mich dich sich uns euch dein deine mein meine sein seine ihre unser euer wird werden kann können muss müssen soll sollen darf dürfen will wollen mag mögen also oft manchmal immer nie hier dort da dafür dazu damit danach davor zuerst zuletzt erst dann mal wieder genau gleich anders andere anderen anderer fast ganz viel viele wenig wenige mehr weniger alle alles beide zwei drei vier fünf sechs sieben acht neun zehn elf zwölf zwanzig hundert tausend englisch deutsch englische englischen deutsche deutschen beispiel beispiele merke achtung hinweis endung endungen vorne hinten am ende anfang satz sätze buchstabe buchstaben stimme lautsprecher hörst hören höre lies lesen schreib schreiben übe üben spiel spielen bild bilder farbe farben zahl zahlen uhr uhrzeit stunde minute deiner deinem deinen meiner meinem meinen seiner seinem ihrem ihren unserem steht stehen sonst meistens klingt klingen spricht schreibt benutzt benutzen zehner einer hunderter gern gerne dir dich ganz ganzen welche welcher welches wichtig wichtigen verstehen achte achten musst kannst willst abspielen anhören langsam namen orte besonders besondere mehrzahl einzahl manche wie viertel halbe halb volle';

let EN = new Set(EN_BASE.split(' '));
let DE = new Set(DE_BASE.split(' '));
/** deutsche Vokabeln, die großgeschrieben werden (Nomen): klein geschrieben ist dasselbe Wort englisch („bus“ – „Bus“) */
let DE_NOUN = new Set<string>();

/** Vokabeln der App dazunehmen (Englisch-Wortfelder: en → englisch, de → deutsch) */
export function addWords(words: { en: string; de: string }[]) {
  const en = new Set(EN);
  const de = new Set(DE);
  const noun = new Set(DE_NOUN);
  for (const w of words) {
    for (const t of w.en.toLowerCase().split(/[^a-z']+/)) if (t.length > 1) en.add(t);
    for (const t of w.de.split(/[^A-Za-zÄÖÜäöüß]+/)) {
      if (t.length < 2) continue;
      de.add(t.toLowerCase());
      if (/^[A-ZÄÖÜ]/.test(t)) noun.add(t.toLowerCase());
    }
  }
  EN = en;
  DE = de;
  DE_NOUN = noun;
}

type Tok = { s: string; word: boolean; lang: Lang | null; start?: boolean };
/** typisch deutsche Schreibung bei unbekannten Wörtern (benutzt, anfangen, hörst, Schultasche …) */
const GERMANISH = /sch|tz|ung$|heit$|keit$|lich$|chen$|ig$|en$|zt$|st$/;
const WORD = /[A-Za-zÄÖÜäöüß']+(?:-[A-Za-zÄÖÜäöüß']+)*/g;

function classify(w: string, sentenceStart: boolean, afterEq = false): Lang | null {
  // nach „=“ steht in den Erklärungen das deutsche Wort („bus = Bus“, „pilot = Pilot“)
  if (afterEq) {
    const c = classify(w, sentenceStart);
    return c === 'en' && !/^[A-ZÄÖÜ]/.test(w) ? 'en' : 'de';
  }
  const low = w.toLowerCase().replace(/^'+|'+$/g, '');
  if (/[äöüß]/i.test(w)) return 'de';
  if (w === 'I' || /^I'(m|ve|ll|d)$/.test(w)) return 'en';
  // mit Bindestrich (forty-seven, T-shirt): nach den Teilen
  if (w.includes('-')) {
    const parts = w.split('-').filter(Boolean).map((x) => classify(x, true));
    return parts.includes('de') ? 'de' : parts.includes('en') ? 'en' : null;
  }
  const en = EN.has(low);
  const de = DE.has(low);
  // großgeschrieben mitten im Satz: deutsches Nomen (englische Wörter stehen in den Erklärungen klein) – außer das Wort
  // ist englisch bekannt (Monday, Maths); gibt es es in beiden Sprachen (April, Bus), entscheiden die Nachbarn
  if (!sentenceStart && /^[A-ZÄÖÜ]/.test(w)) return !en ? 'de' : de ? null : 'en';
  if (en && !de) return 'en';
  if (de && !en) return 'de';
  // klein geschrieben, im Deutschen aber ein Nomen („bus“ neben „Bus“): englisch
  if (en && de) return DE_NOUN.has(low) && !/^[A-ZÄÖÜ]/.test(w) ? 'en' : null;
  return GERMANISH.test(low) ? 'de' : null;
}

/** Text in Abschnitte je Sprache teilen (Deutsch ist die Grundsprache). */
export function splitLangs(text: string): LangPart[] {
  const toks: Tok[] = [];
  let last = 0;
  let start = true;
  for (const m of text.matchAll(WORD)) {
    let eq = false;
    if (m.index! > last) {
      const gap = text.slice(last, m.index);
      toks.push({ s: gap, word: false, lang: null });
      if (/[.!?:…·]/.test(gap)) start = true;
      eq = /=\s*$/.test(gap);
    }
    toks.push({ s: m[0], word: true, lang: classify(m[0], start, eq), start });
    start = false;
    last = m.index! + m[0].length;
  }
  if (last < text.length) toks.push({ s: text.slice(last), word: false, lang: null });

  // unklare Wörter: die Sprache des vorigen Worts – am Satzanfang die des nächsten
  const words = toks.filter((t) => t.word);
  for (let i = 0; i < words.length; i++) {
    if (words[i].lang) continue;
    let p = i - 1;
    while (p >= 0 && !words[p].lang) p--;
    let n = i + 1;
    while (n < words.length && !words[n].lang) n++;
    const prev = p >= 0 ? words[p].lang : null;
    const next = n < words.length ? words[n].lang : null;
    words[i].lang = (words[i].start ? (next ?? prev) : (prev ?? next)) ?? 'de';
  }
  // eine Zahl oder ein Name zwischen zwei Sprachen gehört zum Deutschen (Ansagen wie „twenty = 20“)
  for (let i = 0; i < toks.length; i++) if (!toks[i].word && /\d/.test(toks[i].s)) toks[i].lang = 'de';

  // zu Abschnitten zusammenfassen: Satzzeichen am Ende bleiben beim vorigen, Zeichen wie „=“ „–“ gehen zum nächsten
  const parts: LangPart[] = [];
  let cur: LangPart | null = null;
  let pendingGap = '';
  for (const t of toks) {
    if (!t.word && !t.lang) {
      pendingGap += t.s;
      continue;
    }
    const lang = t.lang as Lang;
    if (cur && cur.lang === lang) {
      cur.text += pendingGap + t.s;
    } else {
      if (cur) {
        // an der Grenze: Satzzeichen (.,!?:;…) gehören zum vorigen Abschnitt, der Rest zum nächsten
        const m = /^[\s.,!?:;…)“"]*/.exec(pendingGap)![0];
        cur.text += m;
        pendingGap = pendingGap.slice(m.length);
      }
      cur = { text: pendingGap + t.s, lang };
      parts.push(cur);
    }
    pendingGap = '';
  }
  if (cur) cur.text += pendingGap;
  else if (pendingGap.trim()) parts.push({ text: pendingGap, lang: 'de' });

  // kleine Reste glätten: ein einzelnes Wort ohne Buchstaben-Inhalt nicht eigens vorlesen
  return parts
    .map((p) => ({ ...p, text: p.lang === 'de' ? p.text.replace(/^\s*=\s*/, 'heißt ').replace(/\s=\s/g, ' heißt ') : p.text.replace(/\s*[=–—→]\s*$/, '') }))
    .filter((p) => /[\p{L}\d]/u.test(p.text))
    .map((p) => ({ ...p, text: p.text.trim() }));
}

/** Enthält der Text überhaupt Englisch? (sonst wie bisher in einem Stück vorlesen) */
export const hasEnglish = (parts: LangPart[]) => parts.some((p) => p.lang === 'en');

/** Titel der Englisch-Themen: „Colours – Farben“ (vorne Englisch, nach dem Strich Deutsch), ohne Strich ganz Englisch */
export function titleParts(title: string): LangPart[] {
  const i = title.indexOf(' – ');
  if (i < 0) return [{ text: `${title}.`, lang: 'en' }];
  return [
    { text: title.slice(0, i), lang: 'en' },
    { text: `${title.slice(i + 3)}.`, lang: 'de' },
  ];
}
