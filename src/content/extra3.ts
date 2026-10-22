// Weitere Themen (Nachtlauf 21./22.10.2026, Teil 3) nach Abgleich mit dem NRW-Lehrplan:
// Lagebeziehungen (Kl. 1), Zahlenstrahl bis 100 (Kl. 2) und bis 1000 (Kl. 3), Im Wörterbuch nachschlagen (Kl. 3).
import { chance, choice, fixedChoice, fmt, pick, pickN, ri, shuffle, type Rng } from '../engine/rng';
import type { Skill, Stage } from '../engine/types';
import { NAMES, columnAdd, columnSub, skill, type Gen } from './helpers';
import { VT, wordTask, type W } from './extra';
import { registerWords, withWord } from './words';

const M = (grade: 1 | 2 | 3 | 4, ...a: Parameters<typeof skill> extends [unknown, unknown, ...infer R] ? R : never) => skill('mathe', grade, ...a);
const E = (year: 1 | 2, ...a: Parameters<typeof skill> extends [unknown, unknown, ...infer R] ? R : never) => skill('englisch', year === 1 ? 3 : 4, ...a);
const D = (grade: 1 | 2 | 3 | 4, ...a: Parameters<typeof skill> extends [unknown, unknown, ...infer R] ? R : never) => skill('deutsch', grade, ...a);

// ---------- Links, rechts, oben, unten (Kl. 1) ----------

const THINGS = ['🍎', '⚽', '🚗', '🧸', '🎈', '📕', '🐱', '🌼', '🍌', '🎁', '🦆', '🧁'];
const LR_TIP = 'Tipp: Strecke beide Hände aus und spreize die Daumen ab – die linke Hand zeigt ein „L“.';

function lageTask(r: Rng, s: Stage): Gen {
  // Stufe 2/3: auch Regal mit oben/unten
  if (s > 1 && chance(r, 0.45)) {
    const nRows = s === 3 ? 3 : 2;
    const items = pickN(r, THINGS, nRows * 3);
    const rows = Array.from({ length: nRows }, (_, i) => items.slice(i * 3, i * 3 + 3));
    const up = chance(r, 0.5);
    const row = up ? ri(r, 1, nRows - 1) : ri(r, 0, nRows - 2);
    const col = ri(r, 0, 2);
    const ref = rows[row][col];
    const ok = rows[up ? row - 1 : row + 1][col];
    const wrongOther = rows[up ? row + 1 : row - 1]?.[col];
    const others = [...(wrongOther ? [wrongOther] : []), ...shuffle(r, items.filter((x) => x !== ok && x !== ref && x !== wrongOther))].slice(0, 3);
    return {
      key: `ou-${rows.flat().join('')}-${ref}-${up}`,
      prompt: `Was liegt im Regal direkt **${up ? 'über' : 'unter'}** ${ref}?`,
      speak: `Was liegt im Regal direkt ${up ? 'über' : 'unter'} dem Bild?`,
      visual: { kind: 'grid', rows, mark: [row, col] },
      answer: { ...choice(r, ok, others), big: true },
      tags: ['oben-unten'],
      traps: wrongOther ? [{ answer: wrongOther, tag: 'oben-unten-vertauscht', hint: `Das liegt ${up ? 'unter' : 'über'} ${ref}. ${up ? 'Über' : 'Unter'} heißt: ${up ? 'ein Fach höher' : 'ein Fach tiefer'}.` }] : [],
      solution: [`${up ? 'Über' : 'Unter'} ${ref} liegt ${ok}.`, up ? 'Über = ein Fach weiter oben.' : 'Unter = ein Fach weiter unten.'],
      solutionVisual: { kind: 'grid', rows, mark: [up ? row - 1 : row + 1, col] },
    };
  }
  const n = s === 1 ? 3 : s === 2 ? 4 : 5;
  const row = pickN(r, THINGS, n);
  if (s > 1 && chance(r, 0.3)) {
    const i = ri(r, 0, n - 3);
    const ok = row[i + 1];
    return {
      key: `zw-${row.join('')}-${i}`,
      prompt: `Was liegt **zwischen** ${row[i]} und ${row[i + 2]}?`,
      speak: 'Was liegt zwischen den beiden Bildern?',
      visual: { kind: 'grid', rows: [row] },
      answer: { ...choice(r, ok, row.filter((x) => x !== ok).slice(0, 3)), big: true },
      tags: ['zwischen'],
      solution: [`Zwischen ${row[i]} und ${row[i + 2]} liegt ${ok}.`, 'Zwischen heißt: Links und rechts davon liegt je eins der beiden Dinge.'],
      solutionVisual: { kind: 'grid', rows: [row], mark: [0, i + 1] },
    };
  }
  const left = chance(r, 0.5);
  const i = left ? ri(r, 1, n - 1) : ri(r, 0, n - 2);
  const ref = row[i];
  const ok = row[left ? i - 1 : i + 1];
  const wrongSide = row[left ? i + 1 : i - 1];
  const others = [...(wrongSide ? [wrongSide] : []), ...row.filter((x) => x !== ok && x !== ref && x !== wrongSide)].slice(0, 3);
  return {
    key: `lr-${row.join('')}-${ref}-${left}`,
    prompt: `Was liegt direkt **${left ? 'links' : 'rechts'}** neben ${ref}?`,
    speak: `Was liegt direkt ${left ? 'links' : 'rechts'} neben dem Bild?`,
    visual: { kind: 'grid', rows: [row], mark: [0, i] },
    answer: { ...choice(r, ok, others), big: true },
    tags: ['links-rechts'],
    traps: wrongSide ? [{ answer: wrongSide, tag: 'links-rechts-vertauscht', hint: `Das liegt ${left ? 'rechts' : 'links'} neben ${ref}. ${LR_TIP}` }] : [],
    solution: [`${left ? 'Links' : 'Rechts'} neben ${ref} liegt ${ok}.`, LR_TIP],
    solutionVisual: { kind: 'grid', rows: [row], mark: [0, left ? i - 1 : i + 1] },
  };
}

// ---------- Zahlenstrahl ----------

/** ein Punkt am Zahlenstrahl: Zahl ablesen */
/** große Zahlen gegliedert schreiben (450 000) */
const g = (v: number) => (v >= 10000 ? fmt(v) : String(v));
function strahlTask(from: number, to: number, step: number, minor: number, n: number, tag = 'ablesen'): Gen {
  const lab = Math.floor(n / step) * step;
  const k = (n - lab) / minor;
  const big = minor > 1;
  return {
    key: `${from}-${to}-${n}`,
    prompt: 'Welche Zahl gehört an den Punkt mit dem Fragezeichen?',
    visual: { kind: 'numberline', from, to, start: n, jumps: [], step, minor, ask: true },
    answer: { type: 'number', value: n },
    tags: [tag],
    traps: [
      { answer: String(n + minor), tag: 'verzaehlt', hint: `Zähle die Striche noch einmal genau – jeder kleine Strich ist ${g(minor)} weiter.` },
      { answer: String(n - minor), tag: 'verzaehlt', hint: `Zähle die Striche noch einmal genau – jeder kleine Strich ist ${g(minor)} weiter.` },
      ...(big ? [{ answer: String(lab + k), tag: 'strich-wert', hint: `Ein kleiner Strich ist hier nicht 1, sondern ${g(minor)}.` }] : []),
    ],
    solution: [`Jeder kleine Strich ist ${g(minor)} weiter.`, `Von ${g(lab)} aus ${k === 1 ? 'ist es 1 Strich' : `sind es ${k} Striche`}: ${g(lab)} + ${g(k * minor)} = ${g(n)}`],
    solutionVisual: { kind: 'numberline', from, to, start: lab, jumps: [n - lab], step, minor },
  };
}

/** Welche Zahl liegt genau in der Mitte? */
function mitteTask(r: Rng, unit: number, maxUnits: number): Gen {
  const a = ri(r, 0, maxUnits - 2) * unit;
  // b = a + 2·half bleibt im Zahlenraum (maxUnits · unit)
  const half = ri(r, 1, Math.max(1, Math.min(4, Math.floor((maxUnits * unit - a) / unit / 2)))) * unit;
  const b = a + 2 * half;
  const m = a + half;
  return {
    key: `mitte-${a}-${b}`,
    prompt: `Welche Zahl liegt am Zahlenstrahl genau in der Mitte zwischen ${g(a)} und ${g(b)}?`,
    answer: { type: 'number', value: m },
    tags: ['mitte'],
    traps: [{ answer: String(b - a), tag: 'abstand-statt-mitte', hint: `${g(b - a)} ist der Abstand. Die Mitte ist die Hälfte davon weiter: ${g(a)} + ${g(half)}.` }],
    solution: [`Von ${g(a)} bis ${g(b)} sind es ${g(b - a)}.`, `Die Hälfte davon ist ${g(half)}.`, `${g(a)} + ${g(half)} = ${g(m)}`],
    solutionVisual: { kind: 'numberline', from: a, to: b, start: a, jumps: [half, half], step: half },
  };
}

function strahl100(r: Rng, s: Stage): Gen {
  if (s > 1 && chance(r, 0.25)) return mitteTask(r, 10, 10);
  if (s === 1) {
    const t = ri(r, 0, 9) * 10;
    let n = t + ri(r, 1, 9);
    if (n % 5 === 0) n++;
    return strahlTask(t, t + 10, 5, 1, n);
  }
  if (s === 2) {
    const t = ri(r, 0, 8) * 10;
    let n = t + ri(r, 1, 19);
    if (n % 10 === 0) n++;
    return strahlTask(t, t + 20, 10, 1, n);
  }
  return strahlTask(0, 100, 10, 5, ri(r, 0, 9) * 10 + 5);
}

function strahl1000(r: Rng, s: Stage): Gen {
  if (s > 1 && chance(r, 0.25)) return chance(r, 0.5) ? mitteTask(r, 100, 10) : mitteTask(r, 50, 20);
  if (s === 1) {
    const h = ri(r, 0, 9) * 100;
    let n = h + ri(r, 1, 9) * 10;
    if (n % 50 === 0) n += 10;
    return strahlTask(h, h + 100, 50, 10, n);
  }
  if (s === 2) {
    const h = ri(r, 0, 8) * 100;
    let n = h + ri(r, 1, 19) * 10;
    if (n % 100 === 0) n += 10;
    return strahlTask(h, h + 200, 100, 10, n);
  }
  return strahlTask(0, 1000, 100, 50, ri(r, 0, 9) * 100 + 50);
}

// ---------- Im Wörterbuch nachschlagen (Kl. 3) ----------

const GRUND: [string, string, string[], 'verb' | 'nomen' | 'adjektiv'][] = [
  ['lief', 'laufen', ['liefen', 'läuft'], 'verb'], ['ging', 'gehen', ['gingen', 'geht'], 'verb'], ['sang', 'singen', ['sangen', 'singt'], 'verb'],
  ['isst', 'essen', ['aß', 'esst'], 'verb'], ['fährt', 'fahren', ['fuhr', 'fahrt'], 'verb'], ['sah', 'sehen', ['sahen', 'sieht'], 'verb'],
  ['schrieb', 'schreiben', ['schrieben', 'schreibt'], 'verb'], ['trug', 'tragen', ['trugen', 'trägt'], 'verb'], ['nahm', 'nehmen', ['nahmen', 'nimmt'], 'verb'],
  ['hilft', 'helfen', ['half', 'hilfst'], 'verb'], ['flog', 'fliegen', ['flogen', 'fliegt'], 'verb'], ['stand', 'stehen', ['standen', 'steht'], 'verb'],
  ['Bäume', 'Baum', ['Bäumen', 'Bäumchen'], 'nomen'], ['Häuser', 'Haus', ['Häusern', 'Häuschen'], 'nomen'], ['Mäuse', 'Maus', ['Mäusen', 'Mäuschen'], 'nomen'],
  ['Bücher', 'Buch', ['Büchern', 'Büchlein'], 'nomen'], ['Füße', 'Fuß', ['Füßen', 'Füßchen'], 'nomen'], ['Kinder', 'Kind', ['Kindern', 'Kindes'], 'nomen'],
  ['Äpfel', 'Apfel', ['Äpfeln', 'Äpfelchen'], 'nomen'], ['Hände', 'Hand', ['Händen', 'Händchen'], 'nomen'],
  ['größer', 'groß', ['größte', 'am größten'], 'adjektiv'], ['wärmer', 'warm', ['wärmste', 'am wärmsten'], 'adjektiv'],
  ['schneller', 'schnell', ['schnellste', 'am schnellsten'], 'adjektiv'], ['länger', 'lang', ['längste', 'am längsten'], 'adjektiv'],
];
const GRUND_WHY = {
  verb: 'Verben stehen im Wörterbuch in der Grundform (Infinitiv): laufen, gehen, essen.',
  nomen: 'Nomen stehen im Wörterbuch in der Einzahl: der Baum, das Haus.',
  adjektiv: 'Adjektive stehen im Wörterbuch in der Grundstufe – nicht gesteigert: groß, warm.',
};
const ABC3: string[][] = [
  ['Ball', 'Band', 'Bank', 'Bach'], ['Schaf', 'Schal', 'Schatz', 'Schach'], ['Maus', 'Mann', 'Mais', 'Mantel'], ['Rose', 'Rock', 'Roller', 'Rotkehlchen'],
  ['Tisch', 'Tier', 'Tinte', 'Tiger'], ['Sonne', 'Sofa', 'Socke', 'Sommer'], ['Kuchen', 'Kuh', 'Kugel', 'Kurve'], ['Bett', 'Besen', 'Beere', 'Berg'],
  ['Hase', 'Hand', 'Haus', 'Hafen'], ['Pilz', 'Pinsel', 'Pirat', 'Pizza'], ['Wolke', 'Wolf', 'Wort', 'Woche'],
];

function woerterbuchTask(r: Rng, s: Stage): Gen {
  if (chance(r, s === 1 ? 0.5 : 0.4)) {
    const words = pickN(r, pick(r, ABC3), s === 1 ? 3 : 4);
    const sorted = [...words].sort((a, b) => a.localeCompare(b, 'de'));
    const last = s === 3 && chance(r, 0.5);
    const ok = last ? sorted[sorted.length - 1] : sorted[0];
    const same = words.reduce((p, w) => { let i = 0; while (i < p.length && p[i] === w[i]) i++; return p.slice(0, i); }, words[0]);
    const pos = same.length + 1;
    return {
      key: `abc-${sorted.join('-')}-${last}`,
      prompt: `Welches Wort steht im Wörterbuch **${last ? 'ganz hinten' : 'ganz vorne'}**?`,
      speak: `Welches Wort steht im Wörterbuch ${last ? 'ganz hinten' : 'ganz vorne'}?`,
      answer: { ...choice(r, ok, words.filter((w) => w !== ok)), speakOptions: 'de' },
      tags: ['abc'],
      solution: [`Die Wörter beginnen alle mit „${same}“ – schau auf den ${pos}. Buchstaben. Ist der auch gleich, auf den nächsten.`, `Nach dem ABC: ${sorted.join(', ')}`],
    };
  }
  const pool = s === 1 ? GRUND.filter((g) => g[3] === 'nomen') : s === 2 ? GRUND.filter((g) => g[3] !== 'adjektiv') : GRUND;
  const [form, base, wrong, kind] = pick(r, pool);
  return {
    key: `gf-${form}`,
    prompt: `Du willst „${form}“ nachschlagen.\nUnter welchem Wort findest du es im Wörterbuch?`,
    speak: `Du willst ${form} nachschlagen. Unter welchem Wort findest du es im Wörterbuch?`,
    answer: { ...choice(r, base, [form, ...wrong]), speakOptions: 'de' },
    tags: [`grundform-${kind}`],
    traps: [{ answer: form, tag: 'nicht-grundform', hint: `„${form}“ ist nicht die Grundform. ${GRUND_WHY[kind]}` }],
    solution: [`Schlage unter „${base}“ nach.`, GRUND_WHY[kind]],
  };
}

// ---------- Englisch: Feste im Jahr (1. Lernjahr) ----------

const FESTE: W[] = [
  { en: 'pumpkin', de: 'Kürbis', e: '🎃' }, { en: 'witch', de: 'Hexe', e: '🧙' }, { en: 'ghost', de: 'Gespenst', e: '👻' }, { en: 'bat', de: 'Fledermaus', e: '🦇' },
  { en: 'Christmas tree', de: 'Weihnachtsbaum', e: '🎄' }, { en: 'present', de: 'Geschenk', e: '🎁' }, { en: 'candle', de: 'Kerze', e: '🕯️' }, { en: 'star', de: 'Stern', e: '⭐' },
  { en: 'snowman', de: 'Schneemann', e: '⛄' }, { en: 'Father Christmas', de: 'Weihnachtsmann', e: '🎅' }, { en: 'Easter egg', de: 'Osterei', e: '🥚' }, { en: 'Easter bunny', de: 'Osterhase', e: '🐰' },
  { en: 'birthday cake', de: 'Geburtstagskuchen', e: '🎂' }, { en: 'balloon', de: 'Luftballon', e: '🎈' },
];
const WISHES: [string, string, string][] = [
  ['Merry Christmas!', 'Frohe Weihnachten!', '🎄'], ['Happy Easter!', 'Frohe Ostern!', '🐰'], ['Happy birthday!', 'Alles Gute zum Geburtstag!', '🎂'],
  ['Trick or treat!', 'Süßes oder Saures!', '🎃'], ['Happy New Year!', 'Frohes neues Jahr!', '🎆'],
];
function festTask(r: Rng, s: Stage): Gen {
  if (chance(r, 0.3)) {
    const [en, de, e] = pick(r, WISHES);
    const say = { text: en, lang: 'en' as const };
    if (s > 1 && chance(r, 0.5))
      return { key: `w-de-${en}`, prompt: `Was sagst du auf Englisch?\n„${de}“`, visual: { kind: 'emoji', chars: e }, answer: { ...choice(r, en, WISHES.filter((w) => w[0] !== en).map((w) => w[0])), speakOptions: 'en' }, tags: ['wünsche'], solution: [`${de} = ${en}`], pronounce: say };
    return { key: `w-${en}`, prompt: 'Hör gut zu! Was bedeutet das?', speak: 'Hör gut zu!', listen: say, visual: { kind: 'emoji', chars: e }, answer: choice(r, de, WISHES.filter((w) => w[0] !== en).map((w) => w[1])), tags: ['wünsche'], solution: [`${en} = ${de}`], pronounce: say };
  }
  return withWord(wordTask(r, FESTE, s), FESTE);
}
registerWords('e1-festivals', FESTE);

// ---------- Englisch: Einkaufen (2. Lernjahr) ----------

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const numEn = (n: number) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : ''));
const euro = (e: number, c: number) => `${e},${String(c).padStart(2, '0')} €`;
const SHOP_QA: [string, string, string[]][] = [
  ['How much is the ice cream?', 'It’s two euros.', ['Yes, please.', 'I like ice cream.', 'Goodbye.']],
  ['Can I help you?', 'Yes, please. Can I have a banana?', ['It’s two euros.', 'No, I can’t.', 'It’s a banana.']],
  ['Here you are.', 'Thank you.', ['How much is it?', 'Yes, I can.', 'Good morning.']],
  ['Anything else?', 'No, thank you.', ['Yes, I am.', 'It’s red.', 'Good morning.']],
  ['How much are the apples?', 'They’re one euro.', ['It’s an apple.', 'Yes, please.', 'I’m fine.']],
  ['Can I have a lemonade, please?', 'Here you are.', ['I’m nine.', 'Yes, I do.', 'It’s Monday.']],
];
const SHOP_WANT: [string, string][] = [
  ['an apple', 'einen Apfel'], ['a banana', 'eine Banane'], ['an ice cream', 'ein Eis'], ['a lemonade', 'eine Limonade'], ['an orange', 'eine Orange'], ['a sandwich', 'ein Sandwich'], ['a muffin', 'einen Muffin'],
];
function shopTask(r: Rng, s: Stage): Gen {
  const v = ri(r, 0, s === 1 ? 1 : 2);
  if (v === 0) {
    // Preise hören: three euros fifty
    const e = ri(r, 1, 9);
    const c = pick(r, [0, 20, 50, 50, 15, 30, 80]);
    const en = `It’s ${numEn(e)} ${e === 1 ? 'euro' : 'euros'}${c ? ` ${numEn(c)}` : ''}.`;
    const ok = euro(e, c);
    const teen = c === 50 ? euro(e, 15) : c === 15 ? euro(e, 50) : c === 30 ? euro(e, 13) : c === 80 ? euro(e, 18) : euro(e, c === 0 ? 10 : c + 10);
    const wrong = [...new Set([teen, c ? euro(Math.floor(c / 10), e * 10) : euro(e + 1, 0), euro(e + 10, c), euro(e === 9 ? 8 : e + 1, c)])].filter((x) => x !== ok).slice(0, 3);
    return { key: `p-${e}-${c}`, prompt: 'Hör gut zu! Wie viel kostet es?', speak: 'Hör gut zu! Wie viel kostet es?', listen: { text: en, lang: 'en', slow: s === 1 }, answer: choice(r, ok, wrong), tags: ['preise'], traps: [15, 50, 30, 80].includes(c) ? [{ answer: teen, tag: 'teen-ty', hint: 'Achte aufs Ende: „-teen“ (13–19) klingt anders als „-ty“ (20, 30 …).' }] : [], solution: [en, `= ${ok}`], pronounce: { text: en, lang: 'en' } };
  }
  if (v === 1) {
    const [q, a, w] = pick(r, SHOP_QA);
    return { key: `q-${q}`, prompt: `Im Laden: Welche Antwort passt?\n${q}`, speak: 'Welche Antwort passt?', listen: { text: q, lang: 'en' }, answer: { ...choice(r, a, s === 1 ? w.slice(0, 2) : w), speakOptions: 'en' }, tags: ['dialog'], solution: [`${q} – ${a}`], pronounce: { text: a, lang: 'en' } };
  }
  const [en, de] = pick(r, SHOP_WANT);
  const ok = `Can I have ${en}, please?`;
  const art = en.startsWith('an ') ? en.replace(/^an /, 'a ') : en.replace(/^a /, 'an ');
  return { key: `w-${en}`, prompt: `Du möchtest etwas kaufen. Wie fragst du?\n„Kann ich bitte ${de} haben?“`, answer: { ...choice(r, ok, [`Can I have ${art}, please?`, `I have ${en}.`, `How much is ${en.replace(/^an? /, 'the ')}?`]), speakOptions: 'en' }, tags: ['dialog'], traps: [{ answer: `Can I have ${art}, please?`, tag: 'a-an', hint: 'Vor a, e, i, o, u (gesprochen) steht „an“, sonst „a“.' }], solution: [ok, `= Kann ich bitte ${de} haben?`], pronounce: { text: ok, lang: 'en' } };
}

