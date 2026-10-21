// Diktat und Schreiben: Die App liest vor, das Kind schreibt. Fehler werden Buchstabe für Buchstabe gezeigt und
// einem Rechtschreibmuster zugeordnet (engine/spelling.ts).
import { pick, type Rng } from '../engine/rng';
import type { Skill, Stage } from '../engine/types';
import { SPELL_TAG_LABELS, spellHint } from '../engine/spelling';
import { skill, type Gen } from './helpers';

/** [Wort, Bild, Satz zum Wort] */
type Item = [string, string, string];

const G1: Item[] = [
  ['Mama', '👩', 'Mama lacht.'], ['Papa', '👨', 'Papa kocht.'], ['Oma', '👵', 'Oma liest.'], ['Opa', '👴', 'Opa malt.'], ['Sofa', '🛋️', 'Das Sofa ist weich.'],
  ['Hut', '🎩', 'Der Hut ist schwarz.'], ['Igel', '🦔', 'Der Igel ist klein.'], ['Lama', '🦙', 'Das Lama frisst Gras.'], ['Nase', '👃', 'Ich putze die Nase.'], ['Rose', '🌹', 'Die Rose ist rot.'],
  ['Hose', '👖', 'Die Hose ist blau.'], ['Dose', '🥫', 'Die Dose ist leer.'], ['Tor', '🥅', 'Tim schießt ein Tor.'], ['Ente', '🦆', 'Die Ente schwimmt.'], ['Kamel', '🐫', 'Das Kamel läuft.'],
  ['Tomate', '🍅', 'Die Tomate ist rot.'], ['Banane', '🍌', 'Die Banane ist gelb.'], ['Wal', '🐋', 'Der Wal ist groß.'], ['Ufo', '🛸', 'Das Ufo fliegt.'], ['Auto', '🚗', 'Das Auto fährt.'],
  ['Maus', '🐭', 'Die Maus piepst.'], ['Haus', '🏠', 'Das Haus ist groß.'], ['Eis', '🍦', 'Das Eis ist kalt.'], ['Limo', '🥤', 'Die Limo ist süß.'], ['Rakete', '🚀', 'Die Rakete fliegt.'],
  ['Salat', '🥗', 'Der Salat ist frisch.'], ['Melone', '🍉', 'Die Melone ist saftig.'], ['Nudel', '🍝', 'Die Nudel ist lang.'], ['Lupe', '🔍', 'Die Lupe ist rund.'], ['Pinsel', '🖌️', 'Der Pinsel ist nass.'],
];
const G2: Item[] = [
  ['Biene', '🐝', 'Die Biene summt.'], ['Ball', '⚽', 'Der Ball rollt.'], ['Sonne', '☀️', 'Die Sonne scheint.'], ['Puppe', '🪆', 'Die Puppe ist alt.'], ['Katze', '🐱', 'Die Katze schläft.'],
  ['Zucker', '🍬', 'Der Zucker ist süß.'], ['Jacke', '🧥', 'Die Jacke ist warm.'], ['Schule', '🏫', 'Ich gehe gern in die Schule.'], ['Kinder', '🧒', 'Die Kinder spielen.'], ['Wasser', '💧', 'Das Wasser ist kalt.'],
  ['Tasse', '☕', 'Die Tasse ist voll.'], ['Brief', '✉️', 'Ich schreibe einen Brief.'], ['Ziege', '🐐', 'Die Ziege meckert.'], ['Vogel', '🐦', 'Der Vogel singt.'], ['Stuhl', '🪑', 'Der Stuhl wackelt.'],
  ['Zahn', '🦷', 'Der Zahn wackelt.'], ['Kuh', '🐮', 'Die Kuh gibt Milch.'], ['Hund', '🐶', 'Der Hund bellt.'], ['Brot', '🍞', 'Das Brot ist frisch.'], ['Baum', '🌳', 'Der Baum ist hoch.'],
  ['Apfel', '🍎', 'Der Apfel ist rot.'], ['Pferd', '🐴', 'Das Pferd galoppiert.'], ['Stern', '⭐', 'Der Stern leuchtet.'], ['spielen', '🧸', 'Wir spielen im Garten.'], ['lachen', '😄', 'Alle lachen laut.'],
  ['schwimmen', '🏊', 'Ich kann schwimmen.'], ['schnell', '🏃', 'Das Auto ist schnell.'], ['Fisch', '🐟', 'Der Fisch schwimmt.'], ['Teller', '🍽️', 'Der Teller ist leer.'], ['Mutter', '👩', 'Meine Mutter lacht.'],
];
const G3: Item[] = [
  ['Fahrrad', '🚲', 'Ich fahre mit dem Fahrrad.'], ['Fenster', '🪟', 'Das Fenster ist offen.'], ['Wiese', '🌾', 'Auf der Wiese blühen Blumen.'], ['Brücke', '🌉', 'Die Brücke ist lang.'], ['Mütze', '🧢', 'Die Mütze ist warm.'],
  ['Zahl', '🔢', 'Die Zahl ist groß.'], ['Wald', '🌲', 'Im Wald ist es still.'], ['Berg', '⛰️', 'Der Berg ist hoch.'], ['Bäume', '🌳', 'Im Park stehen viele Bäume.'], ['Häuser', '🏘️', 'Die Häuser sind bunt.'],
  ['Hände', '🙌', 'Ich wasche meine Hände.'], ['Uhr', '⌚', 'Die Uhr tickt.'], ['Spiegel', '🪞', 'Der Spiegel glänzt.'], ['Schnecke', '🐌', 'Die Schnecke ist langsam.'], ['Pflanze', '🪴', 'Die Pflanze braucht Wasser.'],
  ['Ferien', '🏖️', 'In den Ferien fahren wir weg.'], ['Vater', '👨', 'Mein Vater liest Zeitung.'], ['fahren', '🚗', 'Wir fahren in die Stadt.'], ['wohnen', '🏠', 'Wir wohnen in einem Haus.'], ['fühlen', '🤲', 'Ich kann den Stoff fühlen.'],
  ['Zwerg', '🧙', 'Der Zwerg ist klein.'], ['Korb', '🧺', 'Der Korb ist voll.'], ['Kälte', '🥶', 'Im Winter ist große Kälte.'], ['Freund', '🤝', 'Mein Freund heißt Ben.'], ['Feuer', '🔥', 'Das Feuer ist heiß.'],
  ['Stiefel', '🥾', 'Die Stiefel sind nass.'], ['Glocke', '🔔', 'Die Glocke läutet.'], ['Platz', '🏟️', 'Der Platz ist frei.'], ['viel', '💯', 'Ich habe viel Zeit.'], ['Spinne', '🕷️', 'Die Spinne baut ein Netz.'],
];
const G4: string[] = [
  'Im Sommer fahren wir ans Meer.', 'Der Hund läuft über die Straße.', 'Ich weiß, dass du kommst.', 'Das Fahrrad steht im Keller.', 'Am Fluss wachsen hohe Bäume.',
  'Meine Schwester liest ein spannendes Buch.', 'Im Winter ist es draußen kalt.', 'Wir essen Äpfel, Birnen und Bananen.', 'Der Vogel sitzt auf dem Dach.', 'Nach der Schule spielen wir Fußball.',
  'Die Kinder freuen sich auf die Ferien.', 'Mein Vater fährt mit dem Zug.', 'Ich bleibe zu Hause, weil ich krank bin.', 'Oma backt einen leckeren Kuchen.', 'Das Wasser im See ist sehr warm.',
  'Viele Tiere schlafen im Winter.', 'Der Bäcker verkauft frische Brötchen.', 'Wir gehen heute in den Zoo.', 'Die Blätter fallen von den Bäumen.', 'Er glaubt, dass es morgen regnet.',
  'Mein Freund wohnt in der Nähe.', 'Das Spiel beginnt um vier Uhr.', 'Im Garten blühen bunte Blumen.', 'Wir trinken heißen Tee mit Zucker.',
];

