// Weitere Themen (Nachtlauf 21./22.10.2026, Teil 3) nach Abgleich mit dem NRW-Lehrplan:
// Lagebeziehungen (Kl. 1), Zahlenstrahl bis 100 (Kl. 2) und bis 1000 (Kl. 3), Im Wörterbuch nachschlagen (Kl. 3).
import { chance, choice, pick, pickN, ri, shuffle, type Rng } from '../engine/rng';
import type { Skill, Stage } from '../engine/types';
import { NAMES, columnAdd, columnSub, skill, type Gen } from './helpers';
import { VT, wordTask, type W } from './extra';

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
      { answer: String(n + minor), tag: 'verzaehlt', hint: `Zähle die Striche noch einmal genau – jeder kleine Strich ist ${minor} weiter.` },
      { answer: String(n - minor), tag: 'verzaehlt', hint: `Zähle die Striche noch einmal genau – jeder kleine Strich ist ${minor} weiter.` },
      ...(big ? [{ answer: String(lab + k), tag: 'strich-wert', hint: `Ein kleiner Strich ist hier nicht 1, sondern ${minor}.` }] : []),
    ],
    solution: [`Jeder kleine Strich ist ${minor} weiter.`, `Von ${lab} aus ${k === 1 ? 'ist es 1 Strich' : `sind es ${k} Striche`}: ${lab} + ${k * minor} = ${n}`],
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
    prompt: `Welche Zahl liegt am Zahlenstrahl genau in der Mitte zwischen ${a} und ${b}?`,
    answer: { type: 'number', value: m },
    tags: ['mitte'],
    traps: [{ answer: String(b - a), tag: 'abstand-statt-mitte', hint: `${b - a} ist der Abstand. Die Mitte ist die Hälfte davon weiter: ${a} + ${half}.` }],
    solution: [`Von ${a} bis ${b} sind es ${b - a}.`, `Die Hälfte davon ist ${half}.`, `${a} + ${half} = ${m}`],
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
  return wordTask(r, FESTE, s);
}

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

export const MATHE_EXTRA3: Skill[] = [
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
  ['Vogel', 'V', '🐦'], ['Vater', 'V', '👨'], ['vier', 'v', '4️⃣'], ['viel', 'v', '➕'], ['Vase', 'V', '🏺'], ['Vulkan', 'V', '🌋'], ['Vampir', 'V', '🧛'],
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
function fracTask(r: Rng, s: Stage): Gen {
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

export const DEUTSCH_EXTRA3: Skill[] = [
  D(1, 'd1-selbstlaute', 'Selbstlaute: a, e, i, o, u', '🅰️', { text: ['Die Selbstlaute heißen a, e, i, o, u. Man nennt sie auch Vokale.', 'Alle anderen Buchstaben sind Mitlaute (Konsonanten): b, d, f, g …', 'In fast jeder Silbe steckt ein Selbstlaut: Ba – na – ne.'], visual: { kind: 'text', text: 'A E I O U' }, videoQuery: 'Selbstlaute Vokale Klasse 1 Grundschule' }, vokalTask, { tagLabels: { erkennen: 'Selbstlaute erkennen', zaehlen: 'Selbstlaute zählen', 'mitlaute-gezaehlt': 'Mitlaute statt Selbstlaute gezählt' }, testSeconds: 15 }),
  D(1, 'd1-minitexte', 'Mini-Texte lesen', '📄', { text: ['Lies den kurzen Text in Ruhe – Wort für Wort.', 'Lies dann die Frage. Die Antwort steht im Text.', 'Tippe auf das Bild, das passt.'], visual: { kind: 'text', text: 'Tim hat einen Ball. Der Ball ist rot.' }, videoQuery: 'Lesen lernen Klasse 1 kurze Texte verstehen' }, miniTask, { tagLabels: { 'mini-text': 'kurze Texte verstehen' }, testSeconds: 25 }),
  D(2, 'd2-v-f', 'V oder F?', '🐦', { text: ['Den f-Laut schreibt man meistens mit F: Fisch, Fuchs, fünf.', 'Merkwörter mit V: Vogel, Vater, vier, viel, von, vor – und alle Wörter mit ver- und vor-.', 'Diese Wörter musst du dir merken – man hört f, schreibt aber v.'], visual: { kind: 'text', text: 'Vogel · Vater · vier · viel' }, videoQuery: 'Wörter mit V Merkwörter Grundschule Klasse 2' }, vfTask, { tagLabels: { 'merkwort-v': 'Merkwörter mit V', f: 'Wörter mit F' }, testSeconds: 15 }),
  D(4, 'd4-orts-zeitangaben', 'Orts- und Zeitangaben', '🕰️', { text: ['Zeitangaben sagen, wann etwas passiert. Frage: Wann? – „Am Morgen“, „gestern“, „um drei Uhr“.', 'Ortsangaben sagen, wo oder wohin etwas passiert. Frage: Wo? – „im Park“. Wohin? – „ans Meer“.', 'Wo oder wohin? Bewegt sich etwas zu einem Ort hin, fragst du „Wohin?“.'], visual: { kind: 'text', text: 'Am Morgen (Wann?) fährt Lea in die Schule (Wohin?).' }, videoQuery: 'Zeitangaben Ortsangaben adverbiale Bestimmung Klasse 4' }, advTask, { tagLabels: { zeitangabe: 'Zeitangaben (Wann?)', ortsangabe: 'Ortsangaben (Wo? Wohin?)', 'wo-wohin': 'Wo und Wohin verwechselt' }, testSeconds: 20 }),
  D(4, 'd4-nominalisierung', 'Verben und Adjektive werden Nomen', '🔠', { text: ['Verben und Adjektive können zu Nomen werden – dann schreibt man sie groß.', 'Signalwörter zeigen es an: das, beim, zum, vom, im (das Lesen, beim Schwimmen) – und viel, etwas, nichts, alles (etwas Schönes, viel Gutes).', 'Ohne Signalwort bleiben sie klein: Wir gehen schwimmen. Der Film ist lustig.'], visual: { kind: 'text', text: 'beim Schwimmen · etwas Schönes' }, videoQuery: 'Nominalisierung Verben Adjektive großschreiben Klasse 4' }, nomiTask, { tagLabels: { gross: 'Großschreibung mit Signalwort', klein: 'Kleinschreibung ohne Signalwort', 'signalwort-uebersehen': 'Signalwort übersehen', 'zu-gross': 'zu viel großgeschrieben' }, testSeconds: 20 }),
  D(3, 'd3-woerterbuch', 'Im Wörterbuch nachschlagen', '📖', { text: ['Im Wörterbuch stehen die Wörter nach dem ABC geordnet.', 'Ist der erste Buchstabe gleich, schaust du auf den zweiten – dann auf den dritten.', 'Wörter stehen in der Grundform: Verben wie „laufen“ (nicht „lief“), Nomen in der Einzahl („Baum“, nicht „Bäume“), Adjektive ungesteigert („groß“, nicht „größer“).'], visual: { kind: 'text', text: 'lief → laufen · Bäume → Baum' }, videoQuery: 'im Wörterbuch nachschlagen Grundform Klasse 3' }, woerterbuchTask, { tagLabels: { abc: 'nach dem ABC ordnen', 'grundform-verb': 'Grundform von Verben', 'grundform-nomen': 'Einzahl von Nomen', 'grundform-adjektiv': 'Grundstufe von Adjektiven', 'nicht-grundform': 'nicht in der Grundform gesucht' }, testSeconds: 20 }),
];