// ---------- Englisch: kurze Texte lesen (2. Lernjahr) ----------

const EN_TEXTS: { t: string; qs: [string, string, string[], string][] }[] = [
  { t: 'Hi! My name is Lucy. I am nine years old. I live in London with my mum, my dad and my little brother Sam. I have got a dog. His name is Max. Max is black and white. I like playing football with Max in the park.', qs: [['Wie alt ist Lucy?', 'neun Jahre', ['acht Jahre', 'zehn Jahre', 'sieben Jahre'], 'I am nine years old.'], ['Wie heißt Lucys Hund?', 'Max', ['Sam', 'Lucy', 'Rex'], 'His name is Max.'], ['Was macht Lucy gern mit Max?', 'Fußball spielen im Park', ['schwimmen im See', 'malen zu Hause', 'lesen im Bett'], 'I like playing football with Max in the park.']] },
  { t: 'This is Tom. He is ten. Tom gets up at seven o’clock. He has got cornflakes and milk for breakfast. Then he goes to school by bike. His favourite subject is Maths. After school he plays the guitar.', qs: [['Wann steht Tom auf?', 'um sieben Uhr', ['um acht Uhr', 'um sechs Uhr', 'um zehn Uhr'], 'Tom gets up at seven o’clock.'], ['Wie kommt Tom zur Schule?', 'mit dem Fahrrad', ['mit dem Bus', 'zu Fuß', 'mit dem Auto'], 'He goes to school by bike.'], ['Welches Fach mag Tom am liebsten?', 'Mathe', ['Englisch', 'Sport', 'Kunst'], 'His favourite subject is Maths.']] },
  { t: 'It is winter. It is cold and snowy. Anna and Ben are in the garden. They are making a big snowman. The snowman has got a carrot nose and a red hat. After that they drink hot chocolate in the kitchen.', qs: [['Welche Jahreszeit ist es?', 'Winter', ['Sommer', 'Herbst', 'Frühling'], 'It is winter.'], ['Was hat der Schneemann auf dem Kopf?', 'einen roten Hut', ['eine blaue Mütze', 'einen Topf', 'nichts'], 'The snowman has got … a red hat.'], ['Was trinken Anna und Ben danach?', 'heiße Schokolade', ['kalte Milch', 'Tee', 'Orangensaft'], 'they drink hot chocolate']] },
  { t: 'My name is Emma. I have got a pet. It is small and brown. It has got long ears and it likes carrots. It lives in a big cage in my room. On Sunday I clean the cage.', qs: [['Was für ein Haustier hat Emma wahrscheinlich?', 'einen Hasen', ['einen Hund', 'eine Katze', 'einen Fisch'], 'small and brown … long ears … likes carrots'], ['Wo wohnt das Tier?', 'in einem Käfig in Emmas Zimmer', ['im Garten', 'in der Küche', 'im Keller'], 'It lives in a big cage in my room.'], ['Wann putzt Emma den Käfig?', 'am Sonntag', ['am Montag', 'jeden Tag', 'am Freitag'], 'On Sunday I clean the cage.']] },
  { t: 'Today is Paul’s birthday. He is eight. His friends come to his party. They eat cake and play games. Paul gets a kite and a book. In the evening they go to the cinema.', qs: [['Wie alt wird Paul?', 'acht', ['neun', 'sieben', 'zehn'], 'He is eight.'], ['Was bekommt Paul geschenkt?', 'einen Drachen und ein Buch', ['einen Ball und ein Buch', 'einen Drachen und ein Spiel', 'ein Fahrrad'], 'Paul gets a kite and a book.'], ['Wohin gehen sie am Abend?', 'ins Kino', ['in den Zoo', 'ins Schwimmbad', 'nach Hause'], 'they go to the cinema']] },
  { t: 'Look at my classroom! There are twenty-four children in my class. Our teacher is Mrs Brown. There is a big whiteboard and a computer. Next to the window there are plants. I sit next to my friend Mia.', qs: [['Wie viele Kinder sind in der Klasse?', '24', ['14', '20', '42'], 'There are twenty-four children in my class.'], ['Wie heißt die Lehrerin?', 'Mrs Brown', ['Mrs Black', 'Mia', 'Mrs Green'], 'Our teacher is Mrs Brown.'], ['Was steht neben dem Fenster?', 'Pflanzen', ['ein Computer', 'eine Tafel', 'Stühle'], 'Next to the window there are plants.']] },
  // Nachtlauf 22.10.2026: Texte zu den neuen Wortfeldern (Stadt, Berufe, Tiere, Obst)
  { t: 'I live in a small town. In my town there is a park, a big supermarket and a station. The hospital is next to the church. On Saturday I go to the swimming pool with my dad. After that we eat ice cream in a café.', qs: [['Was steht neben der Kirche?', 'das Krankenhaus', ['der Bahnhof', 'der Supermarkt', 'das Schwimmbad'], 'The hospital is next to the church.'], ['Wohin geht das Kind am Samstag?', 'ins Schwimmbad', ['in den Park', 'zum Bahnhof', 'ins Kino'], 'On Saturday I go to the swimming pool'], ['Mit wem geht das Kind dorthin?', 'mit seinem Papa', ['mit seiner Mama', 'mit seiner Schwester', 'allein'], 'with my dad']] },
  { t: 'My mum is a doctor. She works in a hospital. My dad is a cook. He works in a restaurant and makes very good pizza. My uncle is a pilot. He flies to many countries. When I am big, I want to be a firefighter.', qs: [['Wo arbeitet die Mutter?', 'im Krankenhaus', ['im Restaurant', 'in der Schule', 'am Flughafen'], 'She works in a hospital.'], ['Was macht der Vater sehr gut?', 'Pizza', ['Kuchen', 'Suppe', 'Brot'], 'makes very good pizza'], ['Was möchte das Kind später werden?', 'Feuerwehrmann oder Feuerwehrfrau', ['Arzt oder Ärztin', 'Pilot oder Pilotin', 'Koch oder Köchin'], 'I want to be a firefighter.']] },
  { t: 'Owls are birds. They sleep in the day and fly in the night. They have got big eyes, so they can see in the dark. Owls eat mice. Many owls live in the forest. They can turn their heads very far.', qs: [['Wann schlafen Eulen?', 'am Tag', ['in der Nacht', 'im Winter', 'nie'], 'They sleep in the day'], ['Warum können Eulen im Dunkeln sehen?', 'Sie haben große Augen.', ['Sie haben lange Ohren.', 'Sie haben eine Lampe.', 'Sie schlafen viel.'], 'They have got big eyes, so they can see in the dark.'], ['Was fressen Eulen?', 'Mäuse', ['Fische', 'Äpfel', 'Blätter'], 'Owls eat mice.']] },
  { t: 'Kim and her grandma go to the market. Kim wants grapes and two pears. Grandma buys potatoes, onions and a big watermelon. The watermelon is very heavy. Kim helps Grandma and carries the grapes.', qs: [['Wohin gehen Kim und ihre Oma?', 'auf den Markt', ['in den Park', 'in die Schule', 'ins Kino'], 'go to the market'], ['Was kauft die Oma?', 'Kartoffeln, Zwiebeln und eine Wassermelone', ['Birnen und Weintrauben', 'Äpfel und Bananen', 'Tomaten und Gurken'], 'Grandma buys potatoes, onions and a big watermelon.'], ['Was trägt Kim?', 'die Weintrauben', ['die Wassermelone', 'die Kartoffeln', 'die Zwiebeln'], 'Kim … carries the grapes.']] },
];
function enReadTask(r: Rng, s: Stage): Gen {
  const tx = pick(r, EN_TEXTS);
  const [q, a, w, ev] = pick(r, tx.qs);
  return {
    key: `${tx.t.slice(0, 20)}|${q}`,
    prompt: q,
    visual: { kind: 'text', text: tx.t, title: '📖 Read the text' },
    answer: choice(r, a, s === 1 ? w.slice(0, 2) : w),
    tags: ['lesen'],
    solution: [`Im Text steht: „${ev}“`, `Antwort: ${a}`],
    pronounce: { text: ev.replace(/ … /g, ', '), lang: 'en' },
  };
}

export const ENGLISCH_EXTRA3: Skill[] = [
  E(2, 'e2-health', "What's the matter? – Wie geht's dir?", '🤒', { text: ["What's the matter? = Was ist los?", "I've got a headache. = Ich habe Kopfschmerzen. I've got a cold. = Ich bin erkältet.", "Gute Besserung heißt: Get well soon!"], visual: { kind: 'emoji', chars: '🤕 🤧 🤒' }, videoQuery: "what's the matter song kids I have a headache" }, healthTask, { tagLabels: { hoeren: 'Sätze hören', saetze: 'Sätze verstehen' }, testSeconds: 20 }),
  E(1, 'e1-alphabet', 'The alphabet – ABC auf Englisch', '🔤', { text: ['Die englischen Buchstaben heißen anders als die deutschen.', 'Achtung: E klingt wie „i“, I klingt wie „ai“, A klingt wie „äi“.', 'G („dschii“) und J („dschäi“) verwechselt man leicht. Z heißt in England „zed“.'], visual: { kind: 'word', word: 'A · E · I · G · J', mark: [[4, 5], [8, 9]] }, videoQuery: 'ABC song British English phonics alphabet' }, alphabetTask, { tagLabels: { buchstaben: 'englische Buchstaben hören', buchstabieren: 'buchstabierte Wörter verstehen' }, testSeconds: 20 }),
  E(2, 'e2-myday', 'My day – Tagesablauf', '⏰', { text: ['I get up. = Ich stehe auf. I go to school. = Ich gehe zur Schule.', "Mit Uhrzeit: I get up at seven o'clock.", 'Am Abend: I have dinner. I go to bed.'], visual: { kind: 'clock', h: 7, m: 0 }, videoQuery: 'daily routine song for kids English' }, mydayTask, { tagLabels: { saetze: 'Sätze zum Tagesablauf', uhrzeit: 'mit Uhrzeit', reihenfolge: 'Reihenfolge am Tag' }, testSeconds: 20 }),
  E(1, 'e1-shapes', 'Shapes and colours – Formen', '🔷', { text: ['circle = Kreis, square = Quadrat, triangle = Dreieck, rectangle = Rechteck.', 'Die Farbe steht vor der Form – wie im Deutschen: a red circle = ein roter Kreis.', 'Sprich mit: a blue square, a green triangle!'], visual: { kind: 'shape', shape: 'Kreis', fill: '#F06A6A' }, videoQuery: 'shapes song for kids circle square triangle rectangle' }, shapesTask, { tagLabels: { hoeren: 'Formen hören', uebersetzen: 'Deutsch → Englisch', schreiben: 'Formen schreiben', reihenfolge: 'Farbe und Form vertauscht' }, testSeconds: 20 }),
  E(2, 'e2-reading', 'Read and understand – Texte lesen', '📖', { text: ['Lies den englischen Text in Ruhe – du musst nicht jedes Wort kennen.', 'Suche die Wörter, die du kennst: Zahlen, Farben, Tiere, Namen.', 'Lies dann die Frage und suche die passende Stelle im Text.'], visual: { kind: 'text', text: 'My name is Lucy. I am nine years old.' }, videoQuery: 'English reading for kids short text Grundschule Klasse 4' }, enReadTask, { tagLabels: { lesen: 'englische Texte verstehen' }, testSeconds: 60 }),
  E(1, 'e1-festivals', 'Festivals – Feste im Jahr', '🎃', { text: ['Halloween: pumpkin (Kürbis), witch (Hexe), ghost (Gespenst). Kinder rufen „Trick or treat!“', 'Christmas: Christmas tree, present (Geschenk), candle (Kerze). Man wünscht „Merry Christmas!“', 'Easter: Easter egg, Easter bunny. „Happy Easter!“'], visual: { kind: 'emoji', chars: '🎃🎄🐰' }, videoQuery: 'Halloween Christmas Easter vocabulary for kids English' }, festTask, { tagLabels: { ...VT, wünsche: 'Wünsche zu Festen' }, testSeconds: 15 }),
  E(2, 'e2-shopping', 'Shopping – Einkaufen', '🛒', { text: ['Can I have an apple, please? = Kann ich bitte einen Apfel haben?', 'How much is it? – It’s two euros fifty. (2,50 €)', 'Achtung beim Hören: thirteen (13) – thirty (30), fifteen (15) – fifty (50).', 'Here you are. = Bitte schön (beim Geben). Thank you! = Danke!'], visual: { kind: 'emoji', chars: '🛒🍎💶' }, videoQuery: 'shopping dialogue English for kids how much is it' }, shopTask, { tagLabels: { preise: 'Preise verstehen', dialog: 'Einkaufsgespräch', 'teen-ty': '-teen und -ty verwechselt', 'a-an': 'a oder an' }, testSeconds: 20 }),
];

// ---------- Geld bis 20 € (Kl. 1) ----------

const KAUF = [['ein Buch', '📕'], ['ein Eis', '🍦'], ['einen Ball', '⚽'], ['ein Spielzeugauto', '🚗'], ['einen Teddy', '🧸'], ['Stifte', '🖍️']];
function geld1Task(r: Rng, s: Stage): Gen {
  const pool = s === 1 ? [100, 200, 500] : [100, 200, 500, 1000];
  const max = s === 1 ? 10 : 20;
  let items: number[];
  do items = Array.from({ length: ri(r, s === 1 ? 2 : 3, s === 1 ? 3 : 4) }, () => pick(r, pool)).sort((x, y) => y - x);
  while (items.reduce((a, b) => a + b, 0) / 100 > max);
  const total = items.reduce((a, b) => a + b, 0) / 100;
  let run = 0;
  const running = items.map((x) => `${(run += x) / 100} €`).join(', ');
  const countTrap = items.length !== total ? [{ answer: String(items.length), tag: 'stueck-gezaehlt', hint: 'Du hast die Münzen und Scheine gezählt. Zähle ihren Wert: Was steht darauf?' }] : [];
  if (s === 3 && total >= 3 && chance(r, 0.5)) {
    const price = ri(r, 1, total - 1);
    const [thing, e] = pick(r, KAUF);
    const name = pick(r, NAMES);
    return {
      key: `k-${items.join('-')}-${price}`,
      prompt: `${name} hat dieses Geld und kauft ${thing} ${e} für ${price} €.\nWie viel Geld bleibt übrig?`,
      visual: { kind: 'money', items },
      answer: { type: 'number', value: total - price, unit: '€' },
      tags: ['rest'],
      traps: [{ answer: String(total + price), tag: 'plus-statt-minus', hint: 'Beim Bezahlen wird das Geld weniger – du musst minus rechnen.' }],
      solution: [`Erst zählen: ${running} → ${total} €`, `Dann bezahlen: ${total} € − ${price} € = ${total - price} €`],
    };
  }
  return {
    key: items.join('-'),
    prompt: 'Wie viel Geld ist das?',
    visual: { kind: 'money', items },
    answer: { type: 'number', value: total, unit: '€' },
    tags: ['zaehlen'],
    traps: countTrap,
    solution: ['Zähle vom größten zum kleinsten Wert weiter:', running, `Zusammen: ${total} €`],
  };
}

// ---------- Teilen mit großen Zahlen (Kl. 3, halbschriftlich) ----------

function teilenGrossTask(r: Rng, s: Stage): Gen {
  const d = s === 1 ? pick(r, [2, 3, 4]) : ri(r, 2, 9);
  // Ergebnis = Zehner + Einer; Stufe 1: Zehner-Teil sofort sichtbar (84 : 4 → 80 : 4 + 4 : 4)
  const t = s === 1 ? ri(r, 1, 2) : s === 2 ? ri(r, 1, 4) : ri(r, 2, 9);
  const o = ri(r, 1, s === 1 ? 4 : 9);
  const q = t * 10 + o;
  const a = d * q;
  if (a > (s === 3 ? 999 : 100) || (s < 3 && a < 20)) return teilenGrossTask(r, s);
  const big = d * t * 10;
  const small = d * o;
  return {
    key: `${a}:${d}`,
    prompt: `${a} : ${d} = ☐`,
    answer: { type: 'number', value: q },
    tags: [a >= 100 ? 'dreistellig' : 'zweistellig'],
    traps: [
      { answer: String(t * 10), tag: 'teil-vergessen', hint: `Du hast nur ${big} : ${d} gerechnet. Vergiss den Rest ${small} : ${d} nicht!` },
      { answer: String(o), tag: 'teil-vergessen', hint: `Du hast nur ${small} : ${d} gerechnet. Es fehlt noch ${big} : ${d}.` },
    ],
    solution: [`Zerlege ${a} in ${big} und ${small} – beide kann man gut durch ${d} teilen.`, `${big} : ${d} = ${t * 10}`, `${small} : ${d} = ${o}`, `${t * 10} + ${o} = ${q}`, `Probe: ${q} · ${d} = ${a}`],
  };
}

// ---------- Fahrplan lesen (Kl. 4) ----------

