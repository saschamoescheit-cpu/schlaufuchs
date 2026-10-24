// Weitere Themen (Nachtlauf 21./22.10.2026): Zahlenmauern, Zahlenfolgen, Symmetrie, Kalender, Diagramme,
// Sätze lesen, Silbentrennung, Lesen Kl. 2, Pronomen, Verben beugen, Wortbausteine, Lesen Kl. 3/4,
// Toys, Hobbies, Hörverstehen mit Sätzen, Fragen und Antworten.
import { chance, choice, fixedChoice, pick, pickN, ri, shuffle, type Rng } from '../engine/rng';
import type { Skill, Stage } from '../engine/types';
import { skill, type Gen } from './helpers';
import { registerWords, withWord } from './words';

const M = (grade: 1 | 2 | 3 | 4, ...a: Parameters<typeof skill> extends [unknown, unknown, ...infer R] ? R : never) => skill('mathe', grade, ...a);
const D = (grade: 1 | 2 | 3 | 4, ...a: Parameters<typeof skill> extends [unknown, unknown, ...infer R] ? R : never) => skill('deutsch', grade, ...a);
const E = (year: 1 | 2, ...a: Parameters<typeof skill> extends [unknown, unknown, ...infer R] ? R : never) => skill('englisch', year === 1 ? 3 : 4, ...a);

// ---------- Mathe ----------

/** Zahlenmauer: jeder Stein ist die Summe der beiden Steine darunter */
function wallTask(r: Rng, s: Stage): Gen {
  const max = s === 1 ? 6 : s === 2 ? 20 : 40;
  const base = [ri(r, 1, max), ri(r, 1, max), ri(r, 1, max)];
  const mid = [base[0] + base[1], base[1] + base[2]];
  const top = mid[0] + mid[1];
  const rows: (number | null)[][] = [[...base], [...mid], [top]];
  // Stufe 1: oben fehlt (nur plus), Stufe 2: Mitte fehlt, Stufe 3: unten fehlt (minus rechnen)
  const where = s === 1 ? [2, 0] : s === 2 ? pick(r, [[1, 0], [1, 1], [2, 0]]) : pick(r, [[0, 0], [0, 2], [0, 1]]);
  const value = rows[where[0]][where[1]] as number;
  if (where[0] === 0 && where[1] === 1) {
    // mittlerer unterer Stein: Mitte links bekannt und unten links bekannt
    rows[0][1] = null;
  } else rows[where[0]][where[1]] = null;
  const sol =
    where[0] === 2
      ? [`Oben steht die Summe der beiden Steine darunter: ${mid[0]} + ${mid[1]} = ${top}`]
      : where[0] === 1
        ? [`Rechne die beiden Steine darunter zusammen: ${base[where[1]]} + ${base[where[1] + 1]} = ${value}`]
        : where[1] === 0
          ? [`Der Stein darüber ist ${mid[0]}. Daneben unten steht ${base[1]}.`, `${mid[0]} − ${base[1]} = ${value}`]
          : where[1] === 2
            ? [`Der Stein darüber ist ${mid[1]}. Daneben unten steht ${base[1]}.`, `${mid[1]} − ${base[1]} = ${value}`]
            : [`Der Stein links darüber ist ${mid[0]}, links unten steht ${base[0]}.`, `${mid[0]} − ${base[0]} = ${value}`];
  return { key: JSON.stringify(rows), prompt: 'Welche Zahl gehört in den Stein mit dem Fragezeichen?', visual: { kind: 'wall', rows }, answer: { type: 'number', value }, tags: [where[0] === 0 ? 'unten' : where[0] === 1 ? 'mitte' : 'oben'], solution: [...sol, 'Merke: Zwei Steine nebeneinander ergeben zusammen den Stein darüber.'], solutionVisual: { kind: 'wall', rows: [base, mid, [top]] } };
}

function seqTask(r: Rng, s: Stage): Gen {
  const kind = s === 1 ? pick(r, ['plus', 'minus']) : s === 2 ? pick(r, ['plus', 'minus', 'mal']) : pick(r, ['wechsel', 'mal', 'wachsend']);
  let seq: number[];
  let rule: string;
  if (kind === 'plus') {
    const d = s === 1 ? pick(r, [1, 2, 5, 10]) : pick(r, [3, 4, 6, 9, 11, 15]);
    // Zahlenraum Klasse 2: die letzte Zahl bleibt höchstens 100
    const a = ri(r, 0, Math.min(s === 1 ? 20 : 60, 100 - 5 * d));
    seq = Array.from({ length: 6 }, (_, i) => a + i * d);
    rule = `Immer + ${d}`;
  } else if (kind === 'minus') {
    const d = s === 1 ? pick(r, [1, 2, 5, 10]) : pick(r, [3, 4, 6, 9, 11]);
    const a = ri(r, 6 * d, Math.min(6 * d + (s === 1 ? 20 : 60), 100));
    seq = Array.from({ length: 6 }, (_, i) => a - i * d);
    rule = `Immer − ${d}`;
  } else if (kind === 'mal') {
    // verdoppeln bis höchstens 96 – oder rückwärts halbieren (96, 48, 24 …)
    const a = ri(r, 1, 3);
    const up = Array.from({ length: 6 }, (_, i) => a * 2 ** i);
    const half = chance(r, 0.4);
    seq = half ? up.reverse() : up;
    rule = half ? 'Immer : 2 (halbieren)' : 'Immer · 2 (verdoppeln)';
  } else if (kind === 'wechsel') {
    const [x, y] = pickN(r, [2, 3, 4, 5, 10], 2);
    const a = ri(r, 1, 30);
    seq = [a];
    for (let i = 1; i < 6; i++) seq.push(seq[i - 1] + (i % 2 ? x : y));
    rule = `Abwechselnd + ${x} und + ${y}`;
  } else {
    const a = ri(r, 1, 10);
    seq = [a];
    for (let i = 1; i < 6; i++) seq.push(seq[i - 1] + i);
    rule = 'Der Abstand wird immer um 1 größer: +1, +2, +3, +4 …';
  }
  const shown = seq.slice(0, 5);
  return { key: shown.join(','), prompt: `Wie geht es weiter?\n${shown.join(', ')}, ☐`, speak: `Wie geht es weiter? ${shown.join(', ')}, und dann?`, answer: { type: 'number', value: seq[5] }, tags: [kind], solution: [`Schau dir an, wie sich die Zahlen verändern.`, `Regel: ${rule}`, `Die nächste Zahl ist ${seq[5]}.`] };
}

const SYM: [string, boolean][] = [['A', true], ['H', true], ['M', true], ['O', true], ['T', true], ['U', true], ['V', true], ['W', true], ['X', true], ['Y', true], ['I', true], ['B', false], ['F', false], ['G', false], ['J', false], ['L', false], ['N', false], ['P', false], ['R', false], ['S', false], ['Z', false], ['K', false]];
const SYM_OBJ: [string, string, boolean][] = [['🦋', 'Schmetterling', true], ['❤️', 'Herz', true], ['⭐', 'Stern', true], ['🏠', 'Haus', false], ['🍎', 'Apfel', false], ['🌙', 'Mond (Sichel)', false], ['☂️', 'Schirm', false], ['🔺', 'Dreieck', true]];

