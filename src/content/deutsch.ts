// Deutsch, Klassen 1–4 (orientiert am Lehrplan Deutsch Grundschule NRW 2021).
import { chance, choice, fixedChoice, pick, pickN, ri, type Rng } from '../engine/rng';
import type { Skill, Stage } from '../engine/types';
import { NAMES, skill, type Gen } from './helpers';

const D = (grade: 1 | 2 | 3 | 4, ...a: Parameters<typeof skill> extends [unknown, unknown, ...infer R] ? R : never) => skill('deutsch', grade, ...a);

/** zwei Schreibweisen: richtig + falsch (+ Bild) */
type Pair = [string, string, string?];
function spellTask(r: Rng, stage: Stage, list: Pair[], tag: (p: Pair) => string, why: (p: Pair) => string[], prompt = 'Welches Wort ist richtig geschrieben?'): Gen {
  const p = pick(r, list);
  if (stage === 3) {
    // schwer: das Wort selbst schreiben statt auswählen
    return {
      key: `${p[0]}#schreiben`,
      prompt: 'Hör gut zu und schreibe das Wort.',
      speak: 'Hör gut zu und schreibe das Wort.',
      listen: { text: p[0], lang: 'de', slow: true },
      visual: p[2] ? { kind: 'emoji', chars: p[2] } : undefined,
      answer: { type: 'text', value: p[0], caseSensitive: true, dictation: true },
      tags: [tag(p)],
      solution: [`Richtig ist: ${p[0]}`, ...why(p)],
      solutionVisual: { kind: 'word', word: p[0], mark: markDiff(p[0], p[1]) },
    };
  }
  return {
    key: p[0],
    prompt,
    visual: p[2] ? { kind: 'emoji', chars: p[2] } : undefined,
    answer: choice(r, p[0], [p[1]]),
    tags: [tag(p)],
    solution: [`Richtig ist: ${p[0]}`, ...why(p)],
    solutionVisual: { kind: 'word', word: p[0], mark: markDiff(p[0], p[1]) },
  };
}
/** markiert die Buchstaben, in denen sich zwei Schreibweisen unterscheiden */
function markDiff(a: string, b: string): [number, number][] {
  let s = 0;
  while (s < a.length && a[s] === b[s]) s++;
  let e = 0;
  while (e < a.length - s && a[a.length - 1 - e] === b[b.length - 1 - e]) e++;
  return [[s, Math.max(s + 1, a.length - e)]];
}

// ---------- Klasse 1 ----------

const ANLAUT: [string, string][] = [
  ['Apfel', '🍎'], ['Ameise', '🐜'], ['Auto', '🚗'], ['Banane', '🍌'], ['Baum', '🌳'], ['Biene', '🐝'], ['Buch', '📖'], ['Dino', '🦕'], ['Delfin', '🐬'],
  ['Ente', '🦆'], ['Erdbeere', '🍓'], ['Eis', '🍦'], ['Fisch', '🐟'], ['Frosch', '🐸'], ['Feder', '🪶'], ['Gabel', '🍴'], ['Giraffe', '🦒'], ['Gurke', '🥒'],
  ['Haus', '🏠'], ['Hund', '🐶'], ['Hut', '🎩'], ['Igel', '🦔'], ['Insel', '🏝️'], ['Jacke', '🧥'], ['Joghurt', '🥛'], ['Käse', '🧀'], ['Katze', '🐱'], ['Kuh', '🐮'],
  ['Löwe', '🦁'], ['Leiter', '🪜'], ['Mond', '🌙'], ['Maus', '🐭'], ['Möhre', '🥕'], ['Nase', '👃'], ['Nashorn', '🦏'], ['Ohr', '👂'], ['Oma', '👵'], ['Pilz', '🍄'],
  ['Pinguin', '🐧'], ['Rakete', '🚀'], ['Rose', '🌹'], ['Sonne', '☀️'], ['Schaf', '🐑'], ['Schnecke', '🐌'], ['Tiger', '🐯'], ['Tomate', '🍅'], ['Uhr', '⌚'],
  ['Vogel', '🐦'], ['Wal', '🐋'], ['Wolke', '☁️'], ['Zebra', '🦓'], ['Zitrone', '🍋'],
];
const anlautOf = (w: string) => (w.startsWith('Sch') ? 'Sch' : w.startsWith('Ei') ? 'Ei' : w.startsWith('Au') ? 'Au' : w[0]);
const anlaut = D(1, 'd1-anlaut', 'Anlaute', '🔤', {
  text: ['Der Anlaut ist der erste Laut eines Wortes.', 'Sprich das Wort langsam und deutlich: Mmmaus – der erste Laut ist M.', 'Manche Laute schreibt man mit mehreren Buchstaben: Sch wie Schaf, Ei wie Eis, Au wie Auto.', 'Aufgepasst: Vogel schreibt man mit V, obwohl man F hört!'],
  visual: { kind: 'emoji', chars: '🐭', label: 'Maus' },
  videoQuery: 'Anlaute lernen Klasse 1 Anlauttabelle',
}, (r) => {
  const [w, e] = pick(r, ANLAUT);
  const a = anlautOf(w);
  const pool = [...new Set(ANLAUT.map(([x]) => anlautOf(x)))];
  const traps = w === 'Vogel' ? [{ answer: 'F', tag: 'v-f', hint: 'Man hört ein F, aber Vogel schreibt man mit V. Das musst du dir merken.' }] : [];
  return {
    key: w,
    prompt: 'Mit welchem Buchstaben beginnt das Wort?',
    speak: `Mit welchem Buchstaben beginnt das Wort ${w}?`,
    listen: { text: w, lang: 'de' },
    visual: { kind: 'emoji', chars: e },
    answer: choice(r, a, w === 'Vogel' ? ['F', ...pickN(r, pool, 3)] : pickN(r, pool, 5), 4),
    tags: [a.length > 1 ? 'mehrere-buchstaben' : 'anlaut'],
    traps,
    solution: [`Das Wort heißt ${w}.`, `${w} beginnt mit ${a}.`],
    solutionVisual: { kind: 'word', word: w, mark: [[0, a.length]] },
  };
}, { tagLabels: { 'mehrere-buchstaben': 'Sch, Ei, Au', 'v-f': 'V oder F' }, testSeconds: 15 });

const SILBEN: [string, string][] = [
  ['Hund', '🐶'], ['Maus', '🐭'], ['Baum', '🌳'], ['Fisch', '🐟'], ['Haus', '🏠'], ['Mond', '🌙'], ['Kuh', '🐮'], ['Schaf', '🐑'], ['Eis', '🍦'], ['Buch', '📖'],
  ['Ap-fel', '🍎'], ['Bie-ne', '🐝'], ['Kat-ze', '🐱'], ['En-te', '🦆'], ['Son-ne', '☀️'], ['Ro-se', '🌹'], ['Ho-se', '👖'], ['Ti-ger', '🐯'], ['Na-se', '👃'], ['I-gel', '🦔'],
  ['Wol-ke', '☁️'], ['Kä-se', '🧀'], ['Bir-ne', '🍐'], ['Ha-se', '🐰'], ['Lö-we', '🦁'], ['Af-fe', '🐵'], ['Ze-bra', '🦓'], ['Kro-ne', '👑'],
  ['Ba-na-ne', '🍌'], ['To-ma-te', '🍅'], ['Gi-raf-fe', '🦒'], ['Ra-ke-te', '🚀'], ['Me-lo-ne', '🍉'], ['Ka-rot-te', '🥕'], ['Zi-tro-ne', '🍋'], ['Te-le-fon', '☎️'],
  ['Schmet-ter-ling', '🦋'], ['E-le-fant', '🐘'], ['Kro-ko-dil', '🐊'], ['Pa-pa-gei', '🦜'], ['Re-gen-schirm', '☂️'], ['Tan-nen-baum', '🎄'], ['A-na-nas', '🍍'],
  ['A-vo-ca-do', '🥑'], ['Ma-ri-en-kä-fer', '🐞'], ['Was-ser-me-lo-ne', '🍉'],
];
const silben = D(1, 'd1-silben', 'Silben klatschen', '👏', {
  text: ['Wörter bestehen aus Silben – das sind Sprechteile.', 'Sprich das Wort langsam und klatsche bei jeder Silbe: Ba – na – ne. Das sind 3 Silben.', 'Jede Silbe hat einen Selbstlaut (a, e, i, o, u, ä, ö, ü) oder Doppellaut (au, ei, eu).'],
  visual: { kind: 'syllables', parts: ['Ba', 'na', 'ne'], emoji: '🍌' },
  videoQuery: 'Silben klatschen Klasse 1',
}, (r) => {
  const [w, e] = pick(r, SILBEN);
  const parts = w.split('-');
  const word = parts.join('').replace(/^./, (c) => c.toUpperCase());
  return {
    key: word,
    prompt: `Wie viele Silben hat das Wort?\n${word}`,
    speak: `Wie viele Silben hat das Wort ${word}?`,
    listen: { text: word, lang: 'de' },
    visual: { kind: 'emoji', chars: e },
    answer: fixedChoice(['1', '2', '3', '4', '5'], String(parts.length)),
    tags: [parts.length >= 3 ? 'lange-wörter' : 'kurze-wörter'],
    solution: [`Klatsche mit: ${parts.join(' – ')}`, `${word} hat ${parts.length} Silbe${parts.length > 1 ? 'n' : ''}.`],
    solutionVisual: { kind: 'syllables', parts, emoji: e },
  };
}, { tagLabels: { 'lange-wörter': 'lange Wörter', 'kurze-wörter': 'kurze Wörter' }, testSeconds: 15 });

const REIME: string[][] = [
  ['Maus', 'Haus', 'Laus'], ['Hund', 'Mund', 'rund'], ['Baum', 'Traum', 'Schaum'], ['Hose', 'Rose', 'Dose'], ['Hase', 'Nase', 'Vase'],
  ['Katze', 'Tatze', 'Glatze'], ['Tisch', 'Fisch', 'frisch'], ['Bein', 'Stein', 'Schwein'], ['Sonne', 'Tonne', 'Wonne'], ['Ball', 'Stall', 'Knall'],
  ['Hand', 'Sand', 'Wand'], ['Kanne', 'Tanne', 'Wanne'], ['Hut', 'Mut', 'gut'], ['Bett', 'nett', 'Brett'], ['Wal', 'Schal', 'Zahl'], ['Kuchen', 'suchen', 'buchen'],
];
const reime = D(1, 'd1-reime', 'Reimwörter', '🎵', {
  text: ['Wörter reimen sich, wenn sie hinten gleich klingen.', 'Maus – Haus – Laus: Alle enden auf „aus“.', 'Sprich die Wörter laut – dann hörst du den Reim.'],
  visual: { kind: 'text', text: 'M-aus · H-aus · L-aus' },
  videoQuery: 'Reimwörter finden Klasse 1',
}, (r) => {
  const g = pick(r, REIME);
  const [w, rh] = pickN(r, g, 2);
  const others = REIME.filter((x) => x !== g).flat();
  const ans = choice(r, rh, pickN(r, others, 3));
  return {
    key: `${w}-${rh}`,
    prompt: `Was reimt sich auf „${w}“?`,
    answer: { ...ans, speakOptions: 'de' },
    tags: ['reim'],
    solution: [`${w} und ${rh} reimen sich – sie klingen hinten gleich.`],
  };
}, { testSeconds: 15 });

const CONFUSE: Record<string, string[]> = { b: ['d', 'p', 'q'], d: ['b', 'p', 'q'], p: ['q', 'b', 'd'], q: ['p', 'g', 'd'], n: ['u', 'm', 'h'], u: ['n', 'v', 'w'], m: ['n', 'w', 'u'], i: ['l', 'j', 't'], l: ['i', 't', 'f'], f: ['t', 'l', 'h'], t: ['f', 'l', 'k'], h: ['n', 'k', 'b'], g: ['q', 'y', 'p'], e: ['a', 'c', 'o'], a: ['o', 'e', 'd'] };
const ABC = 'abcdefghijklmnopqrstuvwxyz'.split('');
const buchstaben = D(1, 'd1-buchstaben', 'Groß- und Kleinbuchstaben', '🅰️', {
  text: ['Jeder Buchstabe hat eine große und eine kleine Form: A a, B b, D d …', 'Manche kleinen Buchstaben sehen sich ähnlich: b – d – p – q. Schau genau, wo der Bauch ist!', 'b: Bauch rechts unten. d: Bauch links unten. p: Bauch rechts oben. q: Bauch links oben.'],
  visual: { kind: 'text', text: 'b  d  p  q' },
  videoQuery: 'b und d unterscheiden Grundschule Trick',
}, (r) => {
  const l = pick(r, ABC);
  const toLower = chance(r, 0.7);
  const conf = CONFUSE[l] ?? pickN(r, ABC.filter((x) => x !== l), 3);
  const opts = toLower ? conf : conf.map((x) => x.toUpperCase());
  const right = toLower ? l : l.toUpperCase();
  return {
    key: `${l}-${toLower}`,
    prompt: toLower ? `Welcher kleine Buchstabe gehört zum großen ${l.toUpperCase()}?` : `Welcher große Buchstabe gehört zum kleinen ${l}?`,
    speak: toLower ? `Welcher kleine Buchstabe gehört zum großen ${l.toUpperCase()}?` : `Welcher große Buchstabe gehört zum kleinen ${l}?`,
    visual: { kind: 'text', text: toLower ? l.toUpperCase() : l },
    answer: { ...choice(r, right, opts), big: true },
    tags: ['bdpq'.includes(l) && toLower ? 'b-d-p-q' : 'buchstaben'],
    solution: [`Zum ${toLower ? 'großen' : 'kleinen'} ${toLower ? l.toUpperCase() : l} gehört ${right}.`, 'bdpq'.includes(l) ? 'Schau genau, auf welcher Seite der Bauch ist.' : `Zusammen: ${l.toUpperCase()} ${l}`],
    solutionVisual: { kind: 'text', text: `${l.toUpperCase()} ${l}` },
  };
}, { tagLabels: { 'b-d-p-q': 'b, d, p, q verwechselt' }, testSeconds: 12 });

const LESEN: [string, string][][] = [
  [['Haus', '🏠'], ['Hase', '🐰'], ['Hose', '👖'], ['Hals', '🦒']],
  [['Maus', '🐭'], ['Mais', '🌽'], ['Mund', '👄'], ['Mond', '🌙']],
  [['Hund', '🐶'], ['Hand', '✋'], ['Huhn', '🐔'], ['Hut', '🎩']],
  [['Rose', '🌹'], ['Rakete', '🚀'], ['Rock', '👗'], ['Rad', '🚲']],
  [['Eis', '🍦'], ['Ei', '🥚'], ['Eimer', '🪣'], ['Eule', '🦉']],
  [['Ohr', '👂'], ['Uhr', '⌚'], ['Tor', '🥅'], ['Oma', '👵']],
  [['Kuh', '🐮'], ['Kuchen', '🍰'], ['Krone', '👑'], ['Kamel', '🐫']],
  [['Tasse', '☕'], ['Tasche', '👜'], ['Tanne', '🌲'], ['Taube', '🕊️']],
  [['Bus', '🚌'], ['Buch', '📖'], ['Ball', '⚽'], ['Bett', '🛏️']],
  [['Sonne', '☀️'], ['Socke', '🧦'], ['Säge', '🪚'], ['Sofa', '🛋️']],
  // Nachtlauf 22.10.2026: mehr Wortgruppen
  [['Fisch', '🐟'], ['Frosch', '🐸'], ['Fuß', '🦶'], ['Feder', '🪶']],
  [['Löwe', '🦁'], ['Lampe', '💡'], ['Leiter', '🪜'], ['Lupe', '🔍']],
  [['Baum', '🌳'], ['Bein', '🦵'], ['Birne', '🍐'], ['Blume', '🌷']],
];
const lesen1 = D(1, 'd1-lesen', 'Wörter lesen', '👀', {
  text: ['Lies das Wort Buchstabe für Buchstabe und verbinde die Laute: H – a – s – e → Hase.', 'Schau genau hin: Haus, Hase und Hose sehen ähnlich aus!', 'Lies das Wort zum Schluss noch einmal ganz.'],
  visual: { kind: 'emoji', chars: '🐰', label: 'Hase' },
  videoQuery: 'Lesen lernen Klasse 1 Silben lesen',
}, (r) => {
  const g = pick(r, LESEN);
  const [w, e] = pick(r, g);
  if (chance(r, 0.5)) {
    return { key: `w${w}`, prompt: 'Welches Wort passt zum Bild?', visual: { kind: 'emoji', chars: e }, answer: choice(r, w, g.map((x) => x[0])), tags: ['bild-wort'], solution: [`Auf dem Bild ist: ${w}`], solutionVisual: { kind: 'emoji', chars: e, label: w } };
  }
  return { key: `b${w}`, prompt: `Welches Bild passt zum Wort?\n${w}`, speak: 'Welches Bild passt zum Wort? Lies selbst!', answer: { ...choice(r, e, g.map((x) => x[1])), big: true }, tags: ['wort-bild'], solution: [`${w} – das ist dieses Bild: ${e}`], solutionVisual: { kind: 'emoji', chars: e, label: w } };
}, { tagLabels: { 'bild-wort': 'Wort zum Bild finden', 'wort-bild': 'Bild zum Wort finden' }, testSeconds: 15 });

const LUECKE: [string, string][] = [
  ['Hund', '🐶'], ['Mond', '🌙'], ['Hand', '✋'], ['Fisch', '🐟'], ['Hase', '🐰'], ['Hut', '🎩'], ['Bus', '🚌'], ['Sofa', '🛋️'], ['Igel', '🦔'], ['Rad', '🚲'],
  ['Wal', '🐋'], ['Kamel', '🐫'], ['Pilz', '🍄'], ['Tomate', '🍅'], ['Rose', '🌹'], ['Zebra', '🦓'], ['Lama', '🦙'], ['Schal', '🧣'], ['Tiger', '🐯'], ['Ente', '🦆'],
];
const luecke = D(1, 'd1-luecke', 'Welcher Buchstabe fehlt?', '🧩', {
  text: ['Sprich das Wort ganz langsam und hör genau hin: H – u – n – d.', 'Die Selbstlaute (a, e, i, o, u) hört man meistens deutlich.'],
  visual: { kind: 'word', word: 'Hund', mark: [[1, 2]] },
  videoQuery: 'Selbstlaute Vokale Klasse 1 hören',
}, (r) => {
  const [w, e] = pick(r, LUECKE);
  const idx = [...w].map((c, i) => ('aeiou'.includes(c.toLowerCase()) ? i : -1)).filter((i) => i >= 0);
  const i = pick(r, idx);
  const v = w[i].toLowerCase();
  const shown = w.slice(0, i) + '_' + w.slice(i + 1);
  return {
    key: `${w}-${i}`,
    prompt: `Welcher Buchstabe fehlt?\n${shown}`,
    speak: `Welcher Buchstabe fehlt im Wort ${w}?`,
    listen: { text: w, lang: 'de' },
    visual: { kind: 'emoji', chars: e },
    answer: { ...choice(r, i === 0 ? v.toUpperCase() : v, (i === 0 ? 'AEIOU' : 'aeiou').split('')), big: true },
    tags: ['selbstlaut'],
    solution: [`Das Wort heißt ${w}.`, `Es fehlt das ${v}.`],
    solutionVisual: { kind: 'word', word: w, mark: [[i, i + 1]] },
  };
}, { testSeconds: 15 });

// ---------- Klasse 2 ----------