const STOPS = ['Bahnhof', 'Marktplatz', 'Schule', 'Schwimmbad', 'Rathaus', 'Zoo', 'Bücherei', 'Sportplatz', 'Kirche', 'Park'];
const hm = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
function fahrplanTask(r: Rng, s: Stage): Gen {
  const stops = pickN(r, STOPS, 4);
  const legs = [0, ri(r, 3, 9), ri(r, 3, 9), ri(r, 4, 12)];
  const offs = legs.map((_, i) => legs.slice(0, i + 1).reduce((a, b) => a + b, 0));
  const first = 7 * 60 + ri(r, 0, 5) * 5;
  const gap = pick(r, [15, 20, 30]);
  const starts = [first, first + gap, first + 2 * gap];
  const rows = stops.map((st, i) => [st, ...starts.map((t) => hm(t + offs[i]))]);
  const table = { kind: 'table' as const, title: '🚌 Fahrplan Linie 5', head: ['Haltestelle', '1. Bus', '2. Bus', '3. Bus'], rows };
  const name = pick(r, NAMES);
  const v = s === 1 ? 0 : s === 2 ? ri(r, 0, 2) : ri(r, 1, 3);
  if (v === 0) {
    const bi = ri(r, 0, 2), si = ri(r, 1, 3);
    const ok = `${rows[si][bi + 1]} Uhr`;
    const wrong = [rows[si][((bi + 1) % 3) + 1], rows[si - 1][bi + 1], rows[Math.min(3, si + 1) === si ? si - 1 : si + 1][bi + 1]].map((x) => `${x} Uhr`);
    return { key: `fp0-${rows.flat().join()}-${bi}-${si}`, prompt: `Wann ist der ${bi + 1}. Bus an der Haltestelle „${stops[si]}“?`, visual: { ...table }, answer: choice(r, ok, wrong), tags: ['ablesen'], solution: [`Suche die Zeile „${stops[si]}“ und die Spalte „${bi + 1}. Bus“.`, `Dort steht: ${ok}`], solutionVisual: { ...table, mark: [si, bi + 1] } };
  }
  if (v === 1) {
    const a = ri(r, 0, 2), b = ri(r, a + 1, 3);
    const dur = offs[b] - offs[a];
    return { key: `fp1-${rows.flat().join()}-${a}-${b}`, prompt: `Wie viele Minuten fährt der Bus von „${stops[a]}“ bis „${stops[b]}“?`, visual: { ...table }, answer: { type: 'number', value: dur, unit: 'min' }, tags: ['zeitspanne'], solution: [`Nimm einen Bus, zum Beispiel den 1. Bus:`, `Ab ${stops[a]}: ${rows[a][1]} Uhr, an ${stops[b]}: ${rows[b][1]} Uhr`, `Von ${rows[a][1]} bis ${rows[b][1]} sind es ${dur} Minuten.`] };
  }
  if (v === 2) {
    const target = ri(r, 1, 3);
    const bi = ri(r, 0, 2);
    const arrive = starts[bi] + offs[target];
    const must = arrive + ri(r, 1, Math.min(gap - 1, 12));
    const ok = `den ${bi + 1}. Bus`;
    return { key: `fp2-${rows.flat().join()}-${target}-${must}`, prompt: `${name} muss um ${hm(must)} Uhr an der Haltestelle „${stops[target]}“ sein.\nWelchen Bus muss ${name} spätestens nehmen?`, visual: { ...table }, answer: choice(r, ok, ['den 1. Bus', 'den 2. Bus', 'den 3. Bus'].filter((x) => x !== ok)), tags: ['planen'], traps: bi < 2 ? [{ answer: `den ${bi + 2}. Bus`, tag: 'zu-spaet', hint: `Der ${bi + 2}. Bus ist erst um ${rows[target][bi + 2]} Uhr dort – das ist zu spät.` }] : [], solution: [`Schau in die Zeile „${stops[target]}“.`, `Der ${bi + 1}. Bus ist um ${rows[target][bi + 1]} Uhr dort – das passt.`, ...(bi < 2 ? [`Der ${bi + 2}. Bus kommt erst um ${rows[target][bi + 2]} Uhr – zu spät.`] : [])], solutionVisual: { ...table, mark: [target, bi + 1] } };
  }
  const bi = ri(r, 1, 2);
  const come = starts[bi] - ri(r, 2, gap - 2);
  const wait = starts[bi] - come;
  return { key: `fp3-${rows.flat().join()}-${come}`, prompt: `${name} kommt um ${hm(come)} Uhr zur Haltestelle „${stops[0]}“.\nWie lange muss ${name} auf den nächsten Bus warten?`, visual: { ...table }, answer: { type: 'number', value: wait, unit: 'min' }, tags: ['zeitspanne'], solution: [`Der nächste Bus fährt um ${hm(starts[bi])} Uhr ab ${stops[0]}.`, `Von ${hm(come)} bis ${hm(starts[bi])} sind es ${wait} Minuten.`], solutionVisual: { ...table, mark: [0, bi + 1] } };
}

// ---------- Rechnen mit Geld: Kommazahlen (Kl. 4) ----------

const eur = (ct: number) => `${Math.floor(ct / 100)},${String(ct % 100).padStart(2, '0')} €`;
// Ware, Bild, realistischer Preis von–bis in Cent
const WAREN: [string, string, number, number][] = [
  ['ein Heft', '📒', 80, 250], ['einen Saft', '🧃', 90, 220], ['ein Brötchen', '🥐', 40, 90], ['einen Radiergummi', '🧽', 50, 150], ['eine Brezel', '🥨', 60, 120],
  ['Stifte', '🖍️', 200, 600], ['ein Comicheft', '📗', 250, 500], ['einen Apfel', '🍎', 30, 90], ['ein Buch', '📕', 600, 1200], ['einen Ball', '⚽', 500, 1500],
];
const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} und ${xs[xs.length - 1]}` : xs[0]);
const priceOf = (r: Rng, w: [string, string, number, number]) => ri(r, w[2] / 5, w[3] / 5) * 5;
function geldKommaTask(r: Rng, s: Stage): Gen {
  const v = s === 1 ? 'plus' : s === 2 ? pick(r, ['plus', 'rueck']) : pick(r, ['plus3', 'rueck', 'rueck']);
  const price = () => ri(r, 2, s === 1 ? 9 : 19) * 50 + (s === 1 ? 0 : pick(r, [0, 5, 15, 25, 35, 45]));
  const name = pick(r, NAMES);
  if (v === 'rueck') {
    const items = pickN(r, WAREN, s === 3 ? 3 : 2);
    const prices = items.map((w) => priceOf(r, w));
    const sum = prices.reduce((a, b) => a + b, 0);
    const paid = sum <= 1000 ? 1000 : sum <= 2000 ? 2000 : 5000;
    const back = paid - sum;
    const wrongCents = back % 100 ? back + (100 - 2 * (back % 100)) : back + 50; // typischer Fehler beim Cent-Ergänzen
    const ok = eur(back);
    const wrong = [...new Set([eur(wrongCents), eur(back + 100), eur(Math.max(5, back - 100)), eur(sum)])].filter((x) => x !== ok).slice(0, 3);
    return {
      key: `r-${prices.join('-')}`,
      prompt: `${name} kauft ${list(items.map(([w, e], i) => `${w} ${e} (${eur(prices[i])})`))} und bezahlt mit ${paid / 100} €.\nWie viel Rückgeld bekommt ${name}?`,
      answer: choice(r, ok, wrong),
      tags: ['rueckgeld'],
      traps: [{ answer: eur(wrongCents), tag: 'cent-ergaenzen', hint: 'Ergänze erst die Cent bis zum vollen Euro, dann die Euro bis zum bezahlten Betrag.' }],
      solution: [`Zusammen: ${prices.map(eur).join(' + ')} = ${eur(sum)}`, `Ergänze bis ${paid / 100} €: ${eur(sum)} + ${ok} = ${paid / 100},00 €`, `Rückgeld: ${ok}`],
    };
  }
  const n = v === 'plus3' ? 3 : 2;
  const prices = Array.from({ length: n }, price);
  const sum = prices.reduce((a, b) => a + b, 0);
  const ok = eur(sum);
  const noCarry = prices.reduce((a, p) => a + Math.floor(p / 100), 0) * 100 + (prices.reduce((a, p) => a + (p % 100), 0) % 100);
  const wrong = [...new Set([eur(noCarry), eur(sum + 100), eur(sum - 10 > 0 ? sum - 10 : sum + 10), eur(sum + 10)])].filter((x) => x !== ok).slice(0, 3);
  return {
    key: `p-${prices.join('-')}`,
    prompt: `${prices.map(eur).join(' + ')} = ☐`,
    answer: choice(r, ok, wrong),
    tags: ['addieren'],
    traps: noCarry !== sum ? [{ answer: eur(noCarry), tag: 'cent-uebertrag', hint: '100 Cent sind 1 Euro – die Cent über 100 werden zu einem Euro mehr.' }] : [],
    solution: [`Euro zusammen: ${prices.map((p) => Math.floor(p / 100)).join(' + ')} = ${prices.reduce((a, p) => a + Math.floor(p / 100), 0)} €`, `Cent zusammen: ${prices.map((p) => p % 100).join(' + ')} = ${prices.reduce((a, p) => a + (p % 100), 0)} ct`, `Zusammen: ${ok}`],
  };
}

// ---------- Schriftlich plus und minus bis 1 Million (Kl. 4) ----------

function schriftlich4Task(r: Rng, s: Stage): Gen {
  const digits = s === 1 ? 4 : s === 2 ? 5 : 6;
  const lo = 10 ** (digits - 1);
  const minus = chance(r, 0.5);
  if (!minus) {
    let a = 0, b = 0;
    do {
      a = ri(r, lo, 10 * lo - 1);
      b = ri(r, Math.floor(lo / 2), 10 * lo - 1);
    } while (a + b > 999999);
    const nums = [a, b];
    const res = a + b;
    const { steps, carries } = columnAdd(nums);
    const len = String(res).length;
    const noCarry = Number(Array.from({ length: len }, (_, i) => nums.reduce((acc, n) => acc + (Math.floor(n / 10 ** i) % 10), 0) % 10).reverse().join(''));
    return {
      key: `${a}+${b}`,
      prompt: `Rechne schriftlich:\n${a} + ${b}`,
      speak: `Rechne schriftlich: ${a} plus ${b}`,
      visual: { kind: 'column', op: '+', rows: nums },
      work: { op: '+', rows: nums, result: res },
      answer: { type: 'number', value: res },
      tags: ['plus'],
      traps: noCarry !== res ? [{ answer: String(noCarry), tag: 'übertrag-vergessen', hint: 'Du hast einen Übertrag vergessen. Schreibe ihn klein in die nächste Spalte und rechne ihn mit.' }] : [],
      solution: steps,
      solutionVisual: { kind: 'column', op: '+', rows: nums, result: res, carries },
    };
  }
  const a = ri(r, 2 * lo, 10 * lo - 1);
  const b = ri(r, Math.floor(lo / 2), a - lo);
  const res = a - b;
  const { steps, carries } = columnSub(a, b);
  const da = String(a).split('').reverse().map(Number);
  const db = String(b).split('').reverse().map(Number);
  const wrong = Number(da.map((d, i) => Math.abs(d - (db[i] ?? 0))).reverse().join(''));
  return {
    key: `${a}-${b}`,
    prompt: `Rechne schriftlich:\n${a} − ${b}`,
    speak: `Rechne schriftlich: ${a} minus ${b}`,
    visual: { kind: 'column', op: '−', rows: [a, b] },
    work: { op: '−', rows: [a, b], result: res },
    answer: { type: 'number', value: res },
    tags: ['minus'],
    traps: wrong !== res ? [{ answer: String(wrong), tag: 'kleiner-minus-größer', hint: 'Du hast an einer Stelle unten minus oben gerechnet. Wenn oben zu wenig ist, musst du entbündeln.' }] : [],
    solution: [...steps, `Probe: ${res} + ${b} = ${a}`],
    solutionVisual: { kind: 'column', op: '−', rows: [a, b], result: res, carries },
  };
}

// ---------- Würfelgebäude (Kl. 3) ----------

const ROW_NAMES = ['hinten', 'in der Mitte', 'vorne'];
function cubesTask(r: Rng, s: Stage): Gen {
  const D = s === 1 ? 1 : s === 2 ? 2 : 3;
  const W = s === 1 ? ri(r, 3, 4) : 3;
  // Zeilen von hinten nach vorne; hinten nie niedriger als vorne → alle Stapel sind von oben zu sehen
  const h: number[][] = [];
  for (let row = 0; row < D; row++) h.push(Array.from({ length: W }, (_, c) => (row === 0 ? ri(r, 1, 3) : ri(r, row === D - 1 ? 0 : 1, h[row - 1][c]))));
  if (h.flat().every((x) => x === h[0][0])) h[0][0] = h[0][0] === 3 ? 2 : h[0][0] + 1;
  const total = h.flat().reduce((a, b) => a + b, 0);
  // was man „sieht“, wenn man die versteckten Würfel hinter/unter den vorderen vergisst
  const seen = h.reduce((sum, rowH, row) => sum + rowH.reduce((a, x, c) => a + (row === D - 1 || x === 0 ? x : Math.max(x - (h[row + 1][c] ?? 0), 1)), 0), 0);
  const names = D === 1 ? [''] : D === 2 ? ['hinten', 'vorne'] : ROW_NAMES;
  return {
    key: `w-${h.map((x) => x.join('')).join('-')}`,
    prompt: 'Wie viele Würfel sind es?\n(Kein Würfel schwebt – unter jedem Würfel steht ein anderer oder der Boden.)',
    speak: 'Wie viele Würfel sind es? Kein Würfel schwebt.',
    visual: { kind: 'cubes', h },
    answer: { type: 'number', value: total },
    tags: [D === 1 ? 'eine-reihe' : 'mehrere-reihen'],
    traps: seen !== total ? [{ answer: String(seen), tag: 'versteckte-vergessen', hint: 'Du hast nur die Würfel gezählt, die du siehst. Hinter den vorderen Würfeln stehen noch welche – sonst würden die oberen schweben!' }] : [],
    solution: [
      'Zähle Stapel für Stapel – wie hoch ist jeder Turm?',
      ...h.map((rowH, i) => `${names[i] ? names[i][0].toUpperCase() + names[i].slice(1) + ': ' : ''}${rowH.filter((x) => x).join(' + ') || '0'}${rowH.filter((x) => x).length > 1 ? ` = ${rowH.reduce((a, b) => a + b, 0)}` : ''}`),
      ...(D > 1 ? [`Zusammen: ${total} Würfel`] : []),
    ],
    solutionVisual: { kind: 'text', title: 'Bauplan (Draufsicht)', text: h.map((rowH) => rowH.join('  ')).join('\n') },
  };
}

// ---------- Ziffern schreiben (Kl. 1) ----------

const ZIFFER_WORT = ['Null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun'];
function zifferTask(r: Rng, s: Stage): Gen {
  // Stufe 1: 1–5, danach alle Ziffern
  const d = s === 1 ? ri(r, 1, 5) : ri(r, 0, 9);
  return {
    key: `z${d}`,
    prompt: `Spure die ${d} nach${d ? ` – ${'🍎'.repeat(d)}` : ' – keine Äpfel'}`,
    speak: `Spure die ${ZIFFER_WORT[d]} nach.`,
    answer: { type: 'trace', value: String(d) },
    tags: ['ziffern'],
    solution: ['Fang am grünen Punkt an.', `Fahre die graue ${d} mit dem Finger nach, bis sie ganz bunt ist.`, 'Tipp: Tippe auf ▶ unten rechts – dann siehst du, wie man die Ziffer schreibt.'],
  };
}

// ---------- Sp und St am Wortanfang (Kl. 2) ----------

const SPST: [string, string][] = [
  ['Spinne', '🕷️'], ['Spiegel', '🪞'], ['Spiel', '🎲'], ['Spritze', '💉'], ['Spinat', '🥬'], ['spielen', '🧩'], ['springen', '🤸'], ['sparen', '🪙'],
  ['Stern', '⭐'], ['Stuhl', '🪑'], ['Stein', '🪨'], ['Stiefel', '👢'], ['Straße', '🛣️'], ['Strand', '🏖️'], ['Stadt', '🏙️'], ['stehen', '🧍'],
  ['Stift', '✏️'], ['Strumpf', '🧦'], ['Strauß', '💐'], ['Stunde', '⏳'], ['Sport', '⚽'], ['Spielzeug', '🧸'], ['Sprechblase', '💬'], ['Spatz', '🐦'],
];
function spstTask(r: Rng, s: Stage): Gen {
  const [w, e] = pick(r, SPST);
  const sp = /^sp/i.test(w);
  const up = w[0] === w[0].toUpperCase();
  const right = up ? (sp ? 'Sp' : 'St') : sp ? 'sp' : 'st';
  const heard = up ? (sp ? 'Schp' : 'Scht') : sp ? 'schp' : 'scht';
  const tag = sp ? 'sp' : 'st';
  const why = `Am Wortanfang hört man „${sp ? 'schp' : 'scht'}“ – geschrieben wird aber nur „${right}“.`;
  if (s === 3 && chance(r, 0.5)) {
    return { key: `t-${w}`, prompt: 'Hör gut zu und schreibe das Wort.', speak: w, listen: { text: w, lang: 'de' }, visual: { kind: 'emoji', chars: e }, answer: { type: 'text', value: w, dictation: true, caseSensitive: true }, tags: [tag], traps: [{ answer: heard + w.slice(2), tag: 'sch-geschrieben', hint: why }], solution: [`So schreibt man es: ${w}`, why] };
  }
  const other = up ? (sp ? 'St' : 'Sp') : sp ? 'st' : 'sp';
  return {
    key: `c-${w}`,
    prompt: `Was fehlt am Anfang?
_ _${w.slice(2)}`,
    speak: `Was fehlt am Anfang von ${w}?`,
    visual: { kind: 'emoji', chars: e },
    answer: { ...choice(r, right, s === 1 ? [heard] : [heard, other, up ? (sp ? 'Scht' : 'Schp') : sp ? 'scht' : 'schp']), big: true },
    tags: [tag],
    traps: [{ answer: heard, tag: 'sch-geschrieben', hint: why }],
    solution: [`Richtig: ${w}`, why],
  };
}

// ---------- ei oder ie (Kl. 2) ----------

const EIIE: [string, string][] = [
  ['Eis', '🍦'], ['Bein', '🦵'], ['Kleid', '👗'], ['Pfeil', '🏹'], ['Eimer', '🪣'], ['Schwein', '🐷'], ['Seil', '🪢'], ['Eichhörnchen', '🐿️'], ['Kreis', '⭕'],
  ['Biene', '🐝'], ['Brief', '✉️'], ['Fliege', '🪰'], ['Ziege', '🐐'], ['Wiese', '🌾'], ['Spiegel', '🪞'], ['Riegel', '🍫'], ['Lied', '🎵'], ['Dieb', '🦹'],
  // Nachtlauf 22.10.2026: mehr Wörter
  ['Reis', '🍚'], ['Leiter', '🪜'], ['Geige', '🎻'], ['Seife', '🧼'], ['Zeitung', '📰'], ['Stein', '🪨'], ['Schleife', '🎀'],
  ['Stiefel', '👢'], ['Ziel', '🏁'], ['Papier', '📄'], ['Fieber', '🤒'], ['Spiel', '🎲'], ['Klavier', '🎹'], ['Zwiebel', '🧅'],
];
function eiieTask(r: Rng, s: Stage): Gen {

  const [w, e] = pick(r, EIIE);
  const m = /ei|ie/i.exec(w)!;
  const part = m[0];
  const isEi = part.toLowerCase() === 'ei';
  const up = m.index === 0;
  const opts = up ? ['Ei', 'Ie'] : ['ei', 'ie'];
  const right = up ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part;
  const why = isEi ? `In „${w}“ hört man „ai“ – das schreibt man „ei“.` : `In „${w}“ hört man ein langes „i“ – das schreibt man meistens „ie“.`;
  if (s === 3 && chance(r, 0.5)) {
    return { key: `t-${w}`, prompt: 'Hör gut zu und schreibe das Wort.', speak: w, listen: { text: w, lang: 'de' }, visual: { kind: 'emoji', chars: e }, answer: { type: 'text', value: w, dictation: true, caseSensitive: true }, tags: [isEi ? 'ei' : 'ie'], traps: [{ answer: w.slice(0, m.index) + (isEi ? 'ie' : 'ei') + w.slice(m.index + 2), tag: 'ei-ie-vertauscht', hint: why }], solution: [`So schreibt man es: ${w}`, why] };
  }
  return {
    key: `c-${w}`,
    prompt: `ei oder ie?
