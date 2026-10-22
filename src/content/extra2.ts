// Weitere Themen (Nachtlauf 21./22.10.2026, Teil 2): Würfelnetze, Überschlagen, Kombinatorik, Maßstab (Kl. 4),
// Endlaute, Buchstaben zählen, Silben bauen (Kl. 1), Nachsilben, Sachtexte (Kl. 4), Classroom English.
import { chance, choice, fixedChoice, pick, pickN, ri, shuffle, type Rng } from '../engine/rng';
import type { Skill, Stage } from '../engine/types';
import { skill, type Gen } from './helpers';

const M = (grade: 1 | 2 | 3 | 4, ...a: Parameters<typeof skill> extends [unknown, unknown, ...infer R] ? R : never) => skill('mathe', grade, ...a);
const D = (grade: 1 | 2 | 3 | 4, ...a: Parameters<typeof skill> extends [unknown, unknown, ...infer R] ? R : never) => skill('deutsch', grade, ...a);
const E = (year: 1 | 2, ...a: Parameters<typeof skill> extends [unknown, unknown, ...infer R] ? R : never) => skill('englisch', year === 1 ? 3 : 4, ...a);

// ---------- Würfelnetze ----------

type Cell = [number, number];
/**
 * Lässt sich das Netz zu einem Würfel falten? Wir „rollen“ einen Würfel über die Felder und merken uns,
 * welche Würfelseite unten liegt – sind es sechs verschiedene, ist es ein Würfelnetz.
 */
export function isCubeNet(cells: Cell[]): boolean {
  if (cells.length !== 6) return false;
  const key = (c: Cell) => `${c[0]},${c[1]}`;
  const set = new Set(cells.map(key));
  // Würfel: [unten, oben, Norden, Süden, Osten, Westen]
  type Cube = [number, number, number, number, number, number];
  const roll = (c: Cube, dx: number, dy: number): Cube => {
    const [d, u, n, s, e, w] = c;
    if (dx === 1) return [e, w, n, s, u, d];
    if (dx === -1) return [w, e, n, s, d, u];
    if (dy === 1) return [s, n, d, u, e, w];
    return [n, s, u, d, e, w];
  };
  const seen = new Map<string, Cube>([[key(cells[0]), [0, 1, 2, 3, 4, 5]]]);
  const queue: Cell[] = [cells[0]];
  while (queue.length) {
    const c = queue.shift()!;
    const cube = seen.get(key(c))!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nb: Cell = [c[0] + dx, c[1] + dy];
      if (!set.has(key(nb)) || seen.has(key(nb))) continue;
      seen.set(key(nb), roll(cube, dx, dy));
      queue.push(nb);
    }
  }
  if (seen.size !== 6) return false;
  return new Set([...seen.values()].map((c) => c[0])).size === 6;
}

/** zufälliges zusammenhängendes Netz aus 6 Quadraten (in die linke obere Ecke geschoben) */
function randomHexomino(r: Rng): Cell[] {
  const cells: Cell[] = [[0, 0]];
  const has = (x: number, y: number) => cells.some((c) => c[0] === x && c[1] === y);
  while (cells.length < 6) {
    const [x, y] = pick(r, cells);
    const [dx, dy] = pick(r, [[1, 0], [-1, 0], [0, 1], [0, -1]] as const);
    if (!has(x + dx, y + dy)) cells.push([x + dx, y + dy]);
  }
  const mx = Math.min(...cells.map((c) => c[0]));
  const my = Math.min(...cells.map((c) => c[1]));
  return cells.map(([x, y]) => [x - mx, y - my]);
}

function netTask(r: Rng): Gen {
  const wantValid = chance(r, 0.5);
  let cells = randomHexomino(r);
  for (let i = 0; i < 400 && isCubeNet(cells) !== wantValid; i++) cells = randomHexomino(r);
  const valid = isCubeNet(cells);
  return {
    key: JSON.stringify(cells),
    prompt: 'Kann man aus diesem Netz einen Würfel falten?',
    visual: { kind: 'net', cells },
    answer: fixedChoice(['ja', 'nein'], valid ? 'ja' : 'nein'),
    tags: [valid ? 'netz-ja' : 'netz-nein'],
    solution: valid
      ? ['Ja! Beim Falten liegt jedes Quadrat auf einer anderen Würfelseite – keine Seite fehlt, keine liegt doppelt.', 'Tipp: Stell dir vor, ein Quadrat ist der Boden, und klappe die anderen hoch.']
      : ['Nein. Beim Falten würden zwei Quadrate auf derselben Würfelseite landen – dafür fehlt eine andere Seite.', 'Typisch: Mehr als 4 Quadrate in einer Reihe oder ein 2×2-Block klappt nie.'],
  };
}