/** Rechtschreib-Merkmale eines Textes (für die Fehlerstatistik: wie oft kam ein Muster vor, wie oft war es falsch) */
const FEATURES: [string, RegExp][] = [
  ['ie', /ie/],
  ['ck', /ck/],
  ['tz', /tz/],
  ['doppel', /([bdfglmnprt])\1/],
  ['dehnungs-h', /[aeiouäöü]h(?=[lmnr]|$)/],
  ['auslaut', /[^aeiouäöü][dgb]$|^[a-zäöü]*[aeiouäöü][dgb]$/],
  ['ae-e', /ä(?!u)/],
  ['aeu-eu', /äu|eu/],
  ['ss-sz', /ß|ss/],
  ['v-f', /^v/],
  ['pf', /pf/],
  ['sp-st', /^s[pt]/],
];
export function spellFeatures(text: string, withCase = true): string[] {
  const out = new Set<string>(withCase ? ['gross-klein'] : []);
  for (const w of text.replace(/[.,!?]/g, '').split(/\s+/)) for (const [tag, re] of FEATURES) if (re.test(w.toLowerCase())) out.add(tag);
  return [...out];
}

function wordTask(r: Rng, list: Item[], withCase: boolean, stage: Stage = 2): Gen {
  // Stufe 1: kurze Wörter, Stufe 3: lange Wörter mit mehreren Rechtschreib-Merkmalen
  const pool = stage === 1 ? list.filter(([x]) => x.length <= 5) : stage === 3 ? list.filter(([x]) => x.length >= 6 || spellFeatures(x).length >= 3) : list;
  const [w, e, s] = pick(r, pool.length >= 4 ? pool : list);
  const f = spellFeatures(w, withCase);
  const tips = withCase ? f.filter((t) => t !== 'gross-klein').slice(0, 2).map(spellHint) : [];
  const caseTip = withCase ? (w[0] === w[0].toUpperCase() ? `„${w}“ ist ein Nomen – deshalb groß.` : `„${w}“ ist kein Nomen – deshalb klein.`) : '';
  return {
    key: w,
    prompt: 'Hör gut zu und schreibe das Wort.',
    speak: 'Hör gut zu und schreibe das Wort.',
    listen: { text: `${w}. ${s} ${w}.`, lang: 'de', slow: true },
    visual: { kind: 'emoji', chars: e },
    answer: { type: 'text', value: w, caseSensitive: withCase, dictation: true },
    tags: f,
    solution: [`So schreibt man es: ${w}`, ...(caseTip ? [caseTip] : []), ...tips, ...(tips.length ? [] : ['Sprich das Wort langsam in Silben und schreibe Laut für Laut.'])],
  };
}