${w.slice(0, m.index)}_ _${w.slice(m.index + 2)}`,
    speak: `ei oder ie? ${w}`,
    visual: { kind: 'emoji', chars: e },
    answer: { ...fixedChoice(opts, right), big: true },
    tags: [isEi ? 'ei' : 'ie'],
    solution: [`Richtig: ${w}`, why, 'Merke: ei klingt wie „ai“ (Eis, Bein), ie ist ein langes i (Biene, Brief).'],
  };
}

// ---------- Rechengeschichten (Kl. 1) ----------

const STORY1: { e: string; n: string; start: (a: number) => string; add: (b: number) => string; sub: (b: number) => string }[] = [
  { e: '🦆', n: 'Enten', start: (a) => `Im Teich schwimmen ${a} Enten.`, add: (b) => `${b} Enten kommen dazu.`, sub: (b) => `${b} Enten schwimmen weg.` },
  { e: '🐦', n: 'Vögel', start: (a) => `Auf dem Baum sitzen ${a} Vögel.`, add: (b) => `${b} Vögel fliegen dazu.`, sub: (b) => `${b} Vögel fliegen weg.` },
  { e: '🐰', n: 'Hasen', start: (a) => `Auf der Wiese sind ${a} Hasen.`, add: (b) => `${b} Hasen hoppeln dazu.`, sub: (b) => `${b} Hasen hoppeln weg.` },
  { e: '🧒', n: 'Kinder', start: (a) => `Auf dem Spielplatz spielen ${a} Kinder.`, add: (b) => `${b} Kinder kommen dazu.`, sub: (b) => `${b} Kinder gehen nach Hause.` },
  { e: '🍎', n: 'Äpfel', start: (a) => `Im Korb liegen ${a} Äpfel.`, add: (b) => `Mama legt ${b} Äpfel dazu.`, sub: (b) => `Ben nimmt ${b} Äpfel heraus.` },
  { e: '🎈', n: 'Luftballons', start: (a) => `Lea hat ${a} Luftballons.`, add: (b) => `Sie bekommt ${b} Luftballons dazu.`, sub: (b) => `${b} Luftballons platzen.` },
  { e: '🐟', n: 'Fische', start: (a) => `Im Aquarium schwimmen ${a} Fische.`, add: (b) => `Papa setzt ${b} Fische dazu.`, sub: (b) => `${b} Fische verstecken sich hinter dem Stein. Wie viele siehst du noch?` },
];
function story1Task(r: Rng, s: Stage): Gen {
  const st = pick(r, STORY1);
  const plus = chance(r, 0.5);
  const max = s === 1 ? 10 : 20;
  let a: number, b: number;
  if (plus) {
    a = ri(r, 2, max - 2);
    b = ri(r, 2, Math.min(9, max - a));
  } else {
    a = ri(r, 4, max);
    b = ri(r, 2, Math.min(9, a - 1));
  }
  const res = plus ? a + b : a - b;
  const text = `${st.start(a)} ${plus ? st.add(b) : st.sub(b)}`;
  const q = text.endsWith('?') ? '' : `Wie viele ${st.n} sind es jetzt?`;
  const term = `${a} ${plus ? '+' : '−'} ${b}`;
  const sv = { kind: 'tenframe' as const, a, ...(plus ? { b } : { crossOut: b }) };
  // „Welche Rechnung passt?“ ab Stufe 2
  if (s > 1 && chance(r, 0.35)) {
    const wrong = [`${a} ${plus ? '−' : '+'} ${b}`, `${b} + ${b}`, `${a} + ${a}`].filter((x) => x !== term);
    return { key: `r-${st.n}-${a}-${b}-${plus}`, prompt: `${text}\n**Welche Rechnung passt?**`, visual: { kind: 'emoji', chars: st.e }, answer: choice(r, term, wrong), tags: ['rechnung-finden'], solution: [plus ? `„dazu“ heißt: es werden mehr → plus.` : `„weg“ heißt: es werden weniger → minus.`, `${term} = ${res}`], solutionVisual: sv };
  }
  return {
    key: `${st.n}-${a}-${b}-${plus}`,
    prompt: q ? `${text}\n**${q}**` : text.replace(/ (Wie viele[^?]*\?)$/, '\n**$1**'),
    visual: s === 1 ? sv : s === 2 ? { kind: 'emoji', chars: st.e } : undefined,
    answer: { type: 'number', value: res },
    tags: [plus ? 'plus' : 'minus'],
    traps: [{ answer: String(plus ? Math.abs(a - b) : a + b), tag: 'falsche-rechenart', hint: plus ? 'Es kommen welche dazu – also wird es mehr: plus rechnen!' : 'Es gehen welche weg – also wird es weniger: minus rechnen!' }],
    solution: [plus ? 'Es kommen welche dazu → plus.' : 'Es gehen welche weg → minus.', `${term} = ${res}`, `Es sind jetzt ${res} ${st.n}.`],
    solutionVisual: sv,
  };
}

// ---------- Senkrecht und parallel (Kl. 4) ----------

type Seg = [number, number, number, number];
const seg = (cx: number, cy: number, deg: number, len: number): Seg => {
  const a = (deg * Math.PI) / 180, dx = (Math.cos(a) * len) / 2, dy = (Math.sin(a) * len) / 2;
  return [cx - dx, cy - dy, cx + dx, cy + dy].map((v) => Math.round(v)) as Seg;
};
const inBox = (...ss: Seg[]) => ss.every(([x1, y1, x2, y2]) => [x1, x2].every((x) => x >= 8 && x <= 192) && [y1, y2].every((y) => y >= 8 && y <= 152));
const LAGE_FACTS: { q: string; a: string | number; opts?: string[]; why: string; st: Stage }[] = [
  { q: 'Wie viele rechte Winkel hat ein Rechteck?', a: 4, why: 'Ein Rechteck hat 4 Ecken – jede ist ein rechter Winkel.', st: 1 },
  { q: 'Wie viele Paare paralleler Seiten hat ein Rechteck?', a: 2, why: 'Oben und unten sind parallel, links und rechts auch: 2 Paare.', st: 2 },
  { q: 'Parallele Linien …', a: 'schneiden sich nie', opts: ['schneiden sich in einem rechten Winkel', 'berühren sich an einem Ende'], why: 'Parallele Linien haben überall den gleichen Abstand – sie treffen sich nie, wie Schienen.', st: 1 },
  { q: 'Zwei Linien, die senkrecht zueinander sind, bilden …', a: 'einen rechten Winkel', opts: ['gar keinen Winkel', 'einen Kreis'], why: 'Senkrecht heißt: Sie treffen sich im rechten Winkel – wie die Ecke eines Blatts Papier.', st: 1 },
  { q: 'Wie viele rechte Winkel kann ein Dreieck höchstens haben?', a: 1, why: 'Ein rechter Winkel hat 90°. Zwei davon wären schon 180° – mehr hat ein Dreieck insgesamt nicht.', st: 3 },
];
function lageLinienTask(r: Rng, s: Stage): Gen {
  if (s > 1 && chance(r, 0.25)) {
    const f = pick(r, LAGE_FACTS.filter((x) => x.st <= s));
    const answer = typeof f.a === 'number' ? { type: 'number' as const, value: f.a } : choice(r, f.a, f.opts!);
    return { key: `f-${f.q}`, prompt: f.q, answer, tags: ['wissen'], solution: [f.why] };
  }
  const kind = pick(r, ['parallel', 'senkrecht', 'weder'] as const);
  const steps = s === 1 ? [0, 90] : s === 2 ? [0, 45, 90, 135] : [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165];
  for (let tries = 0; ; tries++) {
    const th = pick(r, steps);
    let a: Seg, b: Seg;
    if (kind === 'parallel') {
      const off = pick(r, [26, 34, 42]);
      const n = [-Math.sin((th * Math.PI) / 180), Math.cos((th * Math.PI) / 180)];
      a = seg(100 - n[0] * off, 80 - n[1] * off, th, 130);
      b = seg(100 + n[0] * off, 80 + n[1] * off, th, pick(r, [100, 130]));
    } else {
      const d = kind === 'senkrecht' ? 90 : pick(r, s === 1 ? [35, 50] : [30, 45, 60]);
      a = seg(100, 80, th, 140);
      const t = ri(r, -35, 35);
      const px = 100 + Math.cos((th * Math.PI) / 180) * t, py = 80 + Math.sin((th * Math.PI) / 180) * t;
      // Kreuz oder T-Form (eine Linie endet an der anderen)
      if (chance(r, 0.5)) b = seg(px, py, th + d, 110);
      else {
        const L = 70, g = ((th + d) * Math.PI) / 180, sg = chance(r, 0.5) ? 1 : -1;
        b = [px, py, px + sg * Math.cos(g) * L, py + sg * Math.sin(g) * L].map((v) => Math.round(v)) as Seg;
      }
    }
    if (!inBox(a, b) && tries < 30) continue;
    const word = { parallel: 'parallel', senkrecht: 'senkrecht', weder: 'weder noch' }[kind];
    return {
      key: `l-${kind}-${a.join(',')}-${b.join(',')}`,
      prompt: 'Wie liegen die beiden Linien zueinander?',
      visual: { kind: 'lines', a, b },
      answer: fixedChoice(['parallel', 'senkrecht', 'weder noch'], word),
      tags: [kind],
      solution: kind === 'parallel' ? ['Die Linien haben überall den gleichen Abstand und treffen sich nie → parallel.'] : kind === 'senkrecht' ? ['Die Linien treffen sich in einem rechten Winkel (wie die Ecke eines Blatts) → senkrecht.', 'Prüfe mit dem Geodreieck: Die Mittellinie liegt genau auf einer Linie.'] : ['Die Linien treffen sich (oder würden sich treffen), aber nicht im rechten Winkel → weder parallel noch senkrecht.'],
      solutionVisual: { kind: 'lines', a, b, right: kind === 'senkrecht' },
    };
  }
}

// ---------- Wortarten bestimmen (Kl. 4): sechs Wortarten ----------

// Wort/Kürzel – N Nomen, V Verb, A Adjektiv, Art Artikel, P Pronomen, Pr Präposition, X wird nicht abgefragt
const WA_SAETZE = [
  'Der/Art kleine/A Hund/N schläft/V unter/Pr dem/Art Tisch/N.',
  'Er/P trinkt/V kalten/A Saft/N aus/Pr der/Art Flasche/N.',
  'Die/Art Kinder/N spielen/V fröhlich/A auf/Pr der/Art Wiese/N.',
  'Wir/P backen/V einen/Art leckeren/A Kuchen/N.',
  'Die/Art Katze/N springt/V auf/Pr das/Art hohe/A Regal/N.',
  'Lena/N schreibt/V einen/Art langen/A Brief/N an/Pr ihren/X Opa/N.',
  'Ich/P lege/V das/Art Buch/N neben/Pr die/Art Lampe/N.',
  'Der/Art Vogel/N baut/V ein/Art Nest/N auf/Pr dem/Art Dach/N.',
  'Sie/P laufen/V schnell/A durch/Pr den/Art dunklen/A Wald/N.',
  'Ihr/P sitzt/V auf/Pr der/Art alten/A Bank/N.',
  'Mama/N kauft/V frische/A Äpfel/N auf/Pr dem/Art Markt/N.',
  'Es/P regnet/V seit/Pr dem/Art frühen/A Morgen/N.',
  'Nach/Pr der/Art Schule/N essen/V wir/P eine/Art warme/A Suppe/N.',
  'Du/P findest/V den/Art roten/A Ball/N hinter/Pr der/Art Tür/N.',
];
const WA: Record<string, { name: string; why: string }> = {
  N: { name: 'Nomen', why: 'Nomen sind Namen für Menschen, Tiere und Dinge. Man schreibt sie groß und kann einen Artikel davorsetzen.' },
  V: { name: 'Verb', why: 'Verben sagen, was jemand tut oder was geschieht. Sie verändern sich mit der Person: ich laufe, du läufst.' },
  A: { name: 'Adjektiv', why: 'Adjektive sagen, wie etwas ist. Man kann sie steigern: groß, größer, am größten.' },
  Art: { name: 'Artikel', why: 'Artikel begleiten Nomen: der, die, das, ein, eine.' },
  P: { name: 'Pronomen', why: 'Pronomen stehen für ein Nomen: ich, du, er, sie, es, wir, ihr.' },
  Pr: { name: 'Präposition', why: 'Präpositionen zeigen, wo, wann oder wie etwas ist: auf, unter, neben, nach, seit.' },
};
function wortart4Task(r: Rng, s: Stage): Gen {
  const allowed = s === 1 ? ['N', 'V', 'A'] : s === 2 ? ['N', 'V', 'A', 'Art', 'P'] : ['N', 'V', 'A', 'Art', 'P', 'Pr'];
  const satz = pick(r, WA_SAETZE);
  const toks = satz.split(' ').map((t) => {
    const m = /^(.+)\/(\w+)([.!?]?)$/.exec(t)!;
    return { w: m[1], t: m[2], p: m[3] };
  });
  const cand = toks.map((_, i) => i).filter((i) => allowed.includes(toks[i].t));
  // seltene Wortarten bevorzugen, damit nicht nur Nomen gefragt werden
  const rare = cand.filter((i) => toks[i].t !== 'N');
  const i = pick(r, chance(r, 0.7) && rare.length ? rare : cand);
  const t = toks[i];
  const text = toks.map((x, k) => (k === i ? `**${x.w}**` : x.w) + x.p).join(' ');
  const plain = toks.map((x) => x.w + x.p).join(' ');
  const opts = s === 1 ? ['Nomen', 'Verb', 'Adjektiv'] : pickN(r, allowed.filter((x) => x !== t.t), 3).map((x) => WA[x].name);
  return {
    key: `${plain}-${i}`,
    prompt: `Welche Wortart ist das markierte Wort?
${text}`,
    speak: `Welche Wortart ist ${t.w}? ${plain}`,
    answer: s === 1 ? fixedChoice(opts, WA[t.t].name) : choice(r, WA[t.t].name, opts),
    tags: [`wa-${t.t.toLowerCase()}`],
    solution: [`„${t.w}“ ist ${t.t === 'Pr' ? 'eine' : 'ein'} ${WA[t.t].name}.`, WA[t.t].why],
  };
}

// ---------- Shapes and colours (Englisch, 1. Lernjahr) ----------

const SH_EN: { s: string; en: string; de: string; art: 'ein' | 'eine'; m?: boolean }[] = [
  { s: 'Kreis', en: 'circle', de: 'Kreis', art: 'ein', m: true },
  { s: 'Quadrat', en: 'square', de: 'Quadrat', art: 'ein' },
  { s: 'Dreieck', en: 'triangle', de: 'Dreieck', art: 'ein' },
  { s: 'Rechteck', en: 'rectangle', de: 'Rechteck', art: 'ein' },
];
// Formen auch als Vokabelkarten und im Diktat (dazu star und heart)
registerWords('e1-shapes', [{ en: 'circle', de: 'Kreis', e: '🔵' }, { en: 'square', de: 'Quadrat', e: '🟦' }, { en: 'triangle', de: 'Dreieck', e: '🔺' }, { en: 'rectangle', de: 'Rechteck', txt: '▭' }, { en: 'star', de: 'Stern', e: '⭐' }, { en: 'heart', de: 'Herz', e: '❤️' }]);
// Farbe: Englisch, deutscher Wortstamm (Endung je nach Form: ein roter Kreis, ein rotes Quadrat; lila bleibt), Füllfarbe, Emoji-Kreis, Emoji-Quadrat
const COL_EN: { en: string; de: string; hex: string; c: string; q: string }[] = [
  { en: 'red', de: 'rot', hex: '#F06A6A', c: '🔴', q: '🟥' },
  { en: 'blue', de: 'blau', hex: '#5B8DEF', c: '🔵', q: '🟦' },
  { en: 'green', de: 'grün', hex: '#58C27D', c: '🟢', q: '🟩' },
  { en: 'yellow', de: 'gelb', hex: '#F7D046', c: '🟡', q: '🟨' },
  { en: 'orange', de: 'orangefarben', hex: '#F7A23B', c: '🟠', q: '🟧' },
  { en: 'purple', de: 'lila', hex: '#A879E0', c: '🟣', q: '🟪' },
];
const deCol = (c: { de: string }, masc?: boolean) => (c.de === 'lila' ? 'lila' : c.de + (masc ? 'er' : 'es'));
/** a oder an (an orange circle) */
const an = (w: string) => `${/^[aeiou]/.test(w) ? 'an' : 'a'} ${w}`;
function shapesTask(r: Rng, s: Stage): Gen {
  const v = s === 1 ? ri(r, 0, 1) : ri(r, 0, s === 3 ? 3 : 2);
  // Hören: Kreis oder Quadrat in einer Farbe – passendes Emoji wählen
  if (v === 1) {
    const sq = chance(r, 0.5);
    // ohne Orange: rotes und oranges Emoji-Quadrat sehen sich auf manchen Geräten zu ähnlich
    const cols = COL_EN.filter((x) => x.en !== 'orange');
    const col = pick(r, cols);
    const others = pickN(r, cols.filter((x) => x !== col), 2);
    const opts = [sq ? col.q : col.c, sq ? col.c : col.q, ...others.map((o) => (sq ? o.q : o.c))];
    const say = `${an(col.en)} ${sq ? 'square' : 'circle'}`;
    return { key: `h-${say}`, prompt: 'Hör gut zu! Welches Bild passt?', listen: { text: say, lang: 'en' }, answer: { ...choice(r, opts[0], opts.slice(1)), big: true }, tags: ['hoeren'], solution: [`${say} = ein ${deCol(col, !sq)} ${sq ? 'Quadrat' : 'Kreis'}`], pronounce: { text: say, lang: 'en' } };
  }
  const sh = pick(r, SH_EN);
  const col = pick(r, COL_EN);
  const phrase = `${an(col.en)} ${sh.en}`;
  const de = `${sh.art} ${deCol(col, sh.m)} ${sh.de}`;
  // Deutsch → Englisch
  if (v === 2) {
    const wrong = [`${an(pick(r, COL_EN.filter((x) => x !== col)).en)} ${sh.en}`, `${an(col.en)} ${pick(r, SH_EN.filter((x) => x !== sh)).en}`, `${an(sh.en)} ${col.en}`];
    return { key: `d-${phrase}`, prompt: `Wie sagt man auf Englisch?\n„${de}“`, answer: { ...choice(r, phrase, wrong), speakOptions: 'en' }, tags: ['uebersetzen'], traps: [{ answer: `${an(sh.en)} ${col.en}`, tag: 'reihenfolge', hint: 'Im Englischen steht die Farbe vor der Form – genau wie im Deutschen: a red circle.' }], solution: [`${de} = ${phrase}`, 'Erst die Farbe, dann die Form.'], pronounce: { text: phrase, lang: 'en' } };
  }
  // Form auf Englisch schreiben
  if (v === 3) {
    return { key: `w-${sh.en}`, prompt: 'Write the shape in English:', visual: { kind: 'shape', shape: sh.s, fill: col.hex }, answer: { type: 'text', value: sh.en, lang: 'en' }, tags: ['schreiben'], solution: [`${sh.de} = ${sh.en}`], pronounce: { text: sh.en, lang: 'en' } };
  }
  // Bild → Englisch
  const wrong = [`${an(pick(r, COL_EN.filter((x) => x !== col)).en)} ${sh.en}`, `${an(col.en)} ${pick(r, SH_EN.filter((x) => x !== sh)).en}`, `${an(pick(r, COL_EN.filter((x) => x !== col)).en)} ${pick(r, SH_EN.filter((x) => x !== sh)).en}`];
  return { key: `b-${phrase}`, prompt: 'What is it?', visual: { kind: 'shape', shape: sh.s, fill: col.hex }, answer: { ...choice(r, phrase, wrong), speakOptions: 'en' }, tags: [`form-${sh.en}`], solution: [`Das ist ${de}.`, `${de} = ${phrase}`], pronounce: { text: phrase, lang: 'en' } };
}

// ---------- My day – Tagesablauf (Englisch, 2. Lernjahr) ----------

// in der Reihenfolge eines Schultags; h = typische Uhrzeit
const MYDAY: { en: string; de: string; e: string; h: number }[] = [
  { en: 'I get up.', de: 'Ich stehe auf.', e: '⏰', h: 7 },
  { en: 'I brush my teeth.', de: 'Ich putze mir die Zähne.', e: '🪥', h: 7 },
  { en: 'I have breakfast.', de: 'Ich frühstücke.', e: '🥣', h: 7 },
  { en: 'I go to school.', de: 'Ich gehe zur Schule.', e: '🏫', h: 8 },
  { en: 'I have lunch.', de: 'Ich esse zu Mittag.', e: '🍝', h: 1 },
  { en: 'I do my homework.', de: 'Ich mache meine Hausaufgaben.', e: '📝', h: 3 },
  { en: 'I play with my friends.', de: 'Ich spiele mit meinen Freunden.', e: '🤾', h: 4 },
  { en: 'I have dinner.', de: 'Ich esse zu Abend.', e: '🍲', h: 6 },
  { en: 'I go to bed.', de: 'Ich gehe ins Bett.', e: '🛏️', h: 8 },
];
const HOURS_EN = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
function mydayTask(r: Rng, s: Stage): Gen {
  const v = s === 1 ? ri(r, 0, 1) : ri(r, 0, 3);
  const d = pick(r, MYDAY);
  // Uhrzeit: „I get up at seven o'clock.“
  if (v === 2) {
    const h = d.h;
    const ok = `at ${HOURS_EN[h]} o'clock`;
    const wrong = [`at ${HOURS_EN[(h % 12) + 1]} o'clock`, `at half past ${HOURS_EN[h]}`, `at ${HOURS_EN[h === 1 ? 12 : h - 1]} o'clock`];
    const sent = `${d.en.replace(/\.$/, '')} ${ok}.`;
    return { key: `t-${d.en}`, prompt: `${d.e} ${d.en.replace(/\.$/, '')} …`, visual: { kind: 'clock', h, m: 0 }, answer: { ...choice(r, ok, wrong), speakOptions: 'en' }, tags: ['uhrzeit'], solution: [sent, `Die Uhr zeigt ${h} Uhr: ${HOURS_EN[h]} o'clock.`], pronounce: { text: sent, lang: 'en' } };
  }
  // Was kommt zuerst?
  if (v === 3) {
    // nur Paare mit klarem Abstand (Zähneputzen vor oder nach dem Frühstück ist Geschmackssache)
    let a = pick(r, MYDAY), b = pick(r, MYDAY);
    while (Math.abs(MYDAY.indexOf(a) - MYDAY.indexOf(b)) < 2) [a, b] = [pick(r, MYDAY), pick(r, MYDAY)];
    const ia = MYDAY.indexOf(a), ib = MYDAY.indexOf(b);
    const first = ia < ib ? a : b;
    return { key: `o-${a.en}-${b.en}`, prompt: 'What do you do first?', answer: { ...fixedChoice([a.en, b.en], first.en), speakOptions: 'en' }, tags: ['reihenfolge'], solution: [`Zuerst: ${first.en} (${first.de})`, `Danach: ${(first === a ? b : a).en}`], pronounce: { text: first.en, lang: 'en' } };
  }
  // Deutsch → Englisch
  if (v === 1) {
    const wrong = pickN(r, MYDAY.filter((x) => x !== d), 3).map((x) => x.en);
    return { key: `d-${d.en}`, prompt: `Wie sagt man auf Englisch?\n„${d.de}“`, answer: { ...choice(r, d.en, wrong), speakOptions: 'en' }, tags: ['saetze'], solution: [`${d.de} = ${d.en}`], pronounce: { text: d.en, lang: 'en' } };
  }
  // Bild → Satz
  const wrong = pickN(r, MYDAY.filter((x) => x.e !== d.e), 3).map((x) => x.en);
  return { key: `b-${d.en}`, prompt: 'What do you do?', visual: { kind: 'emoji', chars: d.e }, answer: { ...choice(r, d.en, wrong), speakOptions: 'en' }, tags: ['saetze'], solution: [`${d.en} = ${d.de}`], pronounce: { text: d.en, lang: 'en' } };
}