function estimateTask(r: Rng, s: Stage): Gen {
  const op = s === 1 ? '+' : s === 2 ? pick(r, ['+', '−']) : pick(r, ['+', '−', '·']);
  if (op === '·') {
    const a = ri(r, 21, 89);
    const b = ri(r, 3, 9);
    const ra = Math.round(a / 10) * 10;
    const est = ra * b;
    return { key: `${a}x${b}`, prompt: `Überschlage:\n${a} · ${b} ≈ ?`, speak: `Überschlage: ${a} mal ${b}. Ungefähr wie viel?`, answer: choice(r, String(est), [String(est + b * 10), String(est - b * 10), String(ra + b), String(est * 10)]), tags: ['ueberschlag-mal'], solution: [`Runde ${a} auf ${ra}.`, `${ra} · ${b} = ${est}`, `Also ist ${a} · ${b} ungefähr ${est} (genau: ${a * b}).`] };
  }
  // Minus: keine Überschläge wie 100 − 100 = 0 (sagen nichts über das Ergebnis)
  let a = 0, b = 0, ra = 0, rb = 0;
  for (let i = 0; i < 20; i++) {
    a = ri(r, op === '+' ? 120 : 260, 880);
    b = ri(r, 110, op === '+' ? 990 - a : a - 120);
    ra = Math.round(a / 100) * 100;
    rb = Math.round(b / 100) * 100;
    if (op === '+' || ra - rb >= 100) break;
  }
  const est = op === '+' ? ra + rb : ra - rb;
  const exact = op === '+' ? a + b : a - b;
  return { key: `${a}${op}${b}`, prompt: `Überschlage:\n${a} ${op} ${b} ≈ ?`, speak: `Überschlage: ${a} ${op === '+' ? 'plus' : 'minus'} ${b}. Ungefähr wie viel?`, answer: choice(r, String(est), [String(est + 100), String(est - 100), String(est + 200), String(Math.round(exact / 10) * 10 === est ? est + 300 : Math.round(exact / 10) * 10)].filter((x) => Number(x) > 0)), tags: [op === '+' ? 'ueberschlag-plus' : 'ueberschlag-minus'], solution: [`Runde auf Hunderter: ${a} ≈ ${ra}, ${b} ≈ ${rb}`, `${ra} ${op} ${rb} = ${est}`, `Genau wäre es ${exact} – der Überschlag ist nah dran.`] };
}

function comboTask(r: Rng, s: Stage): Gen {
  if (s < 3 || chance(r, 0.5)) {
    const [a, b] = s === 1 ? [ri(r, 2, 3), 2] : [ri(r, 2, 4), ri(r, 2, 4)];
    const sc = pick(r, [
      { t: `${a} T-Shirts und ${b} Hosen`, q: 'Wie viele verschiedene Kombinationen kann Lea anziehen?', x: 'T-Shirt', y: 'Hose', zu: 'Zu jedem T-Shirt', passt: 'Jedes T-Shirt passt zu jeder Hose' },
      { t: `${a} Eissorten und ${b} Arten von Bechern`, q: 'Wie viele verschiedene Eisbecher kann man bestellen (eine Sorte, ein Becher)?', x: 'Sorte', y: 'Becher', zu: 'Zu jeder Sorte', passt: 'Jede Sorte passt zu jedem Becher' },
      { t: `${a} Brotsorten und ${b} Beläge`, q: 'Wie viele verschiedene Brote kann man machen (ein Brot, ein Belag)?', x: 'Brot', y: 'Belag', zu: 'Zu jedem Brot', passt: 'Jedes Brot passt zu jedem Belag' },
    ]);
    return { key: `${sc.x}${a}-${b}`, prompt: `Es gibt ${sc.t}.\n${sc.q}`, answer: { type: 'number', value: a * b }, tags: ['kombinieren'], traps: [{ answer: String(a + b), tag: 'plus-statt-mal', hint: `${sc.passt}. Deshalb rechnest du ${a} · ${b}, nicht ${a} + ${b}.` }], solution: [`${sc.zu} gibt es ${b} Möglichkeiten.`, `${a} · ${b} = ${a * b} Möglichkeiten`, 'Tipp: Male ein Baumdiagramm oder schreibe alle Paare auf.'] };
  }
  const digits = pickN(r, [1, 2, 3, 4, 5, 6, 7, 8, 9], 3);
  return { key: `z${digits.join('')}`, prompt: `Wie viele verschiedene zweistellige Zahlen kannst du aus den Ziffern ${digits.join(', ')} bilden?\n(Jede Ziffer darf in einer Zahl nur einmal vorkommen.)`, answer: { type: 'number', value: 6 }, tags: ['zahlen-bilden'], solution: [`Zehnerziffer: 3 Möglichkeiten, Einerziffer danach: noch 2 Möglichkeiten.`, `3 · 2 = 6: ${digits.flatMap((x) => digits.filter((y) => y !== x).map((y) => `${x}${y}`)).join(', ')}`] };
}

function scaleTask(r: Rng, s: Stage): Gen {
  // Maßstab als Verhältnis 1 : 100 (Grundriss) – 1 cm auf dem Plan sind 100 cm = 1 m
  if (s > 1 && chance(r, 0.25)) {
    const cm = ri(r, 3, 9);
    const thing = pick(r, ['Das Kinderzimmer', 'Die Küche', 'Das Klassenzimmer', 'Der Flur']);
    return { key: `v100-${thing}-${cm}`, prompt: `Ein Grundriss hat den Maßstab 1 : 100.\n${thing} ist auf dem Plan ${cm} cm lang. Wie viele Meter sind das in Wirklichkeit?`, answer: { type: 'number', value: cm, unit: 'm' }, tags: ['massstab'], traps: [{ answer: String(cm * 100), tag: 'massstab', hint: '1 : 100 heißt: 1 cm auf dem Plan sind 100 cm in Wirklichkeit – und 100 cm sind 1 m.' }], solution: ['1 : 100 heißt: 1 cm auf dem Plan sind 100 cm = 1 m in Wirklichkeit.', `${cm} cm auf dem Plan sind ${cm} · 1 m = ${cm} m.`] };
  }
  const m = s === 1 ? 10 : pick(r, [10, 20, 50, 100, 200, 500, 1000]);
  const real = m === 1000 ? '1 km' : `${m} m`;
  if (s === 3 && chance(r, 0.5)) {
    const cm = ri(r, 2, 9);
    const dist = cm * m;
    return { key: `r${m}-${cm}`, prompt: `Auf der Karte ist 1 cm in Wirklichkeit ${real}.\nIn Wirklichkeit ist der Weg ${m === 1000 ? `${cm} km` : `${dist} m`} lang. Wie viele cm sind das auf der Karte?`, answer: { type: 'number', value: cm, unit: 'cm' }, tags: ['massstab-rueckwaerts'], solution: [`1 cm ≙ ${real}`, `${m === 1000 ? `${cm} km` : `${dist} m`} : ${real} = ${cm}`, `Auf der Karte: ${cm} cm`] };
  }
  const cm = ri(r, 2, 9);
  const v = m === 1000 ? cm : cm * m;
  return { key: `${m}-${cm}`, prompt: `Auf dem Plan ist 1 cm in Wirklichkeit ${real}.\nEin Weg ist auf dem Plan ${cm} cm lang. Wie lang ist er in Wirklichkeit?`, answer: { type: 'number', value: v, unit: m === 1000 ? 'km' : 'm' }, tags: ['massstab'], traps: [{ answer: String(cm), tag: 'massstab-vergessen', hint: `Auf dem Plan sind es ${cm} cm – in Wirklichkeit ist jeder Zentimeter ${real} lang.` }], solution: [`1 cm ≙ ${real}`, `${cm} cm ≙ ${cm} · ${real} = ${m === 1000 ? `${cm} km` : `${v} m`}`] };
}