function symTask(r: Rng, s: Stage): Gen {
  if (s === 3 || chance(r, 0.4)) {
    const options = shuffle(r, [pick(r, SYM.filter((x) => x[1])), ...pickN(r, SYM.filter((x) => !x[1]), s === 3 ? 3 : 2)]);
    const right = options.find((x) => x[1])![0];
    return { key: `w-${options.map((x) => x[0]).join('')}`, prompt: 'Welcher Buchstabe ist achsensymmetrisch?\n(Spiegelachse senkrecht in der Mitte)', answer: { ...choice(r, right, options.map((x) => x[0])), big: true }, tags: ['buchstaben'], solution: [`${right} sieht links und rechts von der Mittellinie gleich aus.`, 'Trick: Halte einen Spiegel an die Mitte – ist das Bild wieder ganz, ist es symmetrisch.'], solutionVisual: { kind: 'text', text: right } };
  }
  if (s === 1 || chance(r, 0.3)) {
    const [e, name, sym] = pick(r, SYM_OBJ);
    return { key: `o-${name}`, prompt: `Ist das Bild achsensymmetrisch?
(${name}, Spiegelachse senkrecht in der Mitte)`, visual: { kind: 'emoji', chars: e }, answer: fixedChoice(['ja', 'nein'], sym ? 'ja' : 'nein'), tags: [sym ? 'symmetrisch' : 'nicht-symmetrisch'], solution: [sym ? `Ja: Die linke und die rechte Hälfte sind gleich – wie gespiegelt.` : `Nein: Die beiden Hälften sehen verschieden aus.`, 'Trick: Stell dir vor, du faltest das Bild in der Mitte.'] };
  }
  const [ch, sym] = pick(r, SYM);
  return { key: `l-${ch}`, prompt: `Ist der Buchstabe ${ch} achsensymmetrisch?\n(Spiegelachse senkrecht in der Mitte)`, visual: { kind: 'text', text: ch }, answer: fixedChoice(['ja', 'nein'], sym ? 'ja' : 'nein'), tags: [sym ? 'symmetrisch' : 'nicht-symmetrisch'], solution: [sym ? `Ja: Die linke Hälfte von ${ch} ist das Spiegelbild der rechten Hälfte.` : `Nein: Spiegelst du die linke Hälfte von ${ch}, kommt nicht die rechte Hälfte heraus.`, 'Trick: Falte das Blatt in der Mitte – passen beide Hälften genau aufeinander?'] };
}

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const MDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function calTask(r: Rng, s: Stage): Gen {
  const v = s === 1 ? ri(r, 0, 1) : s === 2 ? ri(r, 0, 3) : ri(r, 2, 5);
  if (v === 0) {
    const d = ri(r, 0, 6);
    const after = chance(r, 0.5);
    const right = DAYS[(d + (after ? 1 : 6)) % 7];
    return { key: `t${d}${after}`, prompt: `Welcher Tag kommt ${after ? 'nach' : 'vor'} ${DAYS[d]}?`, answer: choice(r, right, DAYS), tags: ['wochentage'], solution: [`Die Wochentage: ${DAYS.join(', ')}.`, `${after ? 'Nach' : 'Vor'} ${DAYS[d]} kommt ${right}.`] };
  }
  if (v === 1) {
    const m = ri(r, 0, 11);
    const right = MONTHS[(m + 1) % 12];
    return { key: `m${m}`, prompt: `Welcher Monat kommt nach ${MONTHS[m]}?`, answer: choice(r, right, MONTHS), tags: ['monate'], solution: [`Die Monate: ${MONTHS.join(', ')}.`, `Nach ${MONTHS[m]} kommt ${right}.`] };
  }
  if (v === 2) {
    const d = ri(r, 0, 6);
    const n = pick(r, [2, 3, 4, 5]);
    const right = DAYS[(d + n) % 7];
    const word = n === 2 ? 'übermorgen' : `in ${['', '', '', 'drei', 'vier', 'fünf'][n]} Tagen`;
    return { key: `u${d}-${n}`, prompt: `Heute ist ${DAYS[d]}. Welcher Tag ist ${word}?`, answer: choice(r, right, DAYS), tags: ['tage-weiterzaehlen'], solution: [`Zähle weiter: ${Array.from({ length: n }, (_, i) => DAYS[(d + i + 1) % 7]).join(' → ')}`, `${word[0].toUpperCase() + word.slice(1)} ist ${right}.`] };
  }
  if (v === 3) {
    const q = pick(r, [['Wie viele Tage hat eine Woche?', 7, 'Eine Woche hat 7 Tage.'], ['Wie viele Monate hat ein Jahr?', 12, 'Ein Jahr hat 12 Monate.'], ['Wie viele Stunden hat ein Tag?', 24, 'Ein Tag hat 24 Stunden.'], ['Wie viele Tage hat ein Jahr (kein Schaltjahr)?', 365, 'Ein Jahr hat 365 Tage, ein Schaltjahr 366.']] as const);
    return { key: q[0], prompt: q[0], answer: { type: 'number', value: q[1] }, tags: ['zeiteinheiten'], solution: [q[2]] };
  }
  if (v === 4) {
    const m = pick(r, [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    return { key: `d${m}`, prompt: `Wie viele Tage hat der ${MONTHS[m]}?`, answer: fixedChoice(['28', '30', '31'], String(MDAYS[m])), tags: ['monatslaenge'], solution: [`Der ${MONTHS[m]} hat ${MDAYS[m]} Tage.`, 'Faust-Trick: Zähle die Monate an den Fingerknöcheln – Knöchel = 31 Tage, Lücke = 30 Tage (Februar 28 oder 29).'] };
  }
  const startD = ri(r, 1, 20);
  const m = ri(r, 0, 11);
  const add = pick(r, [7, 10, 14]);
  const end = startD + add;
  const ok = end <= MDAYS[m];
  const res = ok ? `${end}. ${MONTHS[m]}` : `${end - MDAYS[m]}. ${MONTHS[(m + 1) % 12]}`;
  const wrong = [`${end}. ${MONTHS[(m + 1) % 12]}`, `${startD + add - 1}. ${MONTHS[m]}`, `${startD + add + 1}. ${MONTHS[m]}`, `${(end % 30) || 1}. ${MONTHS[m]}`];
  return { key: `f${startD}-${m}-${add}`, prompt: `Lea hat am ${startD}. ${MONTHS[m]} Geburtstag. Ihr Fest feiert sie ${add} Tage später. An welchem Datum ist das Fest?`, answer: choice(r, res, wrong), tags: ['datum'], solution: [`${startD} + ${add} = ${end}`, ok ? `Der ${MONTHS[m]} hat ${MDAYS[m]} Tage – das passt noch: ${res}.` : `Der ${MONTHS[m]} hat nur ${MDAYS[m]} Tage. ${end} − ${MDAYS[m]} = ${end - MDAYS[m]} → ${res}.`] };
}

const CHARTS = [
  { title: 'Lieblingstiere der Klasse 3b', unit: 'Kinder', items: [['Hund', '🐶'], ['Katze', '🐱'], ['Pferd', '🐴'], ['Hase', '🐰']] },
  { title: 'Gelesene Bücher im Monat', unit: 'Bücher', items: [['Mia', '👧'], ['Ben', '👦'], ['Ali', '🧒'], ['Lea', '👧']] },
  { title: 'Lieblingsobst', unit: 'Kinder', items: [['Apfel', '🍎'], ['Banane', '🍌'], ['Erdbeere', '🍓'], ['Kirsche', '🍒'], ['Birne', '🍐']] },
  { title: 'Sonnenstunden', unit: 'Stunden', items: [['Mo', ''], ['Di', ''], ['Mi', ''], ['Do', ''], ['Fr', '']] },
];
function chartTask(r: Rng, s: Stage): Gen {
  const c = pick(r, CHARTS);
  const n = s === 1 ? 3 : c.items.length;
  const its = c.items.slice(0, n).map(([label, emoji]) => ({ label, emoji, value: ri(r, 1, s === 3 ? 12 : 9) }));
  // eindeutiges Maximum
  const maxV = Math.max(...its.map((i) => i.value));
  if (its.filter((i) => i.value === maxV).length > 1) its[0].value = maxV + 1;
  const v = s === 1 ? ri(r, 0, 1) : s === 2 ? ri(r, 0, 2) : ri(r, 2, 3);
  const vis = { kind: 'bars' as const, title: c.title, items: its, unit: c.unit };
  if (v === 0) {
    const it = pick(r, its);
    return { key: `${c.title}-${it.label}-${it.value}`, prompt: `Wie viele ${c.unit} sind es bei „${it.label}“?`, visual: vis, answer: { type: 'number', value: it.value }, tags: ['ablesen'], solution: [`Schau, wie hoch die Säule bei „${it.label}“ ist: Sie geht bis ${it.value}.`] };
  }
  if (v === 1) {
    const best = its.find((i) => i.value === Math.max(...its.map((x) => x.value)))!;
    return { key: `${c.title}-max-${its.map((i) => i.value).join()}`, prompt: `Welche Säule ist am höchsten?`, visual: vis, answer: choice(r, best.label, its.map((i) => i.label)), tags: ['vergleichen'], solution: [`Die höchste Säule hat „${best.label}“ mit ${best.value}.`] };
  }
  if (v === 2) {
    // zwei Säulen mit verschiedener Höhe – „0 mehr“ wäre eine Fangfrage
    const [a, b] = pickN(r, its, 2);
    if (a.value === b.value) b.value = a.value > 1 ? a.value - 1 : a.value + 1;
    const [hi, lo] = a.value >= b.value ? [a, b] : [b, a];
    return { key: `${c.title}-d-${a.label}-${b.label}-${its.map((i) => i.value).join()}`, prompt: `Wie viele ${c.unit} mehr sind es bei „${hi.label}“ als bei „${lo.label}“?`, visual: vis, answer: { type: 'number', value: hi.value - lo.value }, tags: ['unterschied'], solution: [`${hi.label}: ${hi.value}, ${lo.label}: ${lo.value}`, `${hi.value} − ${lo.value} = ${hi.value - lo.value}`] };
  }
  const sum = its.reduce((x, i) => x + i.value, 0);
  return { key: `${c.title}-s-${its.map((i) => i.value).join()}`, prompt: `Wie viele ${c.unit} sind es zusammen?`, visual: vis, answer: { type: 'number', value: sum }, tags: ['summe'], solution: [`Lies jede Säule ab und rechne zusammen:`, `${its.map((i) => i.value).join(' + ')} = ${sum}`] };
}

export const MATHE_EXTRA: Skill[] = [
  M(2, 'm2-zahlenmauer', 'Zahlenmauern', '🧱', { text: ['In einer Zahlenmauer ergeben zwei Steine nebeneinander zusammen den Stein darüber.', 'Fehlt oben ein Stein: Plus rechnen (3 + 5 = 8).', 'Fehlt unten ein Stein: Minus rechnen. Oben 8, daneben 3 → 8 − 3 = 5.'], visual: { kind: 'wall', rows: [[3, 5, 2], [8, 7], [15]] }, videoQuery: 'Zahlenmauern Grundschule erklärt' }, wallTask, { tagLabels: { unten: 'fehlender Stein unten (minus)', mitte: 'Stein in der Mitte', oben: 'Stein oben' }, testSeconds: 30 }),
  M(2, 'm2-zahlenfolgen', 'Zahlenfolgen und Muster', '🔁', { text: ['Bei einer Zahlenfolge gibt es eine Regel.', 'Schau dir an, wie es von einer Zahl zur nächsten geht: 3, 5, 7, 9 – immer + 2.', 'Manchmal wechseln sich zwei Regeln ab, manchmal wird der Abstand größer.'], visual: { kind: 'text', text: '3, 5, 7, 9, ☐' }, videoQuery: 'Zahlenfolgen Regeln erkennen Grundschule' }, seqTask, { tagLabels: { plus: 'Folgen mit plus', minus: 'Folgen mit minus', mal: 'Folgen mit mal', wechsel: 'wechselnde Regeln', wachsend: 'wachsender Abstand' }, testSeconds: 30 }),
  M(2, 'm2-symmetrie', 'Symmetrie', '🦋', { text: ['Eine Figur ist achsensymmetrisch, wenn sie an einer Linie gespiegelt genau gleich aussieht.', 'Wie ein Schmetterling: Der linke Flügel ist das Spiegelbild des rechten.', 'Trick: Falte das Bild an der Achse – passen beide Hälften genau aufeinander?'], visual: { kind: 'emoji', chars: '🦋' }, videoQuery: 'Achsensymmetrie Grundschule erklärt' }, symTask, { tagLabels: { symmetrisch: 'symmetrische Figuren', 'nicht-symmetrisch': 'nicht symmetrische Figuren', buchstaben: 'symmetrische Buchstaben finden' }, testSeconds: 20 }),
  M(2, 'm2-kalender', 'Kalender, Tage und Monate', '📅', { text: ['Eine Woche hat 7 Tage: Montag, Dienstag, Mittwoch, Donnerstag, Freitag, Samstag, Sonntag.', 'Ein Jahr hat 12 Monate: Januar bis Dezember.', 'Die Monate haben 30 oder 31 Tage, der Februar 28 (im Schaltjahr 29).', 'Übermorgen ist der Tag nach morgen.'], visual: { kind: 'text', text: 'Mo Di Mi Do Fr Sa So' }, videoQuery: 'Kalender Wochentage Monate Grundschule' }, calTask, { tagLabels: { wochentage: 'Wochentage', monate: 'Monate', 'tage-weiterzaehlen': 'Tage weiterzählen', zeiteinheiten: 'Tage, Wochen, Monate', monatslaenge: 'Tage im Monat', datum: 'Datum rechnen' }, testSeconds: 25 }),
  M(3, 'm3-diagramme', 'Diagramme lesen', '📊', { text: ['In einem Säulendiagramm zeigt die Höhe der Säule, wie viele es sind.', 'Lies die Zahl links an der Skala ab – genau auf der Höhe, wo die Säule aufhört.', 'Vergleichen: Die höchste Säule ist am meisten. Den Unterschied rechnest du mit Minus.'], visual: { kind: 'bars', title: 'Lieblingstiere', items: [{ label: 'Hund', value: 6, emoji: '🐶' }, { label: 'Katze', value: 4, emoji: '🐱' }, { label: 'Hase', value: 2, emoji: '🐰' }], unit: 'Kinder' }, videoQuery: 'Säulendiagramm lesen Grundschule' }, chartTask, { tagLabels: { ablesen: 'Werte ablesen', vergleichen: 'vergleichen', unterschied: 'Unterschied berechnen', summe: 'zusammenzählen' }, testSeconds: 30 }),
];

// ---------- Deutsch ----------

const SATZBILD: [string, string, string[]][] = [
  ['🐶💤', 'Der Hund schläft.', ['Der Hund bellt.', 'Die Katze schläft.', 'Der Hund rennt.']],
  ['🐱🥛', 'Die Katze trinkt Milch.', ['Die Katze frisst Fisch.', 'Der Hund trinkt Milch.', 'Die Kuh gibt Milch.']],
  ['👧📖', 'Das Mädchen liest ein Buch.', ['Das Mädchen malt ein Bild.', 'Der Junge liest ein Buch.', 'Das Mädchen schläft.']],
  ['👦⚽', 'Der Junge spielt Fußball.', ['Der Junge spielt Klavier.', 'Das Mädchen spielt Fußball.', 'Der Junge isst ein Eis.']],
  ['🐟🌊', 'Der Fisch schwimmt im Wasser.', ['Der Vogel fliegt am Himmel.', 'Der Fisch liegt im Sand.', 'Die Ente schwimmt im Teich.']],
  ['🐦🌳', 'Der Vogel sitzt im Baum.', ['Der Vogel sitzt im Nest.', 'Die Katze sitzt im Baum.', 'Der Vogel fliegt weg.']],
  ['☀️🏖️', 'Die Sonne scheint am Strand.', ['Es regnet am Strand.', 'Die Sonne scheint im Wald.', 'Der Mond scheint am Strand.']],
  ['🍎🧺', 'Die Äpfel liegen im Korb.', ['Die Birnen liegen im Korb.', 'Die Äpfel hängen am Baum.', 'Der Korb ist leer.']],
  ['🚌🏫', 'Der Bus fährt zur Schule.', ['Das Auto fährt zur Schule.', 'Der Bus fährt nach Hause.', 'Der Zug fährt zur Schule.']],
  ['👵🎂', 'Oma hat einen Kuchen.', ['Oma hat ein Buch.', 'Opa hat einen Kuchen.', 'Oma hat ein Brot.']],
  ['🐰🥕', 'Der Hase frisst eine Möhre.', ['Der Hase frisst einen Apfel.', 'Das Pferd frisst eine Möhre.', 'Der Hase schläft.']],
  ['👧🚲', 'Das Mädchen fährt Fahrrad.', ['Das Mädchen fährt Auto.', 'Der Junge fährt Fahrrad.', 'Das Mädchen schwimmt.']],
  ['🌧️☂️', 'Es regnet.', ['Die Sonne scheint.', 'Es schneit.', 'Der Wind weht.']],
  ['⛄❄️', 'Es schneit.', ['Es regnet.', 'Die Sonne scheint.', 'Es ist heiß.']],
  ['🐸🍃', 'Der Frosch sitzt auf einem Blatt.', ['Der Frosch sitzt auf einem Stein.', 'Die Ente sitzt auf einem Blatt.', 'Der Frosch schläft im Bett.']],
  ['🐝🌻', 'Die Biene fliegt zur Blume.', ['Der Vogel fliegt zur Blume.', 'Die Biene fliegt zum Baum.', 'Die Biene schläft.']],
  ['👶🍼', 'Das Baby trinkt aus der Flasche.', ['Das Baby isst ein Brot.', 'Die Katze trinkt aus der Flasche.', 'Das Baby spielt Ball.']],
  ['🦒🌳', 'Die Giraffe frisst Blätter vom Baum.', ['Der Elefant frisst Blätter vom Baum.', 'Die Giraffe trinkt Wasser.', 'Die Giraffe schläft.']],
  ['🐄🌾', 'Die Kuh steht auf der Wiese.', ['Das Schaf steht auf der Wiese.', 'Die Kuh liegt im Stall.', 'Die Kuh schwimmt im See.']],
  // Nachtlauf 22.10.2026: mehr Bilder
  ['🐶🦴', 'Der Hund hat einen Knochen.', ['Der Hund hat einen Ball.', 'Die Katze hat einen Knochen.', 'Der Hund frisst Gras.']],
  ['👦🍦', 'Der Junge isst ein Eis.', ['Der Junge isst eine Banane.', 'Das Mädchen isst ein Eis.', 'Der Junge trinkt Saft.']],
  ['🐔🥚', 'Das Huhn legt ein Ei.', ['Das Huhn frisst Körner.', 'Die Ente legt ein Ei.', 'Das Huhn schläft.']],
  ['🧒🎨', 'Das Kind malt ein Bild.', ['Das Kind liest ein Buch.', 'Das Kind singt ein Lied.', 'Die Oma malt ein Bild.']],
  ['🐒🍌', 'Der Affe isst eine Banane.', ['Der Affe isst einen Apfel.', 'Der Bär isst eine Banane.', 'Der Affe schläft.']],
  ['🐭🧀', 'Die Maus frisst Käse.', ['Die Maus frisst Brot.', 'Die Katze frisst Käse.', 'Die Maus schläft.']],
  ['🚒🔥', 'Die Feuerwehr löscht das Feuer.', ['Die Polizei löscht das Feuer.', 'Die Feuerwehr fährt nach Hause.', 'Das Feuer ist aus.']],
  ['🌙⭐', 'Am Himmel leuchten Mond und Sterne.', ['Am Himmel scheint die Sonne.', 'Am Himmel fliegt ein Vogel.', 'Es regnet in der Nacht.']],
  ['🐴🌾', 'Das Pferd frisst Heu.', ['Das Pferd trinkt Wasser.', 'Die Kuh frisst Heu.', 'Das Pferd springt.']],
  ['✈️☁️', 'Das Flugzeug fliegt über den Wolken.', ['Das Flugzeug steht am Boden.', 'Der Vogel fliegt über den Wolken.', 'Das Schiff fährt über das Meer.']],
  ['🐢🏖️', 'Die Schildkröte liegt am Strand.', ['Die Schildkröte frisst Salat.', 'Der Hund liegt am Strand.', 'Die Schildkröte schläft im Haus.']],
  ['👧🎈', 'Das Mädchen hat einen Luftballon.', ['Das Mädchen hat einen Ball.', 'Der Junge hat einen Luftballon.', 'Das Mädchen hat ein Eis.']],
  ['🦆🌊', 'Die Ente schwimmt auf dem Wasser.', ['Die Ente fliegt am Himmel.', 'Der Fisch schwimmt auf dem Wasser.', 'Die Ente schläft im Nest.']],
  ['🐌🍃', 'Die Schnecke kriecht über ein Blatt.', ['Die Schnecke kriecht über einen Stein.', 'Der Käfer kriecht über ein Blatt.', 'Die Schnecke fliegt weg.']],
  ['🧒🛁', 'Das Kind badet in der Wanne.', ['Das Kind schläft im Bett.', 'Die Katze badet in der Wanne.', 'Das Kind spielt im Garten.']],
  ['🎅🎁', 'Der Weihnachtsmann bringt Geschenke.', ['Der Osterhase bringt Geschenke.', 'Der Weihnachtsmann backt Plätzchen.', 'Der Weihnachtsmann schläft.']],
  ['🚂🌉', 'Der Zug fährt über die Brücke.', ['Das Auto fährt über die Brücke.', 'Der Zug steht im Bahnhof.', 'Das Schiff fährt unter der Brücke.']],
  ['🐱🧶', 'Die Katze spielt mit der Wolle.', ['Die Katze trinkt ihre Milch.', 'Der Hund spielt mit der Wolle.', 'Die Katze schläft im Korb.']],
  ['🐶🛁', 'Der Hund sitzt in der Wanne.', ['Die Katze sitzt in der Wanne.', 'Der Hund sitzt im Garten.', 'Der Hund frisst sein Futter.']],
  ['🧒🪁', 'Das Kind lässt einen Drachen steigen.', ['Das Kind wirft einen großen Ball.', 'Opa lässt einen Drachen steigen.', 'Das Kind schläft im Bett.']],
  ['🦉🌙', 'Die Eule ist in der Nacht wach.', ['Die Eule schläft in der Nacht.', 'Der Hahn ist in der Nacht wach.', 'Die Eule frisst Körner.']],
  ['👧🍓', 'Das Mädchen isst eine Erdbeere.', ['Das Mädchen isst eine Kirsche.', 'Der Junge isst eine Erdbeere.', 'Das Mädchen pflückt Blumen.']],
  ['👨‍🍳🍳', 'Der Koch brät ein Ei.', ['Der Koch backt ein Brot.', 'Die Oma brät ein Ei.', 'Der Koch kocht Suppe.']],
  // Nachtlauf 24.10.2026: mehr Bilder
  ['🐝🌻', 'Die Biene sitzt auf der Blume.', ['Die Biene sitzt auf dem Baum.', 'Der Käfer sitzt auf der Blume.', 'Die Biene schläft im Bett.']],
  ['👦🚲', 'Der Junge fährt Fahrrad.', ['Der Junge fährt Auto.', 'Das Mädchen fährt Fahrrad.', 'Der Junge läuft weg.']],
  ['🐸🌧️', 'Der Frosch sitzt im Regen.', ['Der Frosch sitzt in der Sonne.', 'Die Ente sitzt im Regen.', 'Der Frosch schläft im Bett.']],
  ['👵📖', 'Die Oma liest ein Buch.', ['Die Oma backt einen Kuchen.', 'Der Opa liest ein Buch.', 'Die Oma liest die Zeitung.']],
  ['🐻🍯', 'Der Bär nascht Honig.', ['Der Bär frisst Fisch.', 'Die Maus nascht Honig.', 'Der Bär schläft.']],
  ['⛄❄️', 'Der Schneemann steht im Schnee.', ['Der Schneemann schmilzt in der Sonne.', 'Das Kind steht im Schnee.', 'Der Schneemann steht im Regen.']],
  ['🦁💤', 'Der Löwe schläft.', ['Der Löwe brüllt laut.', 'Der Tiger schläft.', 'Der Löwe frisst Fleisch.']],
  ['🚀🌙', 'Die Rakete fliegt zum Mond.', ['Die Rakete fliegt zur Sonne.', 'Das Flugzeug fliegt zum Mond.', 'Die Rakete steht am Boden.']],
  ['👨‍🌾🚜', 'Der Bauer fährt Traktor.', ['Der Bauer fährt Bus.', 'Der Koch fährt Traktor.', 'Der Bauer melkt die Kuh.']],
  ['🧒⚽', 'Das Kind spielt Fußball.', ['Das Kind spielt Tennis.', 'Der Hund spielt Fußball.', 'Das Kind liest ein Buch.']],
  ['🐿️🌰', 'Das Eichhörnchen hat eine Nuss.', ['Das Eichhörnchen hat einen Apfel.', 'Die Maus hat eine Nuss.', 'Das Eichhörnchen schläft.']],
];
function satzBild(r: Rng, s: Stage): Gen {
  const [e, ok, wrong] = pick(r, SATZBILD);
  return { key: ok, prompt: 'Welcher Satz passt zum Bild?', visual: { kind: 'emoji', chars: e }, answer: { ...choice(r, ok, s === 3 ? wrong : wrong.slice(0, 2)), speakOptions: 'de' }, tags: ['satz-bild'], solution: [`Richtig ist: ${ok}`, 'Lies jedes Wort genau – oft ist nur ein Wort anders.'] };
}

const TRENN: [string, string, string[]][] = [
  ['Katze', 'Kat-ze', ['Ka-tze', 'Katz-e']], ['Sonne', 'Son-ne', ['So-nne', 'Sonn-e']], ['Zucker', 'Zu-cker', ['Zuck-er', 'Zuc-ker']], ['Apfel', 'Ap-fel', ['A-pfel', 'Apf-el']],
  ['Fenster', 'Fens-ter', ['Fen-ster', 'Fenst-er']], ['Tafel', 'Ta-fel', ['Taf-el', 'T-afel']], ['Ritter', 'Rit-ter', ['Ri-tter', 'Ritt-er']], ['Tomate', 'To-ma-te', ['Tom-at-e', 'Tom-a-te']],
  ['Banane', 'Ba-na-ne', ['Ban-an-e', 'Bana-ne']], ['Schule', 'Schu-le', ['Sch-ule', 'Schul-e']], ['Wasser', 'Was-ser', ['Wa-sser', 'Wass-er']], ['Brücke', 'Brü-cke', ['Brück-e', 'Brüc-ke']],
  ['Schnecke', 'Schne-cke', ['Schneck-e', 'Schnec-ke']], ['Lehrerin', 'Leh-re-rin', ['Lehr-er-in', 'Le-hrer-in']], ['Kinder', 'Kin-der', ['Ki-nder', 'Kind-er']], ['Garten', 'Gar-ten', ['Ga-rten', 'Gart-en']],
  ['Mutter', 'Mut-ter', ['Mu-tter', 'Mutt-er']], ['Blume', 'Blu-me', ['Bl-ume', 'Blum-e']], ['Hexe', 'He-xe', ['Hex-e', 'H-exe']], ['Wolke', 'Wol-ke', ['Wo-lke', 'Wolk-e']],
  ['Kirsche', 'Kir-sche', ['Kirs-che', 'Ki-rsche']], ['Schokolade', 'Scho-ko-la-de', ['Schok-ol-ade', 'Sch-oko-la-de']], ['Rucksack', 'Ruck-sack', ['Ru-cksack', 'Rucks-ack']],
  ['Pflaster', 'Pflas-ter', ['Pfla-ster', 'Pflast-er']], ['Zimmer', 'Zim-mer', ['Zi-mmer', 'Zimm-er']], ['Jacke', 'Ja-cke', ['Jac-ke', 'Jack-e']],
  // Nachtlauf 22.10.2026: mehr Wörter
  ['Hammer', 'Ham-mer', ['Ha-mmer', 'Hamm-er']], ['Kerze', 'Ker-ze', ['Ke-rze', 'Kerz-e']], ['Pinsel', 'Pin-sel', ['Pi-nsel', 'Pins-el']], ['Lampe', 'Lam-pe', ['La-mpe', 'Lamp-e']],
  ['Butter', 'But-ter', ['Bu-tter', 'Butt-er']], ['Tasche', 'Ta-sche', ['Tas-che', 'Tasch-e']], ['Decke', 'De-cke', ['Dec-ke', 'Deck-e']], ['Fahrrad', 'Fahr-rad', ['Fah-rrad', 'Fahrr-ad']],
  ['Kissen', 'Kis-sen', ['Ki-ssen', 'Kiss-en']], ['Pirat', 'Pi-rat', ['Pir-at', 'P-irat']],
  ['Hose', 'Ho-se', ['Hos-e', 'H-ose']], ['Gabel', 'Ga-bel', ['Gab-el', 'G-abel']], ['Mantel', 'Man-tel', ['Ma-ntel', 'Mant-el']],
  ['Rakete', 'Ra-ke-te', ['Rak-et-e', 'Ra-ket-e']], ['Wecker', 'We-cker', ['Weck-er', 'Wec-ker']], ['Spinne', 'Spin-ne', ['Spi-nne', 'Spinn-e']], ['Erdbeere', 'Erd-bee-re', ['Er-dbee-re', 'Erdb-ee-re']],
  // Nachtlauf 24.10.2026: mehr Wörter
  ['Teller', 'Tel-ler', ['Te-ller', 'Tell-er']], ['Puppe', 'Pup-pe', ['Pu-ppe', 'Pupp-e']], ['Winter', 'Win-ter', ['Wi-nter', 'Wint-er']], ['Sommer', 'Som-mer', ['So-mmer', 'Somm-er']],
  ['Kuchen', 'Ku-chen', ['Kuc-hen', 'Kuch-en']], ['Flasche', 'Fla-sche', ['Flas-che', 'Flasch-e']], ['Glocke', 'Glo-cke', ['Glock-e', 'Gloc-ke']], ['Socke', 'So-cke', ['Sock-e', 'Soc-ke']],
  ['Kartoffel', 'Kar-tof-fel', ['Ka-rto-ffel', 'Kart-off-el']], ['Fußball', 'Fuß-ball', ['Fu-ßball', 'Fußb-all']], ['Schwester', 'Schwes-ter', ['Schwe-ster', 'Schwest-er']],
  ['Bagger', 'Bag-ger', ['Ba-gger', 'Bagg-er']], ['Paket', 'Pa-ket', ['Pak-et', 'P-aket']], ['Tante', 'Tan-te', ['Ta-nte', 'Tant-e']],
];
function trennTask(r: Rng): Gen {
  const [w, ok, wrong] = pick(r, TRENN);
  return { key: w, prompt: `Wie trennt man das Wort richtig?\n${w}`, speak: `Wie trennt man das Wort ${w} richtig?`, answer: choice(r, ok, wrong), tags: [w.includes('ck') ? 'ck-trennen' : 'silben'], solution: [`${ok} – sprich das Wort langsam in Silben.`, ...(w.includes('ck') ? ['Merke: ck wird nicht getrennt – es kommt ganz auf die neue Zeile: Zu-cker.'] : []), 'Einzelne Buchstaben trennt man nicht ab.'] };
}

const STORIES2 = [
  { t: 'Lina backt mit Papa Pfannkuchen. Sie verrührt Mehl, Milch und Eier. Papa brät die Pfannkuchen in der Pfanne. Lina isst ihren Pfannkuchen mit Apfelmus.', qs: [['Was backen Lina und Papa?', 'Pfannkuchen', ['Pizza', 'Kekse', 'Brot']], ['Womit isst Lina ihren Pfannkuchen?', 'mit Apfelmus', ['mit Zucker', 'mit Marmelade', 'mit Käse']], ['Wer brät die Pfannkuchen?', 'Papa', ['Lina', 'Mama', 'Oma']]] },
  { t: 'Im Herbst lässt Jonas seinen Drachen steigen. Der Wind ist stark. Der Drachen fliegt hoch über die Bäume. Plötzlich bleibt er in einem Ast hängen. Opa holt ihn mit einer Leiter herunter.', qs: [['Wann lässt Jonas den Drachen steigen?', 'im Herbst', ['im Sommer', 'im Winter', 'im Frühling']], ['Wo bleibt der Drachen hängen?', 'in einem Ast', ['an einem Dach', 'an einer Laterne', 'im Zaun']], ['Wie holt Opa den Drachen herunter?', 'mit einer Leiter', ['mit einem Seil', 'mit einem Stock', 'Er klettert hoch.']]] },
  { t: 'Ella hat eine Schildkröte. Sie heißt Turbo, ist aber sehr langsam. Turbo frisst gern Salat und Löwenzahn. Im Winter schläft sie in einer Kiste im Keller.', qs: [['Wie heißt die Schildkröte?', 'Turbo', ['Ella', 'Flitzi', 'Rennie']], ['Was frisst Turbo gern?', 'Salat und Löwenzahn', ['Nüsse und Körner', 'Kekse', 'Fleisch und Fisch']], ['Wo schläft Turbo im Winter?', 'in einer Kiste im Keller', ['im Bett von Ella', 'draußen im Garten', 'auf dem Sofa']], ['Warum ist der Name „Turbo“ lustig?', 'Weil die Schildkröte sehr langsam ist.', ['Weil sie gern Salat frisst.', 'Weil sie sehr schnell rennen kann.', 'Weil sie grün und klein ist.']]] },
  { t: 'Heute ist Sportfest. Emil läuft beim Wettlauf mit. Er ist schnell, aber Mila ist noch schneller. Emil wird Zweiter und bekommt eine Urkunde. Er ist trotzdem stolz.', qs: [['Wer gewinnt den Wettlauf?', 'Mila', ['Emil', 'Ben', 'Lea']], ['Der Wievielte wird Emil?', 'Zweiter', ['Erster', 'Dritter', 'Letzter']], ['Wie fühlt sich Emil?', 'stolz', ['wütend', 'traurig', 'müde']]] },
  { t: 'Familie Öztürk fährt ans Meer. Die Kinder bauen eine große Sandburg mit Türmen. Dann kommt eine Welle und spült die Burg weg. Alle lachen und bauen eine neue.', qs: [['Wohin fährt die Familie?', 'ans Meer', ['in die Berge', 'in den Wald', 'in die Stadt']], ['Was zerstört die Sandburg?', 'eine Welle', ['ein Hund', 'ein Ball', 'der Wind']], ['Was machen alle danach?', 'Sie bauen eine neue Burg.', ['Sie gehen traurig nach Hause.', 'Sie weinen lange.', 'Sie gehen schwimmen.']]] },
  { t: 'Tim hat einen kleinen Hund. Der Hund heißt Flocke. Flocke ist weiß und spielt gern mit einem roten Ball.', qs: [['Wie heißt der Hund?', 'Flocke', ['Tim', 'Rex', 'Bello']], ['Welche Farbe hat der Ball?', 'rot', ['blau', 'weiß', 'grün']], ['Welche Farbe hat Flocke?', 'weiß', ['braun', 'schwarz', 'rot']]] },
  { t: 'Mila geht mit Oma in den Zoo. Dort sehen sie Affen, Löwen und Giraffen. Am besten gefallen Mila die Affen.', qs: [['Mit wem geht Mila in den Zoo?', 'mit Oma', ['mit Papa', 'mit Tim', 'allein']], ['Welche Tiere gefallen Mila am besten?', 'die Affen', ['die Löwen', 'die Giraffen', 'die Pinguine']], ['Wohin geht Mila?', 'in den Zoo', ['in die Schule', 'in den Park', 'ins Kino']]] },
  { t: 'Es regnet. Ben zieht seine gelben Gummistiefel an. Dann springt er in jede Pfütze. Danach ist er ganz nass.', qs: [['Wie ist das Wetter?', 'Es regnet.', ['Die Sonne scheint.', 'Es schneit.', 'Es ist windig.']], ['Welche Farbe haben die Stiefel?', 'gelb', ['rot', 'blau', 'grün']], ['Warum ist Ben nass?', 'Er springt in Pfützen.', ['Er duscht sich.', 'Er geht schwimmen.', 'Er trinkt viel Wasser.']]] },
  // Nachtlauf 22.10.2026: mehr Texte
  { t: 'Nach dem Abendessen putzt Noah seine Zähne. Dann zieht er seinen Schlafanzug mit den Sternen an. Mama liest ihm noch eine Geschichte vor. Danach macht sie das Licht aus.', qs: [['Was macht Noah nach dem Abendessen?', 'Er putzt seine Zähne.', ['Er spielt Fußball.', 'Er macht Hausaufgaben.', 'Er badet.']], ['Was ist auf dem Schlafanzug?', 'Sterne', ['Herzen', 'Autos', 'Punkte']], ['Wer liest die Geschichte vor?', 'Mama', ['Papa', 'Oma', 'Noah']]] },
  { t: 'Lea und Ali sammeln im Wald Kastanien. Sie füllen zwei Körbe. Zu Hause basteln sie daraus Tiere mit Streichhölzern als Beinen. Lea bastelt einen Igel, Ali eine Giraffe.', qs: [['Was sammeln Lea und Ali?', 'Kastanien', ['Pilze', 'bunte Steine', 'Blätter']], ['Wie viele Körbe füllen sie?', 'zwei', ['einen', 'drei', 'vier']], ['Was bastelt Ali?', 'eine Giraffe', ['einen Igel', 'einen Hund', 'eine Schnecke']]] },
  { t: 'Am Morgen ist Papas Auto kaputt. Deshalb fahren Mila und Papa mit dem Bus. Der Bus ist sehr voll. Ein Junge steht auf, damit Mila sitzen kann. Mila sagt: „Danke!“ Sie kommen trotzdem pünktlich zur Schule.', qs: [['Warum fahren Mila und Papa mit dem Bus?', 'Das Auto ist kaputt.', ['Es regnet.', 'Der Bus ist schneller.', 'Mila fährt gern Bus.']], ['Wer macht Mila Platz?', 'ein Junge', ['ein Mädchen', 'eine Oma', 'der Busfahrer']], ['Kommen sie zu spät?', 'Nein, sie kommen pünktlich.', ['Ja, eine ganze Stunde zu spät.', 'Sie kommen gar nicht an.', 'Ja, ein kleines bisschen.']]] },
  { t: 'Finn hat einen Wackelzahn. Beim Abendessen beißt er in einen Apfel – und plötzlich ist der Zahn draußen! Finn legt ihn in eine kleine Dose unter sein Kissen. Am nächsten Morgen liegt dort eine glitzernde Münze.', qs: [['Wobei fällt der Zahn heraus?', 'beim Essen eines Apfels', ['beim Fußballspielen', 'nachts im Schlaf', 'beim Zähneputzen']], ['Wohin legt Finn den Zahn?', 'in eine Dose unter das Kissen', ['in seine Schultasche', 'in den Mülleimer in der Küche', 'auf den Tisch']], ['Was findet Finn am Morgen?', 'eine glitzernde Münze', ['einen langen Brief', 'einen neuen Zahn', 'gar nichts']]] },
  { t: 'Im Zoo füttert die Tierpflegerin die Seehunde. Sie wirft ihnen Fische zu. Die Seehunde klatschen mit den Flossen und springen ins Wasser. Die Kinder lachen. Zum Schluss darf Emma einen Fisch werfen.', qs: [['Wer füttert die Seehunde?', 'die Tierpflegerin', ['die kleine Emma', 'der Zoodirektor', 'ein großer Junge']], ['Was fressen die Seehunde?', 'Fische', ['Bananen', 'Fleisch', 'Brot']], ['Was darf Emma zum Schluss machen?', 'einen Fisch werfen', ['einen Seehund streicheln', 'ins Wasser springen', 'ein Foto machen']]] },
  { t: 'Heute ist Laternenumzug. Pia hat eine Laterne gebastelt. Sie sieht aus wie ein Mond. Am Abend gehen alle Kinder mit Musik durch die Straßen. Sie singen Lieder. Am Ende gibt es warmen Kakao für alle.', qs: [['Wie sieht Pias Laterne aus?', 'wie ein Mond', ['wie ein Stern', 'wie ein Fisch', 'wie eine Sonne']], ['Wann ist der Umzug?', 'am Abend', ['am Morgen', 'am Mittag', 'in der Nacht']], ['Was gibt es am Ende?', 'warmen Kakao', ['kalte Limonade', 'heiße Würstchen', 'kleine Kekse']]] },
  { t: 'Jan hilft Papa im Garten. Sie pflanzen kleine Tomaten. Jan gießt jeden Tag mit der grünen Gießkanne. Nach ein paar Wochen sind die Tomaten rot. Jan pflückt sie und isst gleich eine. Sie schmeckt süß.', qs: [['Was pflanzen Jan und Papa?', 'Tomaten', ['Erdbeeren', 'Gurken', 'Blumen']], ['Welche Farbe hat die Gießkanne?', 'grün', ['blau', 'gelb', 'rot']], ['Wie schmeckt die Tomate?', 'süß', ['sauer', 'salzig', 'bitter']]] },
];
const STORIES3 = [
  { t: 'Mira hat zum ersten Mal einen Hamster. Er heißt Krümel. Am Tag schläft er in seinem Häuschen, nachts läuft er in seinem Rad. Mira gibt ihm jeden Morgen frisches Wasser und Körner. Einmal ist Krümel aus dem Käfig entwischt. Die ganze Familie sucht ihn – am Ende sitzt er in Papas Hausschuh.', qs: [['Wann ist Krümel munter?', 'nachts', ['am Morgen', 'mittags', 'nie']], ['Wo findet die Familie Krümel?', 'in Papas Hausschuh', ['unter Miras Bett', 'in der Küche im Schrank', 'draußen im Garten']], ['Was gibt Mira Krümel jeden Morgen?', 'Wasser und Körner', ['Milch und Brot', 'Salat und Fleisch', 'Kekse']]] },
  { t: 'Die Klasse 3a pflanzt Sonnenblumen. Jedes Kind steckt einen Kern in einen Topf mit Erde. Die Töpfe stehen am Fenster, damit sie viel Licht bekommen. Nach einer Woche sind kleine grüne Spitzen zu sehen. Im Sommer sind manche Sonnenblumen größer als die Lehrerin!', qs: [['Warum stehen die Töpfe am Fenster?', 'damit sie viel Licht bekommen', ['damit sie nicht umfallen können', 'damit sie schön kühl bleiben', 'weil dort gerade Platz ist']], ['Wann sieht man die ersten grünen Spitzen?', 'nach einer Woche', ['nach einem Tag', 'nach einem Monat', 'im Winter']], ['Was ist im Sommer besonders?', 'Manche Blumen sind größer als die Lehrerin.', ['Alle Blumen im Topf sind verwelkt.', 'Die Kinder essen die Kerne auf.', 'Die Blumen blühen ganz blau.']]] },
  { t: 'Ben und seine Schwester Ida gehen in die Bücherei. Ben sucht ein Buch über Dinosaurier, Ida eins über Pferde. Die Bibliothekarin hilft ihnen beim Suchen. Sie dürfen die Bücher drei Wochen behalten. Zu Hause lesen beide sofort los.', qs: [['Worüber sucht Ida ein Buch?', 'über Pferde', ['über Dinosaurier', 'über Hunde', 'über den Weltraum']], ['Wie lange dürfen sie die Bücher behalten?', 'drei Wochen', ['nur einen Tag', 'eine Woche', 'ein ganzes Jahr']], ['Wer hilft beim Suchen?', 'die Bibliothekarin', ['ihre Mama', 'die Klassenlehrerin', 'ein Freund aus der Schule']]] },
  { t: 'Am Samstag findet Leo im Park ein Portemonnaie. Darin sind Geld und ein Ausweis. Leo überlegt kurz. Dann bringt er das Portemonnaie mit seiner Mutter zum Fundbüro. Zwei Tage später ruft eine Frau an und bedankt sich. Sie schenkt Leo einen Kinogutschein.', qs: [['Was findet Leo?', 'ein Portemonnaie', ['ein neues Handy', 'einen Haustürschlüssel', 'einen kleinen Hund']], ['Wohin bringt Leo den Fund?', 'zum Fundbüro', ['zur Polizei', 'nach Hause', 'in die Schule']], ['Wie handelt Leo?', 'ehrlich', ['gemein', 'faul', 'ängstlich']], ['Was bekommt Leo als Dank?', 'einen Kinogutschein', ['ein großes Eis', 'ein spannendes Buch', 'zehn Euro']]] },
  { t: 'Familie Kaya macht ein Picknick im Park. Mama hat Brötchen und Obst eingepackt. Papa bringt eine große Decke mit. Plötzlich fängt es an zu regnen. Schnell laufen alle unter einen Baum. Dort essen sie weiter und lachen.', qs: [['Was hat Papa mitgebracht?', 'eine Decke', ['Brötchen', 'Obst', 'einen Schirm']], ['Wo stellen sich alle unter?', 'unter einen Baum', ['ins Auto', 'in ein Café', 'unter eine Brücke']], ['Wie fühlt sich die Familie am Ende?', 'fröhlich', ['wütend', 'traurig', 'ängstlich']]] },
  { t: 'Lukas möchte ein Baumhaus bauen. Zuerst zeichnet er einen Plan. Dann holt er mit seinem Opa Bretter aus dem Baumarkt. Zwei Wochen lang sägen und hämmern sie. Am Ende hat das Baumhaus sogar ein kleines Fenster.', qs: [['Was macht Lukas zuerst?', 'Er zeichnet einen Plan.', ['Er kauft viele Bretter.', 'Er baut ein Fenster ein.', 'Er sägt das Holz.']], ['Wer hilft Lukas?', 'sein Opa', ['sein Papa', 'seine Schwester', 'sein Freund']], ['Wie lange bauen sie?', 'zwei Wochen', ['zwei Tage', 'einen Monat', 'eine Stunde']]] },
  // Nachtlauf 22.10.2026: mehr Texte
  { t: 'Sophie hat Angst vor dem Zahnarzt. Am Montag hat sie einen Termin. Im Wartezimmer liest sie ein Comicheft, damit sie nicht so aufgeregt ist. Der Zahnarzt ist sehr freundlich und erklärt ihr alles. Zum Glück hat Sophie kein Loch im Zahn. Zur Belohnung darf sie sich einen Aufkleber aussuchen.', qs: [['Wann hat Sophie den Termin?', 'am Montag', ['am Freitag', 'am Sonntag', 'heute']], ['Warum liest Sophie im Wartezimmer ein Comicheft?', 'damit sie nicht so aufgeregt ist', ['weil der Zahnarzt es ihr sagt', 'weil sie das Heft kaufen will', 'weil ihr sehr langweilig ist']], ['Was bekommt Sophie zur Belohnung?', 'einen Aufkleber', ['ein Eis', 'einen Luftballon', 'eine neue Zahnbürste']]] },
  { t: 'Im Frühling baut ein Amselpaar ein Nest in der Hecke vor Tims Fenster. Das Weibchen legt vier blaue Eier. Zwei Wochen lang sitzt es fast immer auf dem Nest. Dann schlüpfen die Küken. Die Eltern fliegen den ganzen Tag hin und her und bringen Würmer. Tim beobachtet alles vom Fenster aus, ganz leise.', qs: [['Wo bauen die Amseln ihr Nest?', 'in der Hecke vor Tims Fenster', ['im großen Baum im Park', 'oben auf dem Dach', 'im alten Gartenhaus']], ['Wie viele Eier legt das Weibchen?', 'vier', ['zwei', 'drei', 'fünf']], ['Warum fliegen die Eltern hin und her?', 'Sie bringen den Küken Würmer.', ['Sie spielen zusammen Fangen.', 'Sie suchen ein neues Nest.', 'Sie haben Angst vor Tim.']]] },
  { t: 'Paula und ihr Bruder Max backen Plätzchen für Weihnachten. Max knetet den Teig, Paula sticht Sterne und Herzen aus. Die Bleche kommen für zehn Minuten in den Ofen. Leider vergessen sie die Uhr – die ersten Plätzchen werden ganz dunkel. Die nächsten passen sie besser ab. Am Abend verschenken sie eine Dose an die Nachbarin.', qs: [['Welche Formen sticht Paula aus?', 'Sterne und Herzen', ['Monde und Sterne', 'Tannenbäume', 'Kreise und Herzen']], ['Warum werden die ersten Plätzchen dunkel?', 'Sie vergessen die Uhr.', ['Der Ofen ist kaputt.', 'Der Teig ist zu dick.', 'Max hat zu viel Zucker genommen.']], ['Wem schenken sie eine Dose?', 'der Nachbarin', ['der Oma', 'der Lehrerin', 'dem Postboten']]] },
  { t: 'Jan geht mit seiner Klasse ins Museum. Dort steht das Skelett eines riesigen Dinosauriers. Die Führerin erzählt, dass er vor über sechzig Millionen Jahren gelebt hat. Jan darf einen echten versteinerten Knochen anfassen. Er ist schwerer als gedacht. Auf der Rückfahrt im Bus malt Jan einen Dinosaurier in sein Heft.', qs: [['Wohin geht Jans Klasse?', 'ins Museum', ['in den Zoo', 'ins Kino', 'in den Wald']], ['Was darf Jan anfassen?', 'einen versteinerten Knochen', ['eine echte Muschel', 'einen Dinosaurier-Zahn', 'ein großes Dinosaurier-Ei']], ['Was macht Jan auf der Rückfahrt?', 'Er malt einen Dinosaurier.', ['Er schläft im Bus ein.', 'Er singt ein lustiges Lied.', 'Er liest ein Buch.']]] },
  { t: 'Am Samstagmorgen schaut Emma aus dem Fenster: Über Nacht ist der erste Schnee gefallen, der Garten ist ganz weiß. Schnell zieht sie Mütze, Schal und Handschuhe an. Zusammen mit ihrem Nachbarn Finn baut sie einen Schneemann. Als Nase bekommt er eine Karotte, als Augen zwei Steine. Am Nachmittag scheint die Sonne, und der Schneemann wird immer kleiner.', qs: [['Mit wem baut Emma den Schneemann?', 'mit ihrem Nachbarn Finn', ['mit ihrer großen Schwester', 'mit Papa und Mama', 'ganz allein']], ['Was ist die Nase des Schneemanns?', 'eine Karotte', ['ein Ast', 'ein Knopf', 'ein Stein']], ['Warum wird der Schneemann kleiner?', 'Weil die Sonne scheint.', ['Weil Finn ihn kaputt macht.', 'Weil es regnet.', 'Weil ein Hund an ihm knabbert.']]] },
  { t: 'Am Wochenende macht Familie Berger eine Radtour. Sie fahren am Fluss entlang bis zu einem kleinen See. Dort machen sie Pause und essen belegte Brötchen. Plötzlich hat Papas Fahrrad einen Platten. Zum Glück hat Mama Flickzeug dabei. Nach einer halben Stunde können alle weiterfahren.', qs: [['Wohin fahren die Bergers?', 'zu einem kleinen See', ['zu einem großen Bauernhof', 'ans Meer an die Küste', 'mitten in die Stadt']], ['Was passiert mit Papas Fahrrad?', 'Es hat einen Platten.', ['Die Kette reißt.', 'Es wird gestohlen.', 'Die Klingel ist kaputt.']], ['Warum können sie weiterfahren?', 'Mama hat Flickzeug dabei.', ['Ein Mann hilft ihnen.', 'Papa kauft ein neues Rad.', 'Sie gehen zu Fuß weiter.']]] },
  { t: 'In der Pause findet Malte einen kleinen Vogel auf dem Schulhof. Der Vogel kann nicht fliegen, weil ein Flügel verletzt ist. Malte holt sofort seine Lehrerin. Sie setzt den Vogel vorsichtig in einen Karton mit Löchern. Nach der Schule bringen sie ihn zu einer Tierärztin. Eine Woche später kann der Vogel wieder fliegen.', qs: [['Wo findet Malte den Vogel?', 'auf dem Schulhof', ['im Klassenzimmer', 'im Park', 'auf dem Dach']], ['Warum kann der Vogel nicht fliegen?', 'Ein Flügel ist verletzt.', ['Er ist viel zu müde.', 'Er ist noch zu jung.', 'Er hat großen Hunger.']], ['Wohin bringen sie den Vogel?', 'zu einer Tierärztin', ['in den Zoo', 'zu Malte nach Hause', 'in den Wald']], ['Wie geht die Geschichte aus?', 'Der Vogel kann wieder fliegen.', ['Der Vogel bleibt bei Malte.', 'Der Vogel ist verschwunden.', 'Malte bekommt einen Hund.']]] },
  { t: 'Im Oktober schnitzt Familie Yilmaz einen großen Kürbis. Zuerst schneidet Papa einen Deckel ab. Dann holen die Kinder mit einem Löffel die Kerne heraus. Mira malt ein lustiges Gesicht auf, und Papa schneidet es aus. Am Abend stellen sie eine Kerze hinein. Der Kürbis leuchtet vor der Haustür.', qs: [['Was macht Papa zuerst?', 'Er schneidet einen Deckel ab.', ['Er malt ein lustiges Gesicht.', 'Er holt die Kerne heraus.', 'Er stellt eine Kerze hinein.']], ['Womit holen die Kinder die Kerne heraus?', 'mit einem Löffel', ['mit einer Gabel', 'mit den Händen', 'mit einem Messer']], ['Wo steht der Kürbis am Abend?', 'vor der Haustür', ['auf dem Küchentisch', 'im Kinderzimmer', 'im großen Garten']]] },
  // Nachtlauf 24.10.2026: mehr Geschichten (zum Lesen und Zuhören)
  { t: 'Am Sonntag backt Lukas mit seiner Oma einen Apfelkuchen. Zuerst schälen sie fünf Äpfel und schneiden sie in kleine Stücke. Dann rühren sie den Teig. Der Kuchen muss eine Stunde im Ofen backen. Während sie warten, spielen die beiden Karten. Als der Kuchen fertig ist, riecht die ganze Wohnung nach Äpfeln.', qs: [['Was backen Lukas und Oma?', 'einen Apfelkuchen', ['einen Schokokuchen', 'Plätzchen', 'eine Pizza']], ['Wie lange muss der Kuchen backen?', 'eine Stunde', ['zehn Minuten', 'zwei Stunden', 'einen halben Tag']], ['Was machen die beiden, während sie warten?', 'Sie spielen Karten.', ['Sie gehen spazieren.', 'Sie schauen einen Film.', 'Sie lesen ein Buch.']]] },
  { t: 'Lotta wünscht sich schon lange ein Baumhaus. In den Ferien baut ihr Papa es zusammen mit ihr in der alten Eiche im Garten. Lotta darf die Bretter anmalen. Sie wählt Grün und Gelb. Am letzten Ferientag ist das Baumhaus fertig. Lotta lädt gleich ihre Freundin Nora zum Übernachten ein.', qs: [['In welchem Baum ist das Baumhaus?', 'in der alten Eiche', ['in der großen Tanne', 'im Apfelbaum', 'in der Birke am Zaun']], ['Welche Farben wählt Lotta?', 'Grün und Gelb', ['Rot und Blau', 'Rosa und Lila', 'Schwarz und Weiß']], ['Wen lädt Lotta ein?', 'ihre Freundin Nora', ['ihre Cousine Mia', 'ihren Bruder Tom', 'ihre Oma']]] },
  { t: 'Bei einem Gewitter sitzt Paul mit seinem Vater am Fenster. Erst sehen sie einen hellen Blitz, dann zählen sie langsam: eins, zwei, drei. Bei drei donnert es. Papa erklärt, dass das Gewitter noch etwa einen Kilometer entfernt ist. Paul hat keine Angst mehr, denn sie sind im Haus sicher.', qs: [['Was sehen Paul und Papa zuerst?', 'einen hellen Blitz', ['einen Regenbogen', 'eine dunkle Wolke', 'den vollen Mond']], ['Bis wohin zählen die beiden?', 'bis drei', ['bis zehn', 'bis fünf', 'bis zwanzig']], ['Warum hat Paul keine Angst mehr?', 'Sie sind im Haus sicher.', ['Das Gewitter ist schon vorbei.', 'Papa hat ihm Schokolade gegeben.', 'Der Donner ist ganz leise.']]] },
];
function readTask(r: Rng, stories: typeof STORIES2): Gen {
  const st = pick(r, stories);
  const [q, a, w] = pick(r, st.qs) as [string, string, string[]];
  return { key: `${st.t.slice(0, 24)}|${q}`, prompt: q, visual: { kind: 'text', text: st.t, title: 'Lies genau:' }, answer: choice(r, a, w), tags: [q.startsWith('Warum') || q.startsWith('Wie fühlt') ? 'schlussfolgern' : 'informationen-finden'], solution: ['Suche die Stelle im Text, die zur Frage passt.', `Antwort: ${a}`] };
}

// Zuhören (NRW „Sprechen und Zuhören“): dieselben kurzen Geschichten – nur vorgelesen, der Text erscheint erst in der Lösung
function zuhoerTask(r: Rng, s: Stage, stories: typeof STORIES2 = STORIES2): Gen {
  const st = pick(r, stories);
  const [q, a, w] = pick(r, st.qs) as [string, string, string[]];
  return {
    key: `z-${st.t.slice(0, 24)}|${q}`,
    prompt: `Hör gut zu!
${q}`,
    speak: `Hör gut zu! ${q}`,
    listen: { text: st.t, lang: 'de', slow: s === 1 },
    answer: choice(r, a, s === 1 ? w.slice(0, 2) : w),
    tags: ['zuhoeren'],
    solution: [`Antwort: ${a}`, `Die Geschichte: ${st.t}`],
  };
}

const PRONOMEN: [string, string, string][] = [
  ['Lena', 'Sie', 'Lena liest ein Buch. ☐ findet es sehr spannend.'], ['Tim', 'Er', 'Tim spielt Fußball. ☐ schießt ein Tor.'], ['Das Kind', 'Es', 'Das Kind lacht. ☐ freut sich über das Geschenk.'], ['Die Kinder', 'Sie', 'Die Kinder rennen. ☐ wollen zum Spielplatz.'],
  ['Der Hund', 'Er', 'Der Hund bellt. ☐ hat Hunger.'], ['Die Katze', 'Sie', 'Die Katze miaut. ☐ will hinaus.'], ['Das Pferd', 'Es', 'Das Pferd wiehert. ☐ steht im Stall.'], ['Mama und ich', 'Wir', 'Mama und ich backen. ☐ machen Waffeln.'],
  ['Du und Ben', 'Ihr', 'Du und Ben, ☐ seid heute dran!'], ['Opa', 'Er', 'Opa schläft. ☐ ist müde.'],
  ['Der Ball', 'Er', 'Der Ball rollt weg. ☐ ist ganz rund.'], ['Die Blume', 'Sie', 'Die Blume blüht. ☐ duftet gut.'], ['Das Baby', 'Es', 'Das Baby weint. ☐ hat Hunger.'],
  ['Papa und ich', 'Wir', 'Papa und ich gehen angeln. ☐ fangen einen Fisch.'], ['Lisa und Tom', 'Sie', 'Lisa und Tom spielen. ☐ bauen einen Turm.'], ['Die Vögel', 'Sie', 'Die Vögel zwitschern. ☐ sitzen im Baum.'],
  ['Das Auto', 'Es', 'Das Auto ist schmutzig. ☐ muss gewaschen werden.'], ['Du und Lea', 'Ihr', 'Du und Lea, ☐ dürft zuerst spielen.'], ['Der Lehrer', 'Er', 'Der Lehrer kommt. ☐ bringt Hefte mit.'],
  ['Oma', 'Sie', 'Oma strickt. ☐ macht einen Schal für mich.'], ['Anna und ich', 'Wir', 'Anna und ich sind Freundinnen. ☐ treffen uns jeden Tag.'],
  // Nachtlauf 22.10.2026: mehr Sätze
  ['Der Hase', 'Er', 'Der Hase hoppelt. ☐ sucht eine Möhre.'], ['Die Lehrerin', 'Sie', 'Die Lehrerin lacht. ☐ erzählt einen Witz.'], ['Das Buch', 'Es', 'Das Buch ist spannend. ☐ handelt von Piraten.'],
  ['Die Äpfel', 'Sie', 'Die Äpfel sind reif. ☐ hängen am Baum.'], ['Ben und ich', 'Wir', 'Ben und ich sind Brüder. ☐ teilen ein Zimmer.'], ['Du und Mia', 'Ihr', 'Du und Mia, ☐ habt gewonnen!'],
  ['Der Baum', 'Er', 'Der Baum ist hoch. ☐ steht im Garten.'], ['Das Fahrrad', 'Es', 'Das Fahrrad ist neu. ☐ hat eine Klingel.'], ['Die Sonne', 'Sie', 'Die Sonne geht auf. ☐ scheint hell.'],
  ['Die Maus', 'Sie', 'Die Maus piepst. ☐ hat Angst vor der Katze.'], ['Der Zug', 'Er', 'Der Zug hat Verspätung. ☐ kommt erst um acht.'], ['Das Schwein', 'Es', 'Das Schwein grunzt. ☐ wälzt sich im Schlamm.'],
  ['Mila und ich', 'Wir', 'Mila und ich malen. ☐ brauchen viele Farben.'], ['Du und Paul', 'Ihr', 'Du und Paul, ☐ räumt heute auf!'], ['Die Fische', 'Sie', 'Die Fische schwimmen. ☐ glitzern in der Sonne.'],
  ['Der Schneemann', 'Er', 'Der Schneemann steht im Garten. ☐ hat eine Karottennase.'], ['Die Tür', 'Sie', 'Die Tür quietscht. ☐ ist alt.'], ['Das Zelt', 'Es', 'Das Zelt ist grün. ☐ steht am See.'],
  ['Lara und ich', 'Wir', 'Lara und ich lesen. ☐ mögen Pferdebücher.'], ['Du und Tim', 'Ihr', 'Du und Tim, ☐ seid ein gutes Team!'], ['Die Kühe', 'Sie', 'Die Kühe stehen auf der Weide. ☐ fressen Gras.'],
  ['Das Eis', 'Es', 'Das Eis ist lecker. ☐ schmeckt nach Erdbeere.'], ['Der Drache', 'Er', 'Der Drache fliegt hoch. ☐ hat einen langen Schwanz.'],
  ['Die Lampe', 'Sie', 'Die Lampe ist kaputt. ☐ leuchtet nicht mehr.'], ['Emma und ich', 'Wir', 'Emma und ich spielen Fangen. ☐ rennen um die Wette.'],
  // Nachtlauf 24.10.2026: mehr Sätze
  ['Der Bauer', 'Er', 'Der Bauer füttert die Hühner. ☐ steht jeden Tag früh auf.'], ['Die Ärztin', 'Sie', 'Die Ärztin hört mein Herz ab. ☐ ist sehr nett.'], ['Das Mädchen', 'Es', 'Das Mädchen springt Seil. ☐ zählt laut mit.'],
  ['Die Eltern', 'Sie', 'Die Eltern kochen. ☐ machen eine Suppe.'], ['Jonas und ich', 'Wir', 'Jonas und ich bauen eine Höhle. ☐ brauchen viele Decken.'], ['Du und Ali', 'Ihr', 'Du und Ali, ☐ dürft die Fische füttern!'],
  ['Der Kuchen', 'Er', 'Der Kuchen ist fertig. ☐ riecht lecker.'], ['Die Brücke', 'Sie', 'Die Brücke ist lang. ☐ führt über den Fluss.'], ['Das Telefon', 'Es', 'Das Telefon klingelt. ☐ liegt in der Küche.'],
  ['Die Hühner', 'Sie', 'Die Hühner gackern. ☐ legen Eier.'],
];
function pronTask(r: Rng): Gen {
  const [who, pr, s] = pick(r, PRONOMEN);
  const text = s;
  // Lücke mitten im Satz (z. B. nach einem Komma): Pronomen klein
  const cap = (x: string) => (/^☐|[.!?]\s*☐/.test(text) ? x : x.toLowerCase());
  return { key: text, prompt: `Welches Pronomen passt?\n${text}`, speak: text.replace('☐', 'Lücke'), answer: choice(r, cap(pr), ['Er', 'Sie', 'Es', 'Wir', 'Ihr'].filter((x) => x !== pr).map(cap)), tags: [`pronomen-${pr.toLowerCase()}`], solution: [`„${who}“ kann man ersetzen durch: ${cap(pr)}.`, text.replace('☐', cap(pr)), 'der → er, die → sie, das → es, mehrere → sie'] };
}

const VERBS: [string, Record<string, string>, boolean][] = [
  ['spielen', { ich: 'spiele', du: 'spielst', er: 'spielt', wir: 'spielen', ihr: 'spielt', sie: 'spielen' }, false],
  ['lachen', { ich: 'lache', du: 'lachst', er: 'lacht', wir: 'lachen', ihr: 'lacht', sie: 'lachen' }, false],
  ['malen', { ich: 'male', du: 'malst', er: 'malt', wir: 'malen', ihr: 'malt', sie: 'malen' }, false],
  ['lesen', { ich: 'lese', du: 'liest', er: 'liest', wir: 'lesen', ihr: 'lest', sie: 'lesen' }, true],
  ['laufen', { ich: 'laufe', du: 'läufst', er: 'läuft', wir: 'laufen', ihr: 'lauft', sie: 'laufen' }, true],
  ['fahren', { ich: 'fahre', du: 'fährst', er: 'fährt', wir: 'fahren', ihr: 'fahrt', sie: 'fahren' }, true],
  ['essen', { ich: 'esse', du: 'isst', er: 'isst', wir: 'essen', ihr: 'esst', sie: 'essen' }, true],
  ['sein', { ich: 'bin', du: 'bist', er: 'ist', wir: 'sind', ihr: 'seid', sie: 'sind' }, true],
  ['haben', { ich: 'habe', du: 'hast', er: 'hat', wir: 'haben', ihr: 'habt', sie: 'haben' }, true],
  ['schlafen', { ich: 'schlafe', du: 'schläfst', er: 'schläft', wir: 'schlafen', ihr: 'schlaft', sie: 'schlafen' }, true],
];
const PERSON: Record<string, string> = { ich: 'ich', du: 'du', er: 'er/sie/es', wir: 'wir', ihr: 'ihr', sie: 'sie (mehrere)' };
/** so sähe die Form aus, wenn das Verb ganz regelmäßig wäre */
const regularForm = (inf: string, p: string) => {
  const st = inf.replace(/e?n$/, '');
  return ({ ich: st + 'e', du: st + 'st', er: st + 't', wir: inf, ihr: st + 't', sie: inf } as Record<string, string>)[p];
};
function verbTask(r: Rng, s: Stage): Gen {
  const [inf, forms, irr] = pick(r, s === 1 ? VERBS.filter((v) => !v[2]) : s === 3 ? VERBS.filter((v) => v[2]) : VERBS);
  const p = pick(r, Object.keys(forms));
  const right = forms[p];
  // keine Formen mit drei gleichen Buchstaben (essen → „essst“)
  const wrongs = [...new Set([...Object.values(forms), inf.replace(/en$/, 'st'), inf.replace(/en$/, 't')])].filter((x) => x !== right && !/(.)\1\1/.test(x));
  if (s === 3 && chance(r, 0.5)) return { key: `${inf}-${p}-t`, prompt: `Schreibe die richtige Form:\n${PERSON[p].split('/')[0]} ☐ (${inf})`, speak: `Schreibe die richtige Form von ${inf} für ${PERSON[p].split('/')[0]}.`, answer: { type: 'text', value: right, caseSensitive: true }, tags: [irr ? 'unregelmaessig' : 'regelmaessig'], solution: [`${PERSON[p]} ${right}`, ...(right !== regularForm(inf, p) ? [`${inf} ist ein besonderes Verb – ${Object.entries(forms).map(([k, v]) => `${k} ${v}`).join(', ')}`] : [])] };
  return { key: `${inf}-${p}`, prompt: `Welche Form passt?\n${PERSON[p]} ☐ (${inf})`, speak: `Welche Form von ${inf} passt zu ${PERSON[p].split('/')[0]}?`, answer: choice(r, right, wrongs), tags: [irr ? 'unregelmaessig' : 'regelmaessig', `person-${p}`], solution: [`${PERSON[p]} ${right}`, 'Die Endung zeigt die Person: ich -e, du -st, er/sie/es -t, wir -en, ihr -t, sie -en.', ...(right !== regularForm(inf, p) ? [`Diese Form ist besonders – merke sie dir: ${PERSON[p].split('/')[0]} ${right}.`] : [])] };
}

const BAUSTEINE: [string, string, string[]][] = [
  ['Ich schreibe die Sätze von der Tafel ☐.', 'ab', ['ver', 'vor', 'zer']], ['Der Zauberer kann sich in einen Frosch ☐wandeln.', 'ver', ['ab', 'an', 'mit']], ['Kannst du uns die Geschichte ☐lesen?', 'vor', ['ab', 'zer', 'an']],
  ['Das Glas ist auf den Boden gefallen und ☐brochen.', 'zer', ['ab', 'vor', 'an']], ['Kommst du heute ☐? Wir fahren ins Schwimmbad.', 'mit', ['ver', 'zer', 'ab']], ['Mach bitte das Licht ☐, es ist dunkel.', 'an', ['zer', 'ver', 'vor']],
  ['Ich habe meinen Schlüssel ☐loren.', 'ver', ['zer', 'ab', 'mit']], ['Der Zug fährt um acht Uhr ☐.', 'ab', ['ver', 'zer', 'mit']], ['Am Ende des Spiels ☐teilen wir die Preise.', 'ver', ['zer', 'an', 'mit']],
  ['Der Hund hat meinen Hausschuh ☐bissen.', 'zer', ['an', 'mit', 'vor']], ['Papa will mich heute von der Schule ☐holen.', 'ab', ['zer', 'ver', 'mit']], ['Die Sonne geht am Morgen ☐.', 'auf', ['zer', 'ver', 'mit']],
  ['Kannst du bitte das Fenster ☐machen? Es zieht.', 'zu', ['zer', 'vor', 'ver']], ['Wir ☐stecken uns hinter dem Baum.', 'ver', ['ab', 'an', 'mit']], ['Der Teller fällt herunter und ☐bricht in viele Stücke.', 'zer', ['an', 'mit', 'vor']],
  ['Kannst du mir das Spiel ☐klären?', 'er', ['ab', 'zer', 'mit']], ['Ich habe mir die Hände ☐getrocknet.', 'ab', ['zer', 'ver', 'vor']], ['Wann fängt der Film ☐?', 'an', ['ver', 'zer', 'er']],
  // Nachtlauf 22.10.2026: mehr Sätze
  ['Iss bitte alles ☐!', 'auf', ['zer', 'ver', 'vor']], ['Ich ☐gesse oft meine Hausaufgaben.', 'ver', ['ab', 'an', 'zer']], ['Der Kuchen ist ☐brannt – er ist ganz schwarz.', 'ver', ['zer', 'vor', 'mit']],
  ['Räum bitte dein Zimmer ☐!', 'auf', ['zer', 'ver', 'vor']], ['Die Kinder ☐schneiden das Papier in kleine Stücke.', 'zer', ['an', 'auf', 'mit']], ['Ich möchte dir etwas ☐zählen.', 'er', ['zer', 'ver', 'an']],
  ['Nach den Ferien ☐kennen wir unsere Lehrerin kaum wieder.', 'er', ['zer', 'mit', 'an']], ['Morgen reisen wir in den Urlaub ☐.', 'ab', ['zer', 'vor', 'er']],
  ['Zieh dir die Jacke ☐, es ist kalt!', 'an', ['zer', 'ver', 'er']], ['Mach bitte den Fernseher ☐, wir gehen schlafen.', 'aus', ['zer', 'ver', 'er']],
  ['Ich ☐danke mich für das Geschenk.', 'be', ['zer', 'ab', 'vor']], ['Der Arzt ☐sucht das kranke Kind.', 'unter', ['zer', 'ab', 'vor']],
  ['Kannst du mir beim Tragen ☐helfen?', 'mit', ['zer', 'ver', 'er']], ['Die Blumen in der Vase sind ☐welkt.', 'ver', ['zer', 'ab', 'mit']],
  ['Der Bäcker ☐kauft frische Brötchen.', 'ver', ['zer', 'ab', 'er']], ['Ich schreibe die Wörter ins Heft ☐.', 'ab', ['zer', 'er', 'an']],
  ['Der Wind hat den Drachen ☐rissen.', 'zer', ['ab', 'an', 'mit']], ['Am Abend ☐zählt Opa eine Geschichte.', 'er', ['zer', 'ab', 'mit']],
  ['Wir ☐teilen die Bonbons unter allen Kindern.', 'ver', ['er', 'an', 'mit']], ['Zum Schwimmen ziehen wir den Badeanzug ☐.', 'an', ['zer', 'ver', 'er']],
  // Nachtlauf 24.10.2026: mehr Sätze (trennbare Vorsilben am Satzende, untrennbare vorne)
  ['Ich ☐spreche dir, dass ich komme.', 'ver', ['ab', 'an', 'mit']], ['Wir ☐kaufen unsere alten Spielsachen auf dem Flohmarkt.', 'ver', ['ab', 'zer', 'mit']], ['Bitte ☐klär mir die Aufgabe noch einmal.', 'er', ['zer', 'ab', 'mit']], ['Der Zauberer ☐schwindet plötzlich.', 'ver', ['zer', 'an', 'mit']], ['Lena ☐sucht ihre kranke Oma.', 'be', ['zer', 'ab', 'vor']], ['Der Wind ☐reißt das Papier.', 'zer', ['ab', 'an', 'vor']], ['Bitte mach die Tür ☐, es zieht.', 'zu', ['zer', 'ver', 'er']], ['Am Morgen stehe ich um sieben Uhr ☐.', 'auf', ['zer', 'ver', 'be']], ['Morgen ruft Oma uns ☐.', 'an', ['zer', 'ver', 'er']], ['Der Lehrer ☐teilt die Hefte.', 'ver', ['ab', 'an', 'mit']], ['Die Sonne geht am Abend ☐.', 'unter', ['zer', 'ver', 'er']], ['Ich ☐kenne meine Freundin an ihrer Stimme.', 'er', ['ab', 'zer', 'an']],
];
function bausteinTask(r: Rng): Gen {
  const [s, ok, w] = pick(r, BAUSTEINE);
  return { key: s, prompt: `Welcher Wortbaustein passt?\n${s}`, speak: s.replace('☐', 'Lücke ').replace(/ ([.!?,])/g, '$1'), answer: { ...choice(r, ok, w), big: true }, tags: ['vorsilben'], solution: [s.replace('☐', ok), 'Vorsilben wie ab-, an-, ver-, vor-, zer-, mit- verändern die Bedeutung eines Verbs: schreiben → abschreiben.', ...(/☐[.!?]$/.test(s) ? [`Hier steht die Vorsilbe am Satzende – sie gehört zum Verb davor.`] : [])] };
}

export const DEUTSCH_EXTRA: Skill[] = [
  D(2, 'd2-zuhoeren', 'Gut zuhören', '👂', { text: ['Du hörst eine kurze Geschichte – der Text wird nicht angezeigt.', 'Hör ganz genau hin: Wer? Was? Wo? Wann?', 'Du kannst die Geschichte so oft anhören, wie du willst – auch langsam.'], visual: { kind: 'emoji', chars: '👂📖' }, videoQuery: 'Zuhören üben Grundschule Hörgeschichte Klasse 2' }, zuhoerTask, { tagLabels: { zuhoeren: 'Geschichten zuhören' }, testSeconds: 50 }),
  D(3, 'd3-zuhoeren', 'Gut zuhören: längere Geschichten', '🎧', { text: ['Du hörst eine längere Geschichte – der Text wird nicht angezeigt.', 'Merke dir beim Zuhören: Wer kommt vor? Was passiert zuerst, was danach? Wie geht es aus?', 'Hör die Geschichte ruhig zweimal an – beim zweiten Mal achtest du auf die Frage.'], visual: { kind: 'emoji', chars: '🎧📘' }, videoQuery: 'Zuhören üben Grundschule Hörgeschichte Klasse 3' }, (r, s) => zuhoerTask(r, s, STORIES3), { tagLabels: { zuhoeren: 'Geschichten zuhören' }, testSeconds: 70 }),
  D(1, 'd1-saetze', 'Sätze lesen', '🖼️', { text: ['Lies den Satz Wort für Wort.', 'Schau dann aufs Bild: Passt alles? Wer macht was?', 'Oft ist nur ein einziges Wort anders – lies genau!'], visual: { kind: 'emoji', chars: '🐶💤', label: 'Der Hund schläft.' }, videoQuery: 'Sätze lesen Klasse 1 Leseverständnis' }, satzBild, { tagLabels: { 'satz-bild': 'Satz zum Bild finden' }, testSeconds: 25 }),
  D(2, 'd2-silbentrennung', 'Wörter trennen', '✂️', { text: ['Am Zeilenende trennt man Wörter nach Sprechsilben: Son-ne, To-ma-te.', 'Sprich das Wort langsam und klatsche mit.', 'ck bleibt zusammen und kommt auf die neue Zeile: Zu-cker, Brü-cke.', 'Einen einzelnen Buchstaben trennt man nicht ab.'], visual: { kind: 'syllables', parts: ['Zu', 'cker'], emoji: '🍬' }, videoQuery: 'Silbentrennung Wörter trennen Klasse 2' }, trennTask, { tagLabels: { silben: 'nach Silben trennen', 'ck-trennen': 'ck beim Trennen' }, testSeconds: 20 }),
  D(2, 'd2-lesen', 'Lesen und verstehen', '📗', { text: ['Lies den kurzen Text in Ruhe.', 'Lies dann die Frage und suche die Antwort im Text.', 'Bei „Warum“-Fragen musst du ein bisschen nachdenken.'], videoQuery: 'Leseverständnis Klasse 2 üben' }, (r) => readTask(r, STORIES2), { tagLabels: { schlussfolgern: 'Schlussfolgern (Warum?)', 'informationen-finden': 'Informationen im Text finden' }, testSeconds: 45 }),
  D(3, 'd3-pronomen', 'Pronomen (Fürwörter)', '👉', { text: ['Pronomen ersetzen Nomen, damit sich nichts wiederholt.', 'der Hund → er, die Katze → sie, das Kind → es.', 'Mehrere Personen oder Dinge → sie. Ich und andere → wir. Du und andere → ihr.'], visual: { kind: 'text', text: 'Tim spielt. Er lacht.' }, videoQuery: 'Personalpronomen Grundschule erklärt' }, pronTask, { tagLabels: { 'pronomen-er': 'er', 'pronomen-sie': 'sie', 'pronomen-es': 'es', 'pronomen-wir': 'wir', 'pronomen-ihr': 'ihr' }, testSeconds: 20 }),
  D(3, 'd3-personalformen', 'Verben beugen', '🔧', { text: ['Das Verb verändert sich je nach Person: ich spiele, du spielst, er spielt.', 'Endungen: ich -e, du -st, er/sie/es -t, wir -en, ihr -t, sie -en.', 'Manche Verben ändern auch den Stamm: ich lese – du liest, ich fahre – du fährst.', 'Ganz besonders: sein – ich bin, du bist, er ist, wir sind.'], visual: { kind: 'text', text: 'ich spiele · du spielst · er spielt' }, videoQuery: 'Personalformen Verben konjugieren Grundschule' }, verbTask, { tagLabels: { regelmaessig: 'regelmäßige Verben', unregelmaessig: 'besondere Verben (lesen, fahren, sein …)', 'person-du': 'du-Form', 'person-er': 'er/sie/es-Form', 'person-ihr': 'ihr-Form' }, testSeconds: 20 }),
  D(3, 'd3-wortbausteine', 'Vorsilben und Wortbausteine', '🧩', { text: ['Aus einem Verb werden mit Vorsilben neue Wörter: schreiben → abschreiben, verschreiben, vorschreiben.', 'Häufige Vorsilben: ab-, an-, auf-, aus-, mit-, ver-, vor-, zer-.', 'Die Vorsilbe verändert die Bedeutung – lies den ganzen Satz!', 'Achtung: ab-, an-, auf-, aus-, mit-, vor-, zu- wandern im Satz oft ans Ende: Ich schreibe ab. Der Zug fährt ab. ver-, zer-, er-, be- bleiben immer vorne: Ich verstecke mich.'], visual: { kind: 'text', text: 'ab + schreiben = abschreiben' }, videoQuery: 'Vorsilben Wortbausteine Grundschule' }, bausteinTask, { tagLabels: { vorsilben: 'Vorsilben' }, testSeconds: 20 }),
  D(3, 'd3-lesen-lang', 'Lesen: längere Texte', '📘', { text: ['Lies den ganzen Text, bevor du die Frage liest.', 'Achte auf die Reihenfolge: zuerst, dann, danach, am Ende.', 'Manche Antworten stehen nicht wörtlich im Text – überlege, was passt.'], videoQuery: 'Leseverständnis Klasse 3 Texte verstehen' }, (r) => readTask(r, STORIES3), { tagLabels: { schlussfolgern: 'Schlussfolgern', 'informationen-finden': 'Informationen finden' }, testSeconds: 60 }),
];

// ---------- Englisch ----------
export type W = { en: string; de: string; e: string };
const TOYS: W[] = [{ en: 'ball', de: 'Ball', e: '⚽' }, { en: 'teddy', de: 'Teddy', e: '🧸' }, { en: 'kite', de: 'Drachen', e: '🪁' }, { en: 'train', de: 'Zug', e: '🚂' }, { en: 'robot', de: 'Roboter', e: '🤖' }, { en: 'puzzle', de: 'Puzzle', e: '🧩' }, { en: 'doll', de: 'Puppe', e: '🪆' }, { en: 'yo-yo', de: 'Jo-Jo', e: '🪀' }, { en: 'dice', de: 'Würfel', e: '🎲' }, { en: 'balloon', de: 'Luftballon', e: '🎈' },
  // Nachtlauf 22.10.2026: mehr Spielsachen
  { en: 'skateboard', de: 'Skateboard', e: '🛹' }, { en: 'drum', de: 'Trommel', e: '🥁' }, { en: 'dinosaur', de: 'Dinosaurier', e: '🦖' }, { en: 'trumpet', de: 'Trompete', e: '🎺' }, { en: 'computer game', de: 'Computerspiel', e: '🎮' }];
const HOBBIES: W[] = [{ en: 'play the guitar', de: 'Gitarre spielen', e: '🎸' }, { en: 'play the piano', de: 'Klavier spielen', e: '🎹' }, { en: 'play tennis', de: 'Tennis spielen', e: '🎾' }, { en: 'play basketball', de: 'Basketball spielen', e: '🏀' }, { en: 'ride a horse', de: 'reiten', e: '🏇' }, { en: 'go skiing', de: 'Ski fahren', e: '⛷️' }, { en: 'draw pictures', de: 'Bilder malen', e: '🖍️' }, { en: 'go fishing', de: 'angeln', e: '🎣' }, { en: 'play computer games', de: 'Computerspiele spielen', e: '🎮' }, { en: 'take photos', de: 'fotografieren', e: '📷' },
  { en: 'go swimming', de: 'schwimmen gehen', e: '🏊' }, { en: 'read books', de: 'Bücher lesen', e: '📚' }, { en: 'dance', de: 'tanzen', e: '💃' }, { en: 'sing songs', de: 'Lieder singen', e: '🎤' },
  { en: 'ride a bike', de: 'Fahrrad fahren', e: '🚴' }, { en: 'play the drums', de: 'Schlagzeug spielen', e: '🥁' }, { en: 'go ice skating', de: 'Schlittschuh laufen', e: '⛸️' }, { en: 'bake cakes', de: 'Kuchen backen', e: '🧁' }];
registerWords('e1-toys', TOYS);
registerWords('e2-hobbies', HOBBIES);
export function wordTask(r: Rng, words: W[], s: Stage): Gen {
  const w = pick(r, words);
  const others = words.filter((x) => x !== w);
  const say = { text: w.en, lang: 'en' as const };
  const same = w.en.toLowerCase() === w.de.toLowerCase();
  const mode = s === 1 || same ? pick(r, ['bild', 'hören']) : s === 3 ? pick(r, ['hören', 'de-en', 'schreiben']) : pick(r, ['bild', 'hören', 'de-en']);
  if (mode === 'schreiben' && !w.en.includes(' ')) return { key: `s-${w.en}`, prompt: `Schreibe auf Englisch:\n${w.de}`, visual: { kind: 'emoji', chars: w.e }, answer: { type: 'text', value: w.en, lang: 'en' }, tags: ['schreiben'], solution: [`${w.de} = ${w.en}`], pronounce: say };
  if (mode === 'hören') return { key: `h-${w.en}`, prompt: 'Hör gut zu! Welches Bild passt?', speak: 'Hör gut zu!', listen: say, answer: { ...choice(r, w.e, pickN(r, others, 3).map((x) => x.e)), big: true }, tags: ['hören'], solution: [`${w.en} = ${w.de}`], pronounce: say };
  if (mode === 'de-en') return { key: `u-${w.en}`, prompt: `Was heißt „${w.de}“ auf Englisch?`, answer: { ...choice(r, w.en, pickN(r, others, 3).map((x) => x.en)), speakOptions: 'en' }, tags: ['übersetzen'], solution: [`${w.de} = ${w.en}`], pronounce: say };
  return { key: `b-${w.en}`, prompt: 'Wie heißt das auf Englisch?', visual: { kind: 'emoji', chars: w.e }, answer: { ...choice(r, w.en, pickN(r, others, 3).map((x) => x.en)), speakOptions: 'en' }, tags: ['bild-wort'], solution: [`${w.de} = ${w.en}`], pronounce: say };
}

const LISTEN: [string, string, string[]][] = [
  ['My favourite colour is green.', 'Meine Lieblingsfarbe ist Grün.', ['Meine Lieblingsfarbe ist Blau.', 'Mein Lieblingstier ist grün.', 'Ich mag kein Grün.']],
  ['There are three apples on the table.', 'Auf dem Tisch liegen drei Äpfel.', ['Auf dem Tisch liegen zwei Äpfel.', 'Unter dem Tisch liegen drei Äpfel.', 'Auf dem Tisch liegen drei Bananen.']],
  ['My brother can play the guitar.', 'Mein Bruder kann Gitarre spielen.', ['Meine Schwester kann Gitarre spielen.', 'Mein Bruder kann Klavier spielen.', 'Mein Bruder mag keine Gitarre.']],
  ['We have got a black dog.', 'Wir haben einen schwarzen Hund.', ['Wir haben eine schwarze Katze.', 'Wir haben einen weißen Hund.', 'Ich habe einen schwarzen Hund.']],
  ['My birthday is in May.', 'Ich habe im Mai Geburtstag.', ['Ich habe im März Geburtstag.', 'Mein Bruder hat im Mai Geburtstag.', 'Heute ist mein Geburtstag.']],
  ['Put on your jacket. It is cold.', 'Zieh deine Jacke an. Es ist kalt.', ['Zieh deine Mütze an. Es ist kalt.', 'Zieh deine Jacke aus. Es ist warm.', 'Deine Jacke ist kalt.']],
  ['I go to school by bus.', 'Ich fahre mit dem Bus zur Schule.', ['Ich fahre mit dem Fahrrad zur Schule.', 'Ich gehe zu Fuß zur Schule.', 'Ich fahre mit dem Bus nach Hause.']],
  ['The elephant is big and grey.', 'Der Elefant ist groß und grau.', ['Der Elefant ist klein und grau.', 'Die Maus ist groß und grau.', 'Der Elefant ist groß und braun.']],
  ['I have got a red ball.', 'Ich habe einen roten Ball.', ['Ich habe einen blauen Ball.', 'Ich habe ein rotes Auto.', 'Du hast einen roten Ball.']],
  ['The cat is under the table.', 'Die Katze ist unter dem Tisch.', ['Die Katze ist auf dem Tisch.', 'Der Hund ist unter dem Tisch.', 'Die Katze ist neben dem Bett.']],
  ['My sister is eight years old.', 'Meine Schwester ist acht Jahre alt.', ['Mein Bruder ist acht Jahre alt.', 'Meine Schwester ist neun Jahre alt.', 'Meine Mutter ist acht Jahre alt.']],
  ['I like apples, but I don’t like bananas.', 'Ich mag Äpfel, aber keine Bananen.', ['Ich mag Bananen, aber keine Äpfel.', 'Ich mag Äpfel und Bananen.', 'Ich mag keine Äpfel.']],
  ['It is cold and snowy today.', 'Heute ist es kalt und es schneit.', ['Heute ist es heiß und sonnig.', 'Heute regnet es.', 'Morgen ist es kalt.']],
  ['We play football on Saturday.', 'Wir spielen am Samstag Fußball.', ['Wir spielen am Sonntag Fußball.', 'Wir spielen am Samstag Tennis.', 'Ich spiele am Samstag Fußball.']],
  ['Can you swim? – Yes, I can.', 'Kannst du schwimmen? – Ja.', ['Kannst du tanzen? – Ja.', 'Kannst du schwimmen? – Nein.', 'Magst du schwimmen? – Ja.']],
  ['The dog has got big brown eyes.', 'Der Hund hat große braune Augen.', ['Der Hund hat kleine braune Augen.', 'Die Katze hat große braune Augen.', 'Der Hund hat große braune Ohren.']],
  ['I get up at seven o’clock.', 'Ich stehe um sieben Uhr auf.', ['Ich stehe um elf Uhr auf.', 'Ich gehe um sieben Uhr ins Bett.', 'Ich stehe um sechs Uhr auf.']],
  ['My grandma has got a garden.', 'Meine Oma hat einen Garten.', ['Mein Opa hat einen Garten.', 'Meine Oma hat einen Hund.', 'Meine Oma ist im Garten.']],
  ['There is a bird on the roof.', 'Auf dem Dach sitzt ein Vogel.', ['Auf dem Dach sitzt eine Katze.', 'Unter dem Dach sitzt ein Vogel.', 'Auf dem Baum sitzt ein Vogel.']],
  ['We have got English on Monday.', 'Wir haben am Montag Englisch.', ['Wir haben am Montag Mathe.', 'Wir haben am Freitag Englisch.', 'Ich habe am Montag Englisch.']],
  ['I can’t find my pencil.', 'Ich finde meinen Bleistift nicht.', ['Ich finde meinen Füller nicht.', 'Ich habe meinen Bleistift gefunden.', 'Kannst du meinen Bleistift finden?']],
  ['The shop is next to the school.', 'Der Laden ist neben der Schule.', ['Der Laden ist hinter der Schule.', 'Die Schule ist neben dem Park.', 'Der Laden ist in der Schule.']],
  ['My favourite food is spaghetti.', 'Mein Lieblingsessen ist Spaghetti.', ['Mein Lieblingsessen ist Pizza.', 'Ich mag keine Spaghetti.', 'Mein Lieblingstier ist ein Hund.']],
  ['Please open the window.', 'Bitte öffne das Fenster.', ['Bitte schließ das Fenster.', 'Bitte öffne die Tür.', 'Das Fenster ist offen.']],
  // Nachtlauf 22.10.2026: mehr Aufgaben
  ['My dad is a doctor.', 'Mein Papa ist Arzt.', ['Mein Papa ist Lehrer.', 'Meine Mama ist Ärztin.', 'Mein Opa ist Arzt.']],
  ['The station is next to the park.', 'Der Bahnhof ist neben dem Park.', ['Der Bahnhof ist hinter dem Park.', 'Die Kirche ist neben dem Park.', 'Der Bahnhof ist im Park.']],
  ['I have got a headache.', 'Ich habe Kopfschmerzen.', ['Ich habe Bauchschmerzen.', 'Ich habe Zahnschmerzen.', 'Ich bin müde.']],
  ['My favourite subject is Art.', 'Mein Lieblingsfach ist Kunst.', ['Mein Lieblingsfach ist Musik.', 'Mein Lieblingsfach ist Mathe.', 'Ich mag keine Kunst.']],
  ['Today is Tuesday.', 'Heute ist Dienstag.', ['Heute ist Donnerstag.', 'Morgen ist Dienstag.', 'Heute ist Sonntag.']],
  ['The boy is happy.', 'Der Junge ist fröhlich.', ['Der Junge ist traurig.', 'Das Mädchen ist fröhlich.', 'Der Junge ist müde.']],
  ['There are five birds in the tree.', 'Im Baum sitzen fünf Vögel.', ['Im Baum sitzen vier Vögel.', 'Unter dem Baum sitzen fünf Vögel.', 'Im Baum sitzen fünf Katzen.']],
  ['My mum likes reading books.', 'Meine Mama liest gern Bücher.', ['Mein Papa liest gern Bücher.', 'Meine Mama schreibt gern Bücher.', 'Meine Mama mag keine Bücher.']],
  ['Close the door, please.', 'Mach bitte die Tür zu.', ['Mach bitte das Fenster zu.', 'Mach bitte die Tür auf.', 'Die Tür ist zu.']],
  ['The pencil is in my school bag.', 'Der Bleistift ist in meiner Schultasche.', ['Der Bleistift ist auf meinem Tisch.', 'Das Lineal ist in meiner Schultasche.', 'Der Bleistift ist unter meiner Schultasche.']],
  ['My brother has got a red bike.', 'Mein Bruder hat ein rotes Fahrrad.', ['Mein Bruder hat ein blaues Fahrrad.', 'Meine Schwester hat ein rotes Fahrrad.', 'Mein Bruder hat ein rotes Auto.']],
  ['We eat pizza on Friday.', 'Wir essen am Freitag Pizza.', ['Wir essen am Montag Pizza.', 'Wir essen am Freitag Nudeln.', 'Wir backen am Freitag Pizza.']],
  ['The cat is sleeping on the sofa.', 'Die Katze schläft auf dem Sofa.', ['Die Katze schläft unter dem Sofa.', 'Der Hund schläft auf dem Sofa.', 'Die Katze spielt auf dem Sofa.']],
  ['Look! A rainbow!', 'Schau! Ein Regenbogen!', ['Schau! Ein Flugzeug!', 'Schau! Eine Wolke!', 'Ich sehe keinen Regenbogen.']],
  ['We go to the beach in summer.', 'Im Sommer fahren wir an den Strand.', ['Im Winter fahren wir an den Strand.', 'Im Sommer fahren wir in die Berge.', 'Im Sommer gehen wir ins Schwimmbad.']],
  ['Can I have two pears, please?', 'Kann ich bitte zwei Birnen haben?', ['Kann ich bitte zwei Äpfel haben?', 'Kann ich bitte drei Birnen haben?', 'Ich mag keine Birnen.']],
  ['The owl sleeps in the day.', 'Die Eule schläft am Tag.', ['Die Eule schläft in der Nacht.', 'Die Katze schläft am Tag.', 'Die Eule fliegt am Tag.']],
  // Nachtlauf 24.10.2026: mehr Sätze
  ['The book is on the chair.', 'Das Buch liegt auf dem Stuhl.', ['Das Buch liegt unter dem Stuhl.', 'Das Heft liegt auf dem Stuhl.', 'Das Buch liegt auf dem Tisch.']],
  ['The sun is hot today.', 'Heute ist die Sonne heiß.', ['Heute ist der Mond hell.', 'Gestern war die Sonne heiß.', 'Heute ist es kalt.']],
  ['I can ride a bike.', 'Ich kann Fahrrad fahren.', ['Ich kann nicht Fahrrad fahren.', 'Ich kann reiten.', 'Er kann Fahrrad fahren.']],
  ['There are two cats in the garden.', 'Im Garten sind zwei Katzen.', ['Im Garten sind drei Katzen.', 'Im Haus sind zwei Katzen.', 'Im Garten sind zwei Hunde.']],
  ['Can I have a glass of water, please?', 'Kann ich bitte ein Glas Wasser haben?', ['Kann ich bitte ein Glas Milch haben?', 'Ich möchte kein Wasser.', 'Kann ich bitte einen Apfel haben?']],
  ['The shop opens at nine o’clock.', 'Der Laden öffnet um neun Uhr.', ['Der Laden schließt um neun Uhr.', 'Der Laden öffnet um zehn Uhr.', 'Die Schule beginnt um neun Uhr.']],
  ['My brother is taller than me.', 'Mein Bruder ist größer als ich.', ['Meine Schwester ist größer als ich.', 'Mein Bruder ist kleiner als ich.', 'Mein Bruder ist so groß wie ich.']],
];
function listenTask(r: Rng, s: Stage): Gen {
  const [en, de, w] = pick(r, LISTEN);
  return { key: en, prompt: 'Hör gut zu! Was bedeutet der Satz?', speak: 'Hör gut zu!', listen: { text: en, lang: 'en', slow: s === 1 }, answer: choice(r, de, s === 1 ? w.slice(0, 2) : w), tags: ['saetze-hoeren'], solution: [`${en}`, `= ${de}`], pronounce: { text: en, lang: 'en' } };
}

const QA: [string, string, string[]][] = [
  ["What's your name?", 'My name is Ben.', ['I am eight.', 'I live in Köln.', 'Yes, I can.']],
  ['How old are you?', "I'm eight years old.", ['My name is Mia.', "I'm fine, thanks.", 'It is blue.']],
  ['How are you?', "I'm fine, thank you.", ['I am nine years old.', 'Yes, I have got a dog.', 'My name is Tom.']],
  ['Where do you live?', 'I live in Hamburg.', ['It is sunny today.', 'I like pizza and pasta.', 'I’m ten years old.']],
  ["What's your favourite colour?", 'My favourite colour is green.', ['I am fine, thank you.', 'I like dogs and cats.', 'Yes, it is my colour.']],
  ['Have you got a pet?', 'Yes, I have got a cat.', ['Yes, I can swim very well.', 'I am a little cat.', 'No, I am not hungry.']],
  ['Can you ride a bike?', 'Yes, I can.', ['Yes, I have.', 'Yes, I am.', 'I like bikes.']],
  ["What's the weather like?", "It's rainy.", ["It's Monday.", "It's a cat.", "It's eight o'clock."]],
  ['Do you like ice cream?', 'Yes, I do.', ['Yes, I can.', 'Yes, I am.', 'Yes, it is.']],
  ["What's the time?", "It's three o'clock.", ["It's Tuesday today.", 'I am three years old.', "It's sunny and warm."]],
  ['When is your birthday?', 'My birthday is in May.', ['I am nine years old.', 'Yes, it is a party.', 'I like birthday cake.']],
  ["What's your favourite animal?", 'My favourite animal is the dog.', ['I have got a big dog.', 'Yes, I do like animals.', 'It is Monday morning.']],
  ['Have you got a brother?', 'No, I haven’t.', ['No, I can’t.', 'No, I am not.', 'I like my brother.']],
  ['Can you swim?', 'Yes, I can.', ['Yes, I do.', 'Yes, I have.', 'I like swimming.']],
  ['Do you like spaghetti?', 'No, I don’t.', ['No, I can’t.', 'No, I am not.', 'No, it isn’t.']],
  ['Is this your pencil?', 'Yes, it is.', ['Yes, I am.', 'Yes, I can.', 'Yes, I do.']],
  ["What's this?", "It's a ruler.", ['I am fine, thank you.', 'Yes, it is mine.', "It's red and long."]],
  ['What colour is your bag?', 'It is blue.', ['It is big.', 'I have got a bag.', 'Yes, it is.']],
  ['How many pencils have you got?', 'I have got five pencils.', ['Yes, I have got pencils.', 'I am five years old.', 'My pencil is red.']],
  ['What day is it today?', "It's Friday.", ["It's sunny.", "It's ten o'clock.", "It's my bag."]],
  // Nachtlauf 22.10.2026: mehr Fragen
  ['Where is your school?', 'My school is in Bonn.', ['I am in class four.', 'Yes, it is a big school.', 'I like my school.']],
  ['Can you play the piano?', 'No, I can’t.', ['No, I don’t.', 'No, I haven’t.', 'I like music.']],
  ['Have you got a sister?', 'Yes, I have got a sister.', ['I am a big sister.', 'Yes, I can ride a bike.', 'Yes, I am very happy.']],
  ['Who is your best friend?', 'My best friend is Lena.', ['It is Monday today.', 'Yes, I like my friends.', 'I am eight years old.']],
  ['Are you hungry?', 'Yes, I am.', ['Yes, I do.', 'Yes, I can.', 'Yes, I have.']],
  ['Is it cold today?', 'Yes, it is.', ['Yes, I am.', 'Yes, I do.', 'Yes, I can.']],
  ['How many brothers have you got?', 'I have got two brothers.', ['Yes, I have got brothers.', 'I am two years old.', 'My brother is ten.']],
  ['What are you doing?', 'I am reading a book.', ['Yes, I am very busy.', 'I like books very much.', 'It is a big book.']],
  ['Where is the cat?', 'It is under the table.', ['It is black and white.', 'Yes, it is a nice cat.', 'I have got a cat.']],
  ['What time do you get up?', 'I get up at seven o’clock.', ['It’s Monday morning.', 'I am seven years old.', 'Yes, I do get up.']],
  ['Do you like football?', 'Yes, I do.', ['Yes, I am.', 'Yes, I can.', 'Yes, it is.']], ['What’s your favourite food?', 'My favourite food is pizza.', ['Yes, I do like food.', 'It is red and round.', 'I am very hungry now.']],
  ['Where are you from?', 'I’m from Germany.', ['I’m nine years old.', 'I’m fine, thank you.', 'Yes, I am from here.']], ['Can you sing?', 'Yes, I can.', ['Yes, I do.', 'Yes, I am.', 'I like songs.']],
  ['Is your dog big?', 'No, it isn’t.', ['No, I don’t.', 'No, I can’t.', 'No, I haven’t.']], ['How do you get to school?', 'I go by bus.', ['I like school.', 'It is big.', 'Yes, I do.']],
  ['Are you tired?', 'No, I’m not.', ['No, I don’t.', 'No, it isn’t.', 'No, I can’t.']], ['What’s your teacher’s name?', 'Her name is Mrs Smith.', ['I am a good teacher.', 'Yes, she is very nice.', 'I like my teacher a lot.']],
  ['Can you dance?', 'Yes, I can.', ['Yes, I do.', 'Yes, I am.', 'I like music.']],
  ['What’s your favourite sport?', 'My favourite sport is tennis.', ['I am good at sports.', 'Yes, I play every day.', 'It is a green ball.']],
  ['Is your bag heavy?', 'Yes, it is.', ['Yes, I am.', 'Yes, I can.', 'Yes, I have.']],
  // Nachtlauf 24.10.2026: mehr Fragen (is/am/has/can/do auseinanderhalten)
  ["Has your sister got a bike?", "Yes, she has.", ["Yes, she is.", "Yes, she does.", "Yes, she can."]],
  ["How many legs has a spider got?", "It has got eight legs.", ["It is eight years old.", "It is black and small.", "It can run very fast."]],
  ["What do you eat for breakfast?", "I eat cereal.", ["I go to school.", "I am very hungry.", "It is in the kitchen."]],
  ["What colour is the sky?", "It is blue.", ["It is big.", "It is Sunday.", "Yes, it is."]],
  ["Who is your teacher?", "My teacher is Mrs Smith.", ["It is Monday today.", "I like my school.", "She is in Room 5."]],
];
function qaTask(r: Rng, s: Stage): Gen {
  const [q, a, w] = pick(r, QA);
  return { key: q, prompt: `Welche Antwort passt?\n${q}`, speak: 'Welche Antwort passt?', listen: { text: q, lang: 'en' }, answer: { ...choice(r, a, s === 1 ? w.slice(0, 2) : w), speakOptions: 'en' }, tags: [/^(Can|Have|Do|Is|Are) /.test(q) ? 'ja-nein-fragen' : 'w-fragen'], solution: [`${q} – ${a}`, q.startsWith('Can') ? 'Auf „Can you …?“ antwortet man „Yes, I can.“ oder „No, I can’t.“' : q.startsWith('Do') ? 'Auf „Do you …?“ antwortet man „Yes, I do.“ oder „No, I don’t.“' : q.startsWith('Have') ? 'Auf „Have you got …?“ antwortet man „Yes, I have.“ oder „No, I haven’t.“' : 'Hör auf das Fragewort: What, How old, Where …'], pronounce: { text: `${q} ${a}`, lang: 'en' } };
}

export const VT = { 'bild-wort': 'Bild → englisches Wort', hören: 'Hörverstehen', übersetzen: 'Deutsch → Englisch', schreiben: 'Wörter schreiben' };
export const ENGLISCH_EXTRA: Skill[] = [
  E(1, 'e1-toys', 'Toys – Spielsachen', '🧸', { text: ['ball, teddy, kite (Drachen), train, robot, puzzle, doll (Puppe).', "What's your favourite toy? – My favourite toy is my teddy."], visual: { kind: 'emoji', chars: '🧸' }, videoQuery: 'toys vocabulary English for kids' }, (r, s) => withWord(wordTask(r, TOYS, s), TOYS), { tagLabels: VT, testSeconds: 15 }),
  E(2, 'e2-hobbies', 'Hobbies – Freizeit', '🎸', { text: ['play the guitar, play tennis, ride a horse, go skiing …', 'I like playing tennis. = Ich spiele gern Tennis.', 'Bei Instrumenten sagt man „the“: play the piano.'], visual: { kind: 'emoji', chars: '🎸' }, videoQuery: 'hobbies vocabulary English for kids' }, (r, s) => withWord(wordTask(r, HOBBIES, s), HOBBIES), { tagLabels: VT, testSeconds: 15 }),
  E(2, 'e2-listening', 'Listen and choose – Sätze hören', '🎧', { text: ['Hör dir den ganzen Satz an – du kannst ihn so oft anhören, wie du willst.', 'Achte auf die wichtigen Wörter: Wer? Was? Welche Farbe? Welcher Tag?', 'Du musst nicht jedes Wort verstehen, um den Satz zu verstehen.'], visual: { kind: 'emoji', chars: '🎧' }, videoQuery: 'English listening practice for kids simple sentences' }, listenTask, { tagLabels: { 'saetze-hoeren': 'Sätze hören und verstehen' }, testSeconds: 25 }),
  E(2, 'e2-questions', 'Questions and answers', '❓', { text: ["What's your name? – My name is …", 'How old are you? – I’m … years old.', 'Can you …? – Yes, I can. / No, I can’t.', 'Do you like …? – Yes, I do. / No, I don’t.'], visual: { kind: 'text', text: 'Can you swim? – Yes, I can.' }, videoQuery: 'simple questions and answers English for kids' }, qaTask, { tagLabels: { 'ja-nein-fragen': 'Ja/Nein-Fragen (Can, Do, Have, Is, Are)', 'w-fragen': 'W-Fragen' }, testSeconds: 20 }),
];