// ---------- Wo hörst du den Laut? (Kl. 1) ----------

type Pos = 'am Anfang' | 'in der Mitte' | 'am Ende';
// [Laut, Wort, Bild, Position]
const LAUTPOS: [string, string, string, Pos][] = [
  ['M', 'Maus', '🐭', 'am Anfang'], ['M', 'Lampe', '💡', 'in der Mitte'], ['M', 'Baum', '🌳', 'am Ende'], ['M', 'Mond', '🌙', 'am Anfang'], ['M', 'Ampel', '🚦', 'in der Mitte'],
  ['N', 'Nase', '👃', 'am Anfang'], ['N', 'Ente', '🦆', 'in der Mitte'], ['N', 'Zahn', '🦷', 'am Ende'], ['N', 'Nuss', '🥜', 'am Anfang'], ['N', 'Kran', '🏗️', 'am Ende'],
  ['L', 'Löwe', '🦁', 'am Anfang'], ['L', 'Wolke', '☁️', 'in der Mitte'], ['L', 'Ball', '⚽', 'am Ende'], ['L', 'Igel', '🦔', 'am Ende'], ['L', 'Eule', '🦉', 'in der Mitte'],
  ['S', 'Sonne', '☀️', 'am Anfang'], ['S', 'Hose', '👖', 'in der Mitte'], ['S', 'Eis', '🍦', 'am Ende'], ['S', 'Haus', '🏠', 'am Ende'], ['S', 'Rose', '🌹', 'in der Mitte'],
  ['F', 'Fisch', '🐟', 'am Anfang'], ['F', 'Affe', '🐒', 'in der Mitte'], ['F', 'Schaf', '🐑', 'am Ende'], ['F', 'Fuchs', '🦊', 'am Anfang'],
  ['T', 'Tiger', '🐯', 'am Anfang'], ['T', 'Auto', '🚗', 'in der Mitte'], ['T', 'Zelt', '⛺', 'am Ende'], ['T', 'Hut', '👒', 'am Ende'],
];
function lautposTask(r: Rng, s: Stage): Gen {
  const [l, w, e, pos] = pick(r, s === 1 ? LAUTPOS.filter((x) => x[3] !== 'in der Mitte') : LAUTPOS);
  const opts: Pos[] = s === 1 ? ['am Anfang', 'am Ende'] : ['am Anfang', 'in der Mitte', 'am Ende'];
  const i = w.toLowerCase().indexOf(l.toLowerCase());
  // Doppelbuchstaben (Ball, Affe) ganz markieren
  const end = w[i + 1] && w[i + 1].toLowerCase() === w[i].toLowerCase() ? i + 2 : i + 1;
  return {
    key: `${l}-${w}`,
    prompt: `Wo hörst du das „${l}“?`,
    speak: `Wo hörst du das ${l} in ${w}?`,
    listen: { text: w, lang: 'de', slow: true },
    visual: { kind: 'emoji', chars: e },
    answer: fixedChoice(opts, pos),
    tags: [pos === 'am Anfang' ? 'anfang' : pos === 'am Ende' ? 'ende' : 'mitte'],
    solution: [`Sprich langsam: ${w}.`, `Das „${l}“ hörst du ${pos}.`],
    solutionVisual: { kind: 'word', word: w, mark: [[i, end]] },
  };
}

// ---------- The alphabet – ABC auf Englisch (1. Lernjahr) ----------

// Buchstaben, deren englische Namen deutsche Kinder leicht verwechseln
const ABC_EN: Record<string, { say: string; mix: string[] }> = {
  A: { say: 'ay', mix: ['E', 'I', 'R'] }, E: { say: 'ee', mix: ['I', 'A', 'Y'] }, I: { say: 'eye', mix: ['E', 'A', 'Y'] },
  G: { say: 'jee', mix: ['J', 'Z', 'C'] }, J: { say: 'jay', mix: ['G', 'Y', 'H'] }, Y: { say: 'why', mix: ['W', 'I', 'J'] },
  W: { say: 'double-you', mix: ['V', 'Y', 'U'] }, V: { say: 'vee', mix: ['W', 'B', 'F'] }, R: { say: 'ar', mix: ['A', 'H', 'E'] },
  H: { say: 'aitch', mix: ['A', 'R', 'K'] }, U: { say: 'you', mix: ['O', 'Q', 'W'] }, Z: { say: 'zed', mix: ['S', 'C', 'G'] },
  K: { say: 'kay', mix: ['Q', 'C', 'A'] }, C: { say: 'see', mix: ['S', 'Z', 'K'] },
};
const SPELL_EN: string[][] = [
  ['cat', 'cap', 'car', 'can'], ['dog', 'dot', 'dig', 'dug'], ['pen', 'pin', 'pan', 'pet'], ['red', 'rod', 'rid', 'bed'],
  ['bus', 'bun', 'but', 'bug'], ['sun', 'son', 'run', 'fun'], ['hat', 'ham', 'hit', 'hot'], ['big', 'bag', 'beg', 'bit'],
];
function alphabetTask(r: Rng, s: Stage): Gen {
  if (s > 1 && chance(r, 0.5)) {
    const set = pick(r, SPELL_EN);
    const w = pick(r, set);
    const spelled = w.toUpperCase().split('').join(', ');
    return { key: `w-${w}`, prompt: 'Hör gut zu! Welches Wort wird buchstabiert?', listen: { text: spelled, lang: 'en', slow: true }, answer: { ...choice(r, w, set.filter((x) => x !== w)), speakOptions: 'en' }, tags: ['buchstabieren'], solution: [`Buchstabiert: ${spelled}`, `Das Wort heißt „${w}“.`], pronounce: { text: `${spelled}. ${w}`, lang: 'en' } };
  }
  const L = pick(r, Object.keys(ABC_EN));
  const x = ABC_EN[L];
  return { key: `l-${L}`, prompt: 'Hör gut zu! Welchen Buchstaben hörst du?', listen: { text: `The letter ${L}.`, lang: 'en', slow: true }, answer: { ...choice(r, L, s === 1 ? x.mix.slice(0, 2) : x.mix), big: true }, tags: ['buchstaben'], solution: [`Auf Englisch heißt ${L} „${x.say}“.`, L === 'E' ? 'Achtung: Das englische E klingt wie ein deutsches „i“!' : L === 'I' ? 'Achtung: Das englische I klingt wie „ai“!' : L === 'G' || L === 'J' ? 'G („dschii“) und J („dschäi“) klingen ähnlich – genau hinhören!' : `Sprich nach: ${x.say}.`], pronounce: { text: `The letter ${L}.`, lang: 'en' } };
}

// ---------- Muster fortsetzen (Kl. 1) ----------

const MUSTER_ITEMS = ['🔺', '🟦', '🟡', '⭐', '❤️', '🍎', '🐟', '🌼'];
const MUSTER_UNITS: { u: number[]; st: Stage }[] = [
  { u: [0, 1], st: 1 }, { u: [0, 0, 1], st: 1 }, { u: [0, 1, 1], st: 2 }, { u: [0, 1, 2], st: 2 }, { u: [0, 0, 1, 1], st: 3 }, { u: [0, 1, 2, 1], st: 3 }, { u: [0, 1, 1, 2], st: 3 },
];
function musterTask(r: Rng, s: Stage): Gen {
  const unit = pick(r, MUSTER_UNITS.filter((x) => x.st <= s)).u;
  const k = Math.max(...unit) + 1;
  const items = pickN(r, MUSTER_ITEMS, k);
  const len = unit.length * 2 + ri(r, 1, unit.length);
  const seq = Array.from({ length: len }, (_, i) => items[unit[i % unit.length]]);
  const next = items[unit[len % unit.length]];
  const wrong = items.filter((x) => x !== next).concat(pickN(r, MUSTER_ITEMS.filter((x) => !items.includes(x)), 3)).slice(0, 3);
  const block = unit.map((i) => items[i]).join(' ');
  return {
    key: `${unit.join('')}-${items.join('')}-${len}`,
    prompt: 'Wie geht das Muster weiter?',
    visual: { kind: 'row', items: [...seq, '❓'] },
    answer: { ...choice(r, next, wrong), big: true },
    tags: [unit.length === 2 ? 'muster-2' : 'muster-lang'],
    solution: [`Das Muster wiederholt sich immer wieder: ${block}`, `Als Nächstes kommt: ${next}`],
  };
}

// ---------- Geld mit Komma (Kl. 3) ----------

function geld3Task(r: Rng, s: Stage): Gen {
  const v = s === 1 ? ri(r, 0, 1) : ri(r, 0, s === 3 ? 3 : 2);
  // Geld im Bild: Scheine und Münzen zählen, mit Komma schreiben
  if (v === 0) {
    const notes = pickN(r, [500, 1000, 2000], s === 1 ? 1 : ri(r, 1, 2));
    const euros = pickN(r, [200, 100], ri(r, 0, 2));
    const cents = s === 1 ? [50] : pickN(r, s === 3 ? [50, 20, 10, 5, 2] : [50, 20, 10], ri(r, 1, s === 3 ? 4 : 3));
    const items = [...notes.sort((a, b) => b - a), ...euros, ...cents];
    const sum = items.reduce((a, b) => a + b, 0);
    const c = sum % 100;
    // typischer Fehler: 5 ct als ,5 statt ,05 geschrieben
    const wrongComma = c < 10 ? `${Math.floor(sum / 100)},${c}0 €` : eur(sum + 100);
    const wrong = [...new Set([wrongComma, eur(sum - (c >= 10 ? 10 : 1)), eur(sum + 10), eur(sum + 100)])].filter((x) => x !== eur(sum)).slice(0, 3);
    return { key: `b-${items.join('.')}`, prompt: 'Wie viel Geld ist das?', visual: { kind: 'money', items }, answer: choice(r, eur(sum), wrong), tags: ['zaehlen'], traps: c < 10 ? [{ answer: wrongComma, tag: 'komma-null', hint: `${c} Cent schreibt man mit einer Null: ,0${c} €.` }] : [], solution: [`Euro: ${items.filter((x) => x >= 100).map((x) => x / 100).join(' + ')} = ${Math.floor(sum / 100)} €`, `Cent: ${items.filter((x) => x < 100).join(' + ')} = ${c} ct`, `Zusammen: ${eur(sum)}`] };
  }
  const e = ri(r, 1, 9), c = s === 1 ? pick(r, [50, 20, 10]) : pick(r, [5, 9, 15, 30, 45, 75, 80, 95, 99]);
  const ct = e * 100 + c;
  // Euro mit Komma → Cent
  if (v === 1) return { key: `c-${ct}`, prompt: `${eur(ct)} = ☐ ct`, answer: { type: 'number', value: ct, unit: 'ct' }, tags: ['umrechnen'], traps: [{ answer: String(e * 10 + c), tag: 'umrechnungszahl', hint: '1 € sind 100 ct – also 3 € = 300 ct.' }], solution: ['1 € = 100 ct', `${eur(ct)} = ${e} € und ${c} ct`, `${e * 100} ct + ${c} ct = ${ct} ct`] };
  // Cent → Euro mit Komma
  if (v === 2) {
    const wrong = [...new Set([c < 10 ? `${e},${c}0 €` : `${e * 10 + Math.floor(c / 10)},${c % 10}0 €`, eur(ct + 100), `${Math.floor(ct / 1000)},${String(ct % 1000).padStart(3, '0')} €`])].filter((x) => x !== eur(ct));
    return { key: `e-${ct}`, prompt: `${ct} ct = ☐`, answer: choice(r, eur(ct), wrong), tags: ['umrechnen'], solution: ['100 ct = 1 €', `${ct} ct = ${e * 100} ct + ${c} ct = ${e} € ${c} ct`, `Mit Komma: ${eur(ct)}`] };
  }
  // Was ist teurer? ,50 oder ,05
  const a = e * 100 + 50, b = e * 100 + 5;
  const pair = shuffle(r, [eur(a), eur(b)]);
  return { key: `t-${e}`, prompt: `Was ist teurer?`, answer: fixedChoice(pair, eur(a)), tags: ['vergleichen'], solution: [`${eur(a)} = ${e} € und 50 ct`, `${eur(b)} = ${e} € und 5 ct`, `Also ist ${eur(a)} teurer.`] };
}

// ---------- -ig oder -ich? (Kl. 3) ----------

// [Wort, Endung, Verlängerung bzw. Merkhilfe, Bild]
const IGICH: [string, 'ig' | 'ich', string, string][] = [
  ['König', 'ig', 'die Könige', '👑'], ['Honig', 'ig', 'Merke: Honig schreibt man mit g', '🍯'], ['Käfig', 'ig', 'die Käfige', '🦜'],
  ['lustig', 'ig', 'ein lustiger Clown', '🤡'], ['mutig', 'ig', 'ein mutiger Ritter', '🦸'], ['eilig', 'ig', 'ein eiliger Bote', '🏃'], ['ruhig', 'ig', 'ein ruhiger Abend', '😌'], ['fertig', 'ig', 'eine fertige Burg', '✅'],
  ['Teppich', 'ich', 'die Teppiche', '🧶'], ['Rettich', 'ich', 'die Rettiche', '🥕'], ['Kranich', 'ich', 'die Kraniche', '🦢'], ['Pfirsich', 'ich', 'die Pfirsiche', '🍑'],
  ['freundlich', 'ich', 'Merke: -lich schreibt man immer mit ch', '😊'], ['fröhlich', 'ich', 'Merke: -lich schreibt man immer mit ch', '😄'], ['glücklich', 'ich', 'Merke: -lich schreibt man immer mit ch', '🍀'], ['ehrlich', 'ich', 'Merke: -lich schreibt man immer mit ch', '🤝'],
  ['Zweig', 'ig', 'die Zweige', '🌿'], ['hungrig', 'ig', 'ein hungriger Bär', '😋'], ['durstig', 'ig', 'ein durstiges Pferd', '🥤'], ['schmutzig', 'ig', 'ein schmutziges Schwein', '🐷'], ['billig', 'ig', 'ein billiges Spielzeug', '🏷️'],
  ['pünktlich', 'ich', 'Merke: -lich schreibt man immer mit ch', '⏰'], ['ängstlich', 'ich', 'Merke: -lich schreibt man immer mit ch', '😨'], ['gefährlich', 'ich', 'Merke: -lich schreibt man immer mit ch', '⚠️'],
  // Nachtlauf 22.10.2026: mehr Aufgaben
  ['wichtig', 'ig', 'eine wichtige Aufgabe', '❗'], ['traurig', 'ig', 'ein trauriges Kind', '😢'], ['richtig', 'ig', 'die richtige Antwort', '✔️'], ['windig', 'ig', 'ein windiger Tag', '🌬️'],
  ['gemütlich', 'ich', 'Merke: -lich schreibt man immer mit ch', '🛋️'], ['ordentlich', 'ich', 'Merke: -lich schreibt man immer mit ch', '🧹'], ['heimlich', 'ich', 'Merke: -lich schreibt man immer mit ch', '🤫'], ['höflich', 'ich', 'Merke: -lich schreibt man immer mit ch', '🎩'],
];
function igichTask(r: Rng, s: Stage): Gen {
  const [w, end, hilfe, e] = pick(r, IGICH);
  const stem = w.slice(0, w.length - end.length);
  const why = hilfe.startsWith('Merke') ? hilfe : `Verlängere das Wort: ${hilfe} – jetzt hörst du ${end === 'ig' ? 'das g' : 'das ch'}.`;
  if (s === 3 && chance(r, 0.5)) {
    return { key: `t-${w}`, prompt: 'Hör gut zu und schreibe das Wort.', speak: w, listen: { text: w, lang: 'de' }, visual: { kind: 'emoji', chars: e }, answer: { type: 'text', value: w, dictation: true, caseSensitive: true }, tags: [end], traps: [{ answer: stem + (end === 'ig' ? 'ich' : 'ig'), tag: 'ig-ich-verwechselt', hint: why }], solution: [`So schreibt man es: ${w}`, why] };
  }
  return {
    key: `c-${w}`,
    prompt: `-ig oder -ich?\n${stem}☐`,
    speak: `ig oder ich? ${w}`,
    visual: { kind: 'emoji', chars: e },
    answer: { ...fixedChoice(['ig', 'ich'], end), big: true },
    tags: [end],
    solution: [`Richtig: ${w}`, why],
  };
}

function strahlMio(r: Rng, s: Stage): Gen {
  if (s > 1 && chance(r, 0.25)) return mitteTask(r, 100000, 10);
  if (s === 1) {
    const h = ri(r, 0, 9) * 100000;
    let k = ri(r, 1, 9);
    if (k === 5) k = 4;
    return strahlTask(h, h + 100000, 50000, 10000, h + k * 10000);
  }
  if (s === 2) {
    const t = ri(r, 0, 98) * 10000;
    let k = ri(r, 1, 19);
    if (k === 10) k = 11;
    return strahlTask(t, t + 20000, 10000, 1000, t + k * 1000);
  }
  return strahlTask(0, 1000000, 100000, 50000, ri(r, 0, 9) * 100000 + 50000);
}

// ---------- What's the matter? (Englisch, 2. Lernjahr) ----------

const ILL: { en: string; de: string; e: string }[] = [
  { en: "I've got a headache.", de: 'Ich habe Kopfschmerzen.', e: '🤕' },
  { en: "I've got a cold.", de: 'Ich bin erkältet.', e: '🤧' },
  { en: "I've got a toothache.", de: 'Ich habe Zahnschmerzen.', e: '🦷' },
  { en: "I've got a temperature.", de: 'Ich habe Fieber.', e: '🤒' },
  { en: "I've got an earache.", de: 'Ich habe Ohrenschmerzen.', e: '👂' },
  { en: "I'm tired.", de: 'Ich bin müde.', e: '🥱' },
  { en: "I'm fine, thank you.", de: 'Mir geht es gut, danke.', e: '😊' },
  // Nachtlauf 22.10.2026: mehr Aufgaben
  { en: "I've got a stomach ache.", de: 'Ich habe Bauchschmerzen.', e: '🤢' },
  { en: "I've hurt my knee.", de: 'Ich habe mir das Knie verletzt.', e: '🩹' },
  { en: "I'm cold.", de: 'Mir ist kalt.', e: '🥶' },
  { en: "I'm hot.", de: 'Mir ist heiß.', e: '🥵' },
  { en: "I'm sad.", de: 'Ich bin traurig.', e: '😢' },
];
function healthTask(r: Rng, s: Stage): Gen {
  const d = pick(r, ILL);
  const others = ILL.filter((x) => x !== d);
  const v = s === 1 ? ri(r, 0, 1) : ri(r, 0, 2);
  if (v === 1) {
    return { key: `h-${d.en}`, prompt: "What's the matter? Hör gut zu! Welches Bild passt?", listen: { text: d.en, lang: 'en' }, answer: { ...choice(r, d.e, pickN(r, others, s === 1 ? 2 : 3).map((x) => x.e)), big: true }, tags: ['hoeren'], solution: [`${d.en} = ${d.de}`], pronounce: { text: d.en, lang: 'en' } };
  }
  if (v === 2) {
    return { key: `d-${d.en}`, prompt: `Wie sagt man auf Englisch?\n„${d.de}“`, answer: { ...choice(r, d.en, pickN(r, others, 3).map((x) => x.en)), speakOptions: 'en' }, tags: ['saetze'], solution: [`${d.de} = ${d.en}`], pronounce: { text: d.en, lang: 'en' } };
  }
  return { key: `b-${d.en}`, prompt: "What's the matter?", visual: { kind: 'emoji', chars: d.e }, answer: { ...choice(r, d.en, pickN(r, others, s === 1 ? 2 : 3).map((x) => x.en)), speakOptions: 'en' }, tags: ['saetze'], solution: [`${d.en} = ${d.de}`], pronounce: { text: d.en, lang: 'en' } };
}