export const MATHE_EXTRA2: Skill[] = [
  M(4, 'm4-wuerfelnetze', 'Würfelnetze', '🎲', { text: ['Ein Würfelnetz besteht aus 6 Quadraten. Faltet man es, entsteht ein Würfel.', 'Es gibt genau 11 verschiedene Würfelnetze.', 'Kein Würfelnetz: mehr als 4 Quadrate in einer Reihe, ein Block aus 2 × 2 Quadraten (ein großes Quadrat) oder wenn beim Falten zwei Quadrate übereinander liegen.', 'Tipp: Bestimme ein Quadrat als Boden und klappe in Gedanken die anderen hoch.'], visual: { kind: 'net', cells: [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]] }, videoQuery: 'Würfelnetze erkennen Grundschule' }, netTask, { tagLabels: { 'netz-ja': 'Würfelnetze erkennen', 'netz-nein': 'falsche Netze erkennen' }, testSeconds: 30 }),
  M(4, 'm4-ueberschlag', 'Überschlagen', '🤔', { text: ['Beim Überschlagen rechnest du mit gerundeten Zahlen – das geht schnell im Kopf.', '489 + 312: Runde auf 500 + 300 = 800. Das Ergebnis liegt ungefähr bei 800.', 'Mit dem Überschlag prüfst du, ob dein genaues Ergebnis stimmen kann.'], visual: { kind: 'text', text: '489 + 312 ≈ 500 + 300 = 800' }, videoQuery: 'Überschlagsrechnung Grundschule' }, estimateTask, { tagLabels: { 'ueberschlag-plus': 'Überschlag bei Plus', 'ueberschlag-minus': 'Überschlag bei Minus', 'ueberschlag-mal': 'Überschlag bei Mal' }, testSeconds: 30 }),
  M(4, 'm4-kombinatorik', 'Wie viele Möglichkeiten?', '👕', { text: ['3 T-Shirts und 2 Hosen: Zu jedem T-Shirt passen 2 Hosen.', 'Also gibt es 3 · 2 = 6 Möglichkeiten.', 'Ein Baumdiagramm oder eine Liste hilft, keine Möglichkeit zu vergessen.'], visual: { kind: 'emoji', chars: '👕👕👕 × 👖👖' }, videoQuery: 'Kombinatorik Grundschule Möglichkeiten' }, comboTask, { tagLabels: { kombinieren: 'Kombinationen zählen', 'zahlen-bilden': 'Zahlen aus Ziffern bilden', 'plus-statt-mal': 'plus statt mal gerechnet' }, testSeconds: 40 }),
  M(4, 'm4-massstab', 'Maßstab', '🗺️', { text: ['Auf Karten und Plänen ist alles verkleinert.', 'Der Maßstab sagt, wie lang 1 cm in Wirklichkeit ist – zum Beispiel 1 cm ≙ 100 m.', '3 cm auf der Karte sind dann 3 · 100 m = 300 m in Wirklichkeit.'], visual: { kind: 'text', text: '1 cm ≙ 100 m' }, videoQuery: 'Maßstab Grundschule Karte' }, scaleTask, { tagLabels: { massstab: 'Maßstab anwenden', 'massstab-rueckwaerts': 'Maßstab rückwärts', 'massstab-vergessen': 'Maßstab vergessen' }, testSeconds: 35 }),
];