function sentenceTask(r: Rng, stage: Stage = 2): Gen {
  const pool = stage === 1 ? G4.filter((x) => x.split(' ').length <= 6 && !x.includes(',')) : stage === 3 ? G4.filter((x) => x.includes(',') || x.split(' ').length >= 7) : G4;
  const s = pick(r, pool.length >= 4 ? pool : G4);
  const f = spellFeatures(s);
  const tips = f.filter((t) => t !== 'gross-klein').slice(0, 3).map(spellHint);
  return {
    key: s,
    prompt: 'Hör gut zu und schreibe den Satz.',
    speak: 'Hör gut zu und schreibe den Satz.',
    listen: { text: s, lang: 'de', slow: true },
    answer: { type: 'text', value: s, caseSensitive: true, dictation: true },
    tags: [...f, ...(s.includes(',') ? ['komma'] : [])],
    solution: [`So schreibt man den Satz: ${s}`, 'Satzanfang und Nomen schreibst du groß.', ...tips],
  };
}

const D = (grade: 1 | 2 | 3 | 4, ...a: Parameters<typeof skill> extends [unknown, unknown, ...infer R] ? R : never) => skill('deutsch', grade, ...a);
const LABELS = SPELL_TAG_LABELS;

export const DIKTAT: Skill[] = [
  D(1, 'd1-schreiben', 'Wörter schreiben', '✍️', {
    text: ['Hör dir das Wort genau an. Sprich es dann ganz langsam mit: Ma – ma.', 'Schreibe jeden Laut, den du hörst: M – a – m – a.', 'Tippe auf den Lautsprecher, so oft du willst!'],
    visual: { kind: 'syllables', parts: ['Ma', 'ma'], emoji: '👩' },
    videoQuery: 'Schreiben lernen Klasse 1 lautgetreu Wörter',
  }, (r, st) => wordTask(r, G1, false, st), { tagLabels: LABELS, testSeconds: 30 }),
  D(2, 'd2-diktat', 'Diktat: Lernwörter', '📝', {
    text: ['Hör das Wort und den Satz genau an.', 'Sprich das Wort in Silben mit und schreibe es dann.', 'Denk an die Regeln: Nomen groß, langes i meistens ie, nach kurzem Vokal oft doppelte Mitlaute, ck oder tz.', 'Lies am Ende noch einmal Buchstabe für Buchstabe nach.'],
    visual: { kind: 'word', word: 'Biene', mark: [[1, 3]] },
    videoQuery: 'Lernwörter üben Klasse 2 Rechtschreibung',
  }, (r, st) => wordTask(r, G2, true, st), { tagLabels: LABELS, testSeconds: 40 }),
  D(3, 'd3-diktat', 'Diktat: Rechtschreib-Strategien', '🖊️', {
    text: ['Nutze die Rechtschreib-Strategien:', 'Verlängern: Wald → Wälder (d), Berg → Berge (g).', 'Ableiten: Bäume kommt von Baum (äu), Hände von Hand (ä).', 'Merkwörter: Wörter mit Dehnungs-h (Zahl, Uhr) oder V (Vater, viel) muss man sich merken.'],
    visual: { kind: 'text', text: 'Wald → Wälder' },
    videoQuery: 'Rechtschreibstrategien Grundschule verlängern ableiten merken',
  }, (r, st) => wordTask(r, G3, true, st), { tagLabels: LABELS, testSeconds: 40 }),
  D(4, 'd4-diktat', 'Diktat: ganze Sätze', '📜', {
    text: ['Hör dir den ganzen Satz an. Merke dir ein paar Wörter und schreibe sie, dann hörst du wieder hin.', 'Satzanfang und Nomen schreibst du groß.', 'Achte auf Kommas: vor „dass“, „weil“ und bei Aufzählungen.', 'Lies den Satz am Ende Wort für Wort durch.'],
    visual: { kind: 'text', text: 'Ich weiß, dass du kommst.' },
    videoQuery: 'Diktat üben Klasse 4 Tipps',
  }, sentenceTask, { tagLabels: LABELS, testSeconds: 90 }),
];