export const MATHE_EXTRA3: Skill[] = [
  M(4, 'm4-zahlenstrahl', 'Zahlenstrahl bis 1 Million', '📏', { text: ['Schau zuerst, wie weit ein großer Strich vom nächsten entfernt ist – zum Beispiel 100 000.', 'Dann die kleinen Striche: Wie viele sind zwischen zwei großen? 10 kleine Striche zwischen 0 und 100 000 heißt: jeder ist 10 000.', 'Zähle vom nächsten beschrifteten Strich aus weiter.'], visual: { kind: 'numberline', from: 400000, to: 500000, start: 430000, jumps: [], step: 50000, minor: 10000, ask: true }, videoQuery: 'Zahlenstrahl bis 1 Million Klasse 4' }, strahlMio, { tagLabels: { ablesen: 'Zahlen am Zahlenstrahl ablesen', mitte: 'die Mitte finden', verzaehlt: 'Striche verzählt', 'strich-wert': 'Wert eines kleinen Strichs falsch', 'abstand-statt-mitte': 'Abstand statt Mitte' }, testSeconds: 30 }),
  M(3, 'm3-geld', 'Geld mit Komma', '💰', { text: ['3,45 € heißt: 3 Euro und 45 Cent.', 'Nach dem Komma stehen immer zwei Stellen für die Cent: 5 Cent schreibt man 0,05 €, 50 Cent 0,50 €.', '100 Cent sind 1 Euro – also sind 345 ct = 3,45 €.'], visual: { kind: 'money', items: [200, 100, 20, 20, 5] }, videoQuery: 'Geld Kommaschreibweise Euro Cent Klasse 3' }, geld3Task, { tagLabels: { zaehlen: 'Geld zählen', umrechnen: 'Euro und Cent umrechnen', vergleichen: 'Preise vergleichen', 'komma-null': 'Null nach dem Komma vergessen', umrechnungszahl: 'falsche Umrechnungszahl' }, testSeconds: 30 }),
  M(1, 'm1-muster', 'Muster fortsetzen', '🔁', { text: ['Ein Muster wiederholt sich immer wieder auf die gleiche Weise.', 'Suche den Teil, der sich wiederholt: 🔺 🟦 | 🔺 🟦 | 🔺 🟦', 'Dann weißt du, was als Nächstes kommt.'], visual: { kind: 'row', items: ['🔺', '🟦', '🔺', '🟦', '🔺', '❓'] }, videoQuery: 'Muster fortsetzen Klasse 1 Mathematik' }, musterTask, { tagLabels: { 'muster-2': 'einfache Muster', 'muster-lang': 'längere Muster' }, testSeconds: 20 }),
  M(4, 'm4-parallel-senkrecht', 'Senkrecht und parallel', '📐', { text: ['Parallel: Zwei Linien haben überall den gleichen Abstand – sie treffen sich nie, wie Schienen.', 'Senkrecht: Zwei Linien treffen sich in einem rechten Winkel – wie die Ecke eines Blatts Papier.', 'Prüfen kannst du beides mit dem Geodreieck.'], visual: { kind: 'lines', a: [30, 40, 170, 40], b: [100, 40, 100, 140], right: true }, videoQuery: 'senkrecht und parallel Geodreieck Klasse 4' }, lageLinienTask, { tagLabels: { parallel: 'parallele Linien', senkrecht: 'senkrechte Linien', weder: 'weder parallel noch senkrecht', wissen: 'Begriffe' }, testSeconds: 25 }),
  M(1, 'm1-rechengeschichten', 'Rechengeschichten', '🦆', { text: ['Eine Rechengeschichte erzählt, was passiert – du findest die Rechnung dazu.', 'Kommen welche dazu, wird es mehr: Du rechnest plus.', 'Gehen welche weg, wird es weniger: Du rechnest minus.'], visual: { kind: 'tenframe', a: 4, b: 3 }, videoQuery: 'Rechengeschichten Klasse 1 plus minus' }, story1Task, { tagLabels: { plus: 'Geschichten mit plus', minus: 'Geschichten mit minus', 'rechnung-finden': 'passende Rechnung finden', 'falsche-rechenart': 'plus und minus verwechselt' }, testSeconds: 40 }),
  M(1, 'm1-ziffern', 'Ziffern schreiben', '✏️', { text: ['Jede Ziffer hat ihre feste Form – und eine Richtung, in die man sie schreibt.', 'Fang am grünen Punkt an und fahre die graue Ziffer mit dem Finger nach.', 'Tippe auf ▶, dann zeigt dir der Fuchs, wie es geht.'], visual: { kind: 'word', word: '1 2 3' }, videoQuery: 'Ziffern schreiben lernen Kinder Schreibrichtung' }, zifferTask, { tagLabels: { ziffern: 'Ziffern schreiben' }, testSeconds: 40 }),
  M(1, 'm1-lage', 'Links, rechts, oben, unten', '↔️', { text: ['Links und rechts: Strecke beide Hände aus und spreize die Daumen ab – die linke Hand zeigt ein „L“.', 'Über heißt: weiter oben. Unter heißt: weiter unten.', 'Zwischen heißt: Auf beiden Seiten liegt etwas.'], visual: { kind: 'grid', rows: [['🍎', '⚽', '🚗']], mark: [0, 1] }, videoQuery: 'links rechts oben unten Lagebeziehungen Klasse 1' }, lageTask, { tagLabels: { 'links-rechts': 'links und rechts', 'oben-unten': 'oben und unten', zwischen: 'zwischen', 'links-rechts-vertauscht': 'links und rechts verwechselt', 'oben-unten-vertauscht': 'über und unter verwechselt' }, testSeconds: 15 }),
  M(1, 'm1-ordnen', 'Zahlen ordnen', '🔢', { text: ['Am Zahlenstrahl stehen die kleinen Zahlen links, die großen rechts.', 'Zum Ordnen suchst du zuerst die kleinste Zahl, dann die nächstgrößere – bis zur größten.', 'Das Zeichen < heißt „kleiner als“: 3 < 7.'], visual: { kind: 'numberline', from: 0, to: 10, start: 7, jumps: [] }, videoQuery: 'Zahlen ordnen der Größe nach Klasse 1' }, ordnenTask, { tagLabels: { kleinste: 'kleinste Zahl finden', groesste: 'größte Zahl finden', ordnen: 'Zahlen der Reihe nach ordnen', verwechselt: 'kleinste und größte verwechselt' }, testSeconds: 15 }),
  M(1, 'm1-geld', 'Geld bis 20 €', '💶', { text: ['Auf jeder Münze und jedem Schein steht, wie viel sie wert sind: 1 €, 2 €, 5 €, 10 €.', 'Zähle immer vom größten zum kleinsten Wert und zähle dabei weiter: 10, 15, 17, 18.', 'Nicht die Münzen zählen – ihren Wert zählen!'], visual: { kind: 'money', items: [1000, 500, 200, 100] }, videoQuery: 'Geld zählen Euro Klasse 1' }, geld1Task, { tagLabels: { zaehlen: 'Geld zählen', rest: 'Restgeld', 'stueck-gezaehlt': 'Münzen statt Wert gezählt', 'plus-statt-minus': 'plus statt minus' }, testSeconds: 25 }),
  M(2, 'm2-zahlenstrahl', 'Zahlenstrahl bis 100', '📏', { text: ['Am Zahlenstrahl stehen die Zahlen der Reihe nach – links die kleinen, rechts die großen.', 'Suche die nächste beschriftete Zahl links vom Punkt und zähle die kleinen Striche weiter.', 'Achtung: Schau zuerst, wie viel ein kleiner Strich wert ist – 1, 2 oder 5?'], visual: { kind: 'numberline', from: 30, to: 50, start: 37, jumps: [], step: 10, minor: 1, ask: true }, videoQuery: 'Zahlenstrahl bis 100 Klasse 2 erklärt' }, strahl100, { tagLabels: { ablesen: 'Zahlen ablesen', mitte: 'Mitte finden', verzaehlt: 'Striche verzählt', 'strich-wert': 'Strich-Wert nicht beachtet', 'abstand-statt-mitte': 'Abstand statt Mitte' }, testSeconds: 25 }),
  M(2, 'm2-ergaenzen', 'Ergänzen und Platzhalter', '🧩', { text: ['Ergänzen bis 100: Erst bis zum nächsten Zehner, dann bis 100. 37 + 3 = 40, 40 + 60 = 100 → 63.', 'Steht die Lücke in der Mitte oder vorne, hilft die Umkehraufgabe: 25 + ☐ = 60 → 60 − 25 = 35.', 'Mach immer die Probe: Stimmt die Aufgabe mit deiner Zahl?'], visual: { kind: 'numberline', from: 30, to: 100, start: 37, jumps: [3, 60], step: 10, minor: 5 }, videoQuery: 'Ergänzen bis 100 Platzhalteraufgaben Klasse 2' }, ergaenzenTask, { tagLabels: { 'bis-100': 'bis 100 ergänzen', platzhalter: 'Platzhalteraufgaben', 'zehner-zu-viel': 'einen Zehner zu viel', 'falsch-gerechnet': 'Umkehraufgabe nicht genutzt' }, testSeconds: 25 }),
  M(3, 'm3-geteilt-gross', 'Teilen mit großen Zahlen', '➗', { text: ['Große Zahlen teilst du in Schritten: Zerlege die Zahl in zwei Teile, die du gut teilen kannst.', '84 : 4 → 80 : 4 = 20 und 4 : 4 = 1 → zusammen 21.', 'Probe mit der Malaufgabe: 21 · 4 = 84 ✓'], visual: { kind: 'text', text: '84 : 4 = 80 : 4 + 4 : 4 = 21' }, videoQuery: 'halbschriftliche Division Klasse 3 erklärt' }, teilenGrossTask, { tagLabels: { zweistellig: 'zweistellige Zahlen teilen', dreistellig: 'dreistellige Zahlen teilen', 'teil-vergessen': 'einen Teil vergessen' }, testSeconds: 30 }),
  M(3, 'm3-zahlenstrahl', 'Zahlenstrahl bis 1000', '📐', { text: ['Am Zahlenstrahl bis 1000 ist ein kleiner Strich oft 10 oder 50 wert.', 'Schau dir zuerst zwei beschriftete Zahlen an: Wie viele Striche liegen dazwischen? So findest du den Wert eines Strichs.', 'Dann zählst du von der nächsten beschrifteten Zahl weiter.'], visual: { kind: 'numberline', from: 300, to: 400, start: 370, jumps: [], step: 50, minor: 10, ask: true }, videoQuery: 'Zahlenstrahl bis 1000 Klasse 3' }, strahl1000, { tagLabels: { ablesen: 'Zahlen ablesen', mitte: 'Mitte finden', verzaehlt: 'Striche verzählt', 'strich-wert': 'Strich-Wert nicht beachtet', 'abstand-statt-mitte': 'Abstand statt Mitte' }, testSeconds: 25 }),
  M(3, 'm3-zahlwoerter', 'Zahlwörter lesen und schreiben', '🔤', { text: ['Zahlwörter schreibt man zusammen: dreihundertvierundfünfzig = 354.', 'Achtung: Im Deutschen sagt man die Einer vor den Zehnern – vier-und-fünfzig, aber geschrieben 54.', 'Lies lange Zahlwörter in Stücken: drei-hundert | vier-und-fünfzig.'], visual: { kind: 'text', text: 'dreihundert · vierund · fünfzig = 354' }, videoQuery: 'Zahlwörter schreiben Zahlen bis 1000 Klasse 3' }, zahlwortTask, { tagLabels: { 'bis-100': 'Zahlwörter bis 100', 'bis-1000': 'Zahlwörter bis 1000', zahlendreher: 'Zahlendreher (Einer und Zehner vertauscht)' }, testSeconds: 20 }),
  M(3, 'm3-wuerfelgebaeude', 'Würfelgebäude', '🏗️', { text: ['Kein Würfel schwebt: Unter jedem Würfel steht ein anderer Würfel oder der Boden.', 'Zähle Turm für Turm: Wie hoch ist jeder Stapel? Dann rechnest du alles zusammen.', 'Hinter vorderen Würfeln können Würfel versteckt sein – denk sie mit!', 'Ein Bauplan zeigt von oben, wie viele Würfel auf jedem Feld stehen.'], visual: { kind: 'cubes', h: [[3, 2, 1], [1, 1, 0]] }, videoQuery: 'Würfelgebäude Würfel zählen Bauplan Klasse 3' }, cubesTask, { tagLabels: { 'eine-reihe': 'Würfel in einer Reihe', 'mehrere-reihen': 'Würfel in mehreren Reihen', 'versteckte-vergessen': 'versteckte Würfel vergessen' }, testSeconds: 30 }),
  M(4, 'm4-fahrplan', 'Fahrplan lesen', '🚌', { text: ['In einem Fahrplan stehen die Haltestellen untereinander, die Busse nebeneinander.', 'Suche erst die richtige Zeile (Haltestelle), dann die Spalte (Bus) – wo sie sich treffen, steht die Uhrzeit.', 'Wie lange fährt der Bus? Rechne von der Abfahrt bis zur Ankunft: von 7:10 bis 7:25 sind es 15 Minuten.'], visual: { kind: 'table', title: '🚌 Fahrplan', head: ['Haltestelle', '1. Bus', '2. Bus'], rows: [['Bahnhof', '7:10', '7:30'], ['Schule', '7:25', '7:45']] }, videoQuery: 'Fahrplan lesen Mathe Klasse 4 Grundschule' }, fahrplanTask, { tagLabels: { ablesen: 'Fahrplan ablesen', zeitspanne: 'Fahrzeit und Wartezeit', planen: 'den richtigen Bus finden', 'zu-spaet': 'zu späten Bus gewählt' }, testSeconds: 45 }),
  M(4, 'm4-bruchgroessen', 'Brüche bei Größen: ½, ¼, ¾', '🍰', { text: ['½ heißt: die Hälfte. ½ kg = 500 g, ½ h = 30 min.', '¼ heißt: ein Viertel – das Ganze durch 4. ¼ l = 250 ml, ¼ h = 15 min.', '¾ sind drei Viertel: ¾ h = 45 min, ¾ kg = 750 g.'], visual: { kind: 'text', text: '½ kg = 500 g · ¼ h = 15 min' }, videoQuery: 'Brüche bei Größen halb viertel Klasse 4' }, fracTask, { tagLabels: { halb: 'halbe Größen', viertel: 'Viertel und Dreiviertel', 'prozent-gedacht': 'Umrechnungszahl vergessen' }, testSeconds: 25 }),
  M(4, 'm4-geld-komma', 'Rechnen mit Geld: Kommazahlen', '💶', { text: ['3,45 € heißt: 3 Euro und 45 Cent. 100 Cent sind 1 Euro.', 'Beim Zusammenrechnen: erst die Euro, dann die Cent. Sind es 100 Cent oder mehr, wird daraus ein Euro mehr.', 'Rückgeld: Ergänze erst die Cent bis zum vollen Euro, dann bis zum bezahlten Betrag.'], visual: { kind: 'money', items: [500, 200, 50, 20, 5] }, videoQuery: 'Rechnen mit Geld Kommazahlen Rückgeld Klasse 4' }, geldKommaTask, { tagLabels: { addieren: 'Preise zusammenrechnen', rueckgeld: 'Rückgeld berechnen', 'cent-uebertrag': '100 Cent = 1 Euro vergessen', 'cent-ergaenzen': 'Cent falsch ergänzt' }, testSeconds: 40 }),
  M(4, 'm4-schriftlich-plusminus', 'Schriftlich plus und minus bis 1 Million', '🧮', { text: ['Genauso wie bei kleinen Zahlen: Stellen genau untereinander, rechts bei den Einern anfangen.', 'Plus: Ist eine Spalte 10 oder mehr, merkst du dir den Übertrag für die nächste Spalte.', 'Minus: Ist oben zu wenig, entbündelst du – hol dir 1 von der nächsten Stelle. Mach am Ende die Probe mit plus.'], visual: { kind: 'column', op: '+', rows: [45218, 37956], result: 83174, carries: [0, 1, 0, 1, 1] }, videoQuery: 'schriftliche Addition Subtraktion große Zahlen Klasse 4' }, schriftlich4Task, { tagLabels: { plus: 'schriftlich addieren', minus: 'schriftlich subtrahieren', 'übertrag-vergessen': 'Übertrag vergessen', 'kleiner-minus-größer': 'unten minus oben gerechnet' }, testSeconds: 90 }),
];

// ---------- Ergänzen und Platzhalter bis 100 (Kl. 2) ----------

function ergaenzenTask(r: Rng, s: Stage): Gen {
  const form = s === 1 ? 'bis100' : s === 2 ? pick(r, ['bis100', 'plus']) : pick(r, ['plus', 'vorne', 'minus']);
  if (form === 'bis100') {
    const a = s === 1 ? ri(r, 1, 9) * 10 : ri(r, 11, 89);
    const x = 100 - a;
    const toTen = (10 - (a % 10)) % 10;
    const wrongTens = x + 10;
    return {
      key: `e-${a}`,
      prompt: `${a} + ☐ = 100`,
      answer: { type: 'number', value: x },
      tags: ['bis-100'],
      traps: toTen ? [{ answer: String(wrongTens), tag: 'zehner-zu-viel', hint: `Prüfe: ${a} + ${wrongTens} = ${a + wrongTens} – das ist zu viel. Nach dem Ergänzen zum Zehner ist ein Zehner schon voll.` }] : [],
      solution: toTen ? [`Erst bis zum nächsten Zehner: ${a} + ${toTen} = ${a + toTen}`, `Dann bis 100: ${a + toTen} + ${100 - a - toTen} = 100`, `Zusammen: ${toTen} + ${100 - a - toTen} = ${x}`] : [`${a} + ${x} = 100`, `${a / 10} Zehner + ${x / 10} Zehner = 10 Zehner`],
    };
  }
  const a = ri(r, 12, 58);
  const x = ri(r, 11, 99 - a);
  const sum = a + x;
  if (form === 'plus') return { key: `p-${a}-${sum}`, prompt: `${a} + ☐ = ${sum}`, answer: { type: 'number', value: x }, tags: ['platzhalter'], traps: [{ answer: String(sum + a), tag: 'falsch-gerechnet', hint: `Gesucht ist, was zu ${a} dazukommt. Rechne ${sum} − ${a}.` }], solution: [`Was fehlt von ${a} bis ${sum}?`, `Umkehraufgabe: ${sum} − ${a} = ${x}`, `Probe: ${a} + ${x} = ${sum}`] };
  if (form === 'vorne') return { key: `v-${x}-${sum}`, prompt: `☐ + ${x} = ${sum}`, answer: { type: 'number', value: a }, tags: ['platzhalter'], traps: [{ answer: String(sum + x), tag: 'falsch-gerechnet', hint: `Rechne rückwärts: ${sum} − ${x}.` }], solution: [`Umkehraufgabe: ${sum} − ${x} = ${a}`, `Probe: ${a} + ${x} = ${sum}`] };
  return { key: `m-${sum}-${a}`, prompt: `${sum} − ☐ = ${a}`, answer: { type: 'number', value: x }, tags: ['platzhalter'], traps: [{ answer: String(sum + a), tag: 'falsch-gerechnet', hint: `Wie viel muss weg, damit ${a} übrig bleibt? Rechne ${sum} − ${a}.` }], solution: [`Von ${sum} bis ${a} – wie viel ist weggenommen?`, `${sum} − ${a} = ${x}`, `Probe: ${sum} − ${x} = ${a}`] };
}

// ---------- Zahlen ordnen (Kl. 1) ----------

function ordnenTask(r: Rng, s: Stage): Gen {
  const n = s === 1 ? 3 : 4;
  const nums = pickN(r, Array.from({ length: s === 1 ? 10 : 20 }, (_, i) => i + 1), n);
  const sorted = [...nums].sort((a, b) => a - b);
  const v = s === 1 ? pick(r, ['klein', 'gross']) : pick(r, ['klein', 'gross', 'reihe']);
  if (v === 'reihe') {
    const ok = sorted.join(' < ');
    const wrong = [[...sorted].reverse().join(' < '), [sorted[1], sorted[0], ...sorted.slice(2)].join(' < '), [...sorted.slice(0, -2), sorted[n - 1], sorted[n - 2]].join(' < ')];
    return { key: `r-${sorted.join('-')}`, prompt: `Welche Reihe ist richtig – von klein nach groß?\n${nums.join(', ')}`, answer: choice(r, ok, wrong), tags: ['ordnen'], solution: [`Von klein nach groß: ${ok}`, 'Suche zuerst die kleinste Zahl, dann die nächstgrößere …'] };
  }
  const ok = v === 'klein' ? sorted[0] : sorted[n - 1];
  return {
    key: `${v}-${sorted.join('-')}`,
    prompt: `Welche Zahl ist am ${v === 'klein' ? 'kleinsten' : 'größten'}?`,
    speak: `Welche Zahl ist am ${v === 'klein' ? 'kleinsten' : 'größten'}? ${nums.join(', ')}`,
    answer: { ...choice(r, String(ok), nums.filter((x) => x !== ok).map(String)), big: true },
    tags: [v === 'klein' ? 'kleinste' : 'groesste'],
    traps: [{ answer: String(v === 'klein' ? sorted[n - 1] : sorted[0]), tag: 'verwechselt', hint: `Das ist die ${v === 'klein' ? 'größte' : 'kleinste'} Zahl. Gesucht ist die ${v === 'klein' ? 'kleinste' : 'größte'}.` }],
    solution: [`Der Reihe nach: ${sorted.join(', ')}`, `Am ${v === 'klein' ? 'kleinsten' : 'größten'} ist ${ok}.`],
    solutionVisual: { kind: 'numberline', from: 0, to: s === 1 ? 10 : 20, start: ok, jumps: [], step: s === 1 ? 1 : 5, minor: 1 },
  };
}