// ---------- Deutsch Kl. 1 ----------
const END: [string, string, string][] = [
  ['Hut', '🎩', 't'], ['Maus', '🐭', 's'], ['Igel', '🦔', 'l'], ['Sofa', '🛋️', 'a'], ['Ente', '🦆', 'e'], ['Kamel', '🐫', 'l'], ['Auto', '🚗', 'o'], ['Uhr', '⌚', 'r'],
  ['Eis', '🍦', 's'], ['Löwe', '🦁', 'e'], ['Tiger', '🐯', 'r'], ['Rose', '🌹', 'e'], ['Bus', '🚌', 's'], ['Lama', '🦙', 'a'], ['Nest', '🐣', 't'], ['Pilz', '🍄', 'z'], ['Ufo', '🛸', 'o'], ['Kuchen', '🍰', 'n'], ['Apfel', '🍎', 'l'], ['Ball', '⚽', 'l'],
  // Nachtlauf 22.10.2026: mehr Wörter
  ['Kran', '🏗️', 'n'], ['Brot', '🍞', 't'], ['Schaf', '🐑', 'f'], ['Oma', '👵', 'a'], ['Kino', '🎬', 'o'], ['Stern', '⭐', 'n'], ['Pinsel', '🖌️', 'l'],
  ['Tomate', '🍅', 'e'], ['Radio', '📻', 'o'], ['Pizza', '🍕', 'a'], ['Elefant', '🐘', 't'], ['Hammer', '🔨', 'r'], ['Kerze', '🕯️', 'e'],
];
function endTask(r: Rng): Gen {
  const [w, e, l] = pick(r, END);
  return { key: w, prompt: 'Mit welchem Buchstaben endet das Wort?', speak: `Mit welchem Buchstaben endet das Wort ${w}?`, listen: { text: w, lang: 'de' }, visual: { kind: 'emoji', chars: e }, answer: { ...choice(r, l, ['a', 'e', 'l', 'n', 'o', 'r', 's', 't', 'z'].filter((x) => x !== l)), big: true }, tags: ['endlaut'], solution: [`Sprich langsam: ${w.split('').join(' – ')}`, `${w} endet mit ${l}.`], solutionVisual: { kind: 'word', word: w, mark: [[w.length - 1, w.length]] } };
}
const COUNT_W: [string, string][] = [['Ei', '🥚'], ['Hut', '🎩'], ['Bus', '🚌'], ['Maus', '🐭'], ['Igel', '🦔'], ['Sofa', '🛋️'], ['Ente', '🦆'], ['Kamel', '🐫'], ['Tiger', '🐯'], ['Apfel', '🍎'], ['Banane', '🍌'], ['Tomate', '🍅'], ['Fisch', '🐟'], ['Schaf', '🐑'], ['Oma', '👵'], ['Auto', '🚗'], ['Hund', '🐶'], ['Katze', '🐱'], ['Mond', '🌙'], ['Sonne', '☀️'], ['Rose', '🌹'], ['Uhr', '⏰'], ['Schuh', '👟'], ['Pinsel', '🖌️'],
  // Nachtlauf 22.10.2026: mehr Wörter
  ['Nase', '👃'], ['Brot', '🍞'], ['Stern', '⭐'], ['Zebra', '🦓'], ['Eule', '🦉'], ['Schule', '🏫'], ['Kerze', '🕯️'], ['Wolke', '☁️']];
function countTask(r: Rng): Gen {
  const [w, e] = pick(r, COUNT_W);
  return { key: w, prompt: `Wie viele Buchstaben hat das Wort?\n${w}`, speak: `Wie viele Buchstaben hat das Wort ${w}?`, visual: { kind: 'emoji', chars: e }, answer: { type: 'number', value: w.length }, tags: [w.includes('sch') || w.startsWith('Sch') ? 'sch-zaehlen' : 'buchstaben-zaehlen'], solution: [`${w.split('').join(' – ')}`, `Das sind ${w.length} Buchstaben.`, ...(w.toLowerCase().includes('sch') ? ['Achtung: „sch“ klingt wie ein Laut, sind aber 3 Buchstaben (s, c, h).'] : [])], solutionVisual: { kind: 'word', word: w } };
}
const BUILD: [string[], string][] = [[['Ba', 'na', 'ne'], '🍌'], [['To', 'ma', 'te'], '🍅'], [['Ra', 'ke', 'te'], '🚀'], [['Me', 'lo', 'ne'], '🍉'], [['Ap', 'fel'], '🍎'], [['Ti', 'ger'], '🐯'], [['Ka', 'mel'], '🐫'], [['So', 'fa'], '🛋️'], [['Lö', 'we'], '🦁'], [['Na', 'se'], '👃'], [['Zi', 'tro', 'ne'], '🍋'], [['Ha', 'se'], '🐰'], [['Ro', 'se'], '🌹'], [['Do', 'se'], '🥫'], [['Pi', 'rat'], '🏴‍☠️'], [['Ro', 'bo', 'ter'], '🤖'], [['Ka', 'rot', 'te'], '🥕'], [['Piz', 'za'], '🍕'], [['Ga', 'bel'], '🍴'], [['Kro', 'ko', 'dil'], '🐊'], [['Pa', 'pa', 'gei'], '🦜'], [['Wol', 'ke'], '☁️'],
  // Nachtlauf 22.10.2026: mehr Wörter
  [['Ku', 'chen'], '🍰'], [['Hu', 'pe'], '📯'], [['Ei', 'mer'], '🪣'], [['Ka', 'nu'], '🛶'], [['Bril', 'le'], '👓'], [['Lam', 'pe'], '💡'], [['Mu', 'schel'], '🐚'], [['Schne', 'cke'], '🐌'], [['Ze', 'bra'], '🦓'], [['Te', 'le', 'fon'], '☎️'], [['Pin', 'gu', 'in'], '🐧']];
function buildTask(r: Rng, s: Stage): Gen {
  const [parts, e] = pick(r, BUILD);
  const word = parts.join('');
  const shuffled = s === 3 ? shuffle(r, parts) : parts;
  const wrong = [shuffle(r, parts).join(''), [...parts].reverse().join(''), parts.map((p, i) => (i === 0 ? p : p.split('').reverse().join(''))).join('')].map((x) => x[0].toUpperCase() + x.slice(1).toLowerCase()).filter((x) => x !== word);
  return { key: `${word}-${s}`, prompt: `Welches Wort entsteht aus den Silben?\n${shuffled.join(' + ')}`, speak: s === 3 ? 'Die Silben sind durcheinander. Welches Wort entsteht?' : `Welches Wort entsteht aus ${parts.join(' ')}?`, visual: s === 1 ? { kind: 'emoji', chars: e } : undefined, answer: { ...choice(r, word, [...wrong, word.slice(0, -1) + 'n']), speakOptions: 'de' }, tags: [s === 3 ? 'silben-ordnen' : 'silben-lesen'], solution: [`${parts.join(' – ')} → ${word}`], solutionVisual: { kind: 'syllables', parts, emoji: e } };
}