const abc = D(2, 'd2-abc', 'Das ABC', '🔡', {
  text: ['Das Alphabet hat 26 Buchstaben: A B C D E F G H I J K L M N O P Q R S T U V W X Y Z.', 'Im Wörterbuch stehen Wörter nach dem ABC geordnet. Entscheidend ist der erste Buchstabe.', 'Haben zwei Wörter den gleichen ersten Buchstaben, schaust du auf den zweiten: Ball kommt vor Bus.'],
  visual: { kind: 'text', text: 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z' },
  videoQuery: 'Alphabet ABC Reihenfolge Wörterbuch Klasse 2',
}, (r) => {
  if (chance(r, 0.5)) {
    const i = ri(r, 1, 24);
    const after = chance(r, 0.5);
    const L = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const right = L[after ? i + 1 : i - 1];
    return { key: `l${i}${after}`, prompt: `Welcher Buchstabe kommt im ABC direkt ${after ? 'nach' : 'vor'} ${L[i]}?`, answer: choice(r, right, [L[after ? i - 1 : i + 1], L[(i + 2) % 26], L[Math.max(0, i - 2)]]), tags: ['buchstabenfolge'], solution: [`… ${L[i - 1]} ${L[i]} ${L[i + 1]} …`, `${after ? 'Nach' : 'Vor'} ${L[i]} kommt ${right}.`] };
  }
  const second = chance(r, 0.35);
  const pool = ['Apfel', 'Ball', 'Dach', 'Ente', 'Fuchs', 'Garten', 'Hose', 'Igel', 'Junge', 'Kuchen', 'Lampe', 'Mond', 'Nudel', 'Ofen', 'Puppe', 'Rabe', 'Sonne', 'Tisch', 'Uhr', 'Vogel', 'Wolke', 'Zahn'];
  const sameB = [['Bach', 'Bett', 'Bild', 'Boot', 'Bus'], ['Mann', 'Mehl', 'Milch', 'Mond', 'Mut'], ['Tag', 'Tee', 'Tisch', 'Tor', 'Tulpe'], ['Sand', 'Seil', 'Sieb', 'Sofa', 'Suppe']];
  const words = second ? pickN(r, pick(r, sameB), 3) : pickN(r, pool, 3);
  const first = [...words].sort((a, b) => a.localeCompare(b, 'de'))[0];
  return { key: words.join(','), prompt: 'Welches Wort kommt im ABC zuerst?', answer: choice(r, first, words), tags: [second ? 'zweiter-buchstabe' : 'erster-buchstabe'], solution: second ? ['Alle Wörter beginnen gleich – schau auf den zweiten Buchstaben.', `Sortiert: ${[...words].sort((a, b) => a.localeCompare(b, 'de')).join(', ')}`] : [`Sortiert nach dem ersten Buchstaben: ${[...words].sort((a, b) => a.localeCompare(b, 'de')).join(', ')}`] };
}, { tagLabels: { 'zweiter-buchstabe': 'nach dem 2. Buchstaben ordnen', buchstabenfolge: 'Buchstabenfolge' }, testSeconds: 20 });

// Nomen mit Artikel, Bild und Mehrzahl
const NOMEN: { w: string; a: 'der' | 'die' | 'das'; e: string; pl: string }[] = [
  { w: 'Hund', a: 'der', e: '🐶', pl: 'Hunde' }, { w: 'Katze', a: 'die', e: '🐱', pl: 'Katzen' }, { w: 'Haus', a: 'das', e: '🏠', pl: 'Häuser' },
  { w: 'Baum', a: 'der', e: '🌳', pl: 'Bäume' }, { w: 'Blume', a: 'die', e: '🌷', pl: 'Blumen' }, { w: 'Buch', a: 'das', e: '📖', pl: 'Bücher' },
  { w: 'Apfel', a: 'der', e: '🍎', pl: 'Äpfel' }, { w: 'Banane', a: 'die', e: '🍌', pl: 'Bananen' }, { w: 'Auto', a: 'das', e: '🚗', pl: 'Autos' },
  { w: 'Ball', a: 'der', e: '⚽', pl: 'Bälle' }, { w: 'Maus', a: 'die', e: '🐭', pl: 'Mäuse' }, { w: 'Schaf', a: 'das', e: '🐑', pl: 'Schafe' },
  { w: 'Stuhl', a: 'der', e: '🪑', pl: 'Stühle' }, { w: 'Sonne', a: 'die', e: '☀️', pl: 'Sonnen' }, { w: 'Fahrrad', a: 'das', e: '🚲', pl: 'Fahrräder' },
  { w: 'Fisch', a: 'der', e: '🐟', pl: 'Fische' }, { w: 'Tasse', a: 'die', e: '☕', pl: 'Tassen' }, { w: 'Ei', a: 'das', e: '🥚', pl: 'Eier' },
  { w: 'Vogel', a: 'der', e: '🐦', pl: 'Vögel' }, { w: 'Uhr', a: 'die', e: '⌚', pl: 'Uhren' }, { w: 'Pferd', a: 'das', e: '🐴', pl: 'Pferde' },
  { w: 'Stern', a: 'der', e: '⭐', pl: 'Sterne' }, { w: 'Brille', a: 'die', e: '👓', pl: 'Brillen' }, { w: 'Bett', a: 'das', e: '🛏️', pl: 'Betten' },
  { w: 'Zahn', a: 'der', e: '🦷', pl: 'Zähne' }, { w: 'Hand', a: 'die', e: '✋', pl: 'Hände' }, { w: 'Kind', a: 'das', e: '🧒', pl: 'Kinder' },
  { w: 'Mond', a: 'der', e: '🌙', pl: 'Monde' }, { w: 'Gurke', a: 'die', e: '🥒', pl: 'Gurken' }, { w: 'Schwein', a: 'das', e: '🐷', pl: 'Schweine' },
  // Nachtlauf 22.10.2026: mehr Nomen (keine Wörter mit Doppel-Selbstlaut – „Boöte“ – und keine mit gleicher Mehrzahl wie Kuchen)
  { w: 'Hase', a: 'der', e: '🐰', pl: 'Hasen' }, { w: 'Kuh', a: 'die', e: '🐄', pl: 'Kühe' }, { w: 'Glas', a: 'das', e: '🥛', pl: 'Gläser' },
  { w: 'Hut', a: 'der', e: '🎩', pl: 'Hüte' }, { w: 'Nase', a: 'die', e: '👃', pl: 'Nasen' }, { w: 'Schiff', a: 'das', e: '🚢', pl: 'Schiffe' },
  { w: 'Frosch', a: 'der', e: '🐸', pl: 'Frösche' }, { w: 'Biene', a: 'die', e: '🐝', pl: 'Bienen' }, { w: 'Herz', a: 'das', e: '❤️', pl: 'Herzen' },
  { w: 'Bär', a: 'der', e: '🐻', pl: 'Bären' }, { w: 'Kerze', a: 'die', e: '🕯️', pl: 'Kerzen' }, { w: 'Brot', a: 'das', e: '🍞', pl: 'Brote' },
  { w: 'Topf', a: 'der', e: '🍲', pl: 'Töpfe' }, { w: 'Tomate', a: 'die', e: '🍅', pl: 'Tomaten' }, { w: 'Zelt', a: 'das', e: '⛺', pl: 'Zelte' },
  { w: 'Hahn', a: 'der', e: '🐓', pl: 'Hähne' }, { w: 'Ente', a: 'die', e: '🦆', pl: 'Enten' }, { w: 'Krokodil', a: 'das', e: '🐊', pl: 'Krokodile' },
];
const VERBEN = ['laufen', 'spielen', 'lesen', 'schreiben', 'singen', 'malen', 'springen', 'essen', 'trinken', 'lachen', 'schwimmen', 'tanzen', 'rufen', 'bauen', 'schlafen', 'kochen', 'klettern', 'werfen', 'fliegen', 'helfen', 'rennen', 'weinen', 'sägen', 'basteln', 'putzen', 'turnen', 'graben', 'fahren', 'nähen', 'füttern', 'hüpfen', 'gießen', 'wandern', 'pflücken', 'zeichnen', 'rutschen'];
// Verben in der er-Form: als Ablenker bei „Nomen erkennen“ eindeutig keine Nomen (ESSEN oder RENNEN könnten es sein: das Essen)
const VERBEN_ER = ['läuft', 'spielt', 'liest', 'schreibt', 'singt', 'malt', 'springt', 'isst', 'trinkt', 'lacht', 'schwimmt', 'tanzt', 'ruft', 'baut', 'schläft', 'kocht', 'klettert', 'wirft', 'fliegt', 'hilft', 'rennt', 'weint', 'sägt', 'bastelt', 'putzt', 'turnt'];
const ADJ = ['groß', 'klein', 'schnell', 'langsam', 'laut', 'leise', 'bunt', 'lustig', 'müde', 'warm', 'kalt', 'süß', 'nass', 'weich', 'hell', 'dunkel'];

const nomen = D(2, 'd2-nomen', 'Nomen erkennen', '🏷️', {
  text: ['Nomen (Namenwörter) sind Namen für Menschen, Tiere, Pflanzen und Dinge: Kind, Hund, Blume, Ball.', 'Nomen haben einen Begleiter: der, die oder das.', 'Nomen schreibt man immer groß!', 'Probe: Kann ich der, die oder das davor setzen? „der Hund“ ✓ – „der laufen“ ✗'],
  visual: { kind: 'emoji', chars: '🐶 🌷 ⚽', label: 'der Hund · die Blume · der Ball' },
  videoQuery: 'Nomen Namenwörter erkennen Klasse 2',
}, (r) => {
  const n = pick(r, NOMEN);
  const opts = [n.w, ...pickN(r, VERBEN_ER, 2), pick(r, ADJ.filter((a) => a !== 'dunkel' && a !== 'laut'))].map((x) => x.toUpperCase());
  return { key: n.w, prompt: 'Welches Wort ist ein Nomen?', answer: choice(r, n.w.toUpperCase(), opts.slice(1)), tags: ['nomen'], solution: [`${n.w} ist ein Nomen: ${n.a} ${n.w}.`, 'Die anderen Wörter sind Verben (Tunwörter) oder Adjektive (Wiewörter) – davor passt kein der, die, das.', `Man schreibt es groß: ${n.w}`] };
}, { testSeconds: 15 });

const artikel = D(2, 'd2-artikel', 'der, die, das', '🎩', {
  text: ['Jedes Nomen hat einen Begleiter (Artikel): der, die oder das.', 'der Hund – die Katze – das Haus', 'Den richtigen Artikel muss man oft auswendig lernen. Tipp: Lerne jedes Nomen immer zusammen mit seinem Artikel!', 'In der Mehrzahl heißt es immer „die“: die Hunde, die Häuser.'],
  visual: { kind: 'emoji', chars: '🐶 🐱 🏠', label: 'der · die · das' },
  videoQuery: 'Artikel der die das Klasse 2',
}, (r) => {
  const n = pick(r, NOMEN);
  return { key: n.w, prompt: `Welcher Artikel passt?\n☐ ${n.w}`, speak: `Welcher Artikel passt zu ${n.w}?`, visual: { kind: 'emoji', chars: n.e }, answer: fixedChoice(['der', 'die', 'das'], n.a), tags: [`artikel-${n.a}`], solution: [`Es heißt: ${n.a} ${n.w}`, `Mehrzahl: die ${n.pl}`] };
}, { tagLabels: { 'artikel-der': 'Wörter mit „der“', 'artikel-die': 'Wörter mit „die“', 'artikel-das': 'Wörter mit „das“' }, testSeconds: 12 });

function wrongPlurals(w: string, pl: string): string[] {
  const uml = (s: string) => s.replace(/a(?=[^a]*$)/, 'ä').replace(/o(?=[^o]*$)/, 'ö').replace(/u(?=[^u]*$)/, 'ü');
  // Wörter auf -e (Sonne, Biene): keine Formen wie „Sönnee“ oder „Sonneer“
  const c = w.endsWith('e') ? [w + 's', w + 'r', uml(w) + 'n', uml(w), w.slice(0, -1) + 's'] : [w + 's', w + 'en', w + 'e', w + 'er', uml(w) + 'e', w + 'n', uml(w) + 'er'];
  return [...new Set(c)].filter((x) => x !== pl && x !== w);
}
const mehrzahl = D(2, 'd2-mehrzahl', 'Einzahl und Mehrzahl', '👯', {
  text: ['Einzahl: ein Ding. Mehrzahl: viele Dinge.', 'Die Mehrzahl bildet man verschieden: Hund → Hunde, Katze → Katzen, Buch → Bücher, Auto → Autos.', 'Oft wird aus a, o, u ein ä, ö, ü: Baum → Bäume, Vogel → Vögel.', 'In der Mehrzahl ist der Artikel immer „die“.'],
  visual: { kind: 'emoji', chars: '🌳 → 🌳🌳🌳', label: 'der Baum → die Bäume' },
  videoQuery: 'Einzahl Mehrzahl Nomen Klasse 2',
}, (r) => {
  const n = pick(r, NOMEN);
  return { key: n.w, prompt: `${n.a} ${n.w} – die ☐`, speak: `${n.a} ${n.w}. Wie heißt die Mehrzahl?`, visual: { kind: 'emoji', chars: `${n.e} ${n.e} ${n.e}` }, answer: choice(r, n.pl, wrongPlurals(n.w, n.pl)), tags: [/[äöü]/.test(n.pl) && !/[äöü]/.test(n.w) ? 'umlaut' : 'mehrzahl'], solution: [`Einzahl: ${n.a} ${n.w}`, `Mehrzahl: die ${n.pl}`] };
}, { tagLabels: { umlaut: 'Mehrzahl mit ä, ö, ü' }, testSeconds: 15 });

const verben = D(2, 'd2-verben', 'Verben erkennen', '🏃', {
  text: ['Verben (Tunwörter) sagen, was jemand tut oder was passiert: laufen, lesen, schlafen.', 'Probe: Passt „ich …“ oder „wir …“ davor? „ich laufe“ ✓', 'Verben schreibt man klein (außer am Satzanfang).'],
  visual: { kind: 'emoji', chars: '🏃 📖 😴', label: 'laufen · lesen · schlafen' },
  videoQuery: 'Verben Tunwörter erkennen Klasse 2',
}, (r) => {
  const v = pick(r, VERBEN);
  const opts = [pick(r, NOMEN).w, pick(r, NOMEN).w, pick(r, ADJ)].map((x) => x.toUpperCase());
  return { key: v, prompt: 'Welches Wort ist ein Verb (Tunwort)?', answer: choice(r, v.toUpperCase(), opts), tags: ['verb'], solution: [`${v} ist ein Verb: ich ${/eln$/.test(v) ? v.replace(/eln$/, 'le') : /ern$/.test(v) ? v.replace(/ern$/, 'ere') : v.replace(/en$/, 'e')}, wir ${v}.`, 'Verben sagen, was jemand tut.'] };
}, { testSeconds: 15 });

const GEGENTEIL: [string, string][] = [['groß', 'klein'], ['dick', 'dünn'], ['heiß', 'kalt'], ['hell', 'dunkel'], ['laut', 'leise'], ['schnell', 'langsam'], ['nass', 'trocken'], ['voll', 'leer'], ['hart', 'weich'], ['lang', 'kurz'], ['schwer', 'leicht'], ['früh', 'spät'], ['reich', 'arm'], ['fröhlich', 'traurig'], ['sauber', 'schmutzig'], ['stark', 'schwach'], ['offen', 'geschlossen'], ['hoch', 'tief']];
const adjektive2 = D(2, 'd2-adjektive', 'Adjektive und Gegenteile', '🌗', {
  text: ['Adjektive (Wiewörter) sagen, wie etwas ist: groß, schnell, bunt.', 'Viele Adjektive haben ein Gegenteil: groß – klein, heiß – kalt.', 'Adjektive schreibt man klein.'],
  visual: { kind: 'emoji', chars: '🐘 🐭', label: 'groß – klein' },
  videoQuery: 'Adjektive Wiewörter Gegenteile Klasse 2',
}, (r) => {
  const [a, b] = pick(r, GEGENTEIL);
  const [w, g] = chance(r, 0.5) ? [a, b] : [b, a];
  const others = GEGENTEIL.flat().filter((x) => x !== w && x !== g);
  return { key: w, prompt: `Was ist das Gegenteil von „${w}“?`, answer: { ...choice(r, g, pickN(r, others, 3)), speakOptions: 'de' }, tags: ['gegenteil'], solution: [`Das Gegenteil von ${w} ist ${g}.`] };
}, { testSeconds: 15 });

const SAETZE_ZEICHEN: [string, '.' | '?' | '!'][] = [
  ['Wie heißt du', '?'], ['Kommst du mit zum Spielplatz', '?'], ['Wo wohnst du', '?'], ['Hast du einen Hund', '?'], ['Wann beginnt die Pause', '?'], ['Magst du Eis', '?'],
  ['Ich spiele gern Fußball', '.'], ['Die Katze schläft auf dem Sofa', '.'], ['Heute scheint die Sonne', '.'], ['Mein Bruder ist sechs Jahre alt', '.'], ['Wir gehen in den Zoo', '.'], ['Der Bus kommt um acht Uhr', '.'],
  ['Pass auf', '!'], ['Hilfe', '!'], ['Komm sofort her', '!'], ['Sei leise', '!'], ['Vorsicht, heiß', '!'], ['Lauf schnell weg', '!'],
  ['Was machst du heute', '?'], ['Kannst du mir helfen', '?'], ['Wie spät ist es', '?'], ['Am Montag haben wir Sport', '.'], ['Lena malt ein Bild', '.'], ['Im Herbst fallen die Blätter', '.'],
  ['Mach bitte sofort die Tür zu', '!'], ['Halt, stopp', '!'], ['Juhu, wir haben gewonnen', '!'],
  // Nachtlauf 22.10.2026: mehr Sätze
  ['Wer hat meinen Stift genommen', '?'], ['Warum weint das Baby', '?'], ['Gehst du morgen schwimmen', '?'], ['Unser Hund heißt Bello', '.'], ['Oma backt einen Apfelkuchen', '.'], ['Im Winter ist es kalt', '.'],
  ['Räum bitte dein Zimmer auf', '!'], ['Gib mir sofort den Ball', '!'], ['Toll, ein Regenbogen', '!'],
];
const SATZART: Record<'.' | '?' | '!', string> = { '.': 'Aussagesatz', '?': 'Fragesatz', '!': 'Ausrufe- oder Aufforderungssatz' };
const FRAGE_UM: [string, string, string[]][] = [
  ['Du hast einen Hund.', 'Hast du einen Hund?', ['Du hast einen Hund?', 'Hast du einen Hund.', 'Einen Hund hast du!']],
  ['Lena malt ein Bild.', 'Malt Lena ein Bild?', ['Lena malt ein Bild?', 'Malt Lena ein Bild.', 'Ein Bild malt Lena!']],
  ['Der Bus kommt um acht Uhr.', 'Kommt der Bus um acht Uhr?', ['Der Bus kommt um acht Uhr?', 'Kommt der Bus um acht Uhr.', 'Um acht Uhr kommt der Bus!']],
  ['Ihr spielt Fußball.', 'Spielt ihr Fußball?', ['Ihr spielt Fußball?', 'Spielt ihr Fußball.', 'Fußball spielt ihr!']],
  ['Tim kann schwimmen.', 'Kann Tim schwimmen?', ['Tim kann schwimmen?', 'Kann Tim schwimmen.', 'Schwimmen kann Tim!']],
  ['Es regnet heute.', 'Regnet es heute?', ['Es regnet heute?', 'Regnet es heute.', 'Heute regnet es!']],
  // Nachtlauf 22.10.2026: mehr Sätze
  ['Mama kocht Nudeln.', 'Kocht Mama Nudeln?', ['Mama kocht Nudeln?', 'Kocht Mama Nudeln.', 'Nudeln kocht Mama!']],
  ['Du kommst mit.', 'Kommst du mit?', ['Du kommst mit?', 'Kommst du mit.', 'Mit kommst du!']],
  ['Der Hund ist müde.', 'Ist der Hund müde?', ['Der Hund ist müde?', 'Ist der Hund müde.', 'Müde ist der Hund!']],
  ['Ihr habt Hunger.', 'Habt ihr Hunger?', ['Ihr habt Hunger?', 'Habt ihr Hunger.', 'Hunger habt ihr!']],
];
const satzarten = D(3, 'd3-satzarten', 'Satzarten', '💬', {
  text: ['Aussagesatz: Ich erzähle etwas. Am Ende steht ein Punkt. „Lena malt ein Bild.“', 'Fragesatz: Ich frage etwas. Das Verb oder ein W-Wort steht vorne, am Ende ein Fragezeichen. „Malt Lena ein Bild?“', 'Ausrufe- oder Aufforderungssatz: Ich rufe oder fordere auf. Am Ende ein Ausrufezeichen. „Komm her!“'],
  visual: { kind: 'text', text: 'Lena malt ein Bild.\nMalt Lena ein Bild?\nMal ein Bild!' },
  videoQuery: 'Satzarten Aussagesatz Fragesatz Aufforderungssatz Grundschule',
}, (r, st) => {
  // Aussagesatz in Fragesatz umwandeln (ab Stufe 2)
  if (st > 1 && chance(r, 0.4)) {
    const [a, q, wrong] = pick(r, FRAGE_UM);
    return { key: `u-${a}`, prompt: `Mach aus dem Aussagesatz einen Fragesatz:\n${a}`, answer: choice(r, q, wrong), tags: ['umformen'], traps: [{ answer: wrong[0], tag: 'nur-fragezeichen', hint: 'Nur ein Fragezeichen reicht nicht: Beim Fragesatz rückt das Verb nach vorne.' }], solution: [`${a} → ${q}`, 'Beim Fragesatz steht das Verb vorne und am Ende ein Fragezeichen.'] };
  }
  const [s, z] = pick(r, SAETZE_ZEICHEN);
  // ab Stufe 2 ohne Satzzeichen: am Satzbau erkennen (Verb vorne, W-Wort, Aufforderung)
  const hide = st > 1;
  const why = z === '?' ? 'Das Verb oder ein W-Wort steht vorne – so fragt man.' : z === '!' ? 'Hier wird gerufen oder jemand wird aufgefordert.' : 'Hier wird etwas erzählt – das Verb steht an zweiter Stelle.';
  return { key: `${s}-${hide}`, prompt: hide ? `Welche Satzart ist das? (Das Satzzeichen fehlt.)\n„${s} …“` : `Welche Satzart ist das?\n„${s}${z}“`, answer: fixedChoice(Object.values(SATZART), SATZART[z]), tags: [z === '.' ? 'aussage' : z === '?' ? 'frage' : 'ausruf'], solution: [hide ? why : `Am Ende steht „${z}“.`, `„${s}${z}“ ist ein ${SATZART[z]}.`] };
}, { tagLabels: { aussage: 'Aussagesätze', frage: 'Fragesätze', ausruf: 'Ausrufe- und Aufforderungssätze', umformen: 'Fragesätze bilden', 'nur-fragezeichen': 'nur Fragezeichen statt Verb nach vorne' }, testSeconds: 20 });

const satzzeichen = D(2, 'd2-satzzeichen', 'Satzzeichen . ? !', '❓', {
  text: ['Am Ende eines Satzes steht ein Satzzeichen.', 'Punkt (.): Ich erzähle etwas. „Ich spiele Fußball.“', 'Fragezeichen (?): Ich frage etwas. „Wie heißt du?“ Fragesätze beginnen oft mit W-Wörtern oder dem Verb.', 'Ausrufezeichen (!): Ich rufe, warne oder fordere auf. „Pass auf!“'],
  visual: { kind: 'text', text: '.   ?   !' },
  videoQuery: 'Satzzeichen Punkt Fragezeichen Ausrufezeichen Klasse 2',
}, (r) => {
  const [s, z] = pick(r, SAETZE_ZEICHEN);
  return { key: s, prompt: `Welches Satzzeichen fehlt?\n${s} ☐`, speak: `Welches Satzzeichen fehlt? ${s}`, answer: { ...fixedChoice(['.', '?', '!'], z), big: true }, tags: [{ '.': 'punkt', '?': 'fragezeichen', '!': 'ausrufezeichen' }[z]], solution: [`${s}${z}`, z === '?' ? 'Das ist eine Frage.' : z === '!' ? 'Hier wird gerufen, gewarnt oder aufgefordert.' : 'Hier wird etwas erzählt.'] };
}, { tagLabels: { punkt: 'Punkt', fragezeichen: 'Fragezeichen', ausrufezeichen: 'Ausrufezeichen' }, testSeconds: 15 });

const DOPPEL: Pair[] = [['Sonne', 'Sone', '☀️'], ['Kamm', 'Kam', '💇'], ['Ball', 'Bal', '⚽'], ['Puppe', 'Pupe', '🪆'], ['Tasse', 'Tase', '☕'], ['Butter', 'Buter', '🧈'], ['Wasser', 'Waser', '💧'], ['Teller', 'Teler', '🍽️'], ['Schiff', 'Schif', '🚢'], ['Himmel', 'Himel', '🌌'], ['Brille', 'Brile', '👓'], ['Koffer', 'Kofer', '🧳'], ['Tanne', 'Tane', '🌲'], ['Hammer', 'Hamer', '🔨'], ['Suppe', 'Supe', '🍲'], ['Mutter', 'Muter', '👩'], ['Bett', 'Bet', '🛏️'], ['Ritter', 'Riter', '🛡️'], ['Wanne', 'Wane', '🛁'], ['Pfeffer', 'Pfefer', '🌶️'],
  ['Hose', 'Hosse', '👖'], ['Nase', 'Nasse', '👃'], ['Rose', 'Rosse', '🌹'], ['Hut', 'Hutt', '🎩'], ['Tomate', 'Tommate', '🍅']];
const doppel = D(2, 'd2-doppelkonsonant', 'Doppelte Mitlaute', '👯‍♀️', {
  text: ['Nach einem kurzen, betonten Selbstlaut folgt oft ein doppelter Mitlaut: Sonne, Ball, Kamm.', 'Sprich das Wort und achte auf den Selbstlaut: Ist er kurz (Sonne) oder lang (Hose)?', 'Kurz → doppelt: Puppe, Tasse. Lang → einfach: Hose, Nase.', 'Tipp: Klatsche die Silben – bei Son-ne hörst du das n am Ende der ersten und am Anfang der zweiten Silbe.'],
  visual: { kind: 'syllables', parts: ['Son', 'ne'], emoji: '☀️' },
  videoQuery: 'doppelte Mitlaute Doppelkonsonanten kurzer Vokal Klasse 2',
}, (r, s) => spellTask(r, s, DOPPEL, (p) => (p[0].length > p[1].length ? 'kurzer-vokal' : 'langer-vokal'), (p) => (p[0].length > p[1].length ? ['Der Selbstlaut vorher ist kurz – deshalb kommt ein doppelter Mitlaut.'] : ['Der Selbstlaut ist lang – deshalb nur ein Mitlaut.'])), { tagLabels: { 'kurzer-vokal': 'Doppelung nach kurzem Vokal', 'langer-vokal': 'keine Doppelung nach langem Vokal' }, testSeconds: 12 });

const CKTZ: Pair[] = [['Zucker', 'Zuker', '🍬'], ['Decke', 'Deke', '🛏️'], ['Glocke', 'Gloke', '🔔'], ['Socke', 'Soke', '🧦'], ['Jacke', 'Jake', '🧥'], ['Schnecke', 'Schneke', '🐌'], ['Brücke', 'Brüke', '🌉'], ['Rucksack', 'Ruksak', '🎒'],
  ['Katze', 'Kaze', '🐱'], ['Mütze', 'Müze', '🧢'], ['Spatz', 'Spaz', '🐦'], ['Blitz', 'Bliz', '⚡'], ['Platz', 'Plaz', '🏟️'], ['Tatze', 'Taze', '🐾'], ['Pfütze', 'Pfüze', '💦'],
  ['Brezel', 'Bretzel', '🥨'], ['Kerze', 'Kertze', '🕯️'], ['Pilz', 'Piltz', '🍄'], ['Kreuz', 'Kreutz', '✝️'], ['Onkel', 'Onckel', '👨'], ['Bank', 'Banck', '🪑'], ['Haken', 'Hacken', '🪝'],
  // Nachtlauf 22.10.2026: mehr Aufgaben
  ['Wecker', 'Weker', '⏰'], ['Bäcker', 'Bäker', '🥖'], ['Rock', 'Rok', '👗'], ['Mücke', 'Müke', '🦟'], ['Hitze', 'Hize', '🥵'], ['Witz', 'Wiz', '😂'], ['Netz', 'Nez', '🥅'], ['Schatz', 'Schaz', '💰'],
  ['Herz', 'Hertz', '❤️'], ['Salz', 'Saltz', '🧂'], ['Park', 'Parck', '🏞️']];
const cktz = D(2, 'd2-ck-tz', 'ck und tz', '🧦', {
  text: ['Nach einem kurzen Selbstlaut schreibt man ck statt kk und tz statt zz: Socke, Katze.', 'Nach einem langen Selbstlaut, nach au/ei/eu oder nach einem Mitlaut (l, n, r) steht nur k oder z: Haken, Kreuz, Kerze, Onkel.', 'Merkspruch: Nach l, n, r – das merke ja – steht nie tz und nie ck!'],
  visual: { kind: 'word', word: 'Socke', mark: [[2, 4]] },
  videoQuery: 'ck und tz Rechtschreibung Klasse 2',
}, (r, s) => spellTask(r, s, CKTZ, (p) => (p[0].includes('ck') ? 'ck' : p[0].includes('tz') ? 'tz' : 'kein-ck-tz'), (p) => (p[0].includes('ck') || p[0].includes('tz') ? ['Der Selbstlaut davor ist kurz – deshalb ck oder tz.'] : ['Davor steht ein langer Selbstlaut, ein Doppellaut oder l, n, r – deshalb nur k oder z.'])), { tagLabels: { ck: 'Wörter mit ck', tz: 'Wörter mit tz', 'kein-ck-tz': 'k/z nach l, n, r oder langem Vokal' }, testSeconds: 12 });

const IE: Pair[] = [['Biene', 'Bine', '🐝'], ['Brief', 'Brif', '✉️'], ['Spiegel', 'Spigel', '🪞'], ['Ziege', 'Zige', '🐐'], ['Fliege', 'Flige', '🪰'], ['Kiefer', 'Kifer', '🌲'], ['Wiese', 'Wise', '🌾'], ['Papier', 'Papir', '📄'], ['Tier', 'Tir', '🐾'], ['vier', 'vir', '4️⃣'], ['Dieb', 'Dib', '🦹'], ['Knie', 'Kni', '🦵'], ['Stiefel', 'Stifel', '🥾'],
  ['Tiger', 'Tieger', '🐯'], ['Kino', 'Kieno', '🎬'], ['Igel', 'Iegel', '🦔'], ['Krokodil', 'Krokodiel', '🐊'], ['Bibel', 'Biebel', '📕'], ['Fisch', 'Fiesch', '🐟'], ['Kiste', 'Kieste', '📦'],
  // Nachtlauf 22.10.2026: mehr Wörter
  ['Fieber', 'Fiber', '🤒'], ['Ziel', 'Zil', '🏁'], ['Spiel', 'Spil', '🎲'], ['Lied', 'Lid', '🎵'], ['Riegel', 'Rigel', '🍫'], ['Klavier', 'Klavir', '🎹'], ['Zwiebel', 'Zwibel', '🧅'],
  ['Kirsche', 'Kiersche', '🍒'], ['Schiff', 'Schieff', '🚢'], ['Ring', 'Rieng', '💍'], ['Wind', 'Wiend', '🌬️'], ['Maschine', 'Maschiene', '⚙️'], ['Benzin', 'Benzien', '⛽']];
const ie = D(2, 'd2-ie', 'ie oder i', '🐝', {
  text: ['Hörst du ein langes i, schreibst du meistens ie: Biene, Wiese, vier.', 'Hörst du ein kurzes i, schreibst du i: Fisch, Kiste.', 'Ausnahmen musst du dir merken (Merkwörter): Tiger, Igel, Kino, Krokodil, Bibel.'],
  visual: { kind: 'word', word: 'Biene', mark: [[1, 3]] },
  videoQuery: 'Wörter mit ie langes i Klasse 2',
}, (r, s) => spellTask(r, s, IE, (p) => (p[0].includes('ie') ? 'ie' : ['Tiger', 'Kino', 'Igel', 'Krokodil', 'Bibel', 'Maschine', 'Benzin'].includes(p[0]) ? 'merkwort' : 'kurzes-i'), (p) => (p[0].includes('ie') ? ['Das i ist lang – deshalb ie.'] : ['Tiger', 'Kino', 'Igel', 'Krokodil', 'Bibel', 'Maschine', 'Benzin'].includes(p[0]) ? ['Das ist ein Merkwort: langes i, aber ohne e.'] : ['Das i ist kurz – deshalb nur i.'])), { tagLabels: { ie: 'langes i (ie)', merkwort: 'Merkwörter mit i', 'kurzes-i': 'kurzes i' }, testSeconds: 12 });

const GROSS_SAETZE: { w: string[]; noun: number[] }[] = [
  { w: ['Der', 'Hund', 'spielt', 'mit', 'dem', 'Ball'], noun: [1, 5] }, { w: ['Meine', 'Oma', 'backt', 'einen', 'Kuchen'], noun: [1, 4] },
  { w: ['Im', 'Garten', 'blühen', 'viele', 'Blumen'], noun: [1, 4] }, { w: ['Tim', 'liest', 'ein', 'spannendes', 'Buch'], noun: [0, 4] },
  { w: ['Die', 'Katze', 'schläft', 'auf', 'dem', 'Sofa'], noun: [1, 5] }, { w: ['Wir', 'fahren', 'mit', 'dem', 'Bus', 'zur', 'Schule'], noun: [4, 6] },
  { w: ['Am', 'Morgen', 'trinke', 'ich', 'Milch'], noun: [1, 4] }, { w: ['Der', 'Vogel', 'singt', 'im', 'Baum'], noun: [1, 4] },
  { w: ['Lena', 'malt', 'ein', 'buntes', 'Bild'], noun: [0, 4] }, { w: ['Der', 'Bauer', 'füttert', 'die', 'Kühe'], noun: [1, 4] },
  { w: ['Mein', 'Bruder', 'spielt', 'gern', 'Fußball'], noun: [1, 4] }, { w: ['Im', 'Winter', 'fällt', 'oft', 'Schnee'], noun: [1, 4] },
  { w: ['Die', 'Kinder', 'bauen', 'eine', 'Sandburg'], noun: [1, 4] }, { w: ['Papa', 'kocht', 'heute', 'leckere', 'Nudeln'], noun: [0, 4] },
  { w: ['Am', 'Abend', 'lese', 'ich', 'ein', 'Buch'], noun: [1, 5] }, { w: ['Der', 'Fisch', 'schwimmt', 'im', 'Teich'], noun: [1, 4] },
  { w: ['Unsere', 'Lehrerin', 'erzählt', 'eine', 'Geschichte'], noun: [1, 4] }, { w: ['Ben', 'trägt', 'eine', 'rote', 'Mütze'], noun: [0, 4] },
  { w: ['Die', 'Sonne', 'scheint', 'hell', 'am', 'Himmel'], noun: [1, 5] }, { w: ['Nach', 'der', 'Schule', 'spielen', 'wir', 'im', 'Park'], noun: [2, 6] },
  // Nachtlauf 22.10.2026: mehr Sätze
  { w: ['Der', 'Opa', 'repariert', 'das', 'Fahrrad'], noun: [1, 4] }, { w: ['Im', 'Sommer', 'essen', 'wir', 'gern', 'Eis'], noun: [1, 5] },
  { w: ['Mia', 'füttert', 'ihren', 'Hasen'], noun: [0, 3] }, { w: ['Die', 'Ente', 'schwimmt', 'auf', 'dem', 'See'], noun: [1, 5] },
  { w: ['Am', 'Montag', 'haben', 'wir', 'Sport'], noun: [1, 4] }, { w: ['Der', 'Wind', 'weht', 'die', 'Blätter', 'vom', 'Baum'], noun: [1, 4, 6] },
  { w: ['Jonas', 'schreibt', 'einen', 'Brief', 'an', 'Oma'], noun: [0, 3, 5] }, { w: ['Die', 'Kinder', 'singen', 'ein', 'Lied'], noun: [1, 4] },
  { w: ['Der', 'Hase', 'hoppelt', 'über', 'die', 'Wiese'], noun: [1, 5] }, { w: ['Lisa', 'gießt', 'die', 'Blumen', 'im', 'Garten'], noun: [0, 3, 5] },
  { w: ['Im', 'Herbst', 'fallen', 'die', 'Blätter'], noun: [1, 4] }, { w: ['Mama', 'kauft', 'frische', 'Brötchen'], noun: [0, 3] },
  { w: ['Der', 'Hund', 'bellt', 'den', 'Briefträger', 'an'], noun: [1, 4] }, { w: ['Wir', 'gehen', 'heute', 'in', 'den', 'Zoo'], noun: [5] },
  { w: ['Die', 'Maus', 'frisst', 'ein', 'Stück', 'Käse'], noun: [1, 4, 5] }, { w: ['Am', 'Wochenende', 'besuchen', 'wir', 'Oma'], noun: [1, 4] },
];
const grossschreibung = D(2, 'd2-grossschreibung', 'Groß oder klein?', '🔠', {
  text: ['Groß schreibt man: das erste Wort im Satz und alle Nomen (Namenwörter).', 'Klein schreibt man: Verben (Tunwörter), Adjektive (Wiewörter) und kleine Wörter wie mit, auf, ein.', 'Probe für Nomen: Passt der, die oder das davor?'],
  visual: { kind: 'text', text: 'Der Hund spielt mit dem Ball.' },
  videoQuery: 'Großschreibung Satzanfang Nomen Klasse 2',
}, (r) => {
  const s = pick(r, GROSS_SAETZE);
  const right = s.w.join(' ') + '.';
  const lowerFirst = [s.w[0].toLowerCase(), ...s.w.slice(1)].join(' ') + '.';
  const ni = s.noun.find((i) => i > 0) ?? s.noun[0];
  const nounLow = s.w.map((x, i) => (i === ni ? x.toLowerCase() : x)).join(' ') + '.';
  const vi = s.w.findIndex((x, i) => i > 0 && !s.noun.includes(i) && /^[a-zäöü]/.test(x));
  const verbUp = s.w.map((x, i) => (i === vi ? x[0].toUpperCase() + x.slice(1) : x)).join(' ') + '.';
  return { key: right, prompt: 'Welcher Satz ist richtig geschrieben?', answer: choice(r, right, [lowerFirst, nounLow, verbUp]), tags: ['groß-klein'], traps: [{ answer: lowerFirst, tag: 'satzanfang', hint: 'Das erste Wort im Satz schreibt man immer groß.' }, { answer: nounLow, tag: 'nomen-klein', hint: `„${s.w[ni]}“ ist ein Nomen – Nomen schreibt man groß.` }, { answer: verbUp, tag: 'zu-groß', hint: `„${s.w[vi]?.toLowerCase()}“ ist kein Nomen und steht nicht am Satzanfang – also klein.` }], solution: [right, `Groß: der Satzanfang (${s.w[0]}) und die Nomen (${s.noun.map((i) => s.w[i]).join(', ')}).`] };
}, { tagLabels: { satzanfang: 'Satzanfang klein geschrieben', 'nomen-klein': 'Nomen klein geschrieben', 'zu-groß': 'zu viel groß geschrieben' }, testSeconds: 25 });

// ---------- Klasse 3 ----------

const WA_SAETZE: [string, 'N' | 'V' | 'A' | '-'][][] = [
  [['Der', '-'], ['kleine', 'A'], ['Hund', 'N'], ['bellt', 'V'], ['laut', 'A']],
  [['Lena', 'N'], ['malt', 'V'], ['ein', '-'], ['buntes', 'A'], ['Bild', 'N']],
  [['Die', '-'], ['Kinder', 'N'], ['spielen', 'V'], ['im', '-'], ['warmen', 'A'], ['Sand', 'N']],
  [['Mein', '-'], ['Opa', 'N'], ['erzählt', 'V'], ['lustige', 'A'], ['Geschichten', 'N']],
  [['Der', '-'], ['Zug', 'N'], ['fährt', 'V'], ['sehr', '-'], ['schnell', 'A']],
  [['Die', '-'], ['müde', 'A'], ['Katze', 'N'], ['schläft', 'V'], ['im', '-'], ['Korb', 'N']],
  [['Wir', '-'], ['essen', 'V'], ['süße', 'A'], ['Erdbeeren', 'N']],
  [['Der', '-'], ['Lehrer', 'N'], ['liest', 'V'], ['eine', '-'], ['spannende', 'A'], ['Geschichte', 'N']],
  [['Im', '-'], ['dunklen', 'A'], ['Wald', 'N'], ['heult', 'V'], ['ein', '-'], ['Wolf', 'N']],
  [['Paul', 'N'], ['trinkt', 'V'], ['kalten', 'A'], ['Kakao', 'N']],
];
const WA_NAME = { N: 'Nomen', V: 'Verb', A: 'Adjektiv' } as const;
const wortarten = D(3, 'd3-wortarten', 'Wortarten', '🧺', {
  text: ['Nomen: Namen für Menschen, Tiere, Dinge – mit Artikel, großgeschrieben (der Wald).', 'Verben: Was jemand tut oder was passiert (bellt, liest).', 'Adjektive: Wie etwas ist (klein, schnell). Probe: Passt es zwischen Artikel und Nomen? „der kleine Hund“'],
  visual: { kind: 'text', text: 'Der kleine Hund bellt laut.' },
  videoQuery: 'Wortarten Nomen Verben Adjektive Klasse 3',
}, (r) => {
  const s = pick(r, WA_SAETZE);
  const cand = s.map((x, i) => [x, i] as const).filter(([x]) => x[1] !== '-');
  const [[w, t], i] = pick(r, cand);
  const sentence = s.map(([x], k) => (k === i ? `**${x}**` : x)).join(' ') + '.';
  const name = WA_NAME[t as 'N' | 'V' | 'A'];
  return { key: `${sentence}`, prompt: `Welche Wortart ist das markierte Wort?\n${sentence}`, speak: `Welche Wortart ist das Wort ${w} in diesem Satz? ${s.map(([x]) => x).join(' ')}.`, answer: fixedChoice(['Nomen', 'Verb', 'Adjektiv'], name), tags: [name.toLowerCase()], solution: [t === 'N' ? `„${w}“ ist ein Nomen – man kann der, die oder das davor setzen.` : t === 'V' ? `„${w}“ ist ein Verb – es sagt, was jemand tut oder was passiert.` : `„${w}“ ist ein Adjektiv – es sagt, wie etwas ist.`] };
}, { tagLabels: { nomen: 'Nomen', verb: 'Verben', adjektiv: 'Adjektive' }, testSeconds: 15 });

// [Grundform, er/sie (Präsens), er/sie (Präteritum), Partizip, Hilfsverb, Ergänzung, falsche Formen]
const VERB_TAB: [string, string, string, string, 'hat' | 'ist', string, string[]][] = [
  ['gehen', 'geht', 'ging', 'gegangen', 'ist', 'nach Hause', ['gehte', 'gang', 'gingte']],
  ['laufen', 'läuft', 'lief', 'gelaufen', 'ist', 'schnell', ['laufte', 'lauf', 'liefte']],
  ['spielen', 'spielt', 'spielte', 'gespielt', 'hat', 'Fußball', ['spiel', 'spielten', 'spielt']],
  ['schreiben', 'schreibt', 'schrieb', 'geschrieben', 'hat', 'einen Brief', ['schreibte', 'schrob', 'schriebte']],
  ['essen', 'isst', 'aß', 'gegessen', 'hat', 'einen Apfel', ['esste', 'iss', 'aßte']],
  ['trinken', 'trinkt', 'trank', 'getrunken', 'hat', 'Saft', ['trinkte', 'trunk', 'trankte']],
  ['singen', 'singt', 'sang', 'gesungen', 'hat', 'ein Lied', ['singte', 'sung', 'sangte']],
  ['kommen', 'kommt', 'kam', 'gekommen', 'ist', 'zu spät', ['kommte', 'komm', 'kamte']],
  ['sehen', 'sieht', 'sah', 'gesehen', 'hat', 'einen Film', ['sehte', 'sieh', 'sahte']],
  ['fahren', 'fährt', 'fuhr', 'gefahren', 'ist', 'mit dem Rad', ['fahrte', 'fährte', 'fuhrte']],
  ['malen', 'malt', 'malte', 'gemalt', 'hat', 'ein Bild', ['mol', 'mal', 'mahlte']],
  ['springen', 'springt', 'sprang', 'gesprungen', 'ist', 'über den Bach', ['springte', 'sprung', 'sprangte']],
  ['schwimmen', 'schwimmt', 'schwamm', 'geschwommen', 'ist', 'im See', ['schwimmte', 'schwomm', 'schwammte']],
  ['lesen', 'liest', 'las', 'gelesen', 'hat', 'ein Buch', ['leste', 'lies', 'laste']],
  ['finden', 'findet', 'fand', 'gefunden', 'hat', 'einen Schatz', ['findete', 'fund', 'fandte']],
  ['bauen', 'baut', 'baute', 'gebaut', 'hat', 'eine Sandburg', ['bau', 'bot', 'bauten']],
  ['tanzen', 'tanzt', 'tanzte', 'getanzt', 'hat', 'im Kreis', ['tanz', 'tonz', 'tänzte']],
  ['fliegen', 'fliegt', 'flog', 'geflogen', 'ist', 'nach Spanien', ['fliegte', 'flug', 'flogte']],
  ['helfen', 'hilft', 'half', 'geholfen', 'hat', 'der Oma', ['helfte', 'hilf', 'halfte']],
  ['rufen', 'ruft', 'rief', 'gerufen', 'hat', 'laut', ['rufte', 'ruf', 'riefte']],
  ['nehmen', 'nimmt', 'nahm', 'genommen', 'hat', 'den Ball', ['nehmte', 'nimm', 'nahmte']],
  ['schlafen', 'schläft', 'schlief', 'geschlafen', 'hat', 'lange', ['schlafte', 'schläfte', 'schliefte']],
  ['werfen', 'wirft', 'warf', 'geworfen', 'hat', 'den Ball', ['werfte', 'wirf', 'warfte']],
  ['denken', 'denkt', 'dachte', 'gedacht', 'hat', 'an die Ferien', ['denkte', 'dank', 'dachtete']],
  ['bringen', 'bringt', 'brachte', 'gebracht', 'hat', 'ein Geschenk', ['bringte', 'brang', 'brachtete']],
  ['rennen', 'rennt', 'rannte', 'gerannt', 'ist', 'zum Bus', ['rennte', 'rann', 'ranntete']],
  ['lachen', 'lacht', 'lachte', 'gelacht', 'hat', 'laut', ['lach', 'lucht', 'lachten']],
  ['kochen', 'kocht', 'kochte', 'gekocht', 'hat', 'Suppe', ['koch', 'kuchte', 'kochten']],
];
const REGULAR = new Set(['spielen', 'malen', 'bauen', 'tanzen', 'lachen', 'kochen']);
const zeit3 = D(3, 'd3-zeitformen', 'Gegenwart und Vergangenheit', '⏳', {
  text: ['Gegenwart (Präsens): Das passiert jetzt. „Lena spielt Fußball.“', 'Vergangenheit (Präteritum): Das ist schon passiert – so schreibt man in Geschichten. „Lena spielte Fußball.“', 'Viele Verben bekommen nur ein -te: spielen → spielte.', 'Starke Verben verändern sich: gehen → ging, singen → sang. Diese musst du üben!', 'Umgekehrt geht es auch: Aus „Lena spielte“ wird in der Gegenwart „Lena spielt“.'],
  visual: { kind: 'text', text: 'spielt → spielte · geht → ging' },
  videoQuery: 'Präteritum Vergangenheit Verben Klasse 3',
}, (r, st) => {
  const v = pick(r, VERB_TAB);
  const n = pick(r, NAMES);
  const kind = REGULAR.has(v[0]) ? 'regelmäßig' : 'unregelmäßig';
  const w = st === 1 ? 0 : ri(r, 0, 3);
  // Gegenwart oder Vergangenheit erkennen
  if (w === 2) {
    const past = chance(r, 0.5);
    const sent = `${n} ${past ? v[2] : v[1]} ${v[5]}.`;
    return { key: `e-${v[0]}-${past}`, prompt: `Gegenwart oder Vergangenheit?
${sent}`, answer: fixedChoice(['Gegenwart', 'Vergangenheit'], past ? 'Vergangenheit' : 'Gegenwart'), tags: ['erkennen'], solution: [sent, past ? `„${v[2]}“ ist schon passiert → Vergangenheit. Jetzt hieße es: ${n} ${v[1]} …` : `„${v[1]}“ passiert jetzt → Gegenwart. Früher hieße es: ${n} ${v[2]} …`] };
  }
  // Rückrichtung: Vergangenheit → Gegenwart
  if (w === 3) {
    return { key: `g-${v[0]}`, prompt: `Setze in die Gegenwart:
${n} ${v[2]} ${v[5]}.
${n} ☐ ${v[5]}.`, speak: `Setze in die Gegenwart: ${n} ${v[2]} ${v[5]}.`, answer: choice(r, v[1], [v[0], v[2], ...v[6]].filter((x) => x !== v[1])), tags: [kind], solution: [`${n} ${v[1]} ${v[5]}.`, `Grundform: ${v[0]} – Gegenwart: ${v[1]} – Vergangenheit: ${v[2]}`] };
  }
  return { key: v[0], prompt: `Setze in die Vergangenheit:\n${n} ${v[1]} ${v[5]}.\n${n} ☐ ${v[5]}.`, speak: `Setze in die Vergangenheit: ${n} ${v[1]} ${v[5]}.`, answer: choice(r, v[2], v[6]), tags: [REGULAR.has(v[0]) ? 'regelmäßig' : 'unregelmäßig'], solution: [`${n} ${v[2]} ${v[5]}.`, REGULAR.has(v[0]) ? `${v[0]} ist ein schwaches Verb: Es bekommt -te.` : `${v[0]} ist ein starkes Verb: Es verändert sich (${v[1]} → ${v[2]}). Merke dir die Form!`] };
}, { tagLabels: { regelmäßig: 'schwache Verben (-te)', unregelmäßig: 'starke Verben (ging, sang …)', erkennen: 'Gegenwart oder Vergangenheit erkennen' }, testSeconds: 20 });

const ZUSAMMEN: [string, string, string, string, string, string][] = [
  ['das', 'Haus', 'die', 'Tür', 'Haustür', '🚪'], ['der', 'Apfel', 'der', 'Baum', 'Apfelbaum', '🌳'], ['der', 'Schnee', 'der', 'Mann', 'Schneemann', '⛄'],
  ['der', 'Fuß', 'der', 'Ball', 'Fußball', '⚽'], ['die', 'Sonne', 'die', 'Blume', 'Sonnenblume', '🌻'], ['der', 'Zahn', 'die', 'Bürste', 'Zahnbürste', '🪥'],
  ['die', 'Hand', 'der', 'Schuh', 'Handschuh', '🧤'], ['der', 'Regen', 'der', 'Schirm', 'Regenschirm', '☂️'], ['das', 'Feuer', 'das', 'Werk', 'Feuerwerk', '🎆'],
  ['die', 'Schule', 'die', 'Tasche', 'Schultasche', '🎒'], ['das', 'Wasser', 'die', 'Flasche', 'Wasserflasche', '🍶'], ['der', 'Garten', 'das', 'Haus', 'Gartenhaus', '🏡'],
  ['das', 'Spiel', 'der', 'Platz', 'Spielplatz', '🎠'], ['die', 'Erde', 'die', 'Beere', 'Erdbeere', '🍓'], ['der', 'Stuhl', 'das', 'Bein', 'Stuhlbein', '🪑'],
  ['der', 'Kopf', 'das', 'Kissen', 'Kopfkissen', '🛏️'], ['der', 'Mond', 'das', 'Licht', 'Mondlicht', '🌙'], ['das', 'Eis', 'die', 'Waffel', 'Eiswaffel', '🍦'],
  ['die', 'Hose', 'die', 'Tasche', 'Hosentasche', '👖'], ['der', 'Vogel', 'das', 'Nest', 'Vogelnest', '🐦'], ['der', 'Brief', 'die', 'Marke', 'Briefmarke', '✉️'],
  ['die', 'Tomate', 'die', 'Suppe', 'Tomatensuppe', '🍅'], ['das', 'Rad', 'der', 'Weg', 'Radweg', '🚲'], ['die', 'Nacht', 'der', 'Himmel', 'Nachthimmel', '🌌'],
  ['der', 'Sand', 'die', 'Burg', 'Sandburg', '🏰'], ['das', 'Tier', 'der', 'Arzt', 'Tierarzt', '🐾'], ['die', 'Uhr', 'der', 'Zeiger', 'Uhrzeiger', '🕐'],
];
const zusammen = D(3, 'd3-zusammengesetzt', 'Zusammengesetzte Nomen', '🔗', {
  text: ['Aus zwei Nomen kann man ein neues Nomen bauen: das Haus + die Tür = die Haustür.', 'Das letzte Wort bestimmt den Artikel: die Tür → die Haustür.', 'Das erste Wort sagt genauer, was gemeint ist: eine Tür am Haus.', 'Das neue Wort schreibt man zusammen und groß.'],
  visual: { kind: 'text', text: 'das Haus + die Tür = die Haustür' },
  videoQuery: 'zusammengesetzte Nomen Artikel Klasse 3',
}, (r) => {
  const z = pick(r, ZUSAMMEN);
  if (chance(r, 0.6)) return { key: `a${z[4]}`, prompt: `${z[0]} ${z[1]} + ${z[2]} ${z[3]} = ☐ ${z[4]}`, speak: `${z[0]} ${z[1]} plus ${z[2]} ${z[3]}. Welcher Artikel gehört zu ${z[4]}?`, visual: { kind: 'emoji', chars: z[5] }, answer: fixedChoice(['der', 'die', 'das'], z[2]), tags: ['artikel-letztes-wort'], traps: z[0] !== z[2] ? [{ answer: z[0], tag: 'erstes-wort', hint: 'Der Artikel kommt vom letzten Wort, nicht vom ersten!' }] : [], solution: [`Das letzte Wort ist „${z[2]} ${z[3]}“.`, `Also: ${z[2]} ${z[4]}`] };
  const wrong = [z[3] + z[1].toLowerCase(), z[1] + ' ' + z[3], z[1].toLowerCase() + z[3].toLowerCase()];
  return { key: `w${z[4]}`, prompt: `Welches neue Wort entsteht?\n${z[1]} + ${z[3]}`, speak: `Welches neue Wort entsteht aus ${z[1]} und ${z[3]}?`, visual: { kind: 'emoji', chars: z[5] }, answer: choice(r, z[4], wrong), tags: ['zusammensetzen'], solution: [`${z[1]} + ${z[3]} = ${z[4]}`, 'Man schreibt das neue Wort zusammen und groß.'] };
}, { tagLabels: { 'artikel-letztes-wort': 'Artikel bei zusammengesetzten Nomen', 'erstes-wort': 'Artikel vom ersten Wort genommen' }, testSeconds: 15 });

const FAMILIEN: { stamm: string; fam: string[]; out: string[] }[] = [
  { stamm: 'fahr', fam: ['fahren', 'Fahrrad', 'Fahrer', 'Abfahrt', 'gefahren'], out: ['fallen', 'Farbe', 'Fahne'] },
  { stamm: 'spiel', fam: ['spielen', 'Spieler', 'Spielplatz', 'verspielt', 'Spielzeug'], out: ['Spiegel', 'spitz', 'Spinne'] },
  { stamm: 'schreib', fam: ['schreiben', 'Schreibtisch', 'beschreiben', 'Schreibheft'], out: ['schreien', 'Schrank', 'Schreck'] },
  { stamm: 'les', fam: ['lesen', 'Leser', 'Lesebuch', 'vorlesen'], out: ['Leiter', 'leise', 'Lehrer'] },
  { stamm: 'back', fam: ['backen', 'Bäcker', 'Backofen', 'gebacken'], out: ['Bach', 'Bagger', 'Ball'] },
  { stamm: 'wohn', fam: ['wohnen', 'Wohnung', 'Wohnzimmer', 'Bewohner'], out: ['Wolle', 'Wolke', 'wohin'] },
  { stamm: 'freu', fam: ['Freude', 'freuen', 'erfreut', 'freudig'], out: ['frei', 'Freitag', 'fressen'] },
  { stamm: 'kauf', fam: ['kaufen', 'Verkäufer', 'Einkauf', 'Kaufhaus'], out: ['kauen', 'Kauz', 'Kaugummi'] },
  // Nachtlauf 22.10.2026: mehr Wortfamilien
  { stamm: 'spring', fam: ['springen', 'Springseil', 'Springbrunnen', 'abspringen'], out: ['spritzen', 'Spinne', 'Ring'] },
  { stamm: 'lern', fam: ['lernen', 'Lernspiel', 'verlernen', 'gelernt'], out: ['Laterne', 'leer', 'Lerche'] },
  { stamm: 'koch', fam: ['kochen', 'Koch', 'Kochtopf', 'Kochbuch'], out: ['Knochen', 'Kuchen', 'Kopf'] },
  { stamm: 'mal', fam: ['malen', 'Maler', 'Malkasten', 'bemalt'], out: ['mahlen', 'Mehl', 'Mantel'] },
  { stamm: 'trink', fam: ['trinken', 'Trinkflasche', 'Trinkhalm', 'austrinken'], out: ['Trick', 'tragen', 'trocken'] },
  { stamm: 'schlaf', fam: ['schlafen', 'Schlafanzug', 'einschlafen', 'schläfrig'], out: ['Schlange', 'schlau', 'Schaf'] },
];
const wortfamilie = D(3, 'd3-wortfamilie', 'Wortfamilien', '👨‍👩‍👧', {
  text: ['Wörter mit dem gleichen Wortstamm gehören zu einer Wortfamilie: fahren, Fahrer, Fahrrad, Abfahrt.', 'Der Wortstamm wird gleich (oder fast gleich, z. B. a → ä) geschrieben.', 'Achtung: Nicht jedes Wort, das ähnlich anfängt, gehört dazu – „fallen“ hat nichts mit „fahren“ zu tun.'],
  visual: { kind: 'text', text: 'fahr: fahren · Fahrer · Fahrrad · Abfahrt' },
  videoQuery: 'Wortfamilien Wortstamm Klasse 3',
}, (r) => {
  const f = pick(r, FAMILIEN);
  const out = pick(r, f.out);
  const opts = [...pickN(r, f.fam, 3), out];
  return { key: `${f.stamm}-${out}`, prompt: 'Welches Wort gehört NICHT zur Wortfamilie?', answer: choice(r, out, opts.slice(0, 3)), tags: ['wortfamilie'], solution: [`Der Wortstamm ist „${f.stamm}“.`, `„${out}“ hat einen anderen Wortstamm und gehört nicht dazu.`] };
}, { testSeconds: 20 });

// Auslautverhärtung: [Wort mit Lücke-Position, richtiger Buchstabe, falscher, Verlängerung, Bild]
const AUSLAUT: [string, string, string, string, string][] = [
  ['Hund', 'd', 't', 'die Hunde', '🐶'], ['Wand', 'd', 't', 'die Wände', '🧱'], ['Rad', 'd', 't', 'die Räder', '🚲'], ['Kind', 'd', 't', 'die Kinder', '🧒'], ['Geld', 'd', 't', 'die Gelder', '💰'], ['Mund', 'd', 't', 'die Münder', '👄'], ['Bild', 'd', 't', 'die Bilder', '🖼️'], ['Pferd', 'd', 't', 'die Pferde', '🐴'],
  ['Hut', 't', 'd', 'die Hüte', '🎩'], ['Brot', 't', 'd', 'die Brote', '🍞'], ['Zelt', 't', 'd', 'die Zelte', '⛺'], ['Nest', 't', 'd', 'die Nester', '🐣'], ['Boot', 't', 'd', 'die Boote', '⛵'],
  ['Zug', 'g', 'k', 'die Züge', '🚂'], ['Berg', 'g', 'k', 'die Berge', '⛰️'], ['Tag', 'g', 'k', 'die Tage', '📅'], ['Zwerg', 'g', 'k', 'die Zwerge', '🧙'], ['Flugzeug', 'g', 'k', 'die Flugzeuge', '✈️'],
  ['Schrank', 'k', 'g', 'die Schränke', '🗄️'], ['Park', 'k', 'g', 'parken', '🏞️'], ['Korb', 'b', 'p', 'die Körbe', '🧺'], ['Dieb', 'b', 'p', 'die Diebe', '🦹'], ['Kalb', 'b', 'p', 'die Kälber', '🐄'], ['gelb', 'b', 'p', 'das gelbe Auto', '💛'], ['lieb', 'b', 'p', 'die liebe Oma', '💗'],
  // Nachtlauf 22.10.2026: mehr Wörter
  ['Hemd', 'd', 't', 'die Hemden', '👔'], ['Wald', 'd', 't', 'die Wälder', '🌲'], ['Strand', 'd', 't', 'die Strände', '🏖️'], ['Mond', 'd', 't', 'die Monde', '🌙'],
  ['Licht', 't', 'd', 'die Lichter', '💡'], ['Weg', 'g', 'k', 'die Wege', '🛤️'], ['Krug', 'g', 'k', 'die Krüge', '🏺'], ['Sieg', 'g', 'k', 'die Siege', '🏆'],
  ['Bank', 'k', 'g', 'die Bänke', '🪑'], ['Stab', 'b', 'p', 'die Stäbe', '🪄'],
];
const auslaut = D(3, 'd3-auslaut', 'Wörter verlängern: d/t, g/k, b/p', '🔍', {
  text: ['Am Wortende klingen d und t gleich – ebenso g und k, b und p.', 'Trick: Verlängere das Wort! Bilde die Mehrzahl (Hund → Hunde), steigere das Adjektiv (wild → wilder) oder nimm die Grundform des Verbs (er gibt → geben).', 'Hund → die Hunde: Jetzt hörst du das d deutlich.', 'Zug → die Züge: Jetzt hörst du das g.'],
  visual: { kind: 'text', text: 'Hund → Hun-de' },
  videoQuery: 'Wörter verlängern Auslautverhärtung d t g k b p Klasse 3',
}, (r) => {
  const [w, ok, bad, lang, e] = pick(r, AUSLAUT);
  const i = w.lastIndexOf(ok);
  const shown = w.slice(0, i) + '_' + w.slice(i + 1);
  return { key: w, prompt: `${shown} – welcher Buchstabe fehlt?`, speak: 'Welcher Buchstabe fehlt am Ende? Verlängere das Wort!', visual: { kind: 'emoji', chars: e }, answer: { ...fixedChoice([ok, bad].sort(), ok), big: true }, tags: [`${[ok, bad].sort().join('-')}`], solution: [`Verlängere: ${lang}`, `Jetzt hörst du es: ${ok}. Also schreibt man ${w}.`], solutionVisual: { kind: 'word', word: w, mark: [[i, i + 1]] } };
}, { tagLabels: { 'd-t': 'd oder t am Ende', 'g-k': 'g oder k am Ende', 'b-p': 'b oder p am Ende' }, testSeconds: 15 });

const AE_EU: [string, string, string, string, string?][] = [
  // [Wort, richtig, falsch, Begründung, Bild]
  ['Hände', 'ä', 'e', 'Hände kommt von Hand.', '🙌'], ['Bälle', 'ä', 'e', 'Bälle kommt von Ball.', '⚽'], ['Äpfel', 'Ä', 'E', 'Äpfel kommt von Apfel.', '🍎'], ['Wände', 'ä', 'e', 'Wände kommt von Wand.', '🧱'], ['Bäcker', 'ä', 'e', 'Bäcker kommt von backen.', '🥖'], ['Gläser', 'ä', 'e', 'Gläser kommt von Glas.', '🥛'], ['Kälte', 'ä', 'e', 'Kälte kommt von kalt.', '🥶'],
  ['Fenster', 'e', 'ä', 'Es gibt kein verwandtes Wort mit a – also e.', '🪟'], ['Wetter', 'e', 'ä', 'Es gibt kein verwandtes Wort mit a – also e.', '🌦️'], ['Ende', 'E', 'Ä', 'Es gibt kein verwandtes Wort mit a – also e.'], ['Mensch', 'e', 'ä', 'Es gibt kein verwandtes Wort mit a – also e.', '🧑'],
  ['Bäume', 'äu', 'eu', 'Bäume kommt von Baum.', '🌳'], ['Häuser', 'äu', 'eu', 'Häuser kommt von Haus.', '🏘️'], ['Mäuse', 'äu', 'eu', 'Mäuse kommt von Maus.', '🐭'], ['Träume', 'äu', 'eu', 'Träume kommt von Traum.', '💭'], ['läuft', 'äu', 'eu', 'läuft kommt von laufen.', '🏃'],
  ['Feuer', 'eu', 'äu', 'Es gibt kein verwandtes Wort mit au – also eu.', '🔥'], ['heute', 'eu', 'äu', 'Es gibt kein verwandtes Wort mit au – also eu.', '📆'], ['Freund', 'eu', 'äu', 'Es gibt kein verwandtes Wort mit au – also eu.', '🤝'], ['Eule', 'Eu', 'Äu', 'Es gibt kein verwandtes Wort mit au – also eu.', '🦉'], ['Leute', 'eu', 'äu', 'Es gibt kein verwandtes Wort mit au – also eu.', '👥'],
  // Nachtlauf 22.10.2026: mehr Aufgaben
  ['Blätter', 'ä', 'e', 'Blätter kommt von Blatt.', '🍂'], ['Zähne', 'ä', 'e', 'Zähne kommt von Zahn.', '🦷'], ['Räder', 'ä', 'e', 'Räder kommt von Rad.', '🚲'], ['Nächte', 'ä', 'e', 'Nächte kommt von Nacht.', '🌙'],
  ['Hemd', 'e', 'ä', 'Es gibt kein verwandtes Wort mit a – also e.', '👔'], ['Becher', 'e', 'ä', 'Es gibt kein verwandtes Wort mit a – also e.', '🥤'],
  ['Kräuter', 'äu', 'eu', 'Kräuter kommt von Kraut.', '🌿'], ['träumen', 'äu', 'eu', 'träumen kommt von Traum.', '😴'],
  ['Beule', 'eu', 'äu', 'Es gibt kein verwandtes Wort mit au – also eu.', '🤕'], ['neun', 'eu', 'äu', 'Es gibt kein verwandtes Wort mit au – also eu.', '9️⃣'], ['Euro', 'Eu', 'Äu', 'Es gibt kein verwandtes Wort mit au – also eu.', '💶'],
];
const aeEu = D(3, 'd3-ae-aeu', 'ä oder e, äu oder eu', '🌳', {
  text: ['ä und e klingen gleich, äu und eu auch.', 'Trick: Suche ein verwandtes Wort mit a oder au (ableiten).', 'Bäume → Baum: also äu. Hände → Hand: also ä.', 'Findest du kein verwandtes Wort mit a/au, schreibst du e oder eu: Feuer, Fenster.'],
  visual: { kind: 'text', text: 'Baum → Bäume · Hand → Hände' },
  videoQuery: 'ä oder e äu oder eu ableiten Klasse 3',
}, (r) => {
  const [w, ok, bad, why, e] = pick(r, AE_EU);
  const i = w.indexOf(ok);
  const shown = w.slice(0, i) + '_' + w.slice(i + ok.length);
  const pair = ok.length === 2 ? 'äu-eu' : 'ä-e';
  return { key: w, prompt: `${shown} – was fehlt?`, speak: 'Was fehlt in diesem Wort? Suche ein verwandtes Wort!', visual: e ? { kind: 'emoji', chars: e } : undefined, answer: { ...fixedChoice(ok.toLowerCase().startsWith('ä') ? [ok, bad] : [bad, ok], ok), big: true }, tags: [pair], solution: [why, `Richtig: ${w}`], solutionVisual: { kind: 'word', word: w, mark: [[i, i + ok.length]] } };
}, { tagLabels: { 'ä-e': 'ä oder e', 'äu-eu': 'äu oder eu' }, testSeconds: 15 });

const DEHNUNG: Pair[] = [['fahren', 'faren', '🚗'], ['Zahl', 'Zal', '🔢'], ['Uhr', 'Ur', '⌚'], ['Kuh', 'Ku', '🐮'], ['Huhn', 'Hun', '🐔'], ['Stuhl', 'Stul', '🪑'], ['Sohn', 'Son', '👦'], ['wohnen', 'wonen', '🏠'], ['Zahn', 'Zan', '🦷'], ['Bahn', 'Ban', '🚆'], ['Jahr', 'Jar', '📅'], ['Ohr', 'Or', '👂'], ['Schuh', 'Schu', '👟'], ['fühlen', 'fülen', '🤲'],
  ['Name', 'Nahme', '📛'], ['Hose', 'Hohse', '👖'], ['Tafel', 'Tahfel', '🧑‍🏫'], ['Schule', 'Schuhle', '🏫'], ['Blume', 'Bluhme', '🌷'], ['Brot', 'Broht', '🍞'], ['Nase', 'Nahse', '👃'], ['Igel', 'Ihgel', '🦔'],
  // Nachtlauf 22.10.2026: mehr Wörter
  ['Fahne', 'Fane', '🚩'], ['Hahn', 'Han', '🐓'], ['Fehler', 'Feler', '❌'], ['Höhle', 'Höle', '🕳️'], ['Fahrrad', 'Farrad', '🚲'], ['Rahmen', 'Ramen', '🖼️'], ['Möhre', 'Möre', '🥕'],
  ['Rose', 'Rohse', '🌹'], ['Hut', 'Huht', '👒'], ['Tor', 'Tohr', '🥅'], ['Tomate', 'Tohmate', '🍅']];
const dehnung = D(3, 'd3-dehnungs-h', 'Wörter mit Dehnungs-h', '🐔', {
  text: ['Manchmal zeigt ein h, dass der Selbstlaut davor lang ist: fahren, Zahl, Uhr.', 'Das h hört man nicht – diese Wörter musst du dir merken (Merkwörter).', 'Das Dehnungs-h steht oft vor l, m, n oder r: Zahl, nehmen, Zahn, Uhr.', 'Aber Vorsicht: Die meisten Wörter mit langem Selbstlaut haben KEIN h: Name, Hose, Schule.'],
  visual: { kind: 'word', word: 'Zahl', mark: [[2, 3]] },
  videoQuery: 'Dehnungs-h Merkwörter Klasse 3',
}, (r, s) => spellTask(r, s, DEHNUNG, (p) => (p[0].includes('h') && !p[1].includes('h') ? 'mit-h' : 'ohne-h'), (p) => (p[0].includes('h') && !p[1].includes('h') ? ['Das ist ein Merkwort mit Dehnungs-h.'] : ['Dieses Wort hat einen langen Selbstlaut, aber kein h.'])), { tagLabels: { 'mit-h': 'Wörter mit Dehnungs-h', 'ohne-h': 'h zu viel geschrieben' }, testSeconds: 12 });

// [Grundstufe, Vergleichsstufe, Höchststufe, passendes Verb]
const STEIGERUNG: [string, string, string, string][] = [['groß', 'größer', 'am größten', 'ist'], ['klein', 'kleiner', 'am kleinsten', 'ist'], ['schnell', 'schneller', 'am schnellsten', 'läuft'], ['gut', 'besser', 'am besten', 'malt'], ['viel', 'mehr', 'am meisten', 'isst'], ['hoch', 'höher', 'am höchsten', 'springt'], ['alt', 'älter', 'am ältesten', 'ist'], ['weit', 'weiter', 'am weitesten', 'wirft'], ['lang', 'länger', 'am längsten', 'schläft'], ['jung', 'jünger', 'am jüngsten', 'ist'], ['gern', 'lieber', 'am liebsten', 'liest'], ['laut', 'lauter', 'am lautesten', 'singt'], ['stark', 'stärker', 'am stärksten', 'ist'],
  // Nachtlauf 22.10.2026: mehr Adjektive
  ['leise', 'leiser', 'am leisesten', 'spricht'], ['klug', 'klüger', 'am klügsten', 'ist'], ['mutig', 'mutiger', 'am mutigsten', 'ist'], ['langsam', 'langsamer', 'am langsamsten', 'geht'],
  ['früh', 'früher', 'am frühesten', 'kommt'], ['schön', 'schöner', 'am schönsten', 'singt'], ['kurz', 'kürzer', 'am kürzesten', 'schläft'], ['wild', 'wilder', 'am wildesten', 'tanzt']];
const IRR = new Set(['gut', 'viel', 'gern', 'hoch']);
const steigerung = D(3, 'd3-steigerung', 'Adjektive steigern', '📈', {
  text: ['Mit Adjektiven kann man vergleichen.', 'Grundstufe: Tim ist so groß wie Ben.', 'Vergleichsstufe (+er): Lea ist größer als Tim.', 'Höchststufe (am …sten): Opa ist am größten.', 'Manche Adjektive sind ganz anders: gut – besser – am besten, viel – mehr – am meisten, gern – lieber – am liebsten.'],
  visual: { kind: 'text', text: 'groß – größer – am größten' },
  videoQuery: 'Adjektive steigern Vergleichsstufe Höchststufe Klasse 3',
}, (r) => {
  const [g, k, s, verb] = pick(r, STEIGERUNG);
  const n = pick(r, NAMES), n2 = pick(r, NAMES.filter((x) => x !== n));
  const comp = chance(r, 0.6);
  // Adjektive auf -e (leise): Ablenker ohne doppeltes e (nicht „leiseer“)
  const st = g.endsWith('e') ? g.slice(0, -1) : g;
  const reg = (x: string) => [st + 'er', 'am ' + x + 'sten', 'mehr ' + x, st + 'erer'];
  const opts = comp ? [k, s, st + 'er', 'mehr ' + g] : [s, k, 'am ' + g + 'sten', 'am ' + st + 'esten'];
  const sentence = comp ? `${n} ${verb} ☐ als ${n2}. (${g})` : `Von allen Kindern ${verb} ${n} ☐. (${g})`;
  return { key: `${g}-${comp}`, prompt: `Setze richtig ein:\n${sentence}`, speak: `Setze das Wort ${g} richtig ein. ${sentence.replace('☐', 'Lücke').replace(/\(.*\)/, '')}`, answer: choice(r, comp ? k : s, [...opts, ...reg(g)]), tags: [IRR.has(g) ? 'unregelmäßig' : comp ? 'vergleichsstufe' : 'höchststufe'], solution: [`${g} – ${k} – ${s}`, comp ? `Beim Vergleich mit „als“ nimmst du die Vergleichsstufe: ${k}.` : `Wenn jemand der/die Beste ist, nimmst du die Höchststufe: ${s}.`] };
}, { tagLabels: { unregelmäßig: 'besondere Steigerung (gut, viel …)', vergleichsstufe: 'Vergleichsstufe', höchststufe: 'Höchststufe' }, testSeconds: 20 });

const SP_SAETZE: { s: string[]; subj: [number, number]; pred: number }[] = [
  { s: ['Der', 'Hund', 'bellt', 'laut'], subj: [0, 2], pred: 2 }, { s: ['Meine', 'Schwester', 'liest', 'ein', 'Buch'], subj: [0, 2], pred: 2 },
  { s: ['Die', 'Kinder', 'bauen', 'eine', 'Sandburg'], subj: [0, 2], pred: 2 }, { s: ['Am', 'Abend', 'kocht', 'Papa', 'Nudeln'], subj: [3, 4], pred: 2 },
  { s: ['Im', 'Teich', 'schwimmen', 'viele', 'Fische'], subj: [3, 5], pred: 2 }, { s: ['Lea', 'malt', 'einen', 'Regenbogen'], subj: [0, 1], pred: 1 },
  { s: ['Heute', 'besucht', 'uns', 'die', 'Oma'], subj: [3, 5], pred: 1 }, { s: ['Der', 'kleine', 'Igel', 'sucht', 'Futter'], subj: [0, 3], pred: 3 },
  { s: ['Die', 'Sonne', 'scheint', 'hell'], subj: [0, 2], pred: 2 }, { s: ['Mein', 'Opa', 'repariert', 'das', 'Fahrrad'], subj: [0, 2], pred: 2 },
  { s: ['Im', 'Herbst', 'fallen', 'die', 'Blätter'], subj: [3, 5], pred: 2 }, { s: ['Tim', 'trinkt', 'einen', 'Kakao'], subj: [0, 1], pred: 1 },
  { s: ['Die', 'Lehrerin', 'erklärt', 'die', 'Aufgabe'], subj: [0, 2], pred: 2 }, { s: ['Nach', 'dem', 'Essen', 'spielen', 'die', 'Kinder'], subj: [4, 6], pred: 3 },
  { s: ['Der', 'Wind', 'weht', 'sehr', 'stark'], subj: [0, 2], pred: 2 }, { s: ['Morgen', 'fährt', 'unsere', 'Klasse', 'in', 'den', 'Zoo'], subj: [2, 4], pred: 1 },
];
const satzglieder3 = D(3, 'd3-satzglieder', 'Subjekt und Prädikat', '🧱', {
  text: ['Das Prädikat (Satzkern) ist das Verb im Satz. Frage: Was tut jemand? Was geschieht?', 'Das Subjekt ist der Satzgegenstand. Frage: Wer oder was tut etwas?', '„Der Hund bellt.“ Wer oder was bellt? → der Hund (Subjekt). Was tut der Hund? → bellt (Prädikat).', 'Das Subjekt steht nicht immer am Anfang: „Am Abend kocht Papa Nudeln.“'],
  visual: { kind: 'text', text: 'Der Hund | bellt.' },
  videoQuery: 'Subjekt Prädikat bestimmen Klasse 3',
}, (r) => {
  const t = pick(r, SP_SAETZE);
  const sent = t.s.join(' ') + '.';
  const subj = t.s.slice(t.subj[0], t.subj[1]).join(' ');
  const pred = t.s[t.pred];
  if (chance(r, 0.5)) {
    const wrongs = [t.s.slice(0, 2).join(' '), t.s.slice(-2).join(' '), t.s[t.s.length - 1], t.s.slice(0, 1).join(' ')].filter((x) => x !== subj);
    return { key: `s${sent}`, prompt: `Was ist das Subjekt?\n${sent}`, answer: choice(r, subj, wrongs), tags: ['subjekt'], solution: ['Frage: Wer oder was tut hier etwas?', `→ ${subj}. Das ist das Subjekt.`] };
  }
  return { key: `p${sent}`, prompt: `Was ist das Prädikat?\n${sent}`, answer: choice(r, pred, t.s.filter((x, i) => i !== t.pred && x.length > 2)), tags: ['prädikat'], solution: [`Frage: Was ${/(en|sind)$/.test(pred) ? 'tun' : 'tut'} ${midSentence(subj)}? / Was geschieht?`, `→ ${pred}. Das ist das Prädikat (das Verb).`] };
}, { tagLabels: { subjekt: 'Subjekt finden', prädikat: 'Prädikat finden' }, testSeconds: 20 });

// Lesetexte aus Bausteinen
function story3(r: Rng): Gen {
  const n = pick(r, NAMES);
  const [tier, tname] = pick(r, [['Hund', 'Bello'], ['Katze', 'Minka'], ['Hase', 'Hoppel'], ['Pony', 'Blitz']] as const);
  const ort = pick(r, ['in den Park', 'an den See', 'in den Wald', 'zum Spielplatz']);
  const farbe = pick(r, ['roten', 'blauen', 'gelben', 'grünen']);
  const ding = pick(r, ['Ball', 'Drachen', 'Frisbee']);
  const essen = pick(r, ['ein Eis', 'eine Brezel', 'einen Apfel']);
  const tag = pick(r, ['Samstag', 'Sonntag', 'Mittwoch']);
  const text = `Am ${tag} geht ${n} mit ${tier === 'Katze' ? 'der Katze' : tier === 'Hund' ? 'dem Hund' : tier === 'Hase' ? 'dem Hasen' : 'dem Pony'} ${tname} ${ort}. Dort spielen sie mit einem ${farbe} ${ding}. Danach isst ${n} ${essen}. Am Abend sind beide sehr müde.`;
  const qs = [
    { q: `Wie heißt das Tier von ${n}?`, a: tname, w: ['Bello', 'Minka', 'Hoppel', 'Blitz', 'Flocke'] },
    { q: `Welche Farbe hat der ${ding}?`, a: farbe.replace('en', ''), w: ['rot', 'blau', 'gelb', 'grün'] },
    { q: `Was isst ${n}?`, a: essen, w: ['ein Eis', 'eine Brezel', 'einen Apfel', 'eine Pizza'] },
    { q: 'An welchem Tag spielt die Geschichte?', a: tag, w: ['Samstag', 'Sonntag', 'Mittwoch', 'Montag'] },
    { q: 'Wie fühlen sich die beiden am Abend?', a: 'müde', w: ['müde', 'wütend', 'hungrig', 'traurig'] },
  ];
  const q = pick(r, qs);
  return { key: `${text}|${q.q}`, prompt: q.q, speak: q.q, visual: { kind: 'text', text, title: 'Lies genau:' }, answer: choice(r, q.a, q.w), tags: ['textverständnis'], solution: ['Im Text steht:', text, `Antwort: ${q.a}`] };
}
const lesen3 = D(3, 'd3-lesen', 'Lesen und verstehen', '📚', {
  text: ['Lies den Text zuerst einmal ganz durch.', 'Lies dann die Frage. Suche im Text die Stelle, wo die Antwort steht.', 'Lies diese Stelle noch einmal genau – dann wählst du die Antwort.'],
  videoQuery: 'Leseverständnis Tipps Grundschule',
}, story3, { testSeconds: 60 });

// ---------- Klasse 4 ----------

const FAELLE: { s: string; mark: string; fall: 'Nominativ' | 'Genitiv' | 'Dativ' | 'Akkusativ' }[] = [
  { s: '**Der Hund** spielt im Garten.', mark: 'Der Hund', fall: 'Nominativ' }, { s: 'Ich gebe **dem Hund** einen Knochen.', mark: 'dem Hund', fall: 'Dativ' }, { s: 'Ich sehe **den Hund**.', mark: 'den Hund', fall: 'Akkusativ' }, { s: 'Das Fell **des Hundes** ist weich.', mark: 'des Hundes', fall: 'Genitiv' },
  { s: '**Die Lehrerin** erklärt die Aufgabe.', mark: 'Die Lehrerin', fall: 'Nominativ' }, { s: 'Wir helfen **der Lehrerin**.', mark: 'der Lehrerin', fall: 'Dativ' }, { s: 'Wir begrüßen **die Lehrerin**.', mark: 'die Lehrerin', fall: 'Akkusativ' }, { s: 'Die Tasche **der Lehrerin** ist rot.', mark: 'der Lehrerin', fall: 'Genitiv' },
  { s: '**Das Kind** lacht laut.', mark: 'Das Kind', fall: 'Nominativ' }, { s: 'Oma schenkt **dem Kind** ein Buch.', mark: 'dem Kind', fall: 'Dativ' }, { s: 'Papa trägt **das Kind** nach Hause.', mark: 'das Kind', fall: 'Akkusativ' }, { s: 'Das Fahrrad **des Kindes** ist neu.', mark: 'des Kindes', fall: 'Genitiv' },
  { s: 'Lena ruft **ihren Bruder**.', mark: 'ihren Bruder', fall: 'Akkusativ' }, { s: 'Tim schreibt **seiner Freundin** einen Brief.', mark: 'seiner Freundin', fall: 'Dativ' }, { s: '**Mein Opa** repariert das Fahrrad.', mark: 'Mein Opa', fall: 'Nominativ' }, { s: 'Wir besuchen **den Zoo**.', mark: 'den Zoo', fall: 'Akkusativ' },
  { s: '**Der Ball** liegt im Gras.', mark: 'Der Ball', fall: 'Nominativ' }, { s: 'Ich werfe **den Ball**.', mark: 'den Ball', fall: 'Akkusativ' }, { s: 'Der Hund rennt **dem Ball** hinterher.', mark: 'dem Ball', fall: 'Dativ' }, { s: 'Die Farbe **des Balles** ist rot.', mark: 'des Balles', fall: 'Genitiv' },
  { s: 'Wir danken **dem Arzt**.', mark: 'dem Arzt', fall: 'Dativ' }, { s: 'Mama ruft **den Arzt** an.', mark: 'den Arzt', fall: 'Akkusativ' }, { s: 'Die Praxis **des Arztes** ist groß.', mark: 'des Arztes', fall: 'Genitiv' }, { s: '**Die Katze** jagt eine Maus.', mark: 'Die Katze', fall: 'Nominativ' }, { s: 'Die Katze jagt **eine Maus**.', mark: 'eine Maus', fall: 'Akkusativ' },
  // Nachtlauf 22.10.2026: mehr Aufgaben
  { s: '**Die Katze** schläft auf dem Sofa.', mark: 'Die Katze', fall: 'Nominativ' }, { s: 'Ich streichle **die Katze**.', mark: 'die Katze', fall: 'Akkusativ' }, { s: 'Ich gebe **der Katze** Milch.', mark: 'der Katze', fall: 'Dativ' },
  { s: 'Das Fell **der Katze** ist weich.', mark: 'der Katze', fall: 'Genitiv' }, { s: 'Das Dach **des Hauses** ist rot.', mark: 'des Hauses', fall: 'Genitiv' }, { s: 'Wir besuchen **unsere Oma**.', mark: 'unsere Oma', fall: 'Akkusativ' },
  { s: 'Ben hilft **seinem Vater** im Garten.', mark: 'seinem Vater', fall: 'Dativ' }, { s: '**Die Kinder** spielen Verstecken.', mark: 'Die Kinder', fall: 'Nominativ' },
];
const FRAGE = { Nominativ: 'Wer oder was?', Genitiv: 'Wessen?', Dativ: 'Wem?', Akkusativ: 'Wen oder was?' } as const;
const faelle = D(4, 'd4-faelle', 'Die vier Fälle', '🗝️', {
  text: ['Nomen können in vier Fällen stehen. Du findest den Fall mit einer Frage:', '1. Fall – Nominativ: Wer oder was? „Der Hund spielt.“', '2. Fall – Genitiv: Wessen? „Das Fell des Hundes.“', '3. Fall – Dativ: Wem? „Ich gebe dem Hund einen Knochen.“', '4. Fall – Akkusativ: Wen oder was? „Ich sehe den Hund.“'],
  visual: { kind: 'text', text: 'Wer? · Wessen? · Wem? · Wen?' },
  videoQuery: 'Die vier Fälle Nominativ Genitiv Dativ Akkusativ Grundschule',
}, (r) => {
  const f = pick(r, FAELLE);
  const rest = f.s.replace(/\*\*.*?\*\*/, '…');
  return { key: f.s, prompt: `In welchem Fall steht das markierte Satzglied?\n${f.s}`, speak: `In welchem Fall steht „${f.mark}“? ${f.s.replace(/\*\*/g, '')}`, answer: fixedChoice(['Nominativ', 'Genitiv', 'Dativ', 'Akkusativ'], f.fall), tags: [f.fall.toLowerCase()], solution: [`Frage: ${FRAGE[f.fall]} ${rest.includes('…') ? '' : ''}`.trim(), `→ ${f.mark}`, `Das ist der ${f.fall} (${FRAGE[f.fall]}).`] };
}, { tagLabels: { nominativ: 'Nominativ (Wer?)', genitiv: 'Genitiv (Wessen?)', dativ: 'Dativ (Wem?)', akkusativ: 'Akkusativ (Wen?)' }, testSeconds: 25 });

const TENSES = ['Präsens', 'Präteritum', 'Perfekt', 'Futur'] as const;
const zeit4 = D(4, 'd4-zeitformen', 'Zeitformen', '🕰️', {
  text: ['Präsens (Gegenwart): Lena spielt.', 'Präteritum (1. Vergangenheit, in Geschichten): Lena spielte.', 'Perfekt (2. Vergangenheit, beim Erzählen): Lena hat gespielt. – mit „haben“ oder „sein“.', 'Futur (Zukunft): Lena wird spielen. – mit „werden“.'],
  visual: { kind: 'text', text: 'spielt · spielte · hat gespielt · wird spielen' },
  videoQuery: 'Zeitformen Präsens Präteritum Perfekt Futur Klasse 4',
}, (r) => {
  const v = pick(r, VERB_TAB);
  const n = pick(r, NAMES);
  const t = pick(r, TENSES);
  const s = { Präsens: `${n} ${v[1]} ${v[5]}.`, Präteritum: `${n} ${v[2]} ${v[5]}.`, Perfekt: `${n} ${v[4]} ${v[5]} ${v[3]}.`, Futur: `${n} wird ${v[5]} ${v[0]}.` }[t];
  return { key: `${v[0]}-${t}`, prompt: `Welche Zeitform ist das?\n${s}`, answer: fixedChoice([...TENSES], t), tags: [t.toLowerCase()], solution: [s, { Präsens: 'Das passiert jetzt → Präsens.', Präteritum: 'Vergangenheit in einem Wort → Präteritum.', Perfekt: `Vergangenheit mit „${v[4]}“ + ${v[3]} → Perfekt.`, Futur: 'Mit „wird“ → Zukunft (Futur).' }[t]] };
}, { tagLabels: { präsens: 'Präsens', präteritum: 'Präteritum', perfekt: 'Perfekt', futur: 'Futur' }, testSeconds: 20 });

const DAS_DASS: [string, 'das' | 'dass'][] = [
  ['Ich glaube, ☐ es morgen regnet.', 'dass'], ['☐ Buch ist sehr spannend.', 'das'], ['Das Kind, ☐ dort spielt, ist mein Bruder.', 'das'], ['Mama sagt, ☐ wir pünktlich sein sollen.', 'dass'],
  ['Ich hoffe, ☐ du bald gesund wirst.', 'dass'], ['Siehst du ☐ Pferd auf der Wiese?', 'das'], ['Das Fahrrad, ☐ ich mir wünsche, ist blau.', 'das'], ['Es ist schön, ☐ du da bist.', 'dass'],
  ['Weißt du, ☐ Wale Säugetiere sind?', 'dass'], ['☐ ist mein Lieblingslied.', 'das'], ['Er freut sich, ☐ er gewonnen hat.', 'dass'], ['Wo ist ☐ Haus, ☐ du gemalt hast?', 'das'],
  ['Ich weiß, ☐ du das kannst.', 'dass'], ['Das Lied, ☐ wir singen, ist lustig.', 'das'], ['Papa meint, ☐ es zu kalt zum Baden ist.', 'dass'], ['Gib mir bitte ☐ Heft.', 'das'],
  ['Es ist wichtig, ☐ wir uns die Hände waschen.', 'dass'], ['☐ Wetter ist heute schön.', 'das'], ['Lea erzählt, ☐ ihre Katze Junge bekommen hat.', 'dass'], ['Das Spiel, ☐ wir gestern gespielt haben, war toll.', 'das'],
  ['Ich bin froh, ☐ heute Freitag ist.', 'dass'], ['Kennst du ☐ Mädchen mit der roten Mütze?', 'das'],
  // Nachtlauf 22.10.2026: mehr Aufgaben
  ['Ich finde, ☐ du recht hast.', 'dass'], ['☐ Auto, ☐ dort parkt, gehört meinem Onkel.', 'das'], ['Hast du gehört, ☐ morgen die Schule ausfällt?', 'dass'], ['Wir sehen ☐ Feuerwerk vom Balkon aus.', 'das'],
  ['Ich wünsche mir, ☐ es schneit.', 'dass'], ['☐ Mädchen, ☐ neben mir sitzt, heißt Lara.', 'das'], ['Mia ist traurig, ☐ ihr Hamster krank ist.', 'dass'], ['Bring bitte ☐ Brot mit.', 'das'],
  ['Ich merke, ☐ ich müde werde.', 'dass'], ['☐ Eis schmeckt lecker.', 'das'], ['Oma schreibt, ☐ sie uns bald besucht.', 'dass'], ['Wer hat ☐ Fenster offen gelassen?', 'das'],
  ['Es ist schade, ☐ die Ferien vorbei sind.', 'dass'], ['Das Bild, ☐ an der Wand hängt, hat Paul gemalt.', 'das'], ['Der Lehrer sagt, ☐ wir leise sein sollen.', 'dass'], ['Ist ☐ dein Rucksack?', 'das'],
];
const dasDass = D(4, 'd4-das-dass', 'das oder dass', '⚖️', {
  text: ['„das“ ist ein Artikel oder Begleiter: das Buch – oder es steht für ein Nomen.', 'Probe: Kannst du „dieses“, „jenes“ oder „welches“ einsetzen? Dann schreibst du „das“.', '„dass“ verbindet zwei Sätze und steht oft nach Verben wie glauben, hoffen, sagen, wissen: „Ich hoffe, dass …“.', 'Vor „dass“ steht immer ein Komma.'],
  visual: { kind: 'text', text: 'das = dieses / welches · dass = Bindewort' },
  videoQuery: 'das oder dass Grundschule Klasse 4',
}, (r) => {
  const [s, a] = pick(r, DAS_DASS);
  return { key: s, prompt: `Setze ein: das oder dass?\n${s}`, speak: s.replace(/☐/g, 'Lücke'), answer: fixedChoice(['das', 'dass'], a), tags: [a], solution: [s.replace(/☐/g, a).replace(/^./, (c) => c.toUpperCase()), a === 'das' ? 'Probe: Man kann „dieses“ oder „welches“ einsetzen → das.' : '„dieses“ oder „welches“ passt nicht. Das Wort verbindet zwei Sätze → dass.'] };
}, { tagLabels: { das: '„das“ erkennen', dass: '„dass“ erkennen' }, testSeconds: 15 });

const SSZ: [string, 's' | 'ss' | 'ß', string, string?][] = [
  ['Straße', 'ß', 'Das a ist lang – nach langem Selbstlaut schreibt man ß.', '🛣️'], ['Fuß', 'ß', 'Das u ist lang → ß.', '🦶'], ['Gruß', 'ß', 'Das u ist lang → ß.', '👋'], ['groß', 'ß', 'Das o ist lang → ß.', '🐘'], ['heiß', 'ß', 'Nach ei schreibt man ß.', '🔥'], ['Spaß', 'ß', 'Das a ist lang → ß.', '😄'], ['süß', 'ß', 'Das ü ist lang → ß.', '🍭'],
  ['Fluss', 'ss', 'Das u ist kurz → ss.', '🏞️'], ['Kuss', 'ss', 'Das u ist kurz → ss.', '💋'], ['Wasser', 'ss', 'Das a ist kurz → ss.', '💧'], ['Tasse', 'ss', 'Das a ist kurz → ss.', '☕'], ['Schloss', 'ss', 'Das o ist kurz → ss.', '🏰'], ['Nuss', 'ss', 'Das u ist kurz → ss.', '🌰'], ['Klasse', 'ss', 'Das a ist kurz → ss.', '🏫'],
  ['weiß', 'ß', 'Nach ei schreibt man ß.', '🤍'], ['Strauß', 'ß', 'Nach au schreibt man ß.', '💐'], ['Soße', 'ß', 'Das o ist lang → ß.', '🥫'], ['Floß', 'ß', 'Das o ist lang → ß.', '🛶'],
  ['Messer', 'ss', 'Das e ist kurz → ss.', '🔪'], ['Kissen', 'ss', 'Das i ist kurz → ss.', '🛏️'], ['Schlüssel', 'ss', 'Das ü ist kurz → ss.', '🔑'], ['Schüssel', 'ss', 'Das ü ist kurz → ss.', '🥣'],
  ['Nase', 's', 'Man hört ein weiches, summendes s → s.', '👃'], ['Rose', 's', 'Man hört ein weiches, summendes s → s.', '🌹'], ['Preis', 's', 'Verlängere: Preise – weiches s → s.', '🏷️'],
  ['Haus', 's', 'Verlängere: Häuser – man hört ein weiches s → s.', '🏠'], ['Gras', 's', 'Verlängere: Gräser – weiches s → s.', '🌱'], ['Maus', 's', 'Verlängere: Mäuse – weiches s → s.', '🐭'], ['Glas', 's', 'Verlängere: Gläser – weiches s → s.', '🥛'], ['Hose', 's', 'Man hört ein weiches, summendes s → s.', '👖'], ['Bus', 's', 'Merkwort: Bus (die Busse).', '🚌'],
  ['Kloß', 'ß', 'Das o ist lang → ß.', '🥟'], ['beißen', 'ß', 'Nach ei schreibt man ß.', '🦷'], ['Pass', 'ss', 'Das a ist kurz → ss.', '🛂'],
  ['Hase', 's', 'Man hört ein weiches, summendes s → s.', '🐰'], ['Esel', 's', 'Man hört ein weiches, summendes s → s.', '🐴'], ['Käse', 's', 'Man hört ein weiches, summendes s → s.', '🧀'],
];
const ssz = D(4, 'd4-s-ss-sz', 's, ss oder ß', '🐍', {
  text: ['Nach einem kurzen Selbstlaut schreibt man ss: Fluss, Wasser.', 'Nach einem langen Selbstlaut oder ei, au, eu schreibt man ß, wenn das s zischt (stimmlos): Straße, heiß.', 'Klingt das s weich und summend (stimmhaft), schreibt man s: Hose, Nase.', 'Am Wortende verlängern: Haus → Häuser (weich) → s. Fuß → Füße (zischend) → ß.'],
  visual: { kind: 'text', text: 'Fluss · Straße · Hose' },
  videoQuery: 's ss ß Regeln Grundschule Klasse 4',
}, (r) => {
  const [w, ok, why, e] = pick(r, SSZ);
  const i = w.indexOf(ok);
  const shown = w.slice(0, i) + '_' + w.slice(i + ok.length);
  return { key: w, prompt: `${shown} – was fehlt?`, speak: 'Was fehlt in diesem Wort: s, Doppel-s oder scharfes s?', visual: e ? { kind: 'emoji', chars: e } : undefined, answer: { ...fixedChoice(['s', 'ss', 'ß'], ok), big: true }, tags: [ok === 'ß' ? 'sz' : ok], solution: [why, `Richtig: ${w}`], solutionVisual: { kind: 'word', word: w, mark: [[i, i + ok.length]] } };
}, { tagLabels: { s: 'einfaches s', ss: 'ss nach kurzem Vokal', sz: 'ß nach langem Vokal' }, testSeconds: 15 });

const REDE: [string, string, string, '.' | '?' | '!'][] = [
  ['Mia', 'sagt', 'Ich habe Hunger', '.'], ['Tim', 'fragt', 'Kommst du mit', '?'], ['Mama', 'ruft', 'Das Essen ist fertig', '!'], ['Der Lehrer', 'sagt', 'Schlagt die Bücher auf', '.'],
  ['Oma', 'fragt', 'Möchtest du Kuchen', '?'], ['Ben', 'schreit', 'Pass auf', '!'], ['Lena', 'erzählt', 'Wir fahren ans Meer', '.'], ['Papa', 'fragt', 'Wer hat die Tür offen gelassen', '?'],
  ['Lisa', 'ruft', 'Komm schnell her', '!'], ['Opa', 'erzählt', 'Früher gab es keine Handys', '.'], ['Emil', 'fragt', 'Wie spät ist es', '?'], ['Die Lehrerin', 'sagt', 'Heute schreiben wir ein Diktat', '.'],
  ['Paul', 'fragt', 'Darf ich mitspielen', '?'], ['Mama', 'flüstert', 'Das Baby schläft', '.'], ['Jonas', 'ruft', 'Wir haben gewonnen', '!'],
  ['Sophie', 'fragt', 'Hast du meinen Stift gesehen', '?'], ['Der Trainer', 'ruft', 'Lauft schneller', '!'], ['Anna', 'sagt', 'Morgen habe ich Geburtstag', '.'],
  ['Max', 'fragt', 'Wann fängt der Film an', '?'], ['Oma', 'sagt', 'Ich backe heute Waffeln', '.'], ['Die Ärztin', 'sagt', 'Du musst im Bett bleiben', '.'],
  ['Leo', 'ruft', 'Hilfe, ich falle', '!'], ['Mila', 'fragt', 'Wo ist mein Turnbeutel', '?'], ['Papa', 'sagt', 'Wir gehen morgen schwimmen', '.'], ['Der Polizist', 'ruft', 'Stehen bleiben', '!'],
];
const rede = D(4, 'd4-woertliche-rede', 'Wörtliche Rede', '💬', {
  text: ['Was jemand genau sagt, steht in Anführungszeichen: unten „ … und oben “.', 'Begleitsatz vorne: Danach kommt ein Doppelpunkt. Mia sagt: „Ich habe Hunger.“', 'Begleitsatz hinten: Nach den Anführungszeichen kommt ein Komma. „Ich habe Hunger“, sagt Mia. (Bei Aussagen fällt der Punkt in der Rede weg.)', 'Fragezeichen und Ausrufezeichen bleiben immer in den Anführungszeichen.'],
  visual: { kind: 'text', text: 'Mia sagt: „Ich habe Hunger.“' },
  videoQuery: 'wörtliche Rede Zeichensetzung Begleitsatz Klasse 4',
}, (r) => {
  const [who, verb, sp, p] = pick(r, REDE);
  const front = chance(r, 0.6);
  if (front) {
    const ok = `${who} ${verb}: „${sp}${p}“`;
    return { key: `v${sp}`, prompt: 'Welcher Satz ist richtig?', answer: choice(r, ok, [`${who} ${verb} „${sp}${p}“`, `${who} ${verb}: „${sp}“${p}`, `${who} ${verb}, „${sp}${p}“`]), tags: ['begleitsatz-vorne'], solution: [ok, 'Begleitsatz vorne → Doppelpunkt, dann die Rede in Anführungszeichen. Das Satzzeichen der Rede steht innen.'] };
  }
  const end = p === '.' ? '' : p;
  const ok = `„${sp}${end}“, ${verb} ${who.replace(/^(Der|Die|Das|Mein|Meine|Unser|Unsere) /, (m) => m.toLowerCase())}.`;
  const v2 = who.replace(/^(Der|Die|Das|Mein|Meine|Unser|Unsere) /, (m) => m.toLowerCase());
  return { key: `h${sp}`, prompt: 'Welcher Satz ist richtig?', answer: choice(r, ok, [`„${sp}${end}“ ${verb} ${v2}.`, `„${sp}.“, ${verb} ${v2}.`, `„${sp}${end}“. ${verb} ${v2}.`].filter((x) => x !== ok)), tags: ['begleitsatz-hinten'], solution: [ok, `Begleitsatz hinten → nach dem Anführungszeichen ein Komma.${p === '.' ? ' Der Punkt der Rede fällt weg.' : ' Das ' + (p === '?' ? 'Fragezeichen' : 'Ausrufezeichen') + ' bleibt in der Rede.'}`] };
}, { tagLabels: { 'begleitsatz-vorne': 'Begleitsatz vorne', 'begleitsatz-hinten': 'Begleitsatz hinten' }, testSeconds: 30 });

const KOMMA: { ok: string; wrong: string[]; tag: string; why: string }[] = [
  { ok: 'Ich kaufe Äpfel, Birnen und Bananen.', wrong: ['Ich kaufe Äpfel Birnen und Bananen.', 'Ich kaufe Äpfel, Birnen, und Bananen.'], tag: 'aufzählung', why: 'Bei Aufzählungen trennt ein Komma die Wörter. Vor „und“ steht kein Komma.' },
  { ok: 'Im Zoo sehen wir Löwen, Affen, Zebras und Giraffen.', wrong: ['Im Zoo sehen wir Löwen Affen Zebras und Giraffen.', 'Im Zoo sehen wir Löwen, Affen, Zebras, und Giraffen.'], tag: 'aufzählung', why: 'Bei Aufzählungen trennt ein Komma die Wörter. Vor „und“ steht kein Komma.' },
  { ok: 'Meine Lieblingsfarben sind Rot, Blau und Grün.', wrong: ['Meine Lieblingsfarben sind Rot Blau und Grün.', 'Meine Lieblingsfarben sind Rot, Blau, und Grün.'], tag: 'aufzählung', why: 'Bei Aufzählungen trennt ein Komma die Wörter. Vor „und“ steht kein Komma.' },
  { ok: 'Ich bleibe zu Hause, weil ich krank bin.', wrong: ['Ich bleibe zu Hause weil ich krank bin.', 'Ich bleibe zu Hause weil, ich krank bin.'], tag: 'nebensatz', why: 'Vor „weil“ steht ein Komma – es trennt die beiden Satzteile.' },
  { ok: 'Wir gehen schwimmen, wenn die Sonne scheint.', wrong: ['Wir gehen schwimmen wenn die Sonne scheint.', 'Wir gehen, schwimmen wenn die Sonne scheint.'], tag: 'nebensatz', why: 'Vor „wenn“ steht ein Komma.' },
  { ok: 'Ich weiß, dass du das kannst.', wrong: ['Ich weiß dass du das kannst.', 'Ich weiß dass, du das kannst.'], tag: 'nebensatz', why: 'Vor „dass“ steht immer ein Komma.' },
  { ok: 'Lisa lacht, denn der Witz ist lustig.', wrong: ['Lisa lacht denn der Witz ist lustig.', 'Lisa lacht denn, der Witz ist lustig.'], tag: 'nebensatz', why: 'Vor „denn“ steht ein Komma.' },
  { ok: 'Zum Frühstück gibt es Brot, Käse, Honig und Tee.', wrong: ['Zum Frühstück gibt es Brot Käse Honig und Tee.', 'Zum Frühstück gibt es Brot, Käse, Honig, und Tee.'], tag: 'aufzählung', why: 'Bei Aufzählungen trennt ein Komma die Wörter. Vor „und“ steht kein Komma.' },
  { ok: 'Auf dem Bauernhof leben Kühe, Schweine, Hühner und Pferde.', wrong: ['Auf dem Bauernhof leben Kühe Schweine Hühner und Pferde.', 'Auf dem Bauernhof leben Kühe, Schweine, Hühner, und Pferde.'], tag: 'aufzählung', why: 'Bei Aufzählungen trennt ein Komma die Wörter. Vor „und“ steht kein Komma.' },
  { ok: 'Möchtest du Saft, Milch oder Wasser?', wrong: ['Möchtest du Saft Milch oder Wasser?', 'Möchtest du Saft, Milch, oder Wasser?'], tag: 'aufzählung', why: 'Bei Aufzählungen trennt ein Komma die Wörter. Vor „oder“ steht kein Komma.' },
  { ok: 'Paul hat einen Hund, eine Katze und zwei Hasen.', wrong: ['Paul hat einen Hund eine Katze und zwei Hasen.', 'Paul hat einen Hund, eine Katze, und zwei Hasen.'], tag: 'aufzählung', why: 'Bei Aufzählungen trennt ein Komma die Wörter. Vor „und“ steht kein Komma.' },
  { ok: 'Ich ziehe eine Jacke an, weil es kalt ist.', wrong: ['Ich ziehe eine Jacke an weil es kalt ist.', 'Ich ziehe eine Jacke an weil, es kalt ist.'], tag: 'nebensatz', why: 'Vor „weil“ steht ein Komma – es trennt die beiden Satzteile.' },
  { ok: 'Tom freut sich, dass morgen Ferien sind.', wrong: ['Tom freut sich dass morgen Ferien sind.', 'Tom freut sich dass, morgen Ferien sind.'], tag: 'nebensatz', why: 'Vor „dass“ steht immer ein Komma.' },
  { ok: 'Wir spielen drinnen, wenn es regnet.', wrong: ['Wir spielen drinnen wenn es regnet.', 'Wir spielen, drinnen wenn es regnet.'], tag: 'nebensatz', why: 'Vor „wenn“ steht ein Komma.' },
  { ok: 'Ich wollte rausgehen, aber es regnete.', wrong: ['Ich wollte rausgehen aber es regnete.', 'Ich wollte rausgehen aber, es regnete.'], tag: 'nebensatz', why: 'Vor „aber“ steht ein Komma.' },
  { ok: 'Mia ist müde, denn sie hat schlecht geschlafen.', wrong: ['Mia ist müde denn sie hat schlecht geschlafen.', 'Mia ist müde denn, sie hat schlecht geschlafen.'], tag: 'nebensatz', why: 'Vor „denn“ steht ein Komma.' },
  { ok: 'Weil es regnet, bleiben wir drinnen.', wrong: ['Weil es regnet bleiben wir drinnen.', 'Weil, es regnet bleiben wir drinnen.'], tag: 'nebensatz', why: 'Auch wenn „weil“ vorne steht, trennt ein Komma die beiden Satzteile.' },
  { ok: 'Als es dunkel wurde, gingen wir nach Hause.', wrong: ['Als es dunkel wurde gingen wir nach Hause.', 'Als, es dunkel wurde gingen wir nach Hause.'], tag: 'nebensatz', why: 'Der Satzteil mit „als“ wird mit einem Komma abgetrennt.' },
  { ok: 'Ich hoffe, dass du bald gesund wirst.', wrong: ['Ich hoffe dass du bald gesund wirst.', 'Ich hoffe dass, du bald gesund wirst.'], tag: 'nebensatz', why: 'Vor „dass“ steht immer ein Komma.' },
  // Nachtlauf 22.10.2026: mehr Sätze
  { ok: 'In meiner Schultasche sind Hefte, Stifte und ein Lineal.', wrong: ['In meiner Schultasche sind Hefte Stifte und ein Lineal.', 'In meiner Schultasche sind Hefte, Stifte, und ein Lineal.'], tag: 'aufzählung', why: 'Bei Aufzählungen trennt ein Komma die Wörter. Vor „und“ steht kein Komma.' },
  { ok: 'Wir backen einen Kuchen, weil Oma Geburtstag hat.', wrong: ['Wir backen einen Kuchen weil Oma Geburtstag hat.', 'Wir backen einen Kuchen weil, Oma Geburtstag hat.'], tag: 'nebensatz', why: 'Vor „weil“ steht ein Komma – es trennt die beiden Satzteile.' },
  { ok: 'Ich frage Papa, ob wir ins Kino gehen.', wrong: ['Ich frage Papa ob wir ins Kino gehen.', 'Ich frage Papa ob, wir ins Kino gehen.'], tag: 'nebensatz', why: 'Vor „ob“ steht ein Komma.' },
  { ok: 'Der Hund bellt, wenn es klingelt.', wrong: ['Der Hund bellt wenn es klingelt.', 'Der Hund, bellt wenn es klingelt.'], tag: 'nebensatz', why: 'Vor „wenn“ steht ein Komma.' },
  { ok: 'Ich mag Hunde, aber ich habe Angst vor Pferden.', wrong: ['Ich mag Hunde aber ich habe Angst vor Pferden.', 'Ich mag Hunde aber, ich habe Angst vor Pferden.'], tag: 'nebensatz', why: 'Vor „aber“ steht ein Komma.' },
  { ok: 'Am Strand bauen wir Burgen, sammeln Muscheln und baden im Meer.', wrong: ['Am Strand bauen wir Burgen sammeln Muscheln und baden im Meer.', 'Am Strand bauen wir Burgen, sammeln Muscheln, und baden im Meer.'], tag: 'aufzählung', why: 'Auch Tätigkeiten kann man aufzählen: Komma dazwischen, aber nicht vor „und“.' },
  { ok: 'Nachdem wir gegessen hatten, spielten wir Karten.', wrong: ['Nachdem wir gegessen hatten spielten wir Karten.', 'Nachdem, wir gegessen hatten spielten wir Karten.'], tag: 'nebensatz', why: 'Der Satzteil mit „nachdem“ wird mit einem Komma abgetrennt.' },
  { ok: 'Im Zoo sehen wir Löwen, Affen, Giraffen und Zebras.', wrong: ['Im Zoo sehen wir Löwen Affen Giraffen und Zebras.', 'Im Zoo sehen wir Löwen, Affen, Giraffen, und Zebras.'], tag: 'aufzählung', why: 'Bei Aufzählungen trennt ein Komma die Wörter. Vor „und“ steht kein Komma.' },
  { ok: 'Mama fragt, ob ich Hunger habe.', wrong: ['Mama fragt ob ich Hunger habe.', 'Mama fragt ob, ich Hunger habe.'], tag: 'nebensatz', why: 'Vor „ob“ steht ein Komma.' },
  { ok: 'Wenn die Sonne scheint, gehen wir ins Freibad.', wrong: ['Wenn die Sonne scheint gehen wir ins Freibad.', 'Wenn, die Sonne scheint gehen wir ins Freibad.'], tag: 'nebensatz', why: 'Der Satzteil mit „wenn“ wird mit einem Komma abgetrennt.' },
  { ok: 'Lena weiß, dass Pinguine nicht fliegen können.', wrong: ['Lena weiß dass Pinguine nicht fliegen können.', 'Lena weiß dass, Pinguine nicht fliegen können.'], tag: 'nebensatz', why: 'Vor „dass“ steht immer ein Komma.' },
  { ok: 'Ich bin hungrig, aber das Essen ist noch nicht fertig.', wrong: ['Ich bin hungrig aber das Essen ist noch nicht fertig.', 'Ich bin hungrig aber, das Essen ist noch nicht fertig.'], tag: 'nebensatz', why: 'Vor „aber“ steht ein Komma.' },
  { ok: 'Für den Ausflug packen wir Brote, Äpfel, Wasser und eine Decke ein.', wrong: ['Für den Ausflug packen wir Brote Äpfel Wasser und eine Decke ein.', 'Für den Ausflug packen wir Brote, Äpfel, Wasser, und eine Decke ein.'], tag: 'aufzählung', why: 'Bei Aufzählungen trennt ein Komma die Wörter. Vor „und“ steht kein Komma.' },
];
const komma = D(4, 'd4-komma', 'Kommas setzen', '✏️', {
  text: ['Aufzählungen: Zwischen die Wörter kommt ein Komma – aber nicht vor „und“ oder „oder“.', 'Vor Bindewörtern wie weil, dass, wenn, denn, aber steht ein Komma.', 'Beispiel: „Ich bleibe zu Hause, weil ich krank bin.“'],
  visual: { kind: 'text', text: 'Äpfel, Birnen und Bananen' },
  videoQuery: 'Komma Aufzählung weil dass Grundschule Klasse 4',
}, (r) => {
  const k = pick(r, KOMMA);
  return { key: k.ok, prompt: 'Welcher Satz ist richtig?', answer: choice(r, k.ok, k.wrong), tags: [k.tag], solution: [k.ok, k.why] };
}, { tagLabels: { aufzählung: 'Komma bei Aufzählungen', nebensatz: 'Komma vor weil, dass, wenn' }, testSeconds: 25 });

const SG4: { s: string; mark: string; was: 'Subjekt' | 'Prädikat' | 'Dativobjekt' | 'Akkusativobjekt' }[] = [
  { s: '**Der Bäcker** verkauft frisches Brot.', mark: 'Der Bäcker', was: 'Subjekt' }, { s: 'Der Bäcker **verkauft** frisches Brot.', mark: 'verkauft', was: 'Prädikat' }, { s: 'Der Bäcker verkauft **frisches Brot**.', mark: 'frisches Brot', was: 'Akkusativobjekt' },
  { s: 'Tim schenkt **seiner Mutter** Blumen.', mark: 'seiner Mutter', was: 'Dativobjekt' }, { s: 'Tim schenkt seiner Mutter **Blumen**.', mark: 'Blumen', was: 'Akkusativobjekt' }, { s: '**Tim** schenkt seiner Mutter Blumen.', mark: 'Tim', was: 'Subjekt' },
  { s: 'Die Kinder **helfen** dem Hausmeister.', mark: 'helfen', was: 'Prädikat' }, { s: 'Die Kinder helfen **dem Hausmeister**.', mark: 'dem Hausmeister', was: 'Dativobjekt' }, { s: 'Am Morgen füttert **Oma** die Hühner.', mark: 'Oma', was: 'Subjekt' }, { s: 'Am Morgen füttert Oma **die Hühner**.', mark: 'die Hühner', was: 'Akkusativobjekt' },
  { s: 'Lea gibt **dem Hund** einen Knochen.', mark: 'dem Hund', was: 'Dativobjekt' }, { s: 'Lea gibt dem Hund **einen Knochen**.', mark: 'einen Knochen', was: 'Akkusativobjekt' }, { s: '**Lea** gibt dem Hund einen Knochen.', mark: 'Lea', was: 'Subjekt' },
  { s: 'Der Briefträger **bringt** uns ein Paket.', mark: 'bringt', was: 'Prädikat' }, { s: 'Der Briefträger bringt uns **ein Paket**.', mark: 'ein Paket', was: 'Akkusativobjekt' }, { s: '**Der Briefträger** bringt uns ein Paket.', mark: 'Der Briefträger', was: 'Subjekt' },
  { s: '**Meine Schwester** besucht ihre Freundin.', mark: 'Meine Schwester', was: 'Subjekt' }, { s: 'Meine Schwester besucht **ihre Freundin**.', mark: 'ihre Freundin', was: 'Akkusativobjekt' },
  { s: 'Das Geschenk gefällt **dem Mädchen**.', mark: 'dem Mädchen', was: 'Dativobjekt' }, { s: '**Das Geschenk** gefällt dem Mädchen.', mark: 'Das Geschenk', was: 'Subjekt' }, { s: 'Das Geschenk **gefällt** dem Mädchen.', mark: 'gefällt', was: 'Prädikat' },
  { s: 'Am Nachmittag zeigt Opa **den Enkeln** seinen Garten.', mark: 'den Enkeln', was: 'Dativobjekt' }, { s: 'Am Nachmittag zeigt Opa den Enkeln **seinen Garten**.', mark: 'seinen Garten', was: 'Akkusativobjekt' }, { s: 'Am Nachmittag **zeigt** Opa den Enkeln seinen Garten.', mark: 'zeigt', was: 'Prädikat' },
  { s: 'Der Junge **wirft** den Ball über den Zaun.', mark: 'wirft', was: 'Prädikat' }, { s: 'Der Junge wirft **den Ball** über den Zaun.', mark: 'den Ball', was: 'Akkusativobjekt' },
  { s: '**Der Hund** jagt die Katze.', mark: 'Der Hund', was: 'Subjekt' }, { s: 'Der Hund **jagt** die Katze.', mark: 'jagt', was: 'Prädikat' }, { s: 'Der Hund jagt **die Katze**.', mark: 'die Katze', was: 'Akkusativobjekt' },
  { s: 'Die Lehrerin erklärt **den Kindern** die Aufgabe.', mark: 'den Kindern', was: 'Dativobjekt' }, { s: 'Die Lehrerin erklärt den Kindern **die Aufgabe**.', mark: 'die Aufgabe', was: 'Akkusativobjekt' }, { s: 'Die Lehrerin **erklärt** den Kindern die Aufgabe.', mark: 'erklärt', was: 'Prädikat' },
  { s: 'Das Fahrrad gehört **meinem Bruder**.', mark: 'meinem Bruder', was: 'Dativobjekt' }, { s: '**Das Fahrrad** gehört meinem Bruder.', mark: 'Das Fahrrad', was: 'Subjekt' },
  { s: 'Am Abend **liest** Papa ein Buch.', mark: 'liest', was: 'Prädikat' }, { s: 'Am Abend liest Papa **ein Buch**.', mark: 'ein Buch', was: 'Akkusativobjekt' },
];
/** Satzanfang mitten im Satz: Begleiter und Pronomen klein ("Meine Schwester" → "meine Schwester"), Nomen bleiben groß */
function midSentence(w: string): string {
  return /^(Der|Die|Das|Den|Dem|Ein|Eine|Einen|Mein|Meine|Dein|Deine|Sein|Seine|Ihr|Ihre|Unser|Unsere|Euer|Eure|Alle|Viele|Zwei|Drei|Vier|Fünf|Ich|Du|Er|Sie|Es|Wir)\b/.test(w) ? w[0].toLowerCase() + w.slice(1) : w;
}
const SG_Q = { Subjekt: 'Wer oder was?', Prädikat: 'Was tut jemand?', Dativobjekt: 'Wem?', Akkusativobjekt: 'Wen oder was?' } as const;
const satzglieder4 = D(4, 'd4-satzglieder', 'Satzglieder', '🧩', {
  text: ['Subjekt: Wer oder was? – Prädikat: Was tut jemand?', 'Dativobjekt: Wem? „Tim schenkt seiner Mutter Blumen.“ Wem? → seiner Mutter.', 'Akkusativobjekt: Wen oder was? Was schenkt Tim? → Blumen.', 'Satzglieder kann man umstellen (Umstellprobe): „Blumen schenkt Tim seiner Mutter.“'],
  visual: { kind: 'text', text: 'Tim | schenkt | seiner Mutter | Blumen.' },
  videoQuery: 'Satzglieder Subjekt Prädikat Objekt Klasse 4',
}, (r) => {
  const t = pick(r, SG4);
  return { key: t.s, prompt: `Welches Satzglied ist markiert?\n${t.s}`, speak: `Welches Satzglied ist „${t.mark}“? ${t.s.replace(/\*\*/g, '')}`, answer: fixedChoice(['Subjekt', 'Prädikat', 'Dativobjekt', 'Akkusativobjekt'], t.was), tags: [t.was.toLowerCase()], solution: [`Frage: ${SG_Q[t.was]} → ${t.mark}`, `Das ist das ${t.was}.`] };
}, { tagLabels: { subjekt: 'Subjekt', prädikat: 'Prädikat', dativobjekt: 'Dativobjekt (Wem?)', akkusativobjekt: 'Akkusativobjekt (Wen?)' }, testSeconds: 25 });

const WORTFELD: { s: string; ok: string; opts: string[]; feld: string }[] = [
  { s: 'Leise ☐ Tim seiner Freundin ein Geheimnis ins Ohr.', ok: 'flüstert', opts: ['schreit', 'ruft', 'antwortet'], feld: 'sagen' },
  { s: '„Hilfe!“, ☐ das Kind, so laut es kann.', ok: 'schreit', opts: ['flüstert', 'murmelt', 'antwortet'], feld: 'sagen' },
  { s: '„Wie spät ist es?“, ☐ Lea.', ok: 'fragt', opts: ['antwortet', 'flüstert', 'befiehlt'], feld: 'sagen' },
  { s: 'Lea fragt: „Wie spät ist es?“ – „Es ist drei Uhr“, ☐ Papa.', ok: 'antwortet', opts: ['fragt', 'schreit', 'jammert'], feld: 'sagen' },
  { s: 'Die Katze ☐ ganz leise an die Maus heran.', ok: 'schleicht', opts: ['rennt', 'stampft', 'hüpft'], feld: 'gehen' },
  { s: 'Der Läufer ☐ so schnell er kann ins Ziel.', ok: 'rennt', opts: ['schleicht', 'bummelt', 'humpelt'], feld: 'gehen' },
  { s: 'Mit dem verletzten Fuß ☐ Ben zum Arzt.', ok: 'humpelt', opts: ['rennt', 'hüpft', 'springt'], feld: 'gehen' },
  { s: 'Am Sonntag ☐ wir gemütlich durch die Stadt.', ok: 'bummeln', opts: ['rasen', 'stolpern', 'flüchten'], feld: 'gehen' },
  { s: 'Der Riese ☐ wütend mit seinen großen Füßen auf den Boden.', ok: 'stampft', opts: ['schleicht', 'trippelt', 'schwebt'], feld: 'gehen' },
  { s: '„Gute Nacht“, ☐ Oma leise und macht das Licht aus.', ok: 'flüstert', opts: ['brüllt', 'fragt', 'schimpft'], feld: 'sagen' },
  { s: '„Räum sofort dein Zimmer auf!“, ☐ Mama streng.', ok: 'befiehlt', opts: ['flüstert', 'fragt', 'kichert'], feld: 'sagen' },
  { s: '„Das ist ungerecht!“, ☐ Jonas und stampft mit dem Fuß auf.', ok: 'schimpft', opts: ['flüstert', 'antwortet', 'fragt'], feld: 'sagen' },
  { s: 'Das kleine Kind ☐ mit winzigen Schritten über den Flur.', ok: 'trippelt', opts: ['stampft', 'rast', 'springt'], feld: 'gehen' },
  { s: 'Nach dem langen Ausflug ☐ wir müde nach Hause.', ok: 'trotten', opts: ['rasen', 'hüpfen', 'sprinten'], feld: 'gehen' },
  { s: 'Die Ballerina ☐ leicht wie eine Feder über die Bühne.', ok: 'schwebt', opts: ['stampft', 'humpelt', 'stolpert'], feld: 'gehen' },
  { s: 'Mit dem Fernglas ☐ Opa die Vögel im Wald.', ok: 'beobachtet', opts: ['überhört', 'vergisst', 'verpasst'], feld: 'sehen' },
  { s: 'Vor Schreck ☐ Mia mit großen Augen auf die Spinne.', ok: 'starrt', opts: ['blinzelt', 'gähnt', 'lächelt'], feld: 'sehen' },
  { s: 'Neugierig ☐ Paul durch das Schlüsselloch.', ok: 'späht', opts: ['gähnt', 'übersieht', 'schläft'], feld: 'sehen' },
  // Nachtlauf 22.10.2026: mehr Sätze, Wortfeld „essen“ neu
  { s: 'Die Lehrerin ☐ den Kindern, wie das Experiment funktioniert.', ok: 'erklärt', opts: ['flüstert', 'jammert', 'kichert'], feld: 'sagen' },
  { s: '„Mein Bauch tut so weh!“, ☐ Ben.', ok: 'jammert', opts: ['jubelt', 'befiehlt', 'kichert'], feld: 'sagen' },
  { s: '„Wir haben gewonnen!“, ☐ die Mannschaft.', ok: 'jubelt', opts: ['jammert', 'flüstert', 'murmelt'], feld: 'sagen' },
  { s: 'Mit vollem Mund ☐ Opa etwas, das keiner versteht.', ok: 'murmelt', opts: ['brüllt', 'jubelt', 'befiehlt'], feld: 'sagen' },
  { s: 'Auf dem glatten Eis ☐ Lena und fällt hin.', ok: 'rutscht', opts: ['schleicht', 'bummelt', 'trottet'], feld: 'gehen' },
  { s: 'Fröhlich ☐ der Hase über die Wiese.', ok: 'hoppelt', opts: ['schleicht', 'humpelt', 'trottet'], feld: 'gehen' },
  { s: 'Der Bergsteiger ☐ auf den steilen Felsen.', ok: 'klettert', opts: ['schwebt', 'bummelt', 'trippelt'], feld: 'gehen' },
  { s: 'Im Dunkeln ☐ Tim plötzlich ein Licht in der Ferne.', ok: 'entdeckt', opts: ['überhört', 'vergisst', 'verschläft'], feld: 'sehen' },
  { s: 'Ganz genau ☐ die Forscherin den Käfer mit der Lupe.', ok: 'betrachtet', opts: ['übersieht', 'verpasst', 'überhört'], feld: 'sehen' },
  { s: 'Die Sonne blendet. Ali ☐ mit halb geschlossenen Augen.', ok: 'blinzelt', opts: ['starrt', 'glotzt', 'beobachtet'], feld: 'sehen' },
  { s: 'Der hungrige Hund ☐ sein Futter in einer Sekunde.', ok: 'verschlingt', opts: ['nascht', 'knabbert', 'kostet'], feld: 'essen' },
  { s: 'Die Maus ☐ an einem Stück Käse.', ok: 'knabbert', opts: ['verschlingt', 'schlürft', 'trinkt'], feld: 'essen' },
  { s: 'Heimlich ☐ Mia ein Stück Schokolade aus der Dose.', ok: 'nascht', opts: ['verschlingt', 'schlürft', 'trinkt'], feld: 'essen' },
  { s: 'Laut ☐ Opa seine heiße Suppe vom Löffel.', ok: 'schlürft', opts: ['knabbert', 'nascht', 'beißt'], feld: 'essen' },
];
const wortfeld = D(4, 'd4-wortfeld', 'Treffende Wörter (Wortfelder)', '🌈', {
  text: ['Ein Wortfeld sind Wörter mit ähnlicher Bedeutung: sagen – flüstern – rufen – fragen – antworten.', 'Treffende Wörter machen deine Texte spannender: Statt „Tim sagt leise“ schreibst du „Tim flüstert“.', 'Achte auf Hinweise im Satz: leise, laut, schnell, verletzt …'],
  visual: { kind: 'text', text: 'sagen: flüstern · rufen · fragen · antworten' },
  videoQuery: 'Wortfeld sagen gehen treffende Verben Grundschule',
}, (r) => {
  const w = pick(r, WORTFELD);
  return { key: w.s, prompt: `Welches Wort passt am besten?\n${w.s}`, speak: w.s.replace('☐', 'Lücke'), answer: { ...choice(r, w.ok, w.opts), speakOptions: 'de' }, tags: [`wortfeld-${w.feld}`], solution: [w.s.replace('☐', w.ok), `„${w.ok}“ passt am besten zu den Hinweisen im Satz.`] };
}, { tagLabels: { 'wortfeld-sagen': 'Wortfeld „sagen“', 'wortfeld-gehen': 'Wortfeld „gehen“', 'wortfeld-sehen': 'Wortfeld „sehen“', 'wortfeld-essen': 'Wortfeld „essen“' }, testSeconds: 20 });

function story4(r: Rng): Gen {
  const stories = [
    { t: 'Nele ist neu in der Klasse 4b. Am ersten Tag kennt sie niemanden und sitzt in der Pause allein auf der Bank. Da kommt Tarek und fragt, ob sie beim Fangen mitspielen möchte. Nele zögert erst, dann rennt sie mit. Am Nachmittag erzählt sie ihrer Mutter, dass sie schon einen Freund gefunden hat. Am nächsten Morgen freut sie sich auf die Schule.', qs: [
      { q: 'Warum sitzt Nele in der Pause allein?', a: 'Sie ist neu und kennt noch niemanden.', w: ['Sie ist krank.', 'Sie mag keine Spiele.', 'Sie hat Streit mit Tarek.'] },
      { q: 'Was fragt Tarek?', a: 'ob sie beim Fangen mitspielen möchte', w: ['ob sie ihm ein Brot gibt', 'wie spät es ist', 'ob sie neu ist'] },
      { q: 'Wie hat sich Neles Gefühl am Ende verändert?', a: 'Erst war sie allein, am Ende freut sie sich.', w: ['Erst war sie fröhlich, am Ende traurig.', 'Sie war die ganze Zeit traurig.', 'Sie ist am Ende wütend.'] },
    ] },
    { t: 'In der Nacht hat es stark geschneit. Als Finn aufwacht, ist alles weiß. Der Schulbus kann nicht fahren, weil die Straßen nicht geräumt sind. Finn und seine Schwester bauen im Garten einen riesigen Schneemann. Als Nase bekommt er eine Möhre, als Augen zwei Kohlestücke. Am Abend ist Finn müde, aber glücklich.', qs: [
      { q: 'Warum kann der Schulbus nicht fahren?', a: 'Die Straßen sind nicht geräumt.', w: ['Der Busfahrer ist krank.', 'Es ist Sonntag.', 'Der Bus ist kaputt.'] },
      { q: 'Was bekommt der Schneemann als Nase?', a: 'eine Möhre', w: ['ein Kohlestück', 'einen Knopf', 'einen Ast'] },
      { q: 'In welcher Jahreszeit spielt die Geschichte?', a: 'im Winter', w: ['im Sommer', 'im Herbst', 'im Frühling'] },
    ] },
    { t: 'Die Klasse 4a plant einen Flohmarkt. Jedes Kind bringt Spielsachen und Bücher mit, die es nicht mehr braucht. Der Flohmarkt findet in der Turnhalle statt. Am Ende haben die Kinder 236 Euro eingenommen. Das Geld spenden sie an ein Tierheim. Die Leiterin des Tierheims kommt in die Klasse und bedankt sich.', qs: [
      { q: 'Wo findet der Flohmarkt statt?', a: 'in der Turnhalle', w: ['im Klassenzimmer', 'auf dem Schulhof', 'im Tierheim'] },
      { q: 'Wie viel Geld nehmen die Kinder ein?', a: '236 Euro', w: ['263 Euro', '200 Euro', '36 Euro'] },
      { q: 'Warum kommt die Leiterin des Tierheims in die Klasse?', a: 'Sie will sich für die Spende bedanken.', w: ['Sie will Tiere verkaufen.', 'Sie will beim Flohmarkt helfen.', 'Sie ist eine neue Lehrerin.'] },
    ] },
    { t: 'Paula und ihr Bruder Max fahren mit dem Zug zu ihrer Tante nach Hamburg. Die Fahrt dauert vier Stunden. Unterwegs spielen sie Karten und essen belegte Brote. Max schläft nach zwei Stunden ein. Als sie ankommen, regnet es. Die Tante wartet mit einem großen roten Regenschirm am Bahnsteig.', qs: [
      { q: 'Wohin fahren Paula und Max?', a: 'nach Hamburg', w: ['nach Berlin', 'nach München', 'nach Köln'] },
      { q: 'Wie lange dauert die Fahrt?', a: 'vier Stunden', w: ['zwei Stunden', 'drei Stunden', 'einen Tag'] },
      { q: 'Warum braucht die Tante einen Regenschirm?', a: 'Weil es regnet.', w: ['Weil die Sonne scheint.', 'Weil sie ihn verschenkt.', 'Weil es schneit.'] },
      { q: 'Was macht Max nach zwei Stunden?', a: 'Er schläft ein.', w: ['Er isst ein Brot.', 'Er steigt aus.', 'Er liest ein Buch.'] },
    ] },
    { t: 'Im Herbst sammeln Eichhörnchen Nüsse und Eicheln. Sie verstecken sie an vielen Stellen im Boden. Im Winter suchen sie ihre Vorräte wieder. Doch nicht alle Verstecke finden sie. Aus manchen vergessenen Nüssen wachsen im Frühling neue Bäume. So helfen Eichhörnchen dem Wald.', qs: [
      { q: 'Was sammeln Eichhörnchen im Herbst?', a: 'Nüsse und Eicheln', w: ['Blätter und Gras', 'Pilze und Beeren', 'Steine'] },
      { q: 'Was passiert mit vergessenen Nüssen?', a: 'Es wachsen neue Bäume.', w: ['Sie werden zu Steinen.', 'Vögel fressen sie alle.', 'Sie verschwinden.'] },
      { q: 'Wie helfen Eichhörnchen dem Wald?', a: 'Sie pflanzen ohne Absicht neue Bäume.', w: ['Sie fällen alte Bäume.', 'Sie gießen die Pflanzen.', 'Sie vertreiben die Vögel.'] },
    ] },
    { t: 'Jonas hat Geburtstag. Er wird zehn Jahre alt. Zur Feier lädt er sechs Freunde ein. Sie machen eine Schatzsuche im Garten. Die Hinweise führen vom Apfelbaum zum Gartenhaus und dann zum Sandkasten. Dort finden die Kinder eine Kiste mit Schokotalern. Am Abend sagt Jonas: „Das war mein schönster Geburtstag!“', qs: [
      { q: 'Wie alt wird Jonas?', a: 'zehn Jahre', w: ['neun Jahre', 'elf Jahre', 'acht Jahre'] },
      { q: 'Wo finden die Kinder den Schatz?', a: 'im Sandkasten', w: ['im Gartenhaus', 'unter dem Apfelbaum', 'im Keller'] },
      { q: 'Wie hat Jonas der Geburtstag gefallen?', a: 'sehr gut', w: ['gar nicht', 'langweilig', 'Das steht nicht im Text.'] },
      { q: 'Wie viele Freunde lädt Jonas ein?', a: 'sechs', w: ['zehn', 'vier', 'acht'] },
    ] },
    // Nachtlauf 22.10.2026: mehr Texte
    { t: 'Die Klasse 4c fährt für drei Tage auf einen Bauernhof. Jeden Morgen um sechs Uhr helfen die Kinder im Stall. Lina füttert die Kälber, Emre sammelt die Eier ein. Am zweiten Tag wird ein kleines Ferkel geboren. Die Kinder dürfen ihm einen Namen geben und nennen es Rosi. Bei der Abfahrt sind alle ein bisschen traurig.', qs: [
      { q: 'Wie lange bleibt die Klasse auf dem Bauernhof?', a: 'drei Tage', w: ['zwei Tage', 'eine Woche', 'vier Tage'] },
      { q: 'Was macht Emre?', a: 'Er sammelt die Eier ein.', w: ['Er füttert die Kälber.', 'Er melkt die Kühe.', 'Er fegt den Hof.'] },
      { q: 'Wie heißt das Ferkel?', a: 'Rosi', w: ['Lina', 'Susi', 'Emma'] },
      { q: 'Warum sind die Kinder bei der Abfahrt traurig?', a: 'Es hat ihnen auf dem Bauernhof gefallen.', w: ['Sie haben Hunger.', 'Das Ferkel ist krank.', 'Es regnet.'] },
    ] },
    { t: 'Als Mia nach der Schule nach Hause kommt, findet sie ihren Haustürschlüssel nicht. Sie sucht in ihrer Jackentasche und in ihrem Ranzen. Dann fällt ihr ein, dass sie beim Sportunterricht ihre Jacke ausgezogen hat. Sie läuft zurück zur Turnhalle. Der Hausmeister hat den Schlüssel schon gefunden und gibt ihn ihr zurück. Mia bedankt sich und bringt ihm am nächsten Tag ein selbst gemaltes Bild.', qs: [
      { q: 'Wo sucht Mia zuerst?', a: 'in ihrer Jackentasche', w: ['unter der Fußmatte', 'im Briefkasten', 'in der Küche'] },
      { q: 'Wer hat den Schlüssel gefunden?', a: 'der Hausmeister', w: ['die Lehrerin', 'ihr Freund', 'ihre Mutter'] },
      { q: 'Warum läuft Mia zurück zur Turnhalle?', a: 'Sie hat dort ihre Jacke ausgezogen.', w: ['Sie hat gleich wieder Sport.', 'Sie will dort spielen.', 'Ihre Mutter wartet dort.'] },
      { q: 'Was bringt Mia dem Hausmeister?', a: 'ein selbst gemaltes Bild', w: ['Schokolade', 'eine Blume', 'einen Brief'] },
    ] },
    { t: 'Fledermäuse sind die einzigen Säugetiere, die richtig fliegen können. Am Tag schlafen sie kopfüber hängend in Höhlen oder auf Dachböden. In der Nacht jagen sie Insekten. Dabei stoßen sie hohe Rufe aus, die wir Menschen nicht hören können. Das Echo zeigt ihnen, wo ein Hindernis oder eine Mücke ist. Im Winter halten Fledermäuse Winterschlaf.', qs: [
      { q: 'Wann jagen Fledermäuse?', a: 'in der Nacht', w: ['am Morgen', 'am Mittag', 'nur im Winter'] },
      { q: 'Wie schlafen Fledermäuse?', a: 'kopfüber hängend', w: ['in einem Nest', 'auf dem Rücken', 'im Wasser'] },
      { q: 'Warum finden Fledermäuse im Dunkeln ihren Weg?', a: 'Das Echo ihrer Rufe zeigt ihnen den Weg.', w: ['Sie haben eine Taschenlampe.', 'Sie fliegen nur, wenn der Mond scheint.', 'Sie kennen jeden Baum auswendig.'] },
      { q: 'Was machen Fledermäuse im Winter?', a: 'Sie halten Winterschlaf.', w: ['Sie fliegen in den Süden.', 'Sie jagen Mücken.', 'Sie bauen Nester.'] },
    ] },
  ];
  const s = pick(r, stories);
  const q = pick(r, s.qs);
  return { key: `${s.t.slice(0, 30)}|${q.q}`, prompt: q.q, visual: { kind: 'text', text: s.t, title: 'Lies genau:' }, answer: choice(r, q.a, q.w), tags: [q.q.startsWith('Warum') || q.q.startsWith('Wie helfen') || q.q.startsWith('Wie hat') ? 'schlussfolgern' : 'informationen-finden'], solution: ['Suche die passende Stelle im Text.', `Antwort: ${q.a}`] };
}
const lesen4 = D(4, 'd4-lesen', 'Lesen und verstehen', '📖', {
  text: ['Lies den Text ganz und in Ruhe.', 'Manche Antworten stehen direkt im Text. Bei anderen musst du nachdenken: Warum passiert etwas?', 'Unterstreiche im Kopf die wichtigen Wörter der Frage und suche sie im Text.'],
  videoQuery: 'Leseverständnis Klasse 4 Tipps',
}, story4, { tagLabels: { schlussfolgern: 'Schlussfolgern (Warum?)', 'informationen-finden': 'Informationen im Text finden' }, testSeconds: 75 });

export const DEUTSCH: Skill[] = [
  anlaut, silben, reime, buchstaben, lesen1, luecke,
  abc, nomen, artikel, mehrzahl, verben, adjektive2, satzzeichen, doppel, cktz, ie, grossschreibung,
  wortarten, satzarten, zeit3, zusammen, wortfamilie, auslaut, aeEu, dehnung, steigerung, satzglieder3, lesen3,
  faelle, zeit4, dasDass, ssz, rede, komma, satzglieder4, wortfeld, lesen4,
];