// ---------- Zahlwörter (Kl. 3) ----------

const EINS = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];
const ZEHN = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];
/** deutsches Zahlwort bis 999 (zusammengeschrieben, wie es Kinder lernen) */
export function zahlwort(n: number): string {
  if (n < 20) return EINS[n];
  if (n < 100) {
    const e = n % 10;
    return e ? `${e === 1 ? 'ein' : EINS[e]}und${ZEHN[Math.floor(n / 10)]}` : ZEHN[n / 10];
  }
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return `${h === 1 ? 'ein' : EINS[h]}hundert${rest ? zahlwort(rest) : ''}`;
}
function zahlwortTask(r: Rng, s: Stage): Gen {
  const n = s === 1 ? ri(r, 21, 99) : s === 2 ? ri(r, 101, 999) : pick(r, [ri(r, 101, 999), ri(r, 1, 9) * 100 + ri(r, 11, 19), ri(r, 1, 9) * 100 + ri(r, 1, 9)]);
  const w = zahlwort(n);
  const swap = (x: number) => {
    const e = x % 10, z = Math.floor(x / 10) % 10;
    return x - e - z * 10 + e * 10 + z;
  };
  const dreher = swap(n);
  if (chance(r, 0.5)) {
    return {
      key: `w-${n}`,
      prompt: `Schreibe als Zahl:\n${w}`,
      speak: `Schreibe als Zahl: ${n}`,
      answer: { type: 'number', value: n },
      tags: [n < 100 ? 'bis-100' : 'bis-1000'],
      traps: dreher !== n ? [{ answer: String(dreher), tag: 'zahlendreher', hint: 'Achtung Zahlendreher: Im Deutschen sagt man die Einer vor den Zehnern – „vierundsiebzig“ ist 74, nicht 47.' }] : [],
      solution: [`${w} = ${n}`, n >= 100 ? `${Math.floor(n / 100)} Hunderter, ${Math.floor(n / 10) % 10} Zehner, ${n % 10} Einer` : `${Math.floor(n / 10)} Zehner, ${n % 10} Einer`],
    };
  }
  const wrong = [...new Set([dreher, n + 10 <= 999 ? n + 10 : n - 10, n >= 100 ? n + 100 * (n < 900 ? 1 : -1) : n + 1].filter((x) => x !== n))].map(zahlwort);
  return {
    key: `z-${n}`,
    prompt: `Welches Zahlwort passt zu ${n}?`,
    answer: choice(r, w, wrong), // ohne Vorlesen der Antworten – das würde die Lösung verraten
    tags: [n < 100 ? 'bis-100' : 'bis-1000'],
    traps: dreher !== n ? [{ answer: zahlwort(dreher), tag: 'zahlendreher', hint: 'Achtung Zahlendreher: Im Zahlwort kommen die Einer vor den Zehnern.' }] : [],
    solution: [`${n} = ${w}`, 'Lies Stück für Stück: erst die Hunderter, dann die Einer, dann die Zehner – „…hundert-vier-und-fünfzig“.'],
  };
}

// ---------- Mini-Texte lesen (Kl. 1) ----------

// [Text, Frage, richtige Antwort (Bild), falsche Bilder]
const MINI: [string, string, string, string[]][] = [
  ['Tim hat einen Ball. Der Ball ist rot.', 'Was hat Tim?', '⚽', ['🧸', '🚗', '🎈']],
  ['Lea mag Eis. Sie isst ein Eis mit Erdbeeren.', 'Was isst Lea?', '🍦', ['🍕', '🍌', '🥨']],
  ['Der Hund schläft. Er liegt im Körbchen.', 'Wer schläft?', '🐶', ['🐱', '🐰', '🐦']],
  ['Oma hat eine Katze. Die Katze heißt Mimi.', 'Welches Tier hat Oma?', '🐱', ['🐶', '🐟', '🐴']],
  ['Ben fährt mit dem Rad zur Schule.', 'Womit fährt Ben?', '🚲', ['🚗', '🚌', '🛴']],
  ['Es regnet. Mia nimmt ihren Schirm mit.', 'Was nimmt Mia mit?', '☂️', ['🎒', '🧢', '🧤']],
  ['Papa backt einen Kuchen. Der Kuchen ist lecker.', 'Was backt Papa?', '🎂', ['🍞', '🍪', '🥐']],
  ['Im Teich schwimmt eine Ente. Sie ist gelb.', 'Was schwimmt im Teich?', '🦆', ['🐟', '🐸', '🐢']],
  ['Am Himmel ist der Mond. Es ist Nacht.', 'Was ist am Himmel?', '🌙', ['☀️', '🌈', '⚡']],
  ['Emil malt ein Haus. Das Haus hat ein rotes Dach.', 'Was malt Emil?', '🏠', ['🌳', '🚗', '🌼']],
  ['Ida pflückt eine Blume. Sie schenkt sie Mama.', 'Was pflückt Ida?', '🌼', ['🍎', '🍄', '🍀']],
  ['Der Bus ist gelb. Er hält an der Schule.', 'Was hält an der Schule?', '🚌', ['🚲', '🚂', '✈️']],
  ['Max hat Hunger. Er isst eine Banane.', 'Was isst Max?', '🍌', ['🍎', '🍇', '🥕']],
  ['Im Garten steht ein Baum. Ein Vogel sitzt darauf.', 'Wer sitzt auf dem Baum?', '🐦', ['🐱', '🐿️', '🦋']],
  ['Lotta spielt Geige. Sie übt jeden Tag.', 'Was spielt Lotta?', '🎻', ['🥁', '🎺', '🎹']],
  ['Es ist Winter. Die Kinder bauen einen Schneemann.', 'Was bauen die Kinder?', '⛄', ['🏰', '🏠', '🪁']],
  ['Opa liest die Zeitung. Er trägt eine Brille.', 'Was liest Opa?', '📰', ['📖', '✉️', '🗺️']],
  ['Auf der Wiese hoppelt ein Hase. Er frisst eine Möhre.', 'Was frisst der Hase?', '🥕', ['🍎', '🌽', '🥦']],
  ['Nele hat Geburtstag. Sie bekommt einen Luftballon.', 'Was bekommt Nele?', '🎈', ['🧸', '📚', '⚽']],
  ['Das Baby weint. Mama gibt ihm die Flasche.', 'Was bekommt das Baby?', '🍼', ['🥤', '🍪', '🧸']],
  ['Paul geht schwimmen. Im Wasser ist ein Fisch.', 'Was ist im Wasser?', '🐟', ['🦆', '🐸', '🐢']],
  ['Die Sonne scheint. Jana trägt ihre Sonnenbrille.', 'Was trägt Jana?', '🕶️', ['🧢', '🧣', '👒']],
  ['Ein Flugzeug fliegt hoch über das Haus.', 'Was fliegt über das Haus?', '✈️', ['🚁', '🎈', '🦅']],
  ['Kim hat Durst. Sie trinkt ein Glas Milch.', 'Was trinkt Kim?', '🥛', ['🧃', '☕', '🍵']],
  // Nachtlauf 22.10.2026: mehr Texte
  ['Der Frosch sitzt auf einem Stein. Er quakt laut.', 'Wer quakt?', '🐸', ['🦆', '🐶', '🐱']],
  ['Das Pferd steht im Stall. Es frisst Heu.', 'Wer frisst Heu?', '🐴', ['🐶', '🐷', '🐔']],
  ['Finn hat kalte Hände. Er zieht Handschuhe an.', 'Was zieht Finn an?', '🧤', ['🧦', '🧢', '👟']],
  ['Mama kauft Brot beim Bäcker.', 'Was kauft Mama?', '🍞', ['🧀', '🍎', '🥛']],
  ['Die Katze spielt mit einem Wollknäuel.', 'Womit spielt die Katze?', '🧶', ['⚽', '🧸', '🪀']],
  ['Leo putzt sich die Zähne. Dann geht er ins Bett.', 'Wohin geht Leo?', '🛏️', ['🛁', '🚪', '🏫']],
  ['Am Abend leuchten die Sterne.', 'Was leuchtet am Abend?', '⭐', ['☀️', '🌈', '☁️']],
  ['Ella wirft den Ball. Der Hund holt ihn.', 'Was wirft Ella?', '🎾', ['🦴', '🧸', '🥏']],
];
function miniTask(r: Rng, s: Stage): Gen {
  const [t, q, ok, wrong] = pick(r, MINI);
  return {
    key: q,
    prompt: `${t}\n**${q}**`,
    speak: s === 1 ? `${t} ${q}` : q,
    answer: { ...choice(r, ok, s === 1 ? wrong.slice(0, 2) : wrong), big: true },
    tags: ['mini-text'],
    solution: [`Im Text steht: ${t}`, `Antwort: ${ok}`],
  };
}

// ---------- V oder F (Kl. 2) ----------

const VF: [string, string, string][] = [
  ['Vogel', 'V', '🐦'], ['Vater', 'V', '👨'], ['vier', 'v', '4️⃣'], ['viel', 'v', '➕'], ['Veilchen', 'V', '🌸'], ['verlieren', 'v', '😢'], ['Vorhang', 'V', '🎭'], // nicht Vase/Vulkan/Vampir: dort spricht man „w“
  ['verstecken', 'v', '🙈'], ['vergessen', 'v', '🤔'], ['vorlesen', 'v', '📖'], ['voll', 'v', '🥛'], ['Vorsicht', 'V', '⚠️'],
  ['Feuer', 'F', '🔥'], ['Fuß', 'F', '🦶'], ['Fee', 'F', '🧚'], ['Flasche', 'F', '🍾'], ['Ferien', 'F', '🏖️'], ['finden', 'f', '🔎'],
  ['Fisch', 'F', '🐟'], ['Fuchs', 'F', '🦊'], ['Feder', 'F', '🪶'], ['Fahrrad', 'F', '🚲'], ['fünf', 'f', '5️⃣'], ['Frosch', 'F', '🐸'], ['Fenster', 'F', '🪟'], ['fliegen', 'f', '✈️'],
];
function vfTask(r: Rng, s: Stage): Gen {
  const [w, l, e] = pick(r, VF);
  const isV = l.toLowerCase() === 'v';
  const up = w[0] === w[0].toUpperCase();
  const opts = up ? ['V', 'F'] : ['v', 'f'];
  if (s === 3 && chance(r, 0.5)) {
    return { key: `t-${w}`, prompt: 'Hör gut zu und schreibe das Wort.', speak: w, listen: { text: w, lang: 'de' }, visual: { kind: 'emoji', chars: e }, answer: { type: 'text', value: w, dictation: true, caseSensitive: true }, tags: [isV ? 'merkwort-v' : 'f'], solution: [`So schreibt man es: ${w}`, isV ? `„${w}“ ist ein Merkwort mit V – man hört f, schreibt aber v.` : `„${w}“ schreibt man mit F.`] };
  }
  return {
    key: `c-${w}`,
    prompt: `Welcher Buchstabe fehlt?\n_${w.slice(1)}`,
    speak: `Welcher Buchstabe fehlt bei ${w}? V oder F?`,
    visual: { kind: 'emoji', chars: e },
    answer: { ...choice(r, w[0], opts.filter((x) => x !== w[0])), big: true },
    tags: [isV ? 'merkwort-v' : 'f'],
    solution: [`Richtig: ${w}`, isV ? 'Das ist ein Merkwort mit V: Vogel, Vater, vier, viel, von, vor, ver-. Man hört f, schreibt aber v.' : 'Die meisten Wörter mit f-Laut schreibt man mit F. Nur Merkwörter haben ein V.'],
  };
}

// ---------- Brüche bei Größen (Kl. 4) ----------

const FRAC: { f: string; val: number; text: string }[] = [
  { f: '½', val: 0.5, text: 'ein halb' }, { f: '¼', val: 0.25, text: 'ein Viertel' }, { f: '¾', val: 0.75, text: 'drei Viertel' },
];
const FRAC_UNITS: { big: string; small: string; per: number; name: string }[] = [
  { big: 'kg', small: 'g', per: 1000, name: 'Kilogramm' }, { big: 'l', small: 'ml', per: 1000, name: 'Liter' }, { big: 'h', small: 'min', per: 60, name: 'Stunde' },
  { big: 'km', small: 'm', per: 1000, name: 'Kilometer' }, { big: 'm', small: 'cm', per: 100, name: 'Meter' }, { big: '€', small: 'ct', per: 100, name: 'Euro' },
];
const SMALL_SPOKEN: Record<string, string> = { g: 'Gramm', ml: 'Milliliter', min: 'Minuten', m: 'Meter', cm: 'Zentimeter', ct: 'Cent' };
const TIME_WORDS: [string, number, string][] = [
  ['eine Viertelstunde', 15, '¼ Stunde = 60 min : 4 = 15 min'],
  ['eine halbe Stunde', 30, '½ Stunde = 60 min : 2 = 30 min'],
  ['eine Dreiviertelstunde', 45, '¾ Stunde = 3 · 15 min = 45 min'],
  ['anderthalb Stunden', 90, 'anderthalb = 1 und ½: 60 min + 30 min = 90 min'],
];
function fracTask(r: Rng, s: Stage): Gen {
  const v0 = s === 1 ? 0 : ri(r, 0, 3);
  // Zeitwörter aus dem Alltag
  if (v0 === 2) {
    const [w, min, why] = pick(r, s === 2 ? TIME_WORDS.slice(0, 3) : TIME_WORDS);
    return { key: `t-${min}`, prompt: `Wie viele Minuten sind ${w}?`, answer: { type: 'number', value: min, unit: 'min' }, tags: [min === 30 || min === 90 ? 'halb' : 'viertel'], solution: ['1 Stunde = 60 min', why] };
  }
  // Rückrichtung: kleine Einheit → Bruch der großen Einheit
  if (v0 === 3) {
    const u = pick(r, FRAC_UNITS.filter((x) => x.big !== '€'));
    const fr = pick(r, FRAC);
    const part = Math.round(fr.val * u.per);
    return {
      key: `r-${part}${u.small}`,
      prompt: `${part} ${u.small} = ☐ ${u.big}`,
      answer: { ...fixedChoice(['¼', '½', '¾', '1'], fr.f), big: true },
      tags: [fr.f === '½' ? 'halb' : 'viertel'],
      solution: [`1 ${u.big} = ${u.per} ${u.small}`, `Halb: ${u.per / 2} ${u.small}, ein Viertel: ${u.per / 4} ${u.small}, drei Viertel: ${(3 * u.per) / 4} ${u.small}`, `${part} ${u.small} = ${fr.f} ${u.big}`],
    };
  }
  const u = pick(r, FRAC_UNITS);
  // beim Geld nur „halbe Euro“ – ¼ € oder ¾ € sagt niemand
  const fr = s === 1 || u.big === '€' ? FRAC[0] : pick(r, FRAC);
  const whole = s === 3 && chance(r, 0.5) ? ri(r, 1, 3) : 0;
  const v = Math.round((whole + fr.val) * u.per);
  const label = `${whole || ''}${fr.f} ${u.big}`;
  const part = Math.round(fr.val * u.per);
  return {
    key: `${label}-${u.small}`,
    prompt: `${label} = ☐ ${u.small}`,
    speak: `${whole ? `${whole} und ` : ''}${fr.text} ${u.name} sind wie viel ${SMALL_SPOKEN[u.small] ?? u.small}?`,
    answer: { type: 'number', value: v, unit: u.small },
    tags: [fr.f === '½' ? 'halb' : 'viertel'],
    traps: [{ answer: String(Math.round(fr.val * 100)), tag: 'prozent-gedacht', hint: `1 ${u.big} sind ${u.per} ${u.small} – davon brauchst du ${fr.text}.` }],
    solution: [`1 ${u.big} = ${u.per} ${u.small}`, fr.f === '½' ? `Die Hälfte von ${u.per} ist ${part}.` : fr.f === '¼' ? `Ein Viertel: ${u.per} : 4 = ${part}` : `Ein Viertel: ${u.per} : 4 = ${u.per / 4}, drei Viertel: 3 · ${u.per / 4} = ${part}`, ...(whole ? [`Dazu ${whole} ${u.big} = ${whole * u.per} ${u.small}`, `Zusammen: ${v} ${u.small}`] : [])],
  };
}

// ---------- Selbstlaute (Kl. 1) ----------

const VOKALE = 'aeiou';
const VOK_W: [string, string][] = [
  ['Hut', '🎩'], ['Ente', '🦆'], ['Igel', '🦔'], ['Sofa', '🛋️'], ['Tomate', '🍅'], ['Banane', '🍌'], ['Salat', '🥗'], ['Rose', '🌹'], ['Nase', '👃'],
  ['Kamel', '🐫'], ['Tiger', '🐯'], ['Ufo', '🛸'], ['Oma', '👵'], ['Apfel', '🍎'], ['Hose', '👖'], ['Lama', '🦙'], ['Kino', '🎬'], ['Gabel', '🍴'], ['Rakete', '🚀'], ['Melone', '🍉'],
];
const KONS = 'bdfghklmnprstwz';
function vokalTask(r: Rng, s: Stage): Gen {
  if (s === 1 || chance(r, 0.4)) {
    const v = pick(r, [...VOKALE]);
    const up = chance(r, 0.5);
    const cons = pickN(r, [...KONS], s === 1 ? 2 : 3);
    const f = (x: string) => (up ? x.toUpperCase() : x);
    return {
      key: `v-${v}-${cons.join('')}-${up}`,
      prompt: 'Welcher Buchstabe ist ein Selbstlaut?',
      speak: 'Welcher Buchstabe ist ein Selbstlaut?',
      answer: { ...choice(r, f(v), cons.map(f)), big: true },
      tags: ['erkennen'],
      solution: [`${f(v)} ist ein Selbstlaut.`, 'Die Selbstlaute heißen: a, e, i, o, u. Alle anderen Buchstaben sind Mitlaute.'],
      solutionVisual: { kind: 'text', text: 'A E I O U' },
    };
  }
  const [w, e] = pick(r, VOK_W);
  const n = [...w.toLowerCase()].filter((c) => VOKALE.includes(c)).length;
  const marks: [number, number][] = [...w.toLowerCase()].flatMap((c, i) => (VOKALE.includes(c) ? [[i, i + 1] as [number, number]] : []));
  return {
    key: `z-${w}`,
    prompt: `Wie viele Selbstlaute hat das Wort?\n${w}`,
    speak: `Wie viele Selbstlaute hat das Wort ${w}?`,
    visual: { kind: 'emoji', chars: e },
    answer: { type: 'number', value: n },
    tags: ['zaehlen'],
    traps: [{ answer: String(w.length - n), tag: 'mitlaute-gezaehlt', hint: 'Du hast die Mitlaute gezählt. Selbstlaute sind nur a, e, i, o, u.' }],
    solution: [`In „${w}“ stecken ${n} Selbstlaute: ${[...w].filter((c) => VOKALE.includes(c.toLowerCase())).join(', ')}.`, 'Selbstlaute: a, e, i, o, u'],
    solutionVisual: { kind: 'word', word: w, mark: marks },
  };
}

// ---------- Nominalisierung: groß oder klein? (Kl. 4) ----------