// ---------- Deutsch Kl. 4 ----------
const NACH: [string, string, string, string?][] = [
  ['frei', 'Freiheit', 'heit'], ['krank', 'Krankheit', 'heit'], ['schön', 'Schönheit', 'heit'], ['dunkel', 'Dunkelheit', 'heit'], ['gesund', 'Gesundheit', 'heit'],
  ['ehrlich', 'Ehrlichkeit', 'keit'], ['freundlich', 'Freundlichkeit', 'keit'], ['sauber', 'Sauberkeit', 'keit'], ['traurig', 'Traurigkeit', 'keit'], ['pünktlich', 'Pünktlichkeit', 'keit'],
  ['wohnen', 'Wohnung', 'ung'], ['zeichnen', 'Zeichnung', 'ung'], ['hoffen', 'Hoffnung', 'ung'], ['meinen', 'Meinung', 'ung'], ['bewegen', 'Bewegung', 'ung'],
  ['erleben', 'Erlebnis', 'nis', 'das'], ['ergeben', 'Ergebnis', 'nis', 'das'], ['zeugen', 'Zeugnis', 'nis', 'das'], ['geheim', 'Geheimnis', 'nis', 'das'], ['erlauben', 'Erlaubnis', 'nis'],
  // Nachtlauf 22.10.2026: mehr Wörter
  ['klug', 'Klugheit', 'heit'], ['faul', 'Faulheit', 'heit'], ['sicher', 'Sicherheit', 'heit'], ['gleich', 'Gleichheit', 'heit'],
  ['fröhlich', 'Fröhlichkeit', 'keit'], ['höflich', 'Höflichkeit', 'keit'], ['flüssig', 'Flüssigkeit', 'keit'], ['fähig', 'Fähigkeit', 'keit'],
  ['rechnen', 'Rechnung', 'ung'], ['warnen', 'Warnung', 'ung'], ['lösen', 'Lösung', 'ung'], ['ordnen', 'Ordnung', 'ung'],
  ['finster', 'Finsternis', 'nis'], ['hindern', 'Hindernis', 'nis', 'das'], ['wild', 'Wildnis', 'nis'], ['ärgern', 'Ärgernis', 'nis', 'das'],
];
function nachTask(r: Rng, s: Stage): Gen {
  const [base, noun, suf, art = 'die'] = pick(r, NACH);
  const stem = noun.slice(0, noun.length - suf.length);
  if (s === 3) return { key: `${noun}-t`, prompt: `Bilde das Nomen:\n${base} → ${art} ☐`, speak: `Bilde das Nomen zu ${base}.`, answer: { type: 'text', value: noun, caseSensitive: true }, tags: [`nachsilbe-${suf}`, 'gross-klein'], solution: [`${base} → ${art} ${noun}`, 'Wörter mit -heit, -keit, -ung und -nis sind Nomen – man schreibt sie groß!'] };
  return { key: noun, prompt: `Aus „${base}“ wird ein Nomen:\n${art} ${stem}☐`, speak: `Aus ${base} wird ein Nomen. Welche Endung passt?`, answer: { ...fixedChoice(['heit', 'keit', 'ung', 'nis'], suf), big: true }, tags: [`nachsilbe-${suf}`], solution: [`${base} → ${art} ${noun}`, 'Mit den Nachsilben -heit, -keit, -ung und -nis werden aus Adjektiven und Verben Nomen. Diese Nomen schreibt man groß.', suf === 'keit' ? 'Tipp: Adjektive auf -lich und -ig bekommen meist -keit.' : suf === 'ung' ? 'Tipp: Verben bekommen oft -ung: wohnen → Wohnung.' : ''].filter(Boolean) };
}
const SACH: { title: string; t: string; qs: [string, string, string[]][] }[] = [
  { title: 'Der Maulwurf', t: 'Der Maulwurf lebt fast immer unter der Erde. Mit seinen großen, schaufelartigen Vorderpfoten gräbt er lange Gänge. Die Erde, die er dabei wegschiebt, drückt er nach oben – so entstehen die Maulwurfshügel auf Wiesen. Maulwürfe sehen sehr schlecht, aber sie können sehr gut riechen und fühlen. Sie fressen vor allem Regenwürmer und Insektenlarven.', qs: [['Wie entstehen Maulwurfshügel?', 'Der Maulwurf drückt die Erde nach oben.', ['Der Wind weht die Erde zusammen.', 'Kinder bauen sie.', 'Regenwürmer graben sie.']], ['Womit gräbt der Maulwurf?', 'mit seinen Vorderpfoten', ['mit seiner Nase', 'mit den Zähnen', 'mit dem Schwanz']], ['Warum findet der Maulwurf sein Futter trotz schlechter Augen?', 'Er kann sehr gut riechen und fühlen.', ['Er hat eine Taschenlampe.', 'Er sieht im Dunkeln sehr gut.', 'Andere Tiere helfen ihm.']]] },
  { title: 'Die Kartoffel', t: 'Die Kartoffel kommt ursprünglich aus Südamerika. Vor etwa 450 Jahren brachten Seefahrer sie nach Europa. Zuerst pflanzten die Menschen sie nur wegen ihrer hübschen Blüten. Erst später entdeckten sie, dass die Knollen unter der Erde gut schmecken und satt machen. Heute ist die Kartoffel in Deutschland eines der wichtigsten Lebensmittel.', qs: [['Woher kommt die Kartoffel ursprünglich?', 'aus Südamerika', ['aus Afrika', 'aus Deutschland', 'aus Asien']], ['Warum pflanzte man sie zuerst?', 'wegen ihrer hübschen Blüten', ['weil sie gut schmeckt', 'als Tierfutter', 'als Medizin']], ['Welcher Teil der Pflanze wird gegessen?', 'die Knollen unter der Erde', ['die Blüten', 'die Blätter', 'die Früchte am Stängel']]] },
  { title: 'Der Igel', t: 'Igel sind nachtaktive Tiere. Am Tag schlafen sie unter Hecken oder in Laubhaufen. Nachts suchen sie nach Käfern, Würmern und Schnecken. Ein Igel hat etwa 7000 Stacheln. Wenn er Angst hat, rollt er sich zu einer Kugel zusammen. Im Winter hält er einen Winterschlaf, der bis zu fünf Monate dauern kann.', qs: [['Wann sucht der Igel sein Futter?', 'nachts', ['am Mittag', 'am Morgen', 'im Winter']], ['Wie viele Stacheln hat ein Igel ungefähr?', 'etwa 7000', ['etwa 70', 'etwa 700', 'etwa 70 000']], ['Was macht der Igel, wenn er Angst hat?', 'Er rollt sich zu einer Kugel zusammen.', ['Er rennt schnell weg.', 'Er gräbt ein Loch.', 'Er klettert auf einen Baum.']], ['Welche Überschrift passt am besten?', 'Der Igel – ein stacheliger Nachtwanderer', ['Mein Haustier', 'Tiere im Zoo', 'Der Igel im Sommerurlaub']]] },
  { title: 'Bienen', t: 'Bienen leben in großen Gruppen, die man Völker nennt. In einem Volk gibt es eine Königin, viele Arbeiterinnen und einige Drohnen. Die Arbeiterinnen sammeln Nektar und Pollen von Blüten. Aus dem Nektar machen sie Honig. Beim Sammeln bestäuben die Bienen die Blüten – so können Obst und Gemüse wachsen.', qs: [['Wie nennt man eine große Gruppe von Bienen?', 'ein Volk', ['eine Herde', 'ein Rudel', 'eine Klasse']], ['Woraus machen Bienen Honig?', 'aus Nektar', ['aus Wasser', 'aus Blättern', 'aus Zucker']], ['Warum sind Bienen wichtig für Obst und Gemüse?', 'Sie bestäuben die Blüten.', ['Sie fressen Schädlinge.', 'Sie gießen die Pflanzen.', 'Sie machen Honig für die Pflanzen.']], ['Wer sammelt den Nektar?', 'die Arbeiterinnen', ['die Königin', 'die Drohnen', 'die Imker']]] },
  { title: 'Der Mond', t: 'Der Mond kreist um die Erde. Für eine Runde braucht er ungefähr einen Monat. Der Mond leuchtet nicht selbst – er wird von der Sonne angestrahlt. Deshalb sehen wir manchmal nur eine schmale Sichel und manchmal den ganzen runden Vollmond. Im Jahr 1969 betraten zum ersten Mal Menschen den Mond.', qs: [['Warum leuchtet der Mond?', 'Er wird von der Sonne angestrahlt.', ['Er hat eigene Lampen.', 'Er brennt wie ein Feuer.', 'Die Sterne leuchten ihn an.']], ['Wie lange braucht der Mond für eine Runde um die Erde?', 'ungefähr einen Monat', ['einen Tag', 'eine Woche', 'ein Jahr']], ['Wann betraten Menschen zum ersten Mal den Mond?', 'im Jahr 1969', ['im Jahr 1869', 'im Jahr 2000', 'noch nie']]] },
  { title: 'Der Löwenzahn', t: 'Der Löwenzahn wächst fast überall: auf Wiesen, am Wegrand und sogar in Ritzen zwischen Steinen. Im Frühling hat er leuchtend gelbe Blüten. Später wird aus der Blüte eine weiße Kugel, die Pusteblume. Der Wind trägt die kleinen Samen mit ihren Schirmchen weit weg. So kann an einem neuen Ort ein neuer Löwenzahn wachsen.', qs: [['Was wird aus der gelben Blüte?', 'eine weiße Pusteblume', ['ein Apfel', 'eine rote Beere', 'ein neues Blatt']], ['Wie kommen die Samen an einen neuen Ort?', 'Der Wind trägt sie weg.', ['Kinder pflanzen sie ein.', 'Vögel fressen sie.', 'Sie rollen weg.']], ['Wo wächst der Löwenzahn?', 'fast überall, sogar zwischen Steinen', ['nur im Wald', 'nur im Wasser', 'nur im Blumentopf']]] },
  { title: 'Der Wasserkreislauf', t: 'Die Sonne erwärmt das Wasser in Meeren, Seen und Flüssen. Dabei verdunstet ein Teil des Wassers und steigt als Wasserdampf nach oben. In der kalten Luft bilden sich daraus Wolken. Werden die Wassertropfen in den Wolken zu schwer, fallen sie als Regen oder Schnee auf die Erde. Das Wasser fließt wieder in Flüsse und Meere – und alles beginnt von vorn.', qs: [['Was passiert, wenn die Sonne das Wasser erwärmt?', 'Es verdunstet.', ['Es gefriert.', 'Es wird salzig.', 'Es versickert.']], ['Woraus bilden sich Wolken?', 'aus Wasserdampf', ['aus Rauch', 'aus Staub', 'aus Sand']], ['Warum heißt es „Kreislauf“?', 'Weil alles immer wieder von vorn beginnt.', ['Weil Wolken rund sind.', 'Weil das Wasser im Kreis fließt.', 'Weil die Erde rund ist.']]] },
  // Nachtlauf 22.10.2026: mehr Sachtexte
  { title: 'Der Regenwurm', t: 'Regenwürmer leben im Boden. Sie haben keine Augen und keine Beine. Mit ihrer Haut spüren sie Licht und Wärme. Regenwürmer fressen abgestorbene Blätter und Erde. Dabei lockern sie den Boden auf, sodass Luft und Wasser besser hineinkommen. Ihr Kot ist ein guter Dünger. Darum freuen sich Gärtnerinnen und Gärtner über viele Regenwürmer.', qs: [['Was fressen Regenwürmer?', 'abgestorbene Blätter und Erde', ['Käfer und Mücken', 'frisches Gras', 'Obst und Gemüse']], ['Womit spüren Regenwürmer Licht?', 'mit ihrer Haut', ['mit ihren Augen', 'mit ihren Beinen', 'gar nicht']], ['Warum freuen sich Gärtner über Regenwürmer?', 'Sie lockern den Boden und düngen ihn.', ['Sie fressen die Schnecken.', 'Sie gießen die Pflanzen.', 'Sie vertreiben die Vögel.']]] },
  { title: 'Der Rhein', t: 'Der Rhein ist einer der längsten Flüsse in Europa. Er entspringt in den Alpen in der Schweiz und fließt durch Deutschland bis in die Niederlande. Dort mündet er in die Nordsee. In Nordrhein-Westfalen liegen große Städte am Rhein, zum Beispiel Köln und Düsseldorf. Auf dem Rhein fahren viele Schiffe, die Waren transportieren.', qs: [['Wo entspringt der Rhein?', 'in den Alpen in der Schweiz', ['in der Nordsee', 'in Köln', 'in den Niederlanden']], ['In welches Meer mündet der Rhein?', 'in die Nordsee', ['in die Ostsee', 'ins Mittelmeer', 'in den Atlantik']], ['Welche Stadt liegt am Rhein?', 'Köln', ['München', 'Hamburg', 'Berlin']], ['Wozu fahren viele Schiffe auf dem Rhein?', 'Sie transportieren Waren.', ['Sie fangen Fische.', 'Sie messen das Wasser.', 'Sie bauen Brücken.']]] },
  { title: 'Der Biber', t: 'Biber leben an Flüssen und Seen. Mit ihren scharfen Zähnen können sie sogar dicke Bäume fällen. Aus Ästen, Schlamm und Steinen bauen sie Dämme. So staut sich das Wasser, und der Eingang zu ihrer Burg liegt unter Wasser. Dort sind die Jungen vor Feinden sicher. Biber fressen Rinde, Blätter und Wasserpflanzen. Früher waren sie in Deutschland fast ausgestorben, heute gibt es wieder viele.', qs: [['Womit fällen Biber Bäume?', 'mit ihren scharfen Zähnen', ['mit ihren Pfoten', 'mit ihrem Schwanz', 'mit Steinen']], ['Warum liegt der Eingang der Biberburg unter Wasser?', 'Dort sind die Jungen vor Feinden sicher.', ['Biber können nicht laufen.', 'Dort ist es wärmer.', 'Biber mögen kein Licht.']], ['Was fressen Biber?', 'Rinde, Blätter und Wasserpflanzen', ['Fische und Frösche', 'Mäuse und Käfer', 'Nüsse und Beeren']], ['Welche Überschrift passt am besten?', 'Der Biber – ein Baumeister am Wasser', ['Fische im Fluss', 'Wie man Bäume fällt', 'Tiere im Winter']]] },
  { title: 'Die Feuerwehr', t: 'Wenn es brennt, wählt man die Notrufnummer 112. Die Feuerwehr kommt dann mit Blaulicht und Martinshorn. Feuerwehrleute tragen schwere Schutzkleidung und einen Helm. Mit Schläuchen löschen sie das Feuer. Die Feuerwehr hilft aber nicht nur bei Bränden: Sie rettet auch Menschen nach Unfällen oder holt Tiere aus Notlagen. In vielen Dörfern arbeiten die Feuerwehrleute freiwillig, ohne Geld dafür zu bekommen.', qs: [['Welche Nummer wählt man, wenn es brennt?', '112', ['110', '911', '123']], ['Wobei hilft die Feuerwehr außerdem?', 'Sie rettet Menschen nach Unfällen.', ['Sie verteilt Briefe.', 'Sie baut Häuser.', 'Sie repariert Autos.']], ['Was bedeutet „freiwillig“ in diesem Text?', 'Sie helfen, ohne Geld dafür zu bekommen.', ['Sie müssen jeden Tag arbeiten.', 'Sie sind besonders schnell.', 'Sie haben heute frei.']]] },
];
function sachTask(r: Rng): Gen {
  const st = pick(r, SACH);
  const [q, a, w] = pick(r, st.qs);
  return { key: `${st.title}|${q}`, prompt: q, visual: { kind: 'text', text: st.t, title: st.title }, answer: choice(r, a, w), tags: [q.startsWith('Warum') ? 'schlussfolgern' : q.includes('Überschrift') ? 'hauptaussage' : 'informationen-finden'], solution: ['Suche im Sachtext die Stelle, die zur Frage passt.', `Antwort: ${a}`] };
}

