// Weitere Themen (Nachtlauf 21./22.10.2026, Teil 3) nach Abgleich mit dem NRW-Lehrplan:
// Lagebeziehungen (Kl. 1), Zahlenstrahl bis 100 (Kl. 2) und bis 1000 (Kl. 3), Im Wörterbuch nachschlagen (Kl. 3).
import { chance, choice, pick, pickN, ri, shuffle, type Rng } from '../engine/rng';
import type { Skill, Stage } from '../engine/types';
import { skill, type Gen } from './helpers';
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
  const half = ri(r, 1, Math.min(4, (maxUnits * unit - a) / unit / 2)) * unit;
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
  if (s > 1 && chance(r, 0.25)) return mitteTask(r, chance(r, 0.5) ? 100 : 50, chance(r, 0.5) ? 10 : 20);
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

export const ENGLISCH_EXTRA3: Skill[] = [
  E(1, 'e1-festivals', 'Festivals – Feste im Jahr', '🎃', { text: ['Halloween: pumpkin (Kürbis), witch (Hexe), ghost (Gespenst). Kinder rufen „Trick or treat!“', 'Christmas: Christmas tree, present (Geschenk), candle (Kerze). Man wünscht „Merry Christmas!“', 'Easter: Easter egg, Easter bunny. „Happy Easter!“'], visual: { kind: 'emoji', chars: '🎃🎄🐰' }, videoQuery: 'Halloween Christmas Easter vocabulary for kids English' }, festTask, { tagLabels: { ...VT, wünsche: 'Wünsche zu Festen' }, testSeconds: 15 }),
  E(2, 'e2-shopping', 'Shopping – Einkaufen', '🛒', { text: ['Can I have an apple, please? = Kann ich bitte einen Apfel haben?', 'How much is it? – It’s two euros fifty. (2,50 €)', 'Achtung beim Hören: thirteen (13) – thirty (30), fifteen (15) – fifty (50).', 'Here you are. = Bitte schön (beim Geben). Thank you! = Danke!'], visual: { kind: 'emoji', chars: '🛒🍎💶' }, videoQuery: 'shopping dialogue English for kids how much is it' }, shopTask, { tagLabels: { preise: 'Preise verstehen', dialog: 'Einkaufsgespräch', 'teen-ty': '-teen und -ty verwechselt', 'a-an': 'a oder an' }, testSeconds: 20 }),
];

export const MATHE_EXTRA3: Skill[] = [
  M(1, 'm1-lage', 'Links, rechts, oben, unten', '↔️', { text: ['Links und rechts: Strecke beide Hände aus und spreize die Daumen ab – die linke Hand zeigt ein „L“.', 'Über heißt: weiter oben. Unter heißt: weiter unten.', 'Zwischen heißt: Auf beiden Seiten liegt etwas.'], visual: { kind: 'grid', rows: [['🍎', '⚽', '🚗']], mark: [0, 1] }, videoQuery: 'links rechts oben unten Lagebeziehungen Klasse 1' }, lageTask, { tagLabels: { 'links-rechts': 'links und rechts', 'oben-unten': 'oben und unten', zwischen: 'zwischen', 'links-rechts-vertauscht': 'links und rechts verwechselt', 'oben-unten-vertauscht': 'über und unter verwechselt' }, testSeconds: 15 }),
  M(2, 'm2-zahlenstrahl', 'Zahlenstrahl bis 100', '📏', { text: ['Am Zahlenstrahl stehen die Zahlen der Reihe nach – links die kleinen, rechts die großen.', 'Suche die nächste beschriftete Zahl links vom Punkt und zähle die kleinen Striche weiter.', 'Achtung: Schau zuerst, wie viel ein kleiner Strich wert ist – 1, 2 oder 5?'], visual: { kind: 'numberline', from: 30, to: 50, start: 37, jumps: [], step: 10, minor: 1, ask: true }, videoQuery: 'Zahlenstrahl bis 100 Klasse 2 erklärt' }, strahl100, { tagLabels: { ablesen: 'Zahlen ablesen', mitte: 'Mitte finden', verzaehlt: 'Striche verzählt', 'strich-wert': 'Strich-Wert nicht beachtet', 'abstand-statt-mitte': 'Abstand statt Mitte' }, testSeconds: 25 }),
  M(3, 'm3-zahlenstrahl', 'Zahlenstrahl bis 1000', '📐', { text: ['Am Zahlenstrahl bis 1000 ist ein kleiner Strich oft 10 oder 50 wert.', 'Schau dir zuerst zwei beschriftete Zahlen an: Wie viele Striche liegen dazwischen? So findest du den Wert eines Strichs.', 'Dann zählst du von der nächsten beschrifteten Zahl weiter.'], visual: { kind: 'numberline', from: 300, to: 400, start: 370, jumps: [], step: 50, minor: 10, ask: true }, videoQuery: 'Zahlenstrahl bis 1000 Klasse 3' }, strahl1000, { tagLabels: { ablesen: 'Zahlen ablesen', mitte: 'Mitte finden', verzaehlt: 'Striche verzählt', 'strich-wert': 'Strich-Wert nicht beachtet', 'abstand-statt-mitte': 'Abstand statt Mitte' }, testSeconds: 25 }),
];

export const DEUTSCH_EXTRA3: Skill[] = [
  D(3, 'd3-woerterbuch', 'Im Wörterbuch nachschlagen', '📖', { text: ['Im Wörterbuch stehen die Wörter nach dem ABC geordnet.', 'Ist der erste Buchstabe gleich, schaust du auf den zweiten – dann auf den dritten.', 'Wörter stehen in der Grundform: Verben wie „laufen“ (nicht „lief“), Nomen in der Einzahl („Baum“, nicht „Bäume“), Adjektive ungesteigert („groß“, nicht „größer“).'], visual: { kind: 'text', text: 'lief → laufen · Bäume → Baum' }, videoQuery: 'im Wörterbuch nachschlagen Grundform Klasse 3' }, woerterbuchTask, { tagLabels: { abc: 'nach dem ABC ordnen', 'grundform-verb': 'Grundform von Verben', 'grundform-nomen': 'Einzahl von Nomen', 'grundform-adjektiv': 'Grundstufe von Adjektiven', 'nicht-grundform': 'nicht in der Grundform gesucht' }, testSeconds: 20 }),
];