// [Satz mit ☐, Wort klein, groß?, Signalwort]
const NOMI: [string, string, boolean, string][] = [
  ['Beim ☐ habe ich mir das Knie gestoßen.', 'laufen', true, 'beim'], ['Wir gehen heute ☐.', 'schwimmen', false, ''], ['Das ☐ macht mir großen Spaß.', 'lesen', true, 'das'],
  ['Zum ☐ brauche ich einen Stift.', 'schreiben', true, 'zum'], ['Ich will heute Abend ☐.', 'malen', false, ''], ['Ich wünsche dir viel ☐!', 'gutes', true, 'viel'],
  ['Im Zoo haben wir etwas ☐ gesehen.', 'lustiges', true, 'etwas'], ['Der Film war sehr ☐.', 'lustig', false, ''], ['Vom vielen ☐ bin ich müde.', 'rennen', true, 'vom'],
  ['Heute gibt es nichts ☐ im Fernsehen.', 'spannendes', true, 'nichts'], ['Mama kann sehr gut ☐.', 'kochen', false, ''], ['Alles ☐ zum Geburtstag!', 'gute', true, 'alles'],
  ['Beim ☐ muss man leise sein.', 'lernen', true, 'beim'], ['Das Wasser ist sehr ☐.', 'kalt', false, ''], ['Lisa hilft beim ☐ der Wäsche.', 'aufhängen', true, 'beim'],
  ['Wir hören dem ☐ der Vögel zu.', 'singen', true, 'dem'], ['Tim kann schon gut ☐.', 'rechnen', false, ''], ['Ich habe etwas ☐ für dich.', 'schönes', true, 'etwas'],
  // Nachtlauf 22.10.2026: mehr Sätze
  ['Nach dem ☐ putze ich mir die Zähne.', 'essen', true, 'dem'], ['Wir wollen heute ☐.', 'basteln', false, ''], ['Zum ☐ gehe ich in den Garten.', 'spielen', true, 'zum'],
  ['Im Urlaub haben wir viel ☐ erlebt.', 'schönes', true, 'viel'], ['Die Suppe ist noch zu ☐.', 'heiß', false, ''], ['Das ☐ fällt mir noch schwer.', 'rechnen', true, 'das'],
  ['Beim ☐ der Zähne summe ich ein Lied.', 'putzen', true, 'beim'], ['Hast du etwas ☐ gehört?', 'neues', true, 'etwas'], ['Der Hund ist sehr ☐.', 'schnell', false, ''],
  ['Vom ☐ tun mir die Arme weh.', 'tragen', true, 'vom'], ['Morgen wollen wir zusammen ☐.', 'backen', false, ''], ['Im Wald gibt es nichts ☐.', 'gefährliches', true, 'nichts'],
  ['Mein Bruder kann laut ☐.', 'pfeifen', false, ''],
];
const cap = (w: string) => w[0].toUpperCase() + w.slice(1);
function nomiTask(r: Rng, s: Stage): Gen {
  const [satz, w, gross, signal] = pick(r, NOMI);
  const ok = gross ? cap(w) : w;
  const full = satz.replace('☐', ok);
  const why = gross ? `Vor „${ok}“ steht das Signalwort „${signal}“. Damit wird das Wort zum Nomen – also groß.` : `„${w}“ ist hier kein Nomen – kein Signalwort davor. Also klein.`;
  if (s === 3 && chance(r, 0.5)) {
    return { key: `t-${satz}`, prompt: `Schreibe das Wort richtig in die Lücke:\n${satz.replace('☐', `☐ (${w})`)}`, speak: satz.replace('☐', w), answer: { type: 'text', value: ok, caseSensitive: true }, tags: [gross ? 'gross' : 'klein'], solution: [full, why] };
  }
  return { key: `c-${satz}`, prompt: `Groß oder klein?\n${satz}`, speak: satz.replace('☐', w), answer: { ...choice(r, ok, [gross ? w : cap(w)]), big: true }, tags: [gross ? 'gross' : 'klein'], traps: [{ answer: gross ? w : cap(w), tag: gross ? 'signalwort-uebersehen' : 'zu-gross', hint: gross ? `Achte auf das Signalwort „${signal}“ vor dem Wort.` : 'Ohne Signalwort (das, beim, zum, viel, etwas …) bleibt das Verb oder Adjektiv klein.' }], solution: [full, why] };
}

// ---------- Orts- und Zeitangaben (Kl. 4) ----------

type Adv = 'zeit' | 'wo' | 'wohin';
const ADV: { s: string; mark: string; was: Adv }[] = [
  { s: '**Am Morgen** fährt Lea mit dem Bus.', mark: 'Am Morgen', was: 'zeit' }, { s: 'Die Katze schläft **auf dem Sofa**.', mark: 'auf dem Sofa', was: 'wo' },
  { s: '**Im Sommer** fahren wir ans Meer.', mark: 'Im Sommer', was: 'zeit' }, { s: 'Im Sommer fahren wir **ans Meer**.', mark: 'ans Meer', was: 'wohin' },
  { s: 'Tim spielt **nach der Schule** Fußball.', mark: 'nach der Schule', was: 'zeit' }, { s: 'Tim spielt nach der Schule **im Park**.', mark: 'im Park', was: 'wo' },
  { s: '**Gestern** hat es geregnet.', mark: 'Gestern', was: 'zeit' }, { s: 'Oma wohnt **in Köln**.', mark: 'in Köln', was: 'wo' },
  { s: 'Wir treffen uns **um drei Uhr** vor dem Kino.', mark: 'um drei Uhr', was: 'zeit' }, { s: 'Wir treffen uns um drei Uhr **vor dem Kino**.', mark: 'vor dem Kino', was: 'wo' },
  { s: '**Unter dem Bett** liegt eine Socke.', mark: 'Unter dem Bett', was: 'wo' }, { s: 'Der Zug kommt **in zehn Minuten**.', mark: 'in zehn Minuten', was: 'zeit' },
  { s: '**Jeden Montag** haben wir Sport.', mark: 'Jeden Montag', was: 'zeit' }, { s: 'Die Kinder spielen **auf dem Schulhof**.', mark: 'auf dem Schulhof', was: 'wo' },
  { s: 'Papa kocht **in der Küche**.', mark: 'in der Küche', was: 'wo' }, { s: '**Am Wochenende** besuchen wir Opa.', mark: 'Am Wochenende', was: 'zeit' },
  { s: 'Lisa geht morgens **in die Schule**.', mark: 'in die Schule', was: 'wohin' }, { s: 'Der Ball fliegt **über den Zaun**.', mark: 'über den Zaun', was: 'wohin' },
  { s: 'Nach dem Essen legt Mama das Buch **auf den Tisch**.', mark: 'auf den Tisch', was: 'wohin' }, { s: '**Nach dem Essen** legt Mama das Buch auf den Tisch.', mark: 'Nach dem Essen', was: 'zeit' },
  // Nachtlauf 22.10.2026: mehr Sätze
  { s: '**Im Winter** bauen wir einen Schneemann.', mark: 'Im Winter', was: 'zeit' }, { s: 'Der Vogel sitzt **auf dem Dach**.', mark: 'auf dem Dach', was: 'wo' },
  { s: 'Der Hund rennt **in den Garten**.', mark: 'in den Garten', was: 'wohin' }, { s: '**Heute Abend** gehen wir ins Kino.', mark: 'Heute Abend', was: 'zeit' },
  { s: 'Heute Abend gehen wir **ins Kino**.', mark: 'ins Kino', was: 'wohin' }, { s: 'Mein Fahrrad steht **neben der Garage**.', mark: 'neben der Garage', was: 'wo' },
  { s: '**Vor dem Frühstück** putzt Ben die Zähne.', mark: 'Vor dem Frühstück', was: 'zeit' }, { s: 'Die Kinder klettern **auf den Baum**.', mark: 'auf den Baum', was: 'wohin' },
  { s: 'Oma liest **jeden Abend** ein Buch.', mark: 'jeden Abend', was: 'zeit' }, { s: 'Die Fische schwimmen **im Teich**.', mark: 'im Teich', was: 'wo' },
  { s: 'Lea stellt die Blumen **ans Fenster**.', mark: 'ans Fenster', was: 'wohin' },
];
const ADV_NAME = { zeit: 'Zeitangabe (Wann?)', ort: 'Ortsangabe (Wo? Wohin?)' };
function advTask(r: Rng, s: Stage): Gen {
  const a = pick(r, ADV);
  const plain = a.s.replace(/\*\*/g, '');
  const ort = a.was !== 'zeit';
  const why = ort ? a.was === 'wo' ? 'Die Angabe sagt, wo etwas passiert – das ist eine Ortsangabe.' : 'Die Angabe sagt, wohin sich etwas bewegt – das ist eine Ortsangabe.' : 'Die Angabe sagt, wann etwas passiert – das ist eine Zeitangabe.';
  // Stufe 3: die passende Frage finden (auch Wo und Wohin unterscheiden)
  if (s === 3 && chance(r, 0.5)) {
    const ok = a.was === 'zeit' ? 'Wann?' : a.was === 'wo' ? 'Wo?' : 'Wohin?';
    return {
      key: `q-${a.s}`,
      prompt: `Mit welcher Frage findest du die markierte Angabe?\n${a.s}`,
      speak: `Mit welcher Frage findest du „${a.mark}“? ${plain}`,
      answer: { ...choice(r, ok, ['Wann?', 'Wo?', 'Wohin?', 'Wer?'].filter((x) => x !== ok)), big: true },
      tags: [ort ? 'ortsangabe' : 'zeitangabe'],
      traps: a.was === 'wohin' ? [{ answer: 'Wo?', tag: 'wo-wohin', hint: 'Hier bewegt sich etwas irgendwohin – dann fragst du „Wohin?“.' }] : a.was === 'wo' ? [{ answer: 'Wohin?', tag: 'wo-wohin', hint: 'Hier ist etwas an einem Ort, es bewegt sich nicht dorthin – dann fragst du „Wo?“.' }] : [],
      solution: [`Frage: ${ok} → ${a.mark}`, why],
    };
  }
  const right = ort ? ADV_NAME.ort : ADV_NAME.zeit;
  return {
    key: a.s,
    prompt: `Was für eine Angabe ist markiert?\n${a.s}`,
    speak: `Was für eine Angabe ist „${a.mark}“? ${plain}`,
    answer: choice(r, right, [ort ? ADV_NAME.zeit : ADV_NAME.ort, ...(s > 1 ? ['Subjekt (Wer oder was?)'] : [])]),
    tags: [ort ? 'ortsangabe' : 'zeitangabe'],
    solution: [`Frage: ${ort ? (a.was === 'wo' ? 'Wo?' : 'Wohin?') : 'Wann?'} → ${a.mark}`, why],
  };
}

// ---------- Buchstaben nachspuren (Kl. 1) ----------

// [großer Buchstabe, Anlautwort, Bild]
const SPUR: [string, string, string][] = [
  ['A', 'Affe', '🐒'], ['B', 'Ball', '⚽'], ['D', 'Dino', '🦕'], ['E', 'Ente', '🦆'], ['F', 'Fisch', '🐟'], ['G', 'Gabel', '🍴'], ['H', 'Hund', '🐶'],
  ['I', 'Igel', '🦔'], ['J', 'Jacke', '🧥'], ['K', 'Katze', '🐱'], ['L', 'Löwe', '🦁'], ['M', 'Maus', '🐭'], ['N', 'Nase', '👃'], ['O', 'Ohr', '👂'],
  ['P', 'Pilz', '🍄'], ['R', 'Rad', '🚲'], ['S', 'Sonne', '☀️'], ['T', 'Tomate', '🍅'], ['U', 'Uhr', '⌚'], ['W', 'Wal', '🐳'], ['Z', 'Zebra', '🦓'],
];
function spurTask(r: Rng, s: Stage): Gen {
  const [L, w, e] = pick(r, SPUR);
  // Stufe 1 große, Stufe 2 kleine Buchstaben, Stufe 3 gemischt
  const small = s === 2 || (s === 3 && chance(r, 0.6));
  const letter = small ? L.toLowerCase() : L;
  return {
    key: letter,
    prompt: `Spure das ${letter} nach – ${letter} wie ${w} ${e}`,
    speak: `Spure das ${small ? 'kleine' : 'große'} ${L} nach. ${L} wie ${w}.`,
    answer: { type: 'trace', value: letter },
    tags: [small ? 'klein' : 'gross'],
    solution: ['Fang am grünen Punkt an.', `Fahre mit dem Finger auf dem grauen ${letter} entlang, bis der ganze Buchstabe bunt ist – ohne daneben zu malen.`, `${letter} wie ${w} ${e}`],
  };
}

export const DEUTSCH_EXTRA3: Skill[] = [
  D(3, 'd3-ig-ich', '-ig oder -ich?', '👑', { text: ['Am Wortende klingen -ig und -ich fast gleich: König, Teppich.', 'Verlängere das Wort: die Könige (g!), die Teppiche (ch!). Bei Adjektiven: ein lustiger Clown.', 'Merke: Die Endung -lich schreibt man immer mit ch: freundlich, fröhlich.'], visual: { kind: 'word', word: 'König → Könige', mark: [[3, 5], [12, 13]] }, videoQuery: 'ig oder ich Rechtschreibung verlängern Grundschule' }, igichTask, { tagLabels: { ig: 'Wörter mit -ig', ich: 'Wörter mit -ich / -lich', 'ig-ich-verwechselt': 'ig und ich verwechselt' }, testSeconds: 15 }),
  D(1, 'd1-lautposition', 'Wo hörst du den Laut?', '👂', { text: ['Sprich das Wort ganz langsam und dehne es: Mmmaus.', 'Hörst du den Laut gleich zuerst? Dann ist er am Anfang. Ganz zum Schluss? Dann am Ende.', 'Dazwischen ist die Mitte: La-mm-pe.'], visual: { kind: 'word', word: 'Maus · Lampe · Baum', mark: [[0, 1], [9, 10], [18, 19]] }, videoQuery: 'Anlaut Inlaut Auslaut hören Klasse 1' }, lautposTask, { tagLabels: { anfang: 'Laut am Anfang', mitte: 'Laut in der Mitte', ende: 'Laut am Ende' }, testSeconds: 20 }),
  D(4, 'd4-wortarten', 'Wortarten: auch Pronomen und Präpositionen', '🏷️', { text: ['Nomen (Hund), Verben (schläft) und Adjektive (klein) kennst du schon.', 'Artikel begleiten Nomen: der, die, ein. Pronomen stehen für ein Nomen: er, sie, wir.', 'Präpositionen zeigen, wo oder wann etwas ist: unter, auf, nach.'], visual: { kind: 'text', text: 'Der kleine Hund schläft unter dem Tisch.\nArtikel · Adjektiv · Nomen · Verb · Präposition · Artikel · Nomen' }, videoQuery: 'Wortarten Pronomen Präposition Grundschule Klasse 4' }, wortart4Task, { tagLabels: { 'wa-n': 'Nomen', 'wa-v': 'Verben', 'wa-a': 'Adjektive', 'wa-art': 'Artikel', 'wa-p': 'Pronomen', 'wa-pr': 'Präpositionen' }, testSeconds: 20 }),
  D(2, 'd2-sp-st', 'Sp und St am Wortanfang', '🕷️', { text: ['Am Wortanfang hört man oft „schp“ oder „scht“: Spinne, Stern.', 'Geschrieben wird aber nur Sp oder St – ohne ch!', 'Sprich langsam und denk dran: Hört man schp → schreib Sp. Hört man scht → schreib St.'], visual: { kind: 'word', word: 'Spinne · Stern', mark: [[0, 2], [9, 11]] }, videoQuery: 'Wörter mit Sp und St Grundschule Klasse 2' }, spstTask, { tagLabels: { sp: 'Wörter mit Sp', st: 'Wörter mit St', 'sch-geschrieben': 'sch geschrieben statt S' }, testSeconds: 15 }),
  D(2, 'd2-ei-ie', 'ei oder ie?', '🐝', { text: ['ei klingt wie „ai“: Eis, Bein, Schwein.', 'ie ist ein langes i: Biene, Brief, Wiese.', 'Achtung, die beiden sehen sich ähnlich: Beine 🦵 – Biene 🐝!'], visual: { kind: 'word', word: 'Beine · Biene', mark: [[1, 3], [9, 11]] }, videoQuery: 'ei oder ie Grundschule Rechtschreibung' }, eiieTask, { tagLabels: { ei: 'Wörter mit ei', ie: 'Wörter mit ie', 'ei-ie-vertauscht': 'ei und ie vertauscht' }, testSeconds: 15 }),
  D(1, 'd1-nachspuren', 'Buchstaben nachspuren', '🖍️', { text: ['Jeder Buchstabe hat eine feste Form – und eine Richtung, in die man ihn schreibt.', 'Fang oben am grünen Punkt an und fahre den grauen Buchstaben mit dem Finger nach.', 'Sprich dabei leise mit: A wie Affe!'], visual: { kind: 'word', word: 'A a' }, videoQuery: 'Buchstaben schreiben lernen Druckschrift Klasse 1' }, spurTask, { tagLabels: { gross: 'große Buchstaben', klein: 'kleine Buchstaben' }, testSeconds: 40 }),
  D(1, 'd1-selbstlaute', 'Selbstlaute: a, e, i, o, u', '🅰️', { text: ['Die Selbstlaute heißen a, e, i, o, u. Man nennt sie auch Vokale.', 'Alle anderen Buchstaben sind Mitlaute (Konsonanten): b, d, f, g …', 'In fast jeder Silbe steckt ein Selbstlaut: Ba – na – ne.'], visual: { kind: 'text', text: 'A E I O U' }, videoQuery: 'Selbstlaute Vokale Klasse 1 Grundschule' }, vokalTask, { tagLabels: { erkennen: 'Selbstlaute erkennen', zaehlen: 'Selbstlaute zählen', 'mitlaute-gezaehlt': 'Mitlaute statt Selbstlaute gezählt' }, testSeconds: 15 }),
  D(1, 'd1-minitexte', 'Mini-Texte lesen', '📄', { text: ['Lies den kurzen Text in Ruhe – Wort für Wort.', 'Lies dann die Frage. Die Antwort steht im Text.', 'Tippe auf das Bild, das passt.'], visual: { kind: 'text', text: 'Tim hat einen Ball. Der Ball ist rot.' }, videoQuery: 'Lesen lernen Klasse 1 kurze Texte verstehen' }, miniTask, { tagLabels: { 'mini-text': 'kurze Texte verstehen' }, testSeconds: 25 }),
  D(2, 'd2-v-f', 'V oder F?', '🐦', { text: ['Den f-Laut schreibt man meistens mit F: Fisch, Fuchs, fünf.', 'Merkwörter mit V: Vogel, Vater, vier, viel, von, vor – und alle Wörter mit ver- und vor-.', 'Diese Wörter musst du dir merken – man hört f, schreibt aber v.'], visual: { kind: 'text', text: 'Vogel · Vater · vier · viel' }, videoQuery: 'Wörter mit V Merkwörter Grundschule Klasse 2' }, vfTask, { tagLabels: { 'merkwort-v': 'Merkwörter mit V', f: 'Wörter mit F' }, testSeconds: 15 }),
  D(4, 'd4-orts-zeitangaben', 'Orts- und Zeitangaben', '🕰️', { text: ['Zeitangaben sagen, wann etwas passiert. Frage: Wann? – „Am Morgen“, „gestern“, „um drei Uhr“.', 'Ortsangaben sagen, wo oder wohin etwas passiert. Frage: Wo? – „im Park“. Wohin? – „ans Meer“.', 'Wo oder wohin? Bewegt sich etwas zu einem Ort hin, fragst du „Wohin?“.'], visual: { kind: 'text', text: 'Am Morgen (Wann?) fährt Lea in die Schule (Wohin?).' }, videoQuery: 'Zeitangaben Ortsangaben adverbiale Bestimmung Klasse 4' }, advTask, { tagLabels: { zeitangabe: 'Zeitangaben (Wann?)', ortsangabe: 'Ortsangaben (Wo? Wohin?)', 'wo-wohin': 'Wo und Wohin verwechselt' }, testSeconds: 20 }),
  D(4, 'd4-nominalisierung', 'Verben und Adjektive werden Nomen', '🔠', { text: ['Verben und Adjektive können zu Nomen werden – dann schreibt man sie groß.', 'Signalwörter zeigen es an: das, beim, zum, vom, im (das Lesen, beim Schwimmen) – und viel, etwas, nichts, alles (etwas Schönes, viel Gutes).', 'Ohne Signalwort bleiben sie klein: Wir gehen schwimmen. Der Film ist lustig.'], visual: { kind: 'text', text: 'beim Schwimmen · etwas Schönes' }, videoQuery: 'Nominalisierung Verben Adjektive großschreiben Klasse 4' }, nomiTask, { tagLabels: { gross: 'Großschreibung mit Signalwort', klein: 'Kleinschreibung ohne Signalwort', 'signalwort-uebersehen': 'Signalwort übersehen', 'zu-gross': 'zu viel großgeschrieben' }, testSeconds: 20 }),
  D(3, 'd3-woerterbuch', 'Im Wörterbuch nachschlagen', '📖', { text: ['Im Wörterbuch stehen die Wörter nach dem ABC geordnet.', 'Ist der erste Buchstabe gleich, schaust du auf den zweiten – dann auf den dritten.', 'Wörter stehen in der Grundform: Verben wie „laufen“ (nicht „lief“), Nomen in der Einzahl („Baum“, nicht „Bäume“), Adjektive ungesteigert („groß“, nicht „größer“).'], visual: { kind: 'text', text: 'lief → laufen · Bäume → Baum' }, videoQuery: 'im Wörterbuch nachschlagen Grundform Klasse 3' }, woerterbuchTask, { tagLabels: { abc: 'nach dem ABC ordnen', 'grundform-verb': 'Grundform von Verben', 'grundform-nomen': 'Einzahl von Nomen', 'grundform-adjektiv': 'Grundstufe von Adjektiven', 'nicht-grundform': 'nicht in der Grundform gesucht' }, testSeconds: 20 }),
];