// ---------- Englisch ----------
const CLASS: [string, string, string][] = [
  ['Stand up.', 'Steh auf.', '🧍'], ['Sit down.', 'Setz dich.', '🪑'], ['Open your book.', 'Öffne dein Buch.', '📖'], ['Close the door.', 'Schließ die Tür.', '🚪'], ['Listen.', 'Hör zu.', '👂'],
  ['Be quiet, please.', 'Sei bitte leise.', '🤫'], ['Raise your hand.', 'Melde dich.', '✋'], ['Look at the board.', 'Schau an die Tafel.', '👀'], ['Write your name.', 'Schreib deinen Namen.', '✍️'], ['Draw a picture.', 'Mal ein Bild.', '🖍️'],
  ['Take out your pencil.', 'Nimm deinen Bleistift heraus.', '✏️'], ['Clean the board.', 'Wisch die Tafel.', '🧽'], ['Make a circle.', 'Bildet einen Kreis.', '⭕'], ['Work with a partner.', 'Arbeite mit einem Partner.', '👫'],
  ['Pack your schoolbag.', 'Pack deine Schultasche.', '🎒'], ['Sing a song.', 'Sing ein Lied.', '🎵'], ['Cut it out.', 'Schneide es aus.', '✂️'], ['Count to ten.', 'Zähl bis zehn.', '🔟'],
];
function classTask(r: Rng, s: Stage): Gen {
  const [en, de, e] = pick(r, CLASS);
  const others = CLASS.filter((x) => x[0] !== en);
  const say = { text: en, lang: 'en' as const };
  if (s === 1 || chance(r, 0.5)) return { key: `h-${en}`, prompt: 'Hör gut zu! Welches Bild passt?', speak: 'Hör gut zu!', listen: say, answer: { ...choice(r, e, pickN(r, others, s === 1 ? 2 : 3).map((x) => x[2])), big: true }, tags: ['hören'], solution: [`${en} = ${de}`], pronounce: say };
  return { key: `v-${en}`, prompt: `Was bedeutet „${en}“?`, speak: 'Was bedeutet das?', listen: say, answer: choice(r, de, pickN(r, others, 3).map((x) => x[1])), tags: ['verstehen'], solution: [`${en} = ${de}`], pronounce: say };
}

export const DEUTSCH_EXTRA2: Skill[] = [
  D(1, 'd1-endlaut', 'Endlaute', '🔚', { text: ['Der Endlaut ist der letzte Laut eines Wortes.', 'Sprich das Wort langsam und hör auf das Ende: Hu – t. Der Endlaut ist t.'], visual: { kind: 'word', word: 'Hut', mark: [[2, 3]] }, videoQuery: 'Anlaut Endlaut Inlaut Klasse 1' }, endTask, { tagLabels: { endlaut: 'Endlaute hören' }, testSeconds: 15 }),
  D(1, 'd1-buchstaben-zaehlen', 'Buchstaben zählen', '🔢', { text: ['Zeige beim Zählen auf jeden Buchstaben.', 'Achtung: „sch“ klingt wie ein Laut, besteht aber aus 3 Buchstaben – s, c, h.'], visual: { kind: 'word', word: 'Schaf' }, videoQuery: 'Buchstaben Laute unterscheiden Klasse 1' }, countTask, { tagLabels: { 'sch-zaehlen': 'sch richtig zählen', 'buchstaben-zaehlen': 'Buchstaben zählen' }, testSeconds: 15 }),
  D(1, 'd1-silben-bauen', 'Silben zu Wörtern', '🧱', { text: ['Lies die Silben nacheinander und verbinde sie: Ba + na + ne → Banane.', 'Sprich das Wort danach noch einmal ganz – klingt es richtig?'], visual: { kind: 'syllables', parts: ['Ba', 'na', 'ne'], emoji: '🍌' }, videoQuery: 'Silben lesen Wörter zusammensetzen Klasse 1' }, buildTask, { tagLabels: { 'silben-lesen': 'Silben zusammenlesen', 'silben-ordnen': 'Silben ordnen' }, testSeconds: 20 }),
  D(4, 'd4-nachsilben', 'Nomen mit -heit, -keit, -ung, -nis', '🧪', { text: ['Mit Nachsilben werden aus Adjektiven und Verben Nomen: frei → die Freiheit, wohnen → die Wohnung.', 'Die Nachsilben -heit, -keit, -ung und -nis zeigen: Das ist ein Nomen – also groß schreiben!', 'Adjektive auf -lich und -ig bekommen meistens -keit: freundlich → Freundlichkeit.'], visual: { kind: 'text', text: 'frei → die Freiheit' }, videoQuery: 'Nachsilben heit keit ung nis Nomen Grundschule' }, nachTask, { tagLabels: { 'nachsilbe-heit': '-heit', 'nachsilbe-keit': '-keit', 'nachsilbe-ung': '-ung', 'nachsilbe-nis': '-nis', 'gross-klein': 'Nomen groß schreiben' }, testSeconds: 20 }),
  D(4, 'd4-sachtexte', 'Sachtexte lesen', '🔬', { text: ['Sachtexte informieren über ein Thema – zum Beispiel über Tiere oder die Natur.', 'Lies zuerst die Überschrift: Worum geht es?', 'Suche dann die Stelle, die zur Frage passt. Bei „Warum“-Fragen musst du Informationen verbinden.'], videoQuery: 'Sachtexte lesen und verstehen Grundschule' }, sachTask, { tagLabels: { 'informationen-finden': 'Informationen finden', schlussfolgern: 'Schlussfolgern', hauptaussage: 'passende Überschrift' }, testSeconds: 75 }),
];

export const ENGLISCH_EXTRA2: Skill[] = [
  E(1, 'e1-classroom', 'Classroom English', '🏫', { text: ['Im Englischunterricht hörst du oft diese Sätze:', 'Stand up. – Steh auf. · Sit down. – Setz dich.', 'Open your book. – Öffne dein Buch. · Listen. – Hör zu.', 'Raise your hand. – Melde dich.'], visual: { kind: 'emoji', chars: '🏫' }, videoQuery: 'classroom commands song for kids' }, classTask, { tagLabels: { hören: 'Anweisungen hören', verstehen: 'Anweisungen verstehen' }, testSeconds: 15 }),
];
