// Mathe, Klassen 1–4 (orientiert am Lehrplan Mathematik Grundschule NRW 2021).
import { chance, choice, fixedChoice, fmt, pick, ri, shuffle, type Rng } from '../engine/rng';
import type { Skill, Stage } from '../engine/types';
import { NAMES, PLACE, PLACE_SHORT, columnAdd, columnDiv, columnMul1, columnSub, digitsOf, skill, type Gen } from './helpers';

const M = (grade: 1 | 2 | 3 | 4, ...a: Parameters<typeof skill> extends [unknown, unknown, ...infer R] ? R : never) => skill('mathe', grade, ...a);

const sumUp = (a: number, b: number) => a + b;
const ueber = { 'zehnerübergang': 'Zehnerübergang', 'ohne-übergang': 'ohne Zehnerübergang', 'übertrag-vergessen': 'Übertrag vergessen', 'einer-vertauscht': 'kleiner minus größer bei den Einern' };

// ---------- Klasse 1 ----------

const SCATTER_THINGS: [string, string][] = [['🐞', 'Marienkäfer'], ['🍓', 'Erdbeeren'], ['⭐', 'Sterne'], ['🐟', 'Fische'], ['🌸', 'Blüten'], ['🍄', 'Pilze']];
const zaehlen = M(1, 'm1-zaehlen', 'Mengen zählen bis 20', '🔢', {
  text: [
    'Zähle nicht jeden Punkt einzeln – das dauert lange und man verzählt sich leicht.',
    'Im Zehnerfeld hat eine Reihe 5 Punkte, ein volles Feld hat 10 Punkte.',
    'Siehst du ein volles Feld und noch 3 Punkte? Dann sind es 10 + 3 = 13.',
    'Liegen die Dinge durcheinander, tippe jedes beim Zählen einmal an oder bilde Fünfer-Gruppen.',
  ],
  visual: { kind: 'dots', n: 13 },
  videoQuery: 'Zehnerfeld Mengen erfassen Klasse 1',
}, (r, s) => {
  const n = s === 1 ? ri(r, 3, 10) : s === 2 ? ri(r, 6, 15) : ri(r, 11, 20);
  // ungeordnete Menge: Bilder durcheinander – abzählen und Fünfer bilden
  if (s > 1 && chance(r, 0.4)) {
    const [e, name] = pick(r, SCATTER_THINGS);
    const cells = shuffle(r, Array.from({ length: 24 }, (_, i) => i)).slice(0, n);
    const pts = cells.map((c) => [20 + (c % 6) * 40 + ri(r, -8, 8), 20 + Math.floor(c / 6) * 36 + ri(r, -6, 6)] as [number, number]);
    return { key: `s${n}-${e}-${cells.join('.')}`, prompt: `Wie viele ${name} sind es?`, visual: { kind: 'scatter', emoji: e, pts }, answer: { type: 'number', value: n }, tags: ['streubild'], solution: ['Tipp: Tippe jedes Bild beim Zählen einmal an – so zählst du keins doppelt.', 'Oder bilde Fünfer-Gruppen und zähle 5, 10, 15 …', `Es sind ${n}.`], solutionVisual: { kind: 'dots', n } };
  }
  return {
    key: `${n}`,
    prompt: 'Wie viele Punkte siehst du?',
    visual: { kind: 'dots', n },
    answer: { type: 'number', value: n },
    tags: n > 10 ? ['über-10'] : ['bis-10'],
    solution: n > 10
      ? ['Ein volles Zehnerfeld hat 10 Punkte.', `Im zweiten Feld ${n - 10 === 1 ? 'ist noch 1 Punkt' : `sind noch ${n - 10} Punkte`}.`, `10 + ${n - 10} = ${n}`]
      : [`Eine volle Reihe hat 5 Punkte.${n > 5 ? ` Darunter sind noch ${n - 5}. 5 + ${n - 5} = ${n}` : ''}`, `Es sind ${n} Punkte.`],
    solutionVisual: { kind: 'dots', n },
  };
}, { tagLabels: { 'über-10': 'Mengen über 10', 'bis-10': 'Mengen bis 10', streubild: 'durcheinander liegende Dinge zählen' }, testSeconds: 20 });

const vergleichen = M(1, 'm1-vergleichen', 'Größer, kleiner, gleich', '🐊', {
  text: [
    '< heißt „kleiner als“, > heißt „größer als“, = heißt „gleich“.',
    'Stell dir ein Krokodil vor: Es hat immer Hunger und reißt sein Maul zur größeren Zahl auf.',
    'Beispiel: 3 < 8 – das Maul ist offen zur 8.',
    'Steht eine Plusaufgabe da (3 + 7 ☐ 8)? Rechne zuerst: 3 + 7 = 10, dann vergleiche 10 und 8.',
  ],
  visual: { kind: 'compare', a: 3, b: 8 },
  videoQuery: 'größer kleiner gleich Zeichen Krokodil Klasse 1',
}, (r, s) => {
  const max = s === 1 ? 10 : 20;
  // Stufe 3 auch mit Plusaufgabe auf einer Seite: erst rechnen, dann vergleichen
  if (s === 3 && chance(r, 0.35)) {
    const x = ri(r, 2, 10), y = ri(r, 1, 10), sum = x + y;
    const b = Math.max(1, Math.min(20, sum + pick(r, [-1, 0, 1, 2, -2])));
    const left = chance(r, 0.5);
    const sign = sum < b ? '<' : sum > b ? '>' : '=';
    const sg = left ? sign : sign === '<' ? '>' : sign === '>' ? '<' : '=';
    const [l, rt] = left ? [`${x} + ${y}`, String(b)] : [String(b), `${x} + ${y}`];
    return {
      key: `t${x}+${y}-${b}-${left}`,
      prompt: `Welches Zeichen passt?\n${l} ☐ ${rt}`,
      speak: `Welches Zeichen passt zwischen ${l.replace('+', 'plus')} und ${rt.replace('+', 'plus')}?`,
      answer: fixedChoice(['<', '=', '>'], sg),
      tags: sg === '=' ? ['gleich'] : ['ungleich', 'rechnen-vergleichen'],
      solution: [`Rechne zuerst: ${x} + ${y} = ${sum}`, `Vergleiche dann ${left ? `${sum} und ${b}` : `${b} und ${sum}`}.`, `Also: ${l} ${sg} ${rt}`],
    };
  }
  const a = ri(r, 0, max);
  // schwer: nah beieinander liegende Zahlen
  const b = chance(r, 0.2) ? a : s === 3 ? Math.max(0, Math.min(20, a + pick(r, [-2, -1, 1, 2]))) : ri(r, 0, max);
  const sign = a < b ? '<' : a > b ? '>' : '=';
  const word = { '<': 'kleiner als', '>': 'größer als', '=': 'gleich' }[sign];
  return {
    key: `${a}-${b}`,
    prompt: `Welches Zeichen passt?\n${a} ☐ ${b}`,
    speak: `Welches Zeichen passt zwischen ${a} und ${b}?`,
    visual: a <= 20 && b <= 20 ? { kind: 'compare', a, b } : undefined,
    answer: fixedChoice(['<', '=', '>'], sign),
    tags: sign === '=' ? ['gleich'] : ['ungleich'],
    solution: [`${a} ist ${word} ${b}.`, `Also: ${a} ${sign} ${b}`, sign === '=' ? 'Beide Zahlen sind gleich groß.' : 'Das Krokodilmaul ist offen zur größeren Zahl.'],
  };
}, { tagLabels: { gleich: 'gleich (=)', ungleich: 'größer oder kleiner', 'rechnen-vergleichen': 'erst rechnen, dann vergleichen' }, testSeconds: 15 });

const nachbarn = M(1, 'm1-nachbarn', 'Nachbarzahlen', '🏘️', {
  text: [
    'Jede Zahl hat zwei Nachbarn: Der Vorgänger ist 1 weniger, der Nachfolger ist 1 mehr.',
    'Die Nachbarn von 7 sind 6 und 8.',
    'Am Zahlenstrahl steht der Vorgänger links, der Nachfolger rechts.',
  ],
  visual: { kind: 'numberline', from: 4, to: 10, start: 7, jumps: [] },
  videoQuery: 'Nachbarzahlen Vorgänger Nachfolger Klasse 1',
}, (r, s) => {
  const n = s === 1 ? ri(r, 1, 9) : s === 2 ? ri(r, 1, 19) : pick(r, [9, 10, 11, 19, ri(r, 11, 19)]);
  const vor = chance(r, 0.5);
  const v = vor ? n - 1 : n + 1;
  return {
    key: `${vor ? 'v' : 'n'}${n}`,
    prompt: vor ? `Welche Zahl kommt direkt vor ${n}?` : `Welche Zahl kommt direkt nach ${n}?`,
    answer: { type: 'number', value: v },
    tags: [vor ? 'vorgänger' : 'nachfolger'],
    solution: [vor ? `Der Vorgänger ist 1 weniger: ${n} − 1 = ${v}` : `Der Nachfolger ist 1 mehr: ${n} + 1 = ${v}`],
    solutionVisual: { kind: 'numberline', from: Math.max(0, n - 3), to: n + 3, start: n, jumps: [vor ? -1 : 1] },
  };
}, { tagLabels: { 'vorgänger': 'Vorgänger', 'nachfolger': 'Nachfolger' }, testSeconds: 15 });

const zerlegen = M(1, 'm1-zerlegen', 'Zahlen zerlegen', '🏠', {
  text: [
    'Jede Zahl kann man in zwei Teile zerlegen – wie im Zahlenhaus.',
    'Die 7 kann sein: 6 + 1, 5 + 2, 4 + 3 …',
    'Besonders wichtig sind die Zehnerfreunde: Zahlen, die zusammen 10 ergeben (1 + 9, 2 + 8, 3 + 7, 4 + 6, 5 + 5).',
  ],
  visual: { kind: 'dots', n: 4, m: 3 },
  videoQuery: 'Zahlen zerlegen Zahlenhaus Klasse 1',
}, (r, s) => {
  const total = s === 1 ? ri(r, 3, 6) : s === 3 ? (chance(r, 0.6) ? 10 : ri(r, 7, 10)) : chance(r, 0.35) ? 10 : ri(r, 3, 10);
  const a = ri(r, 0, total);
  const b = total - a;
  return {
    key: `${total}-${a}`,
    prompt: `${total} = ${a} + ☐`,
    speak: `${total} ist gleich ${a} plus wie viel?`,
    answer: { type: 'number', value: b },
    tags: total === 10 ? ['zehnerfreunde'] : ['zerlegen'],
    solution: [b === 0 ? `Du hast schon alle ${total} – es fehlt nichts, also 0.` : `Du hast schon ${a}. Bis ${total} fehlen noch ${b}.`, `${a} + ${b} = ${total}`],
    solutionVisual: { kind: 'dots', n: a, m: b },
  };
}, { tagLabels: { zehnerfreunde: 'Zehnerfreunde', zerlegen: 'Zahlen zerlegen' }, testSeconds: 20 });

const plus10 = M(1, 'm1-plus10', 'Plus bis 10', '➕', {
  text: ['Plus heißt: Es kommt etwas dazu.', 'Starte bei der ersten Zahl und zähle weiter – oder lege die Zahlen ins Zehnerfeld.', '3 + 4: Du hast 3, dazu kommen 4 → 7.'],
  visual: { kind: 'tenframe', a: 3, b: 4 },
  videoQuery: 'Addition bis 10 Klasse 1 erklärt',
}, (r, s) => {
  const max = s === 1 ? 6 : 10;
  const a = ri(r, 1, max - 1);
  const b = ri(r, s === 3 ? Math.min(max - a, 2) : 0, max - a);
  return {
    key: `${a}+${b}`,
    prompt: `${a} + ${b} = ☐`,
    visual: { kind: 'tenframe', a, b },
    answer: { type: 'number', value: a + b },
    tags: ['plus'],
    traps: [{ answer: String(a - b), tag: 'rechenzeichen', hint: 'Achte auf das Zeichen: + heißt dazu, nicht weg.' }].filter(() => a - b >= 0 && a - b !== a + b),
    solution: [b === 0 ? `Du hast ${a}. Es kommt nichts dazu.` : `Du hast ${a}. Es ${b === 1 ? 'kommt' : 'kommen'} ${b} dazu.`, `${a} + ${b} = ${a + b}`],
    solutionVisual: { kind: 'tenframe', a, b },
  };
}, { testSeconds: 15 });

const minus10 = M(1, 'm1-minus10', 'Minus bis 10', '➖', {
  text: ['Minus heißt: Es geht etwas weg.', 'Lege die erste Zahl hin und streiche so viele weg, wie abgezogen werden.', '8 − 3: Von 8 Plättchen streichst du 3 weg → 5 bleiben übrig.'],
  visual: { kind: 'tenframe', a: 8, crossOut: 3 },
  videoQuery: 'Subtraktion bis 10 Klasse 1 erklärt',
}, (r, s) => {
  const a = s === 1 ? ri(r, 2, 6) : s === 2 ? ri(r, 4, 10) : ri(r, 7, 10);
  const b = ri(r, 1, a);
  return {
    key: `${a}-${b}`,
    prompt: `${a} − ${b} = ☐`,
    visual: { kind: 'tenframe', a, crossOut: b },
    answer: { type: 'number', value: a - b },
    tags: ['minus'],
    traps: a + b <= 20 ? [{ answer: String(a + b), tag: 'rechenzeichen', hint: 'Achte auf das Zeichen: − heißt wegnehmen.' }] : [],
    solution: [`Du hast ${a}. ${b} ${b === 1 ? 'geht' : 'gehen'} weg.`, `${a} − ${b} = ${a - b}`],
    solutionVisual: { kind: 'tenframe', a, crossOut: b },
  };
}, { testSeconds: 15 });

const plus20 = M(1, 'm1-plus20', 'Plus bis 20', '🚀', {
  text: [
    'Geht es über die 10, rechnest du in zwei Schritten: Erst bis zur 10, dann den Rest dazu.',
    '8 + 5: Erst 8 + 2 = 10. Von der 5 sind noch 3 übrig. 10 + 3 = 13.',
    'Ohne Zehnerübergang ist es leichter: 12 + 5 → 2 + 5 = 7, also 17.',
  ],
  visual: { kind: 'numberline', from: 5, to: 15, start: 8, jumps: [2, 3] },
  videoQuery: 'Zehnerübergang Addition bis 20 Klasse 1',
}, (r, s) => {
  if (s === 3 || (s === 2 && chance(r, 0.6))) {
    const a = ri(r, 2, 9);
    const b = ri(r, 11 - a, 9);
    const toTen = 10 - a;
    return {
      key: `${a}+${b}`,
      prompt: `${a} + ${b} = ☐`,
      answer: { type: 'number', value: a + b },
      tags: ['zehnerübergang'],
      traps: [{ answer: String(a + b - 10), tag: 'übertrag-vergessen', hint: 'Du hast vergessen, dass das Ergebnis über 10 geht. Erst bis zur 10 rechnen, dann weiter.' }],
      solution: [`Erst bis zur 10: ${a} + ${toTen} = 10`, `Von der ${b} ${b - toTen === 1 ? 'ist noch 1' : `sind noch ${b - toTen}`} übrig.`, `10 + ${b - toTen} = ${a + b}`],
      solutionVisual: { kind: 'numberline', from: Math.max(0, a - 2), to: Math.min(20, a + b + 2), start: a, jumps: [toTen, b - toTen] },
    };
  }
  const e = ri(r, 0, 8);
  const a = 10 + e;
  const b = ri(r, 1, 9 - e);
  return {
    key: `${a}+${b}`,
    prompt: `${a} + ${b} = ☐`,
    answer: { type: 'number', value: a + b },
    tags: ['ohne-übergang'],
    solution: [`Rechne mit den Einern: ${e} + ${b} = ${e + b}`, `Dazu der Zehner: 10 + ${e + b} = ${a + b}`],
    solutionVisual: { kind: 'numberline', from: 8, to: 20, start: a, jumps: [b] },
  };
}, { tagLabels: ueber, testSeconds: 20 });

const minus20 = M(1, 'm1-minus20', 'Minus bis 20', '🎢', {
  text: [
    'Geht es unter die 10, rechnest du in zwei Schritten: Erst bis zur 10 zurück, dann den Rest weg.',
    '13 − 5: Erst 13 − 3 = 10. Von der 5 sind noch 2 übrig. 10 − 2 = 8.',
  ],
  visual: { kind: 'numberline', from: 6, to: 15, start: 13, jumps: [-3, -2] },
  videoQuery: 'Zehnerübergang Subtraktion bis 20 Klasse 1',
}, (r, s) => {
  if (s === 3 || (s === 2 && chance(r, 0.6))) {
    const a = ri(r, 11, 18);
    const b = ri(r, a - 9, 9);
    const toTen = a - 10;
    return {
      key: `${a}-${b}`,
      prompt: `${a} − ${b} = ☐`,
      answer: { type: 'number', value: a - b },
      tags: ['zehnerübergang'],
      traps: [{ answer: String(10 + Math.abs(toTen - b)), tag: 'einer-vertauscht', hint: `Bei den Einern geht ${toTen} − ${b} nicht. Rechne lieber in zwei Schritten über die 10.` }].filter((t) => Number(t.answer) !== a - b),
      solution: [`Erst bis zur 10: ${a} − ${toTen} = 10`, `Von der ${b} ${b - toTen === 1 ? 'ist noch 1' : `sind noch ${b - toTen}`} übrig.`, `10 − ${b - toTen} = ${a - b}`],
      solutionVisual: { kind: 'numberline', from: Math.max(0, a - b - 2), to: Math.min(20, a + 2), start: a, jumps: [-toTen, -(b - toTen)] },
    };
  }
  const e = ri(r, 1, 9);
  const a = 10 + e;
  const b = ri(r, 1, e);
  return {
    key: `${a}-${b}`,
    prompt: `${a} − ${b} = ☐`,
    answer: { type: 'number', value: a - b },
    tags: ['ohne-übergang'],
    solution: [`Rechne mit den Einern: ${e} − ${b} = ${e - b}`, `Der Zehner bleibt: 10 + ${e - b} = ${a - b}`],
    solutionVisual: { kind: 'numberline', from: 8, to: 20, start: a, jumps: [-b] },
  };
}, { tagLabels: ueber, testSeconds: 20 });

const verdoppeln1 = M(1, 'm1-verdoppeln', 'Verdoppeln und Halbieren', '🦋', {
  text: ['Verdoppeln heißt: die gleiche Zahl noch einmal dazu. Das Doppelte von 4 ist 4 + 4 = 8.', 'Halbieren heißt: in zwei gleich große Teile teilen. Die Hälfte von 8 ist 4.', 'Wie bei einem Schmetterling: Beide Flügel sind gleich.'],
  visual: { kind: 'dots', n: 4, m: 4 },
  videoQuery: 'Verdoppeln Halbieren Klasse 1',
}, (r, s) => {
  const top = s === 1 ? 5 : 10;
  // Sachaufgabe: Marienkäfer mit gleich vielen Punkten auf beiden Flügeln
  if (chance(r, 0.2)) {
    const n = ri(r, s === 1 ? 1 : 3, s === 1 ? 5 : 9);
    return { key: `k${n}`, prompt: `Ein Marienkäfer hat auf jedem Flügel ${n} ${n === 1 ? 'Punkt' : 'Punkte'}.\nWie viele Punkte hat er zusammen?`, visual: { kind: 'emoji', chars: '🐞' }, answer: { type: 'number', value: 2 * n }, tags: ['verdoppeln'], solution: [`Beide Flügel haben gleich viele Punkte – also verdoppeln.`, `${n} + ${n} = ${2 * n}`], solutionVisual: { kind: 'dots', n, m: n } };
  }
  // Umkehrung: Welche Zahl wurde verdoppelt?
  if (s !== 1 && chance(r, 0.25)) {
    const n = ri(r, s === 3 ? 5 : 2, top);
    return { key: `u${2 * n}`, prompt: `☐ + ☐ = ${2 * n}\nIn beide Kästchen gehört dieselbe Zahl.`, speak: `Welche Zahl plus dieselbe Zahl ergibt ${2 * n}?`, answer: { type: 'number', value: n }, tags: ['halbieren'], solution: [`Gesucht ist die Hälfte von ${2 * n}.`, `${n} + ${n} = ${2 * n}`], solutionVisual: { kind: 'dots', n, m: n } };
  }
  if (chance(r, s === 3 ? 0.3 : 0.5)) {
    const n = ri(r, s === 3 ? 6 : 1, top);
    return { key: `d${n}`, prompt: `Verdopple ${n}.`, answer: { type: 'number', value: 2 * n }, tags: ['verdoppeln'], solution: [`Verdoppeln: ${n} + ${n} = ${2 * n}`], solutionVisual: { kind: 'dots', n, m: n } };
  }
  const n = ri(r, s === 3 ? 5 : 1, top);
  return { key: `h${2 * n}`, prompt: `Halbiere ${2 * n}.`, answer: { type: 'number', value: n }, tags: ['halbieren'], solution: [`Halbieren: ${2 * n} in zwei gleiche Teile. ${n} + ${n} = ${2 * n}, also ist die Hälfte ${n}.`], solutionVisual: { kind: 'dots', n, m: n } };
}, { tagLabels: { verdoppeln: 'Verdoppeln', halbieren: 'Halbieren' }, testSeconds: 15 });

const SHAPES2D = [
  { s: 'Kreis', ecken: 0, info: 'Ein Kreis ist ganz rund und hat keine Ecken.' },
  { s: 'Dreieck', ecken: 3, info: 'Ein Dreieck hat 3 Ecken und 3 Seiten.' },
  { s: 'Quadrat', ecken: 4, info: 'Ein Quadrat hat 4 Ecken und 4 gleich lange Seiten.' },
  { s: 'Rechteck', ecken: 4, info: 'Ein Rechteck hat 4 Ecken. Gegenüberliegende Seiten sind gleich lang.' },
];
const FORM_OBJ = [
  { name: 'eine Münze', e: '🪙', s: 'Kreis', why: 'Eine Münze ist ganz rund.' },
  { name: 'ein Teller', e: '🍽️', s: 'Kreis', why: 'Ein Teller ist (von oben gesehen) ganz rund.' },
  { name: 'ein Stück Pizza', e: '🍕', s: 'Dreieck', why: 'Ein Pizzastück hat eine Spitze und ist fast ein Dreieck.' },
  { name: 'eine Tür', e: '🚪', s: 'Rechteck', why: 'Eine Tür ist hoch und schmal: zwei lange und zwei kurze Seiten.' },
  { name: 'ein Buch', e: '📕', s: 'Rechteck', why: 'Ein Buch hat zwei lange und zwei kurze Seiten.' },
];
const formen = M(1, 'm1-formen', 'Formen erkennen', '🔺', {
  text: ['Kreis: ganz rund, keine Ecken.', 'Dreieck: 3 Ecken, 3 Seiten.', 'Quadrat: 4 Ecken, alle Seiten gleich lang.', 'Rechteck: 4 Ecken, zwei lange und zwei kurze Seiten.', 'Auch gedreht oder klein bleibt eine Form dieselbe: Ein Quadrat auf der Spitze ist immer noch ein Quadrat.'],
  visual: { kind: 'shape', shape: 'Dreieck' },
  videoQuery: 'geometrische Formen Kreis Dreieck Quadrat Rechteck Grundschule',
}, (r, st) => {
  const v = ri(r, 0, st === 1 ? 2 : 3);
  // Formen im Alltag
  if (v === 2) {
    const o = pick(r, FORM_OBJ);
    return { key: `o-${o.name}`, prompt: `Welche Form hat ${o.name}?`, visual: { kind: 'emoji', chars: o.e }, answer: choice(r, o.s, SHAPES2D.map((x) => x.s)), tags: ['alltag'], solution: [o.why, SHAPES2D.find((x) => x.s === o.s)!.info] };
  }
  // Formen zählen: bunt, verschieden groß, auch gedreht
  if (v === 3) {
    const target = pick(r, ['Kreis', 'Dreieck', 'Quadrat']);
    const n = ri(r, 1, st === 3 ? 4 : 3);
    const total = st === 3 ? ri(r, 7, 9) : ri(r, 5, 6);
    const others = SHAPES2D.map((x) => x.s).filter((x) => x !== target);
    const turn = (sh: string) => (st === 1 ? 0 : sh === 'Quadrat' ? pick(r, [0, 0, 45]) : sh === 'Dreieck' ? pick(r, [0, 0, 180, 90]) : sh === 'Rechteck' ? pick(r, [0, 90]) : 0);
    const items = shuffle(r, [...Array.from({ length: n }, () => target), ...Array.from({ length: total - n }, () => pick(r, others))]).map((sh) => ({ s: sh, rot: turn(sh), c: ri(r, 0, 4), big: chance(r, 0.5) }));
    const plural = target === 'Kreis' ? 'Kreise' : target === 'Dreieck' ? 'Dreiecke' : 'Quadrate';
    const traps = target === 'Quadrat' ? items.filter((x) => x.s === 'Rechteck').length ? [{ answer: String(n + items.filter((x) => x.s === 'Rechteck').length), tag: 'quadrat-rechteck', hint: 'Rechtecke zählen nicht mit – beim Quadrat sind alle Seiten gleich lang.' }] : [] : [];
    return { key: `z-${items.map((x) => x.s[0] + x.rot).join('')}`, prompt: `Wie viele ${plural} siehst du?`, visual: { kind: 'shapemix', items }, answer: { type: 'number', value: n }, tags: ['zählen'], traps, solution: [`Zeige mit dem Finger auf jede Form und zähle nur die ${plural}.`, 'Größe, Farbe und Drehung sind egal – die Form zählt.', `Es sind ${n}.`] };
  }
  const f = pick(r, SHAPES2D);
  // ab Stufe 2 auch gedreht: Ein Quadrat bleibt ein Quadrat, auch wenn es auf der Spitze steht
  const rot = st > 1 && f.s !== 'Kreis' && chance(r, 0.5) ? (f.s === 'Quadrat' ? 45 : f.s === 'Dreieck' ? pick(r, [180, 90]) : pick(r, [90, 30])) : 0;
  const turned = rot ? 'Auch gedreht bleibt die Form gleich.' : '';
  if (v === 1 && f.ecken > 0) {
    return { key: `e-${f.s}-${rot}`, prompt: `Wie viele Ecken hat diese Form?`, visual: { kind: 'shape', shape: f.s, rot }, answer: { type: 'number', value: f.ecken }, tags: ['ecken'], solution: [f.info, turned].filter(Boolean) };
  }
  return {
    key: `${f.s}-${rot}`,
    prompt: 'Wie heißt diese Form?',
    visual: { kind: 'shape', shape: f.s, rot },
    answer: choice(r, f.s, SHAPES2D.map((x) => x.s)),
    tags: [f.s === 'Quadrat' || f.s === 'Rechteck' ? 'quadrat-rechteck' : 'formen', ...(rot ? ['gedreht'] : [])],
    solution: [f.info, turned].filter(Boolean),
  };
}, { tagLabels: { 'quadrat-rechteck': 'Quadrat oder Rechteck', ecken: 'Ecken zählen', gedreht: 'gedrehte Formen', zählen: 'Formen zählen', alltag: 'Formen im Alltag' }, testSeconds: 15 });

// ---------- Klasse 2 ----------

const stellenwert2 = M(2, 'm2-stellenwert', 'Zehner und Einer', '🧱', {
  text: ['Zahlen bis 100 bestehen aus Zehnern und Einern.', 'Bei 47 steht die 4 für 4 Zehner (40) und die 7 für 7 Einer.', 'Ein Zehner ist eine Stange mit 10 Würfeln, ein Einer ist ein einzelner Würfel.'],
  visual: { kind: 'blocks', t: 4, o: 7 },
  videoQuery: 'Zehner und Einer Stellenwert Klasse 2',
}, (r) => {
  const t = ri(r, 1, 9);
  const o = ri(r, 0, 9);
  const n = 10 * t + o;
  const rev = 10 * o + t;
  const traps = o > 0 && o !== t ? [{ answer: String(rev), tag: 'zahlendreher', hint: 'Zahlendreher! Zuerst kommen die Zehner, dann die Einer.' }] : [];
  const v = ri(r, 0, 3);
  if (v === 0) return { key: `b${n}`, prompt: 'Welche Zahl ist das?', visual: { kind: 'blocks', t, o }, answer: { type: 'number', value: n }, tags: ['bündeln'], traps, solution: [`${t} Zehnerstangen = ${10 * t}`, `${o} Einerwürfel = ${o}`, `${10 * t} + ${o} = ${n}`], solutionVisual: { kind: 'placetable', digits: [t, o], labels: ['Z', 'E'] } };
  if (v === 1) return { key: `z${n}`, prompt: `Wie viele Zehner hat die Zahl ${n}?`, answer: { type: 'number', value: t }, tags: ['zehner'], traps: [{ answer: String(o), tag: 'zehner-einer', hint: 'Das sind die Einer. Die Zehner stehen vorne.' }].filter(() => o !== t), solution: [`Bei ${n} steht vorne die ${t}: ${t === 1 ? 'Das ist 1 Zehner.' : `Das sind ${t} Zehner.`}`], solutionVisual: { kind: 'placetable', digits: [t, o], labels: ['Z', 'E'], highlight: 0 } };
  if (v === 2) return { key: `e${n}`, prompt: `Wie viele Einer hat die Zahl ${n}?`, answer: { type: 'number', value: o }, tags: ['einer'], traps: [{ answer: String(t), tag: 'zehner-einer', hint: 'Das sind die Zehner. Die Einer stehen hinten.' }].filter(() => o !== t), solution: [`Bei ${n} steht hinten die ${o}: ${o === 1 ? 'Das ist 1 Einer.' : o === 0 ? 'Das sind 0 Einer.' : `Das sind ${o} Einer.`}`], solutionVisual: { kind: 'placetable', digits: [t, o], labels: ['Z', 'E'], highlight: 1 } };
  return { key: `s${n}`, prompt: `${t} Zehner und ${o} Einer sind ☐`, answer: { type: 'number', value: n }, tags: ['bündeln'], traps, solution: [`${t} Zehner = ${10 * t}, dazu ${o} Einer: ${n}`], solutionVisual: { kind: 'blocks', t, o } };
}, { tagLabels: { zahlendreher: 'Zahlendreher', 'zehner-einer': 'Zehner und Einer verwechselt' }, testSeconds: 20 });

function plusMinus100(r: Rng, minus: boolean, s: Stage): Gen {
  const kind = s === 1 ? pick(r, [0, 2, 3]) : s === 3 ? pick(r, [1, 4, 4]) : ri(r, 0, 4); // 0 ZE±E ohne, 1 ZE±E mit, 2 ZE±Z, 3 ZE±ZE ohne, 4 ZE±ZE mit
  let a: number, b: number;
  for (;;) {
    a = ri(r, 11, 89);
    if (kind <= 1) b = ri(r, 2, 9);
    else if (kind === 2) b = 10 * ri(r, 1, 5);
    else b = ri(r, 11, 59);
    const res = minus ? a - b : a + b;
    if (res < 0 || res > 100) continue;
    const cross = minus ? a % 10 < b % 10 : (a % 10) + (b % 10) >= 10;
    if ((kind === 1 || kind === 4) !== cross && kind !== 2) continue;
    if (minus && b >= a) continue;
    break;
  }
  const res = minus ? a - b : a + b;
  const cross = minus ? a % 10 < b % 10 : (a % 10) + (b % 10) >= 10;
  const sg = minus ? '−' : '+';
  const bz = b - (b % 10);
  const be = b % 10;
  const steps =
    b < 10
      ? cross
        ? minus
          ? a % 10 === 0
            ? [`Erst einen ganzen Zehner weg: ${a} − 10 = ${a - 10}`, `Das war ${10 - b} zu viel – also ${10 - b} wieder dazu: ${a - 10} + ${10 - b} = ${res}`]
            : [`Erst bis zum Zehner: ${a} − ${a % 10} = ${a - (a % 10)}`, `Dann den Rest: ${a - (a % 10)} − ${b - (a % 10)} = ${res}`]
          : b === 10 - (a % 10)
            ? [`Genau bis zum nächsten Zehner: ${a} + ${b} = ${res}`]
            : [`Erst bis zum nächsten Zehner: ${a} + ${10 - (a % 10)} = ${a + 10 - (a % 10)}`, `Dann den Rest: ${a + 10 - (a % 10)} + ${b - (10 - (a % 10))} = ${res}`]
        : [`Nur die Einer ändern sich: ${a % 10} ${sg} ${b} = ${minus ? (a % 10) - b : (a % 10) + b}`, `${a} ${sg} ${b} = ${res}`]
      : be === 0
        ? [`Nur die Zehner ändern sich: ${a - (a % 10)} ${sg} ${b} = ${minus ? a - (a % 10) - b : a - (a % 10) + b}`, `Die Einer bleiben: ${res}`]
        : [`Erst die Zehner: ${a} ${sg} ${bz} = ${minus ? a - bz : a + bz}`, `Dann die Einer: ${minus ? a - bz : a + bz} ${sg} ${be} = ${res}`];
  const traps: { answer: string; tag: string; hint: string }[] = [];
  if (cross && !minus) traps.push({ answer: String(res - 10), tag: 'übertrag-vergessen', hint: 'Die Einer ergeben mehr als 10 – daraus wird ein neuer Zehner. Den hast du vergessen.' });
  if (cross && minus) {
    const wrong = 10 * (Math.floor(a / 10) - Math.floor(b / 10)) + Math.abs((a % 10) - be);
    if (wrong !== res) traps.push({ answer: String(wrong), tag: 'einer-vertauscht', hint: `Bei den Einern hast du ${be} − ${a % 10} gerechnet statt ${a % 10} − ${be}. Rechne in Schritten.` });
  }
  if (!minus || a + b <= 100) traps.push({ answer: String(minus ? a + b : a - b), tag: 'rechenzeichen', hint: 'Achte auf das Rechenzeichen.' });
  return {
    key: `${a}${sg}${b}`,
    prompt: `${a} ${sg} ${b} = ☐`,
    answer: { type: 'number', value: res },
    tags: [cross ? 'zehnerübergang' : 'ohne-übergang'],
    traps,
    solution: steps,
    solutionVisual: b < 10 || be === 0 ? { kind: 'numberline', from: Math.max(0, Math.min(a, res) - 5), to: Math.min(100, Math.max(a, res) + 5), start: a, jumps: cross && b < 10 ? (minus ? [-(a % 10), -(b - (a % 10))] : [10 - (a % 10), b - (10 - (a % 10))]) : [minus ? -b : b], step: 10 } : { kind: 'numberline', from: Math.max(0, Math.min(a, res) - 5), to: Math.min(100, Math.max(a, res) + 5), start: a, jumps: minus ? [-bz, -be] : [bz, be], step: 10 },
  };
}

const plus100 = M(2, 'm2-plus100', 'Plus bis 100', '🚂', {
  text: ['Rechne in Schritten: erst die Zehner, dann die Einer.', '38 + 47: 38 + 40 = 78, dann 78 + 7 = 85.', 'Werden die Einer mehr als 10, entsteht ein neuer Zehner (Zehnerübergang).'],
  visual: { kind: 'numberline', from: 35, to: 90, start: 38, jumps: [40, 7], step: 10 },
  videoQuery: 'Addition bis 100 schrittweise Zehnerübergang Klasse 2',
}, (r, s) => plusMinus100(r, false, s), { tagLabels: ueber, testSeconds: 30 });

const minus100 = M(2, 'm2-minus100', 'Minus bis 100', '🛷', {
  text: ['Rechne in Schritten: erst die Zehner weg, dann die Einer.', '72 − 38: 72 − 30 = 42, dann 42 − 8 = 34.', 'Bei 42 − 8 hilft der Zwischenschritt über den Zehner: 42 − 2 = 40, 40 − 6 = 34.'],
  visual: { kind: 'numberline', from: 30, to: 75, start: 72, jumps: [-30, -8], step: 10 },
  videoQuery: 'Subtraktion bis 100 schrittweise Klasse 2',
}, (r, s) => plusMinus100(r, true, s), { tagLabels: ueber, testSeconds: 30 });

function malSteps(a: number, b: number): string[] {
  if ([1, 2, 5, 10].includes(a)) return [`${a} · ${b} ist eine Kernaufgabe: ${a * b}`];
  if (a < 5) return [`Du kennst 2 · ${b} = ${2 * b}.`, `Dazu noch ${a - 2} · ${b} = ${(a - 2) * b}.`, `${2 * b} + ${(a - 2) * b} = ${a * b}`];
  if (a < 10) return [`Du kennst 5 · ${b} = ${5 * b}.`, `Dazu noch ${a - 5} · ${b} = ${(a - 5) * b}.`, `${5 * b} + ${(a - 5) * b} = ${a * b}`];
  return [`10 · ${b} = ${10 * b}`];
}

/** Einmaleins-Reihen je Stufe: Kernaufgaben → leichte → schwere Reihen */
const ROWS: Record<Stage, number[]> = { 1: [2, 5, 10], 2: [2, 3, 4, 5, 10], 3: [3, 4, 6, 7, 8, 9] };

const einmaleins = M(2, 'm2-einmaleins', 'Einmaleins', '✖️', {
  text: ['Malnehmen ist schnelles Plusrechnen: 3 · 4 heißt 4 + 4 + 4 = 12.', 'Die Kernaufgaben 1 ·, 2 ·, 5 · und 10 · solltest du auswendig können.', 'Aus ihnen kannst du alle anderen ableiten: 7 · 6 = 5 · 6 + 2 · 6 = 30 + 12 = 42.', 'Tauschaufgabe: 3 · 7 ist dasselbe wie 7 · 3 – such dir die leichtere aus.'],
  visual: { kind: 'array', rows: 7, cols: 6, split: 5 },
  videoQuery: 'Einmaleins Kernaufgaben ableiten Klasse 2',
}, (r, s) => {
  const a = ri(r, 1, 10);
  const b = pick(r, ROWS[s]);
  // weitere Formate ab Stufe 2: Punktefeld deuten, Tauschaufgabe, Platzhalter
  if (s > 1 && chance(r, 0.35)) {
    const x = ri(r, 2, 9), y = ri(r, 2, 9);
    const f = s === 3 ? ri(r, 0, 2) : ri(r, 0, 1);
    if (f === 0 && x * y <= 50) {
      const ok = `${x} · ${y}`;
      return { key: `f${x}x${y}`, prompt: 'Welche Malaufgabe passt zum Punktefeld?', visual: { kind: 'array', rows: x, cols: y }, answer: choice(r, ok, [`${x} + ${y}`, `${x + 1} · ${y}`, `${x} · ${y + 1}`]), tags: ['punktefeld'], solution: [`${x} Reihen mit je ${y} Punkten`, `${ok} = ${x * y}`] };
    }
    if (f === 1 || x * y > 50) {
      return { key: `t${x}x${y}`, prompt: `${x} · ${y} = ${y} · ☐`, answer: { type: 'number', value: x }, tags: ['tauschaufgabe'], solution: ['Tauschaufgabe: Beim Malnehmen darf man die Zahlen tauschen.', `${x} · ${y} = ${y} · ${x} = ${x * y}`], solutionVisual: { kind: 'array', rows: x, cols: y } };
    }
    return { key: `p${x}x${y}`, prompt: `☐ · ${y} = ${x * y}`, answer: { type: 'number', value: x }, tags: ['platzhalter'], traps: [{ answer: String(x * y - y), tag: 'minus-statt-geteilt', hint: `Gesucht ist, wie oft die ${y} in die ${x * y} passt: ${x * y} : ${y}.` }], solution: [`Wie oft passt die ${y} in die ${x * y}?`, `${x * y} : ${y} = ${x}`, `Probe: ${x} · ${y} = ${x * y}`] };
  }
  const traps = [a * b + b, a * b - b].filter((x) => x > 0).map((x) => ({ answer: String(x), tag: 'nachbaraufgabe', hint: `Knapp daneben – das ist ${x > a * b ? a + 1 : a - 1} · ${b}. Du warst eine Reihe zu weit.` }));
  return {
    key: `${a}x${b}`,
    prompt: `${a} · ${b} = ☐`,
    visual: a * b <= 50 && chance(r, 0.4) ? { kind: 'array', rows: a, cols: b } : undefined,
    answer: { type: 'number', value: a * b },
    tags: [`reihe-${b}`],
    traps,
    solution: malSteps(a, b),
    solutionVisual: { kind: 'array', rows: a, cols: b, split: a > 5 ? 5 : undefined },
  };
}, { tagLabels: { ...Object.fromEntries([2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => [`reihe-${n}`, `Einmaleins mit ${n}`])), punktefeld: 'Malaufgaben im Punktefeld', tauschaufgabe: 'Tauschaufgaben', platzhalter: 'Platzhalter-Aufgaben' }, testSeconds: 15 });

const geteilt = M(2, 'm2-geteilt', 'Geteilt durch', '➗', {
  text: ['Teilen heißt: gerecht verteilen.', '12 : 3 – 12 Bonbons an 3 Kinder. Jedes Kind bekommt 4.', 'Denk an die Malaufgabe: Wie oft passt die 3 in die 12? 4 · 3 = 12, also 12 : 3 = 4.'],
  visual: { kind: 'array', rows: 3, cols: 4 },
  videoQuery: 'Division geteilt Umkehraufgabe Einmaleins Klasse 2',
}, (r, s) => {
  const d = pick(r, ROWS[s]);
  const q = ri(r, 1, 10);
  const n = d * q;
  return {
    key: `${n}:${d}`,
    prompt: `${n} : ${d} = ☐`,
    answer: { type: 'number', value: q },
    tags: [`reihe-${d}`],
    solution: [`Denke an die Malaufgabe: ☐ · ${d} = ${n}`, `${q} · ${d} = ${n}`, `Also ${n} : ${d} = ${q}`],
    solutionVisual: n <= 60 ? { kind: 'array', rows: d, cols: q } : undefined,
  };
}, { tagLabels: Object.fromEntries([2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => [`reihe-${n}`, `Geteilt durch ${n}`])), testSeconds: 15 });

const verdoppeln2 = M(2, 'm2-verdoppeln', 'Verdoppeln und Halbieren bis 100', '🪞', {
  text: ['Verdopple Zehner und Einer einzeln: Das Doppelte von 36 ist 60 + 12 = 72.', 'Halbiere ebenso: Die Hälfte von 58 ist die Hälfte von 50 (25) plus die Hälfte von 8 (4) = 29.'],
  videoQuery: 'Verdoppeln Halbieren bis 100 Klasse 2',
}, (r) => {
  if (chance(r, 0.5)) {
    const n = ri(r, 11, 49);
    const t = n - (n % 10);
    return { key: `d${n}`, prompt: `Verdopple ${n}.`, answer: { type: 'number', value: 2 * n }, tags: ['verdoppeln'], solution: [`Zehner verdoppeln: ${t} + ${t} = ${2 * t}`, `Einer verdoppeln: ${n % 10} + ${n % 10} = ${2 * (n % 10)}`, `Zusammen: ${2 * n}`] };
  }
  const h = ri(r, 6, 50);
  const n = 2 * h;
  const t = n - (n % 10);
  return { key: `h${n}`, prompt: `Halbiere ${n}.`, answer: { type: 'number', value: h }, tags: ['halbieren'], solution: n % 10 === 0 ? [`Die Hälfte von ${n} ist ${h}.`, `Probe: ${h} + ${h} = ${n}`] : [`Hälfte von ${t} ist ${t / 2}`, `Hälfte von ${n % 10} ist ${(n % 10) / 2}`, `Zusammen: ${h}`, `Probe: ${h} + ${h} = ${n}`] };
}, { tagLabels: { verdoppeln: 'Verdoppeln', halbieren: 'Halbieren' }, testSeconds: 20 });

const HW = ['zwölf', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf'];
const hw = (h: number) => HW[((h - 1) % 12) + 1];
function timePhrase(h: number, m: number) {
  if (m === 0) return `${h === 1 ? 'ein' : hw(h)} Uhr`;
  if (m === 15) return `Viertel nach ${hw(h)}`;
  if (m === 30) return `halb ${hw(h + 1)}`;
  return `Viertel vor ${hw(h + 1)}`;
}
const pad = (n: number) => String(n).padStart(2, '0');

const uhr2 = M(2, 'm2-uhr', 'Uhrzeit: volle, halbe, Viertel', '🕒', {
  text: ['Der kleine Zeiger zeigt die Stunden, der große Zeiger die Minuten.', 'Großer Zeiger oben auf der 12: volle Stunde („drei Uhr“).', 'Großer Zeiger unten auf der 6: halbe Stunde. „Halb vier“ heißt: Es ist eine halbe Stunde bis vier Uhr – also 3:30 Uhr!', 'Auf der 3: „Viertel nach“, auf der 9: „Viertel vor“.', 'Zeitspannen: Eine Viertelstunde sind 15 Minuten, eine halbe Stunde 30, eine Stunde 60.'],
  visual: { kind: 'clock', h: 3, m: 30 },
  videoQuery: 'Uhrzeit lernen halb Viertel nach Viertel vor Grundschule',
}, (r, st) => {
  // Zeitspannen ab Stufe 2: in Viertelstunden weiterrechnen
  if (st > 1 && chance(r, 0.35)) {
    const h0 = ri(r, 1, 10);
    const m0 = pick(r, [0, 15, 30, 45]);
    const d = pick(r, st === 2 ? [15, 30, 60] : [15, 30, 45, 60, 90]);
    const t1 = h0 * 60 + m0 + d;
    const h1 = Math.floor(t1 / 60), m1 = t1 % 60;
    const dWord = d === 15 ? 'eine Viertelstunde' : d === 30 ? 'eine halbe Stunde' : d === 45 ? 'eine Dreiviertelstunde' : d === 60 ? 'eine Stunde' : 'anderthalb Stunden';
    if (chance(r, 0.5)) {
      return { key: `d${h0}:${m0}+${d}`, prompt: `Es ist ${timePhrase(h0, m0)}. Wie spät ist es ${dWord} später?`, visual: { kind: 'clock', h: h0, m: m0 }, answer: choice(r, timePhrase(h1, m1), [timePhrase(h1, (m1 + 15) % 60), timePhrase(h0, m0 === 30 ? 0 : 30), timePhrase(h1 % 12 + 1, m1)]), tags: ['zeitspanne'], solution: [`${dWord} = ${d} Minuten`, `${h0}:${pad(m0)} Uhr + ${d} min = ${h1}:${pad(m1)} Uhr`, `Das ist ${timePhrase(h1, m1)}.`], solutionVisual: { kind: 'clock', h: h1, m: m1 } };
    }
    // digital: Uhrzeiten am Tag (8 bis 18 Uhr)
    const H0 = h0 + 7, H1 = h1 + 7;
    const act = d === 15 ? ['Die Pause', 'sie'] : d === 30 ? ['Das Fußballspiel', 'es'] : d === 45 ? ['Die Schulstunde', 'sie'] : d === 60 ? ['Die Turnstunde', 'sie'] : ['Der Film', 'er'];
    return { key: `s${h0}:${m0}-${d}`, prompt: `${act[0]} beginnt um ${H0}:${pad(m0)} Uhr und endet um ${H1}:${pad(m1)} Uhr. Wie viele Minuten dauert ${act[1]}?`, answer: { type: 'number', value: d, unit: 'min' }, tags: ['zeitspanne'], traps: d >= 60 ? [{ answer: String(d === 60 ? 100 : 130), tag: 'hundert-minuten', hint: 'Eine Stunde hat 60 Minuten, nicht 100!' }] : [], solution: ['Eine Stunde hat 60 Minuten, eine halbe Stunde 30, eine Viertelstunde 15.', `Von ${H0}:${pad(m0)} bis ${H1}:${pad(m1)} Uhr sind es ${dWord}: ${d} Minuten.`] };
  }
  const h = ri(r, 1, 12);
  const m = pick(r, [0, 15, 30, 45]);
  const correct = timePhrase(h, m);
  const wrong = [timePhrase(h - 1 || 12, m), timePhrase(h % 12 + 1, m), timePhrase(h, (m + 15) % 60), timePhrase(h, (m + 45) % 60), `halb ${hw(h)}`];
  const tag = m === 0 ? 'volle' : m === 30 ? 'halb' : 'viertel';
  return {
    key: `${h}:${m}`,
    prompt: 'Wie spät ist es?',
    visual: { kind: 'clock', h, m },
    answer: choice(r, correct, wrong),
    tags: [tag],
    traps: m === 30 ? [{ answer: `halb ${hw(h)}`, tag: 'halb-falsch', hint: `„Halb ${hw(h + 1)}“ bedeutet: eine halbe Stunde bis ${hw(h + 1)} Uhr. Der kleine Zeiger steht schon zwischen ${h} und ${h % 12 + 1}.` }] : [],
    solution: [
      `Der kleine Zeiger steht ${m === 0 ? `genau auf der ${h}` : `zwischen ${h} und ${h % 12 + 1}`}.`,
      `Der große Zeiger steht auf der ${m === 0 ? 12 : m / 5}.`,
      h === 12 ? `Es ist ${correct} – also 12:${pad(m)} Uhr.` : `Es ist ${correct} – also ${h}:${pad(m)} Uhr oder ${h + 12}:${pad(m)} Uhr.`,
    ],
    solutionVisual: { kind: 'clock', h, m },
  };
}, { tagLabels: { halb: 'halbe Stunde', viertel: 'Viertel vor/nach', volle: 'volle Stunde', 'halb-falsch': '„halb“ falsch verstanden' }, testSeconds: 20 });

const COINS_CT = [1, 2, 5, 10, 20, 50];
const MONEY_EUR = [100, 200, 500, 1000, 2000];
const euro = (ct: number) => (ct % 100 === 0 ? `${ct / 100} €` : `${Math.floor(ct / 100)},${pad(ct % 100)} €`);
const geld2 = M(2, 'm2-geld', 'Geld: Euro und Cent', '💶', {
  text: ['1 Euro = 100 Cent.', 'Zähle Geld immer vom größten zum kleinsten Wert: 50 ct, 20 ct, 10 ct, 5 ct …', 'Zähle dabei weiter: 50, 70, 80, 85 – zusammen 85 Cent.'],
  visual: { kind: 'money', items: [50, 20, 10, 5] },
  videoQuery: 'Geld zählen Euro Cent Klasse 2',
}, (r, s) => {
  // Stufe 3: Einkaufen mit Rückgeld (ganze Euro bis 100)
  if (s === 3 && chance(r, 0.5)) {
    const paid = pick(r, [20, 50, 100]);
    const price = ri(r, Math.floor(paid / 4), paid - 1);
    const [thing, e] = pick(r, [['ein Spiel', '🎲'], ['ein Buch', '📕'], ['einen Ball', '⚽'], ['einen Teddy', '🧸'], ['ein Puzzle', '🧩'], ['Turnschuhe', '👟']]);
    const name = pick(r, NAMES);
    return {
      key: `rg-${price}-${paid}`,
      prompt: `${name} kauft ${thing} ${e} für ${price} € und bezahlt mit einem ${paid}-€-Schein.\nWie viel Rückgeld bekommt ${name}?`,
      visual: { kind: 'money', items: [paid * 100] },
      answer: { type: 'number', value: paid - price, unit: '€' },
      tags: ['rueckgeld'],
      traps: [{ answer: String(paid + price), tag: 'plus-statt-minus', hint: 'Rückgeld ist das, was übrig bleibt – du musst minus rechnen.' }],
      solution: [`Ergänze von ${price} € bis ${paid} €:`, `${price} € + ${paid - price} € = ${paid} €`, `Rückgeld: ${paid - price} €`],
    };
  }
  const ct = chance(r, 0.5);
  const pool = ct ? COINS_CT : MONEY_EUR;
  let items: number[];
  do items = Array.from({ length: ri(r, 3, 5) }, () => pick(r, pool)).sort((x, y) => y - x);
  while (items.reduce(sumUp, 0) > (ct ? 100 : 10000));
  const total = items.reduce(sumUp, 0);
  let run = 0;
  const running = items.map((x) => (run += x)).map((x) => (ct ? `${x} ct` : euro(x))).join(', ');
  return {
    key: items.join('-'),
    prompt: `Wie viel Geld ist das? (in ${ct ? 'Cent' : 'Euro'})`,
    visual: { kind: 'money', items },
    answer: { type: 'number', value: ct ? total : total / 100, unit: ct ? 'ct' : '€' },
    tags: [ct ? 'cent' : 'euro'],
    solution: ['Zähle vom größten zum kleinsten Wert weiter:', running, `Zusammen: ${ct ? `${total} ct` : euro(total)}`],
    solutionVisual: { kind: 'money', items },
  };
}, { tagLabels: { cent: 'Cent zählen', euro: 'Euro zählen', rueckgeld: 'Rückgeld', 'plus-statt-minus': 'plus statt minus' }, testSeconds: 30 });

const LEN_OBJ = [
  { e: '✏️', name: 'ein Bleistift', ok: '15 cm', wrong: ['15 m', '1 cm', '150 cm'] },
  { e: '🚪', name: 'eine Tür (hoch)', ok: '2 m', wrong: ['2 cm', '20 m', '20 cm'] },
  { e: '🐜', name: 'eine Ameise', ok: '5 mm', wrong: ['5 cm', '5 m', '50 cm'] },
  { e: '🚌', name: 'ein Bus', ok: '12 m', wrong: ['12 cm', '120 m', '1 m'] },
  { e: '📱', name: 'ein Handy', ok: '15 cm', wrong: ['15 m', '150 cm', '1 cm'] },
  { e: '🧒', name: 'ein Kind in der 2. Klasse', ok: '125 cm', wrong: ['125 m', '12 cm', '12 m'] },
];
const laengen2 = M(2, 'm2-laengen', 'Längen: cm und m', '📏', {
  text: ['Kurze Dinge misst man in Zentimetern (cm), lange in Metern (m).', '1 m = 100 cm.', 'Beim Messen mit dem Lineal legst du die 0 an den Anfang des Gegenstands – nicht den Rand des Lineals!'],
  visual: { kind: 'ruler', cm: 7, emoji: '✏️' },
  videoQuery: 'Längen messen cm m Lineal Klasse 2',
}, (r) => {
  const v = ri(r, 0, 2);
  if (v === 0) {
    const cm = ri(r, 2, 12);
    return { key: `r${cm}`, prompt: 'Wie lang ist der Stift? (in cm)', visual: { kind: 'ruler', cm, emoji: '✏️' }, answer: { type: 'number', value: cm, unit: 'cm' }, tags: ['messen'], traps: [{ answer: String(cm + 1), tag: 'lineal-anlegen', hint: 'Zähle die Abstände, nicht die Striche – und starte bei der 0.' }], solution: [`Der Stift beginnt bei 0 und endet bei ${cm}.`, `Er ist ${cm} cm lang.`], solutionVisual: { kind: 'ruler', cm, emoji: '✏️' } };
  }
  if (v === 1) {
    const m = ri(r, 1, 9);
    if (chance(r, 0.5)) return { key: `mcm${m}`, prompt: `${m} m = ☐ cm`, answer: { type: 'number', value: m * 100, unit: 'cm' }, tags: ['umrechnen'], traps: [{ answer: String(m * 10), tag: 'umrechnungszahl', hint: '1 m sind 100 cm, nicht 10 cm.' }], solution: ['1 m = 100 cm', `${m} m = ${m} · 100 cm = ${m * 100} cm`] };
    return { key: `cmm${m}`, prompt: `${m * 100} cm = ☐ m`, answer: { type: 'number', value: m, unit: 'm' }, tags: ['umrechnen'], solution: ['100 cm = 1 m', `${m * 100} cm = ${m} m`] };
  }
  const o = pick(r, LEN_OBJ);
  return { key: `s${o.name}`, prompt: `Wie lang ist ungefähr ${o.name}?`, visual: { kind: 'emoji', chars: o.e }, answer: choice(r, o.ok, o.wrong), tags: ['schätzen'], solution: [`${o.name[0].toUpperCase() + o.name.slice(1)} ist ungefähr ${o.ok} lang.`, 'Tipp: Ein Lineal ist 30 cm lang, eine große Tür etwa 2 m hoch.'] };
}, { tagLabels: { messen: 'Messen mit dem Lineal', umrechnen: 'cm und m umrechnen', schätzen: 'Längen schätzen' }, testSeconds: 25 });

type Story = { text: string; q: string; calc: string; res: number; unit: string; ant: string; op: string; wrong?: number };
function storyGen(r: Rng, level: 2 | 3 | 4): Story {
  const n = pick(r, NAMES);
  const n2 = pick(r, NAMES.filter((x) => x !== n));
  const t = ri(r, 0, level === 2 ? 3 : 5);
  if (level === 2) {
    if (t === 0) { const a = ri(r, 12, 60), b = ri(r, 5, 35); return { text: `${n} hat ${a} Murmeln. ${n2} schenkt ${n} noch ${b} Murmeln.`, q: `Wie viele Murmeln hat ${n} jetzt?`, calc: `${a} + ${b} = ${a + b}`, res: a + b, unit: 'Murmeln', ant: `${n} hat jetzt ${a + b} Murmeln.`, op: 'plus', wrong: a - b }; }
    if (t === 1) { const a = ri(r, 30, 90), b = ri(r, 5, a - 5); return { text: `Im Bus sitzen ${a} Kinder. An der Haltestelle steigen ${b} Kinder aus.`, q: 'Wie viele Kinder sitzen jetzt noch im Bus?', calc: `${a} − ${b} = ${a - b}`, res: a - b, unit: 'Kinder', ant: `Es sitzen noch ${a - b} Kinder im Bus.`, op: 'minus', wrong: a + b <= 100 ? a + b : undefined }; }
    if (t === 2) { const a = ri(r, 2, 9), b = ri(r, 2, 10); return { text: `${n} kauft ${a} Packungen Sticker. In jeder Packung sind ${b} Sticker.`, q: 'Wie viele Sticker sind das zusammen?', calc: `${a} · ${b} = ${a * b}`, res: a * b, unit: 'Sticker', ant: `Das sind ${a * b} Sticker.`, op: 'mal', wrong: a + b }; }
    const d = ri(r, 2, 6), q = ri(r, 2, 10); return { text: `${d * q} Äpfel werden gerecht an ${d} Kinder verteilt.`, q: 'Wie viele Äpfel bekommt jedes Kind?', calc: `${d * q} : ${d} = ${q}`, res: q, unit: 'Äpfel', ant: `Jedes Kind bekommt ${q} Äpfel.`, op: 'geteilt', wrong: d * q - d };
  }
  if (level === 3) {
    if (t === 0) { const p = ri(r, 5, 12), k = ri(r, 3, 6), g = 10 * Math.ceil((p * k + 1) / 10) + pick(r, [0, 10, 20]); return { text: `Ein Kinoticket kostet ${p} €. Familie Berg kauft ${k} Tickets und bezahlt mit ${g} €.`, q: 'Wie viel Rückgeld bekommt sie?', calc: `${k} · ${p} € = ${k * p} €, dann ${g} € − ${k * p} € = ${g - k * p} €`, res: g - k * p, unit: '€', ant: `Sie bekommt ${g - k * p} € zurück.`, op: 'zwei-schritte', wrong: k * p }; }
    if (t === 1) { const a = ri(r, 120, 480), b = ri(r, 100, 400); return { text: `Die Schule sammelt Altpapier. Am Montag kommen ${a} kg zusammen, am Dienstag ${b} kg.`, q: 'Wie viel Kilogramm sind es zusammen?', calc: `${a} + ${b} = ${a + b}`, res: a + b, unit: 'kg', ant: `Es sind ${a + b} kg Altpapier.`, op: 'plus', wrong: Math.abs(a - b) }; }
    if (t === 2) { const a = ri(r, 3, 9) * 100, b = ri(r, 12, 99) * 2; return { text: `Ein Buch hat ${a} Seiten. ${n} hat schon ${b} Seiten gelesen.`, q: `Wie viele Seiten muss ${n} noch lesen?`, calc: `${a} − ${b} = ${a - b}`, res: a - b, unit: 'Seiten', ant: `Es sind noch ${a - b} Seiten.`, op: 'minus', wrong: a + b }; }
    if (t === 3) { const w = ri(r, 2, 4), d = ri(r, 2, 4); return { text: `${n} trainiert jede Woche ${d} Mal Fußball. Ein Training dauert 60 Minuten.`, q: `Wie viele Minuten trainiert ${n} in ${w} Wochen?`, calc: `${w} · ${d} = ${w * d} Trainings, ${w * d} · 60 = ${w * d * 60} Minuten`, res: w * d * 60, unit: 'Minuten', ant: `${n} trainiert ${w * d * 60} Minuten.`, op: 'zwei-schritte', wrong: w * d }; }
    if (t === 4) { const k = ri(r, 3, 8), b = ri(r, 4, 9) * k; return { text: `${b} Kinder fahren ins Schullandheim. In jedes Zimmer passen ${k} Kinder.`, q: 'Wie viele Zimmer werden gebraucht?', calc: `${b} : ${k} = ${b / k}`, res: b / k, unit: 'Zimmer', ant: `Es werden ${b / k} Zimmer gebraucht.`, op: 'geteilt' }; }
    const a = ri(r, 25, 60), b = ri(r, 10, a - 5), c = ri(r, 10, 40); return { text: `Am Kiosk liegen ${a} Brezeln. Vormittags werden ${b} verkauft, mittags kommen ${c} frische dazu.`, q: 'Wie viele Brezeln liegen jetzt am Kiosk?', calc: `${a} − ${b} = ${a - b}, dann ${a - b} + ${c} = ${a - b + c}`, res: a - b + c, unit: 'Brezeln', ant: `Es liegen ${a - b + c} Brezeln am Kiosk.`, op: 'zwei-schritte', wrong: a - b };
  }
  if (t === 0) { const p = ri(r, 12, 45), k = ri(r, 12, 28); return { text: `Die Klasse 4b fährt in den Zoo. Der Bus kostet ${p * 10} €, der Eintritt ${k} € pro Kind. Es fahren 25 Kinder mit.`, q: 'Wie viel kostet der Ausflug insgesamt?', calc: `25 · ${k} € = ${25 * k} €, dann ${25 * k} € + ${p * 10} € = ${25 * k + p * 10} €`, res: 25 * k + p * 10, unit: '€', ant: `Der Ausflug kostet ${25 * k + p * 10} €.`, op: 'zwei-schritte', wrong: 25 * k }; }
  if (t === 1) { const km = ri(r, 65, 110), h = pick(r, [2, 3, 4, 5]); /* realistisch: 65–110 km pro Stunde */ return { text: `Familie Yilmaz fährt in den Urlaub. Die Strecke ist ${km * h} km lang. Sie fahren ${h} Stunden.`, q: 'Wie viele Kilometer schaffen sie im Durchschnitt pro Stunde?', calc: `${km * h} : ${h} = ${km}`, res: km, unit: 'km', ant: `Sie fahren ${km} km pro Stunde.`, op: 'geteilt', wrong: km * h - h }; }
  if (t === 2) { const a = ri(r, 1200, 4800), b = ri(r, 800, a - 200); return { text: `Ein Fahrradhändler hat ${a} € eingenommen. Davon bezahlt er eine Rechnung über ${b} €.`, q: 'Wie viel Geld bleibt übrig?', calc: `${a} − ${b} = ${a - b}`, res: a - b, unit: '€', ant: `Es bleiben ${a - b} € übrig.`, op: 'minus', wrong: a + b }; }
  if (t === 3) { const k = ri(r, 3, 9), s = ri(r, 120, 450); return { text: `Eine Kiste Mineralwasser wiegt 9 kg ${s} g. Ein Lieferwagen bringt ${k} Kisten.`, q: 'Wie viel Gramm wiegen alle Kisten zusammen?', calc: `9 kg ${s} g = ${9000 + s} g, ${k} · ${9000 + s} g = ${k * (9000 + s)} g`, res: k * (9000 + s), unit: 'g', ant: `Die Kisten wiegen ${fmt(k * (9000 + s))} g.`, op: 'zwei-schritte', wrong: k * (9 + s) }; }
  if (t === 4) { const pp = ri(r, 3, 8), c = ri(r, 4, 9); return { text: `Für das Schulfest backen ${c} Eltern je ${pp} Bleche Kuchen. Auf jedes Blech passen 20 Stücke.`, q: 'Wie viele Kuchenstücke gibt es?', calc: `${c} · ${pp} = ${c * pp} Bleche, ${c * pp} · 20 = ${c * pp * 20} Stücke`, res: c * pp * 20, unit: 'Stücke', ant: `Es gibt ${c * pp * 20} Kuchenstücke.`, op: 'zwei-schritte', wrong: c * pp }; }
  const start = ri(r, 7, 9), dur = pick(r, [95, 110, 125, 140, 155]); const end = start * 60 + 15 + dur; return { text: `Der Ausflug beginnt um ${start}:15 Uhr. Die Busfahrt dauert ${dur} Minuten.`, q: 'Um wie viel Uhr kommt der Bus an?', calc: `${dur} min = ${Math.floor(dur / 60)} h ${dur % 60} min. ${start}:15 Uhr + ${Math.floor(dur / 60)} h ${dur % 60} min = ${Math.floor(end / 60)}:${pad(end % 60)} Uhr`, res: end, unit: 'Uhr', wrong: start * 60 + 15 + Math.floor(dur / 100) * 60 + (dur % 100), ant: `Der Bus kommt um ${Math.floor(end / 60)}:${pad(end % 60)} Uhr an.`, op: 'zeit' };
}
function storyTask(r: Rng, level: 2 | 3 | 4, stage: Stage = 2): Gen {
  let s = storyGen(r, level);
  for (let i = 0; i < 12 && ((stage === 1 && s.op === 'zwei-schritte') || (stage === 3 && level > 2 && s.op !== 'zwei-schritte')); i++) s = storyGen(r, level);
  if (s.op === 'zeit') {
    // Uhrzeit-Geschichte: die richtige Uhrzeit auswählen (res = Minuten seit Mitternacht, wrong = mit 100 statt 60 gerechnet)
    const t = (m: number) => `${Math.floor(m / 60)}:${pad(m % 60)} Uhr`;
    const traps = s.wrong !== undefined && s.wrong !== s.res ? [{ answer: t(s.wrong), tag: 'hundert-statt-sechzig', hint: 'Eine Stunde hat 60 Minuten, nicht 100! Zerlege die Fahrzeit in Stunden und Minuten.' }] : [];
    return {
      key: s.text,
      prompt: `${s.text}\n${s.q}`,
      answer: choice(r, t(s.res), [t(s.res + 10), t(s.res - 60), ...(s.wrong !== undefined ? [t(s.wrong)] : []), t(s.res + 60)]),
      tags: ['zeit'],
      traps,
      solution: [`Frage: ${s.q}`, `Rechnung: ${s.calc}`, `Antwort: ${s.ant}`],
    };
  }
  return {
    key: s.text,
    prompt: `${s.text}\n${s.q}`,
    answer: { type: 'number', value: s.res, unit: s.unit === '€' ? '€' : undefined },
    tags: [s.op],
    traps: s.wrong !== undefined && s.wrong !== s.res ? [{ answer: String(s.wrong), tag: s.op === 'zwei-schritte' ? 'schritt-vergessen' : 'falsche-rechenart', hint: s.op === 'zwei-schritte' ? 'Du hast nur den ersten Schritt gerechnet. Lies die Frage noch einmal genau.' : 'Lies genau: Kommt etwas dazu, geht etwas weg, wird vervielfacht oder verteilt?' }] : [],
    solution: [`Frage: ${s.q}`, `Rechnung: ${s.calc}`, `Antwort: ${s.ant}`],
  };
}
const SACH_TAGS = { plus: 'Plus-Geschichten', minus: 'Minus-Geschichten', mal: 'Mal-Geschichten', geteilt: 'Teilen-Geschichten', 'zwei-schritte': 'Aufgaben mit zwei Schritten', 'falsche-rechenart': 'falsche Rechenart gewählt', 'schritt-vergessen': 'einen Rechenschritt vergessen', zeit: 'Zeitrechnung', 'hundert-statt-sechzig': 'mit 100 statt 60 Minuten gerechnet' };
const sachEx = (k: string) => ({ text: ['Lies die Geschichte zweimal in Ruhe.', 'Frage dich: Was weiß ich? Was soll ich herausfinden?', 'Überlege: Kommt etwas dazu (+), geht etwas weg (−), gibt es mehrmals das Gleiche (·) oder wird verteilt (:)?', 'Schreibe Frage, Rechnung und Antwort auf.'], videoQuery: `Sachaufgaben lösen ${k} Grundschule` });
const sach2 = M(2, 'm2-sachaufgaben', 'Rechengeschichten', '📖', sachEx('Klasse 2'), (r, s) => storyTask(r, 2, s), { tagLabels: SACH_TAGS, testSeconds: 60 });

// ---------- Klasse 3 ----------

const stellenwert3 = M(3, 'm3-stellenwert', 'Zahlen bis 1000', '🏛️', {
  text: ['Zahlen bis 1000 haben Hunderter (H), Zehner (Z) und Einer (E).', '507: 5 Hunderter, 0 Zehner, 7 Einer. Die 0 ist wichtig – sie hält den Platz frei!', 'Eine Hunderterplatte besteht aus 10 Zehnerstangen.'],
  visual: { kind: 'placetable', digits: [5, 0, 7], labels: ['H', 'Z', 'E'] },
  videoQuery: 'Zahlen bis 1000 Stellenwerttafel Hunderter Zehner Einer Klasse 3',
}, (r, s) => {
  const h = ri(r, 1, 9), t = chance(r, s === 3 ? 0.6 : s === 2 ? 0.25 : 0) ? 0 : ri(r, 1, 9), o = s === 3 && chance(r, 0.4) ? 0 : ri(r, 0, 9);
  const n = 100 * h + 10 * t + o;
  const v = ri(r, 0, 2);
  if (v === 0) return { key: `b${n}`, prompt: 'Welche Zahl ist das?', visual: { kind: 'blocks', h, t, o }, answer: { type: 'number', value: n }, tags: t === 0 ? ['null'] : ['bündeln'], traps: t === 0 ? [{ answer: `${h}${o}`, tag: 'null-vergessen', hint: 'Es gibt keine Zehner – dafür musst du eine 0 schreiben!' }] : [], solution: [`${h} Hunderter = ${100 * h}`, `${t} Zehner = ${10 * t}`, `${o} Einer = ${o}`, `Zusammen: ${n}`], solutionVisual: { kind: 'placetable', digits: [h, t, o], labels: ['H', 'Z', 'E'] } };
  if (v === 1) return { key: `s${n}`, prompt: `${h} H  ${t} Z  ${o} E = ☐`, speak: `${h} Hunderter, ${t} Zehner, ${o} Einer`, answer: { type: 'number', value: n }, tags: t === 0 || o === 0 ? ['null'] : ['bündeln'], traps: t === 0 ? [{ answer: `${h}${o}`, tag: 'null-vergessen', hint: 'Bei 0 Zehnern schreibst du eine 0 an die Zehnerstelle.' }] : [], solution: [`Schreibe die Ziffern in die Stellenwerttafel: H = ${h}, Z = ${t}, E = ${o}.`, `Die Zahl heißt ${n}.`], solutionVisual: { kind: 'placetable', digits: [h, t, o], labels: ['H', 'Z', 'E'] } };
  const p = ri(r, 0, 2);
  const d = [h, t, o][p];
  return { key: `p${n}-${p}`, prompt: `Wie viele ${['Hunderter', 'Zehner', 'Einer'][p]} hat die Zahl ${n}?`, answer: { type: 'number', value: d }, tags: ['stellen'], solution: [`${n}: H = ${h}, Z = ${t}, E = ${o}`, `Die ${['Hunderter', 'Zehner', 'Einer'][p]}-Ziffer ist ${d}.`], solutionVisual: { kind: 'placetable', digits: [h, t, o], labels: ['H', 'Z', 'E'], highlight: p } };
}, { tagLabels: { null: 'Zahlen mit 0', 'null-vergessen': 'Null vergessen', stellen: 'Stellenwerte' }, testSeconds: 20 });

function roundTask(n: number, place: number): Gen {
  const unit = 10 ** place;
  const down = Math.floor(n / unit) * unit;
  const up = down + unit;
  const decide = Math.floor(n / (unit / 10)) % 10;
  const res = decide >= 5 ? up : down;
  const name = PLACE[place];
  return {
    key: `${n}-${place}`,
    prompt: `Runde ${fmt(n)} auf ${name}.`,
    answer: { type: 'number', value: res },
    tags: [`auf-${name.toLowerCase()}`, ...(decide === 5 ? ['fünf'] : [])],
    traps: [{ answer: String(decide >= 5 ? down : up), tag: 'falsche-richtung', hint: `Schau auf die Stelle rechts von den ${name}n: Dort steht ${decide}. Bei 0–4 rundest du ab, bei 5–9 auf.` }],
    solution: [`Schau auf die Ziffer rechts von den ${name}n: ${decide}.`, decide >= 5 ? `${decide} ist 5 oder mehr → aufrunden.` : `${decide} ist kleiner als 5 → abrunden.`, `${fmt(n)} ≈ ${fmt(res)}`],
    solutionVisual: unit <= 100 && n < 1000 ? { kind: 'numberline', from: down, to: up, start: n, jumps: [], step: unit / 10 } : undefined,
  };
}
const runden3 = M(3, 'm3-runden', 'Runden', '🎯', {
  text: ['Beim Runden schaust du auf die Ziffer rechts von der Stelle, auf die du rundest.', '0, 1, 2, 3, 4 → abrunden. 5, 6, 7, 8, 9 → aufrunden.', '347 auf Zehner: Die Einer-Ziffer ist 7 → aufrunden auf 350.', '347 auf Hunderter: Die Zehner-Ziffer ist 4 → abrunden auf 300.'],
  visual: { kind: 'numberline', from: 340, to: 350, start: 347, jumps: [], step: 1 },
  videoQuery: 'Runden auf Zehner Hunderter Klasse 3',
}, (r, s) => roundTask(ri(r, 101, 989), s === 1 ? 1 : s === 2 ? pick(r, [1, 2]) : 2), { tagLabels: { 'falsche-richtung': 'in die falsche Richtung gerundet', fünf: 'Runden bei der 5' }, testSeconds: 20 });

const kopf1000 = M(3, 'm3-kopfrechnen', 'Plus und Minus bis 1000', '🧠', {
  text: ['Nutze, was du kannst: 340 + 250 ist wie 34 + 25, nur mit Zehnern: 590.', 'Rechne in Schritten: 456 + 230 = 456 + 200 + 30 = 686.', 'Bei Minus ebenso: 700 − 260 = 700 − 200 − 60 = 440.', 'Platzhalter: Bei 340 + ☐ = 900 hilft die Umkehraufgabe: 900 − 340 = 560.'],
  videoQuery: 'Kopfrechnen bis 1000 Addition Subtraktion Klasse 3',
}, (r, st) => {
  // Platzhalter (ab Stufe 2): mit der Umkehraufgabe lösen
  if (st > 1 && chance(r, 0.3)) {
    const unit = st === 2 ? 10 : 1;
    const c = ri(r, 30, 99) * 10 + (unit === 1 ? ri(r, 0, 9) : 0);
    const x = ri(r, 5, Math.floor((c - 100) / unit)) * unit;
    const minus = chance(r, 0.5);
    if (!minus) {
      const a = c - x;
      return { key: `p${a}+x=${c}`, prompt: `${a} + ☐ = ${c}`, answer: { type: 'number', value: x }, tags: ['platzhalter'], traps: [{ answer: String(a + c), tag: 'umkehr-falsch', hint: 'Gesucht ist, was noch fehlt – nicht die Summe. Rechne die Umkehraufgabe mit minus.' }], solution: [`Umkehraufgabe: ${c} − ${a} = ${x}`, `Probe: ${a} + ${x} = ${c}`] };
    }
    const a = c + x;
    if (a <= 1000) return { key: `p${a}-x=${c}`, prompt: `${a} − ☐ = ${c}`, answer: { type: 'number', value: x }, tags: ['platzhalter'], traps: [{ answer: String(a + c), tag: 'umkehr-falsch', hint: 'Gesucht ist, wie viel weggenommen wurde. Rechne: größere Zahl minus Ergebnis.' }], solution: [`Rechne: ${a} − ${c} = ${x}`, `Probe: ${a} − ${x} = ${c}`] };
  }
  const kind = st === 1 ? ri(r, 0, 1) : st === 3 ? ri(r, 2, 3) : ri(r, 0, 3);
  let a: number, b: number, minus: boolean;
  if (kind === 0) { a = ri(r, 10, 60) * 10; b = ri(r, 10, 99 - a / 10) * 10; minus = false; }
  else if (kind === 1) { a = ri(r, 30, 99) * 10; b = ri(r, 10, a / 10 - 5) * 10; minus = true; }
  else if (kind === 2) { a = ri(r, 101, 699); b = ri(r, 1, 2) * 100 + ri(r, 1, 9) * 10; minus = false; }
  else { a = ri(r, 300, 999); b = ri(r, 1, 2) * 100 + ri(r, 1, 9) * 10 + ri(r, 1, 9); minus = true; }
  const res = minus ? a - b : a + b;
  const bh = b - (b % 100), bt = (b % 100) - (b % 10), bo = b % 10;
  const s = minus ? '−' : '+';
  const steps: string[] = [];
  let cur = a;
  for (const part of [bh, bt, bo].filter(Boolean)) { const nx = minus ? cur - part : cur + part; steps.push(`${cur} ${s} ${part} = ${nx}`); cur = nx; }
  return { key: `${a}${s}${b}`, prompt: `${a} ${s} ${b} = ☐`, answer: { type: 'number', value: res }, tags: [minus ? 'minus' : 'plus'], traps: minus || a >= b ? [{ answer: String(minus ? a + b : a - b), tag: 'rechenzeichen', hint: 'Achte auf das Rechenzeichen.' }] : [], solution: ['Rechne in Schritten:', ...steps] };
}, { tagLabels: { plus: 'plus', minus: 'minus', platzhalter: 'Platzhalter-Aufgaben', 'umkehr-falsch': 'Platzhalter: Umkehraufgabe vergessen' }, testSeconds: 30 });

/** Stufe 1 ohne Übertrag, Stufe 2 mit Übertrag, Stufe 3 drei Zahlen oder mehrere Überträge */
function plusNumbers(r: Rng, s: Stage): number[] {
  for (;;) {
    const nums = s === 3 && chance(r, 0.5) ? [ri(r, 100, 399), ri(r, 100, 299), ri(r, 10, 299)] : [ri(r, 120, 699), ri(r, 105, 399)];
    if (nums.reduce(sumUp, 0) > 999) continue; // Zahlenraum Klasse 3: bis 1000
    const c = columnAdd(nums).carries.filter(Boolean).length;
    if (s === 1 ? c === 0 : s === 2 ? c >= 1 : nums.length === 3 || c >= 2) return nums;
  }
}

const schrPlus = M(3, 'm3-schriftlich-plus', 'Schriftliche Addition', '🧾', {
  text: ['Schreibe die Zahlen genau untereinander: Einer unter Einer, Zehner unter Zehner, Hunderter unter Hunderter.', 'Rechne von rechts nach links – zuerst die Einer.', 'Ist das Ergebnis einer Spalte 10 oder mehr, schreibst du die Einer-Ziffer hin und merkst dir den Übertrag in der nächsten Spalte (kleine 1).'],
  visual: { kind: 'column', op: '+', rows: [358, 276], result: 634, carries: [0, 1, 1] },
  videoQuery: 'schriftliche Addition mit Übertrag Klasse 3',
}, (r, s) => {
  const nums = plusNumbers(r, s);
  const res = nums.reduce(sumUp, 0);
  const { steps, carries } = columnAdd(nums);
  const noCarry = Number([0, 1, 2].map((i) => nums.reduce((acc, n) => acc + (Math.floor(n / 10 ** i) % 10), 0) % 10).reverse().join(''));
  const hasCarry = carries.some(Boolean);
  return { key: nums.join('+'), prompt: `Rechne schriftlich:\n${nums.join(' + ')}`, speak: `Rechne schriftlich: ${nums.join(' plus ')}`, visual: { kind: 'column', op: '+', rows: nums }, work: { op: '+', rows: nums, result: res }, answer: { type: 'number', value: res }, tags: [hasCarry ? 'übertrag' : 'ohne-übertrag'], traps: hasCarry && noCarry !== res ? [{ answer: String(noCarry), tag: 'übertrag-vergessen', hint: 'Du hast den Übertrag vergessen. Schreibe ihn klein in die nächste Spalte und rechne ihn mit.' }] : [], solution: steps, solutionVisual: { kind: 'column', op: '+', rows: nums, result: res, carries } };
}, { tagLabels: { übertrag: 'mit Übertrag', 'übertrag-vergessen': 'Übertrag vergessen' }, testSeconds: 60 });

/** Stufe 1 ohne Entbündeln, Stufe 2 mit, Stufe 3 mit Nullen in der oberen Zahl */
function minusNumbers(r: Rng, s: Stage): [number, number] {
  for (;;) {
    const a = s === 3 ? pick(r, [ri(r, 3, 9) * 100 + ri(r, 1, 9), ri(r, 3, 9) * 100, ri(r, 3, 9) * 100 + ri(r, 1, 9) * 10]) : ri(r, 300, 999);
    const b = ri(r, 101, a - 50);
    const borrow = columnSub(a, b).carries.filter(Boolean).length;
    if (s === 1 ? borrow === 0 : borrow >= 1) return [a, b];
  }
}

const schrMinus = M(3, 'm3-schriftlich-minus', 'Schriftliche Subtraktion', '📝', {
  text: ['Schreibe die Zahlen genau untereinander – die größere Zahl oben.', 'Rechne von rechts nach links.', 'Ist die obere Ziffer zu klein, holst du dir einen von der nächsten Stelle (entbündeln): Aus 1 Zehner werden 10 Einer.', 'Ihr lernt in der Schule vielleicht das Ergänzungsverfahren – das Ergebnis ist das gleiche. Mach die Probe mit Plus!'],
  visual: { kind: 'column', op: '−', rows: [542, 178], result: 364 },
  videoQuery: 'schriftliche Subtraktion Klasse 3 erklärt',
}, (r, s) => {
  const [a, b] = minusNumbers(r, s);
  const res = a - b;
  const { steps, carries } = columnSub(a, b);
  const wrong = Number(digitsOf(a).reverse().map((d, i) => Math.abs(d - (digitsOf(b).reverse()[i] ?? 0))).reverse().join(''));
  return { key: `${a}-${b}`, prompt: `Rechne schriftlich:\n${a} − ${b}`, speak: `Rechne schriftlich: ${a} minus ${b}`, visual: { kind: 'column', op: '−', rows: [a, b] }, work: { op: '−', rows: [a, b], result: res }, answer: { type: 'number', value: res }, tags: [carries.some(Boolean) ? 'entbündeln' : 'ohne-entbündeln', ...(String(a).includes('0') ? ['null'] : [])], traps: wrong !== res ? [{ answer: String(wrong), tag: 'kleiner-minus-größer', hint: 'Du hast an einer Stelle die kleinere von der größeren Ziffer abgezogen (unten minus oben). Wenn oben zu wenig ist, musst du entbündeln.' }] : [], solution: [...steps, `Probe: ${res} + ${b} = ${a}`], solutionVisual: { kind: 'column', op: '−', rows: [a, b], result: res, carries } };
}, { tagLabels: { entbündeln: 'mit Entbündeln', null: 'mit Nullen', 'kleiner-minus-größer': 'unten minus oben gerechnet' }, testSeconds: 60 });

const mal3 = M(3, 'm3-mal-gross', 'Malnehmen mit großen Zahlen', '✳️', {
  text: ['Zehnereinmaleins: 30 · 4 ist wie 3 · 4, nur mit Zehnern: 12 Zehner = 120.', 'Zerlegen hilft (halbschriftlich): 14 · 6 = 10 · 6 + 4 · 6 = 60 + 24 = 84.'],
  visual: { kind: 'array', rows: 6, cols: 14, split: 10 },
  videoQuery: 'halbschriftliche Multiplikation Zehnereinmaleins Klasse 3',
}, (r) => {
  if (chance(r, 0.5)) {
    const a = ri(r, 2, 9), b = ri(r, 2, 9);
    return { key: `${a * 10}x${b}`, prompt: `${a * 10} · ${b} = ☐`, answer: { type: 'number', value: a * b * 10 }, tags: ['zehnermal'], traps: [{ answer: String(a * b), tag: 'null-vergessen', hint: 'Du rechnest mit Zehnern – die 0 am Ende nicht vergessen!' }], solution: [`${a} · ${b} = ${a * b}`, `${a * 10} · ${b} sind ${a * b} Zehner = ${a * b * 10}`] };
  }
  const a = pick(r, [11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 25, 26, 27, 28, 29]), b = ri(r, 3, 9);
  const t = a - (a % 10);
  return { key: `${a}x${b}`, prompt: `${a} · ${b} = ☐`, answer: { type: 'number', value: a * b }, tags: ['halbschriftlich'], traps: [{ answer: String(t * b + (a % 10)), tag: 'teil-vergessen', hint: `Du musst beide Teile mit ${b} malnehmen: ${t} · ${b} und ${a % 10} · ${b}.` }], solution: [`Zerlege ${a} in ${t} und ${a % 10}.`, `${t} · ${b} = ${t * b}`, `${a % 10} · ${b} = ${(a % 10) * b}`, `${t * b} + ${(a % 10) * b} = ${a * b}`] };
}, { tagLabels: { zehnermal: 'Zehnereinmaleins', halbschriftlich: 'Zerlegen beim Malnehmen' }, testSeconds: 30 });

const rest3 = M(3, 'm3-division-rest', 'Teilen mit Rest', '🍪', {
  text: ['Nicht immer geht eine Teilung auf. Was übrig bleibt, ist der Rest.', '23 : 5 – die größte passende Malaufgabe ist 4 · 5 = 20. Es bleiben 3 übrig: 23 : 5 = 4 Rest 3.', 'Wichtig: Der Rest muss immer kleiner sein als die Zahl, durch die du teilst!'],
  videoQuery: 'Division mit Rest Klasse 3',
}, (r) => {
  const d = ri(r, 2, 9), q = ri(r, 2, 10), rest = ri(r, 1, d - 1);
  const n = d * q + rest;
  const fmtR = (a: number, b: number) => `${a} Rest ${b}`;
  const correct = fmtR(q, rest);
  return { key: `${n}:${d}`, prompt: `${n} : ${d} = ?`, answer: choice(r, correct, [fmtR(q - 1, rest + d), fmtR(q + 1, rest), fmtR(q, rest + 1 < d ? rest + 1 : rest - 1), fmtR(q - 1, rest)]), tags: ['rest'], traps: [{ answer: fmtR(q - 1, rest + d), tag: 'rest-zu-groß', hint: `Der Rest ${rest + d} ist größer als ${d} – da passt noch einmal die ${d} hinein!` }], solution: [`Größte passende Malaufgabe: ${q} · ${d} = ${q * d}`, `${n} − ${q * d} = ${rest}`, `${n} : ${d} = ${q} Rest ${rest}`, `Der Rest ${rest} ist kleiner als ${d}. ✓`] };
}, { tagLabels: { 'rest-zu-groß': 'Rest zu groß' }, testSeconds: 30 });

const uhr3 = M(3, 'm3-uhrzeit', 'Uhrzeit und Zeitspannen', '⏱️', {
  text: ['Der große Zeiger zeigt die Minuten: Von Zahl zu Zahl sind es 5 Minuten.', 'Eine Stunde hat 60 Minuten.', 'Zeitspanne von 8:40 bis 9:15: Bis 9:00 sind es 20 Minuten, dann noch 15 Minuten – zusammen 35 Minuten.'],
  visual: { kind: 'clock', h: 8, m: 40 },
  videoQuery: 'Zeitspannen berechnen Uhrzeit Klasse 3',
}, (r) => {
  if (chance(r, 0.45)) {
    const h = ri(r, 1, 12), m = ri(r, 1, 11) * 5;
    const c = `${h}:${pad(m)}`;
    const swapH = Math.round(m / 5) || 12;
    return { key: `a${h}:${m}`, prompt: 'Wie spät ist es?', visual: { kind: 'clock', h, m }, answer: choice(r, c, [`${h}:${pad((m + 5) % 60)}`, `${h % 12 + 1}:${pad(m)}`, `${swapH}:${pad(h * 5 % 60)}`, `${h}:${pad(Math.abs(m - 10))}`, `${h === 1 ? 12 : h - 1}:${pad(m)}`]), tags: ['ablesen'], traps: [{ answer: `${swapH}:${pad(h * 5 % 60)}`, tag: 'zeiger-vertauscht', hint: 'Du hast die Zeiger vertauscht: Der kurze Zeiger zeigt die Stunden, der lange die Minuten.' }], solution: [`Kleiner Zeiger: kurz nach der ${h} → ${h} Uhr.`, `Großer Zeiger auf der ${m / 5}: ${m / 5} · 5 = ${m} Minuten.`, `Es ist ${c} Uhr.`], solutionVisual: { kind: 'clock', h, m } };
  }
  const sh = ri(r, 7, 16), sm = ri(r, 0, 11) * 5, dur = ri(r, 3, 22) * 5;
  const end = sh * 60 + sm + dur;
  const eh = Math.floor(end / 60), em = end % 60;
  const toFull = 60 - sm;
  return { key: `z${sh}:${sm}+${dur}`, prompt: `Die Probe beginnt um ${sh}:${pad(sm)} Uhr und endet um ${eh}:${pad(em)} Uhr.\nWie viele Minuten dauert sie?`, answer: { type: 'number', value: dur, unit: 'min' }, tags: ['zeitspanne'], traps: [{ answer: String(dur + 40), tag: 'hundert-statt-sechzig', hint: 'Eine Stunde hat 60 Minuten, nicht 100! Rechne bis zur vollen Stunde und dann weiter.' }], solution: eh > sh && sm > 0 && end > (sh + 1) * 60 ? [`Von ${sh}:${pad(sm)} bis ${sh + 1}:00 sind es ${toFull} Minuten.`, `Von ${sh + 1}:00 bis ${eh}:${pad(em)} sind es ${end - (sh + 1) * 60} Minuten.`, `Zusammen: ${toFull} + ${end - (sh + 1) * 60} = ${dur} Minuten`] : [`Von ${sh}:${pad(sm)} bis ${eh}:${pad(em)} sind es ${dur} Minuten.`] };
}, { tagLabels: { ablesen: 'Uhr ablesen', zeitspanne: 'Zeitspannen', 'zeiger-vertauscht': 'Zeiger vertauscht', 'hundert-statt-sechzig': 'mit 100 statt 60 Minuten gerechnet' }, testSeconds: 40 });

const WEIGHT_OBJ = [
  { e: '🍎', name: 'ein Apfel', ok: '150 g', wrong: ['150 kg', '15 kg', '1 g'] },
  { e: '🚗', name: 'ein Auto', ok: '1500 kg', wrong: ['1500 g', '15 kg', '150 g'] },
  { e: '🐘', name: 'ein Elefant', ok: '5000 kg', wrong: ['500 g', '50 kg', '5000 g'] },
  { e: '🧈', name: 'ein Stück Butter', ok: '250 g', wrong: ['250 kg', '25 kg', '2 g'] },
  { e: '🐈', name: 'eine Katze', ok: '4 kg', wrong: ['4 g', '40 kg', '400 kg'] },
];
const gewichte3 = M(3, 'm3-gewichte', 'Gewichte: g und kg', '⚖️', {
  text: ['Leichte Dinge wiegt man in Gramm (g), schwere in Kilogramm (kg).', '1 kg = 1000 g.', '3 kg 250 g = 3000 g + 250 g = 3250 g.'],
  videoQuery: 'Gewichte Gramm Kilogramm umrechnen Klasse 3',
}, (r) => {
  const v = ri(r, 0, 2);
  if (v === 0) { const k = ri(r, 1, 9), g = chance(r, 0.5) ? ri(r, 1, 9) * 100 : ri(r, 1, 19) * 50; return { key: `kg${k}-${g}`, prompt: `${k} kg ${g} g = ☐ g`, answer: { type: 'number', value: k * 1000 + g, unit: 'g' }, tags: ['umrechnen'], traps: [{ answer: String(k * 100 + g), tag: 'umrechnungszahl', hint: '1 kg sind 1000 g, nicht 100 g.' }], solution: ['1 kg = 1000 g', `${k} kg = ${k * 1000} g`, `${k * 1000} g + ${g} g = ${k * 1000 + g} g`] }; }
  if (v === 1) { const k = ri(r, 2, 9); return { key: `g${k}`, prompt: `${k * 1000} g = ☐ kg`, answer: { type: 'number', value: k, unit: 'kg' }, tags: ['umrechnen'], solution: ['1000 g = 1 kg', `${k * 1000} g = ${k} kg`] }; }
  const o = pick(r, WEIGHT_OBJ);
  return { key: `s${o.name}`, prompt: `Wie schwer ist ungefähr ${o.name}?`, visual: { kind: 'emoji', chars: o.e }, answer: choice(r, o.ok, o.wrong), tags: ['schätzen'], solution: [`${o.name[0].toUpperCase() + o.name.slice(1)} wiegt ungefähr ${o.ok}.`, 'Vergleiche: Eine Tafel Schokolade wiegt 100 g, ein Liter Milch etwa 1 kg.'] };
}, { tagLabels: { umrechnen: 'g und kg umrechnen', schätzen: 'Gewichte schätzen', umrechnungszahl: 'falsche Umrechnungszahl' }, testSeconds: 30 });

const laengen3 = M(3, 'm3-laengen', 'Längen: mm, cm, m, km', '🛣️', {
  text: ['1 cm = 10 mm', '1 m = 100 cm', '1 km = 1000 m', 'Gemischte Angaben rechnest du um und addierst: 3 m 45 cm = 300 cm + 45 cm = 345 cm.'],
  videoQuery: 'Längen umrechnen mm cm m km Klasse 3',
}, (r) => {
  const v = ri(r, 0, 3);
  if (v === 0) { const c = ri(r, 2, 9); return { key: `cmmm${c}`, prompt: `${c} cm = ☐ mm`, answer: { type: 'number', value: c * 10, unit: 'mm' }, tags: ['mm-cm'], solution: ['1 cm = 10 mm', `${c} cm = ${c * 10} mm`] }; }
  if (v === 1) { const m = ri(r, 1, 9), c = ri(r, 5, 95); return { key: `mcm${m}-${c}`, prompt: `${m} m ${c} cm = ☐ cm`, answer: { type: 'number', value: m * 100 + c, unit: 'cm' }, tags: ['cm-m'], traps: [{ answer: String(m * 10 + c), tag: 'umrechnungszahl', hint: '1 m sind 100 cm.' }], solution: ['1 m = 100 cm', `${m} m = ${m * 100} cm`, `${m * 100} cm + ${c} cm = ${m * 100 + c} cm`] }; }
  if (v === 2) { const k = ri(r, 1, 9), m = ri(r, 1, 9) * 100; return { key: `kmm${k}-${m}`, prompt: `${k} km ${m} m = ☐ m`, answer: { type: 'number', value: k * 1000 + m, unit: 'm' }, tags: ['m-km'], traps: [{ answer: String(k * 100 + m), tag: 'umrechnungszahl', hint: '1 km sind 1000 m.' }], solution: ['1 km = 1000 m', `${k} km = ${k * 1000} m`, `${k * 1000} m + ${m} m = ${k * 1000 + m} m`] }; }
  const k = ri(r, 2, 9); return { key: `mkm${k}`, prompt: `${k * 1000} m = ☐ km`, answer: { type: 'number', value: k, unit: 'km' }, tags: ['m-km'], solution: ['1000 m = 1 km', `${k * 1000} m = ${k} km`] };
}, { tagLabels: { 'mm-cm': 'mm und cm', 'cm-m': 'cm und m', 'm-km': 'm und km', umrechnungszahl: 'falsche Umrechnungszahl' }, testSeconds: 30 });

const BODIES = [
  { s: 'Würfel', info: 'Ein Würfel hat 6 gleich große quadratische Flächen, 8 Ecken und 12 Kanten.', e: 8, f: 6, k: 12 },
  { s: 'Quader', info: 'Ein Quader hat 6 rechteckige Flächen, 8 Ecken und 12 Kanten – wie ein Schuhkarton.', e: 8, f: 6, k: 12 },
  { s: 'Kugel', info: 'Eine Kugel ist ganz rund – wie ein Ball. Sie hat keine Ecken und Kanten.', e: 0, f: 1, k: 0 },
  { s: 'Zylinder', info: 'Ein Zylinder hat zwei runde Flächen (oben und unten) – wie eine Dose.', e: 0, f: 3, k: 2 },
  { s: 'Kegel', info: 'Ein Kegel hat eine runde Grundfläche und eine Spitze – wie eine Eistüte.', e: 0, f: 2, k: 1 },
  { s: 'Pyramide', info: 'Eine Pyramide (mit viereckiger Grundfläche) hat 5 Ecken, 5 Flächen und 8 Kanten.', e: 5, f: 5, k: 8 },
];
const BODY_OBJ = [
  { name: 'ein Fußball', e: '⚽', s: 'Kugel', why: 'Ein Ball ist überall rund – er rollt in jede Richtung.' },
  { name: 'eine Orange', e: '🍊', s: 'Kugel', why: 'Eine Orange ist rund wie ein Ball.' },
  { name: 'eine Konservendose', e: '🥫', s: 'Zylinder', why: 'Eine Dose hat oben und unten eine runde Fläche.' },
  { name: 'eine Kerze', e: '🕯️', s: 'Zylinder', why: 'Eine Kerze ist rund und gerade – oben und unten ein Kreis.' },
  { name: 'ein Spielwürfel', e: '🎲', s: 'Würfel', why: 'Alle 6 Flächen sind gleich große Quadrate.' },
  { name: 'ein Eiswürfel', e: '🧊', s: 'Würfel', why: 'Ein Eiswürfel hat 6 gleich große quadratische Flächen.' },
  { name: 'ein Paket', e: '📦', s: 'Quader', why: 'Ein Paket ist wie ein Schuhkarton: 6 rechteckige Flächen.' },
  { name: 'eine Eistüte (die Waffel)', e: '🍦', s: 'Kegel', why: 'Die Waffel hat oben eine runde Öffnung und unten eine Spitze.' },
  // Nachtlauf 22.10.2026: mehr Dinge aus dem Alltag
  { name: 'ein Globus', e: '🌍', s: 'Kugel', why: 'Ein Globus ist rund wie ein Ball – die Erde ist eine Kugel.' },
  { name: 'ein Ziegelstein', e: '🧱', s: 'Quader', why: 'Ein Ziegelstein hat 6 rechteckige Flächen.' },
  { name: 'ein Buch', e: '📕', s: 'Quader', why: 'Ein geschlossenes Buch hat 6 rechteckige Flächen.' },
  { name: 'eine Rolle Klopapier', e: '🧻', s: 'Zylinder', why: 'Die Rolle ist oben und unten rund und dazwischen gerade.' },
  { name: 'eine Batterie', e: '🔋', s: 'Zylinder', why: 'Eine Batterie hat oben und unten eine runde Fläche.' },
  { name: 'ein Partyhut', e: '🥳', s: 'Kegel', why: 'Ein Partyhut ist unten rund und oben spitz.' },
];
const BODY_Q = [
  { q: 'Welcher Körper hat keine Ecken und keine Kanten?', s: 'Kugel', why: 'Die Kugel ist ganz rund – nirgends eine Ecke oder Kante.' },
  { q: 'Welcher Körper hat eine Spitze und eine runde Grundfläche?', s: 'Kegel', why: 'Der Kegel: unten ein Kreis, oben eine Spitze.' },
  { q: 'Welcher Körper hat zwei runde Flächen – oben und unten?', s: 'Zylinder', why: 'Der Zylinder hat oben und unten je einen Kreis.' },
  { q: 'Welcher Körper hat 6 gleich große quadratische Flächen?', s: 'Würfel', why: 'Beim Würfel sind alle Flächen gleich große Quadrate.' },
  { q: 'Welcher Körper hat 6 Flächen, aber nicht alle sind gleich groß?', s: 'Quader', why: 'Beim Quader sind die Flächen Rechtecke – gegenüberliegende sind gleich, aber nicht alle.' },
  { q: 'Welcher Körper hat 5 Ecken?', s: 'Pyramide', why: 'Die Pyramide hat 4 Ecken unten und 1 Spitze oben: 5 Ecken.' },
  // Nachtlauf 22.10.2026: mehr Fragen
  { q: 'Welcher Körper hat 8 Kanten?', s: 'Pyramide', why: 'Die Pyramide hat 4 Kanten unten und 4 Kanten nach oben zur Spitze: 8 Kanten.' },
  { q: 'Welcher Körper hat 12 gleich lange Kanten?', s: 'Würfel', why: 'Beim Würfel sind alle 12 Kanten gleich lang.' },
  { q: 'Welcher Körper hat eine viereckige Grundfläche und eine Spitze?', s: 'Pyramide', why: 'Die Pyramide steht auf einem Viereck und läuft oben spitz zu.' },
  { q: 'Welcher Körper besteht nur aus einer gebogenen Fläche?', s: 'Kugel', why: 'Die Kugel hat nur eine Fläche – und die ist überall gebogen.' },
];
const koerper3 = M(3, 'm3-koerper', 'Geometrische Körper', '🧊', {
  text: ['Körper sind räumlich – man kann sie anfassen.', 'Würfel und Quader haben 8 Ecken, 12 Kanten und 6 Flächen.', 'Kugel, Zylinder und Kegel haben runde Flächen.'],
  visual: { kind: 'shape', shape: 'Würfel' },
  videoQuery: 'geometrische Körper Würfel Quader Kugel Zylinder Kegel Pyramide Grundschule',
}, (r) => {
  const v = ri(r, 0, 3);
  // Körper im Alltag
  if (v === 2) {
    const o = pick(r, BODY_OBJ);
    return { key: `o-${o.name}`, prompt: `Welche Form hat ${o.name}?`, visual: { kind: 'emoji', chars: o.e }, answer: choice(r, o.s, BODIES.map((x) => x.s)), tags: ['alltag'], solution: [o.why, BODIES.find((x) => x.s === o.s)!.info] };
  }
  // Eigenschaften: Welcher Körper …?
  if (v === 3) {
    const q = pick(r, BODY_Q);
    return { key: `q-${q.q}`, prompt: q.q, answer: choice(r, q.s, BODIES.map((x) => x.s)), tags: ['eigenschaften'], solution: [q.why, BODIES.find((x) => x.s === q.s)!.info] };
  }
  const b = pick(r, BODIES);
  if (b.e > 0 && v === 1) {
    const w = pick(r, [['Ecken', b.e], ['Kanten', b.k], ['Flächen', b.f]] as const);
    return { key: `${b.s}-${w[0]}`, prompt: `Wie viele ${w[0]} hat ein${b.s === 'Pyramide' ? 'e' : ''} ${b.s}?`, visual: { kind: 'shape', shape: b.s }, answer: { type: 'number', value: w[1] }, tags: ['ecken-kanten'], solution: [b.info] };
  }
  return { key: b.s, prompt: 'Wie heißt dieser Körper?', visual: { kind: 'shape', shape: b.s }, answer: choice(r, b.s, BODIES.map((x) => x.s)), tags: ['benennen'], solution: [b.info] };
}, { tagLabels: { 'ecken-kanten': 'Ecken, Kanten, Flächen', benennen: 'Körper benennen', alltag: 'Körper im Alltag', eigenschaften: 'Eigenschaften von Körpern' }, testSeconds: 20 });

const sach3 = M(3, 'm3-sachaufgaben', 'Sachaufgaben', '🧐', sachEx('Klasse 3'), (r, s) => storyTask(r, 3, s), { tagLabels: SACH_TAGS, testSeconds: 90 });

// ---------- Klasse 4 ----------

const stellenwert4 = M(4, 'm4-stellenwert', 'Zahlen bis 1 Million', '🌌', {
  text: ['Große Zahlen liest du in Dreierpäckchen von rechts: 485 213 = 485 Tausend 213.', 'Die Stellen heißen: Einer, Zehner, Hunderter, Tausender, Zehntausender, Hunderttausender.', '1 Million = 1000 Tausend = 1 000 000.'],
  visual: { kind: 'placetable', digits: [4, 8, 5, 2, 1, 3], labels: ['HT', 'ZT', 'T', 'H', 'Z', 'E'] },
  videoQuery: 'Zahlen bis eine Million Stellenwerttafel Klasse 4',
}, (r) => {
  const n = ri(r, 10000, 999999);
  const ds = digitsOf(n);
  const labels = PLACE_SHORT.slice(0, ds.length).reverse();
  const v = ri(r, 0, 2);
  if (v === 0) {
    const p = ri(r, 0, ds.length - 1);
    const d = ds[ds.length - 1 - p];
    return { key: `d${n}-${p}`, prompt: `Welche Ziffer steht in ${fmt(n)} an der ${PLACE[p]}stelle?`, answer: { type: 'number', value: d }, tags: ['stellen'], solution: [`Zähle von rechts: Einer, Zehner, Hunderter, Tausender …`, `An der ${PLACE[p]}stelle steht die ${d}.`], solutionVisual: { kind: 'placetable', digits: ds, labels, highlight: ds.length - 1 - p } };
  }
  if (v === 1) {
    const step = pick(r, [1000, 10000, 100]);
    const more = chance(r, 0.5);
    const res = more ? n + step : n - step;
    return { key: `m${n}-${step}-${more}`, prompt: `Welche Zahl ist ${fmt(step)} ${more ? 'mehr' : 'weniger'} als ${fmt(n)}?`, answer: { type: 'number', value: res }, tags: ['nachbarn'], solution: [`Nur die ${PLACE[Math.log10(step)]}stelle ändert sich (mit Übertrag, wenn nötig).`, `${fmt(n)} ${more ? '+' : '−'} ${fmt(step)} = ${fmt(res)}`] };
  }
  const t = Math.floor(n / 1000), rest = n % 1000;
  return { key: `s${n}`, prompt: `${t} Tausend ${rest} = ☐`, speak: `${t} Tausend ${rest}. Schreibe als Zahl.`, answer: { type: 'number', value: n }, tags: ['schreiben'], traps: rest < 100 ? [{ answer: `${t}${rest}`, tag: 'null-vergessen', hint: 'Hinter dem Tausender kommen immer drei Stellen – fülle mit Nullen auf.' }] : [], solution: [`${t} Tausend = ${fmt(t * 1000)}`, `${fmt(t * 1000)} + ${rest} = ${fmt(n)}`], solutionVisual: { kind: 'placetable', digits: ds, labels } };
}, { tagLabels: { stellen: 'Stellenwerte', 'null-vergessen': 'Null vergessen', nachbarn: 'große Zahlen verändern', schreiben: 'Zahlen schreiben' }, testSeconds: 30 });

const runden4 = M(4, 'm4-runden', 'Runden und Überschlagen', '🎯', {
  text: ['Runden geht bei großen Zahlen genauso: Schau auf die Ziffer rechts von der Rundungsstelle.', '0–4 abrunden, 5–9 aufrunden.', 'Überschlagen: Runde erst, dann rechne – so prüfst du, ob dein Ergebnis ungefähr stimmt.'],
  videoQuery: 'Runden große Zahlen Überschlag Klasse 4',
}, (r, s) => roundTask(s === 1 ? ri(r, 1001, 9999) : s === 2 ? ri(r, 10001, 999999) : ri(r, 100001, 949999), s === 1 ? pick(r, [2, 3]) : s === 2 ? pick(r, [3, 4]) : pick(r, [4, 5])), { tagLabels: { 'falsche-richtung': 'in die falsche Richtung gerundet', fünf: 'Runden bei der 5' }, testSeconds: 25 });

const schrMal = M(4, 'm4-schriftlich-mal', 'Schriftliche Multiplikation', '✖️', {
  text: ['Mit einstelliger Zahl: Rechne von rechts nach links und nimm jede Ziffer mal. Überträge schreibst du klein auf.', 'Mit zweistelliger Zahl: Rechne zuerst mal den Zehner, dann mal den Einer. Das zweite Teilergebnis rückt eine Stelle nach rechts. Dann addierst du.'],
  visual: { kind: 'column', op: '·', rows: [347, 6], result: 2082 },
  videoQuery: 'schriftliche Multiplikation Klasse 4 erklärt',
}, (r, s) => {
  if (s === 1 || (s === 2 && chance(r, 0.7))) {
    const a = s === 1 ? ri(r, 12, 399) : ri(r, 120, 2999), d = s === 1 ? ri(r, 2, 5) : ri(r, 3, 9);
    return { key: `${a}x${d}`, prompt: `Rechne schriftlich:\n${a} · ${d}`, speak: `Rechne schriftlich: ${a} mal ${d}`, visual: { kind: 'column', op: '·', rows: [a, d] }, work: { op: '·', rows: [a, d], result: a * d }, answer: { type: 'number', value: a * d }, tags: ['einstellig'], solution: [...columnMul1(a, d), `Ergebnis: ${fmt(a * d)}`], solutionVisual: { kind: 'column', op: '·', rows: [a, d], result: a * d } };
  }
  const a = ri(r, 102, 899), b = ri(r, 12, 49);
  const t = Math.floor(b / 10), o = b % 10;
  return { key: `${a}x${b}`, prompt: `Rechne schriftlich:\n${a} · ${b}`, speak: `Rechne schriftlich: ${a} mal ${b}`, visual: { kind: 'column', op: '·', rows: [a, b] }, work: { op: '·', rows: [a, b], result: a * b }, answer: { type: 'number', value: a * b }, tags: ['zweistellig'], traps: [{ answer: String(a * (t + o)), tag: 'stelle-verschoben', hint: `Die Zehnerziffer ${t} bedeutet ${t * 10}! Das Teilergebnis mit dem Zehner ist ${a} · ${t * 10} = ${a * t * 10}.` }], solution: [`${a} · ${t} Zehner = ${fmt(a * t * 10)}`, `${a} · ${o} = ${fmt(a * o)}`, `${fmt(a * t * 10)} + ${fmt(a * o)} = ${fmt(a * b)}`], solutionVisual: { kind: 'column', op: '·', rows: [a, b], result: a * b, steps: [String(a * t), String(a * o)] } };
}, { tagLabels: { einstellig: 'mal einstellige Zahl', zweistellig: 'mal zweistellige Zahl', 'stelle-verschoben': 'Stellen verschoben' }, testSeconds: 90 });

const schrGeteilt = M(4, 'm4-schriftlich-geteilt', 'Schriftliche Division', '➗', {
  text: ['Teile Ziffer für Ziffer von links nach rechts.', 'Frage: Wie oft passt die Zahl hinein? Schreibe das Ergebnis, rechne den Rest aus und hole die nächste Ziffer herunter.', 'Mach am Ende die Probe mit der Malaufgabe.'],
  visual: { kind: 'column', op: ':', rows: [852, 4], result: 213 },
  videoQuery: 'schriftliche Division Klasse 4 erklärt',
}, (r, s) => {
  const d = s === 1 ? ri(r, 2, 5) : ri(r, 2, 9);
  let q = ri(r, 102, 999);
  while ((s === 1 && String(q).includes('0')) || (s === 3 && !String(q).includes('0') && q < 1000)) q = s === 3 ? pick(r, [ri(r, 1, 9) * 100 + ri(r, 1, 9), ri(r, 101, 999), ri(r, 1, 9) * 100 + ri(r, 1, 9) * 10]) : ri(r, 102, 999);
  // ab Stufe 2 manchmal mit Rest (NRW: Division durch einstellige Zahlen mit Restschreibweise)
  const rest = s >= 2 && chance(r, s === 3 ? 0.5 : 0.3) ? ri(r, 1, d - 1) : 0;
  if (rest) {
    const n = d * q + rest;
    const { steps } = columnDiv(n, d);
    return {
      key: `${n}:${d}`,
      prompt: `Rechne schriftlich mit Rest:\n${fmt(n)} : ${d}`,
      speak: `Rechne schriftlich: ${n} geteilt durch ${d}. Schreibe auch den Rest auf.`,
      work: { op: ':', rows: [n, d], result: q, rest },
      answer: { type: 'text', value: `${q} Rest ${rest}`, accept: [`${q} R ${rest}`, `${q}R${rest}`] },
      tags: ['mit-rest'],
      solution: [...steps, `Ergebnis: ${q} Rest ${rest}`, `Probe: ${q} · ${d} + ${rest} = ${fmt(n)} ✓`],
      solutionVisual: { kind: 'column', op: ':', rows: [n, d], result: q, steps },
    };
  }
  const n = d * q;
  const { steps } = columnDiv(n, d);
  return { key: `${n}:${d}`, prompt: `Rechne schriftlich:\n${fmt(n)} : ${d}`, speak: `Rechne schriftlich: ${n} geteilt durch ${d}`, work: { op: ':', rows: [n, d], result: q }, answer: { type: 'number', value: q }, tags: [String(q).includes('0') ? 'null-im-ergebnis' : 'division'], traps: String(q).includes('0') ? [{ answer: String(q).replace(/0/g, ''), tag: 'null-vergessen', hint: 'Wenn die Zahl nicht hineinpasst, schreibst du eine 0 ins Ergebnis!' }] : [], solution: [...steps, `Probe: ${q} · ${d} = ${fmt(n)} ✓`], solutionVisual: { kind: 'column', op: ':', rows: [n, d], result: q, steps } };
}, { tagLabels: { 'null-im-ergebnis': 'Null im Ergebnis', 'null-vergessen': 'Null im Ergebnis vergessen', 'mit-rest': 'Teilen mit Rest' }, testSeconds: 90 });

const GROESSEN: { q: (r: Rng) => { p: string; v: number; unit: string; tag: string; sol: string[]; trap?: number } }[] = [
  { q: (r) => { const l = ri(r, 2, 9); return { p: `${l} l = ☐ ml`, v: l * 1000, unit: 'ml', tag: 'liter', sol: ['1 l = 1000 ml', `${l} l = ${l * 1000} ml`], trap: l * 100 }; } },
  { q: (r) => { const h = ri(r, 2, 5); return { p: `${h} h = ☐ min`, v: h * 60, unit: 'min', tag: 'zeit', sol: ['1 h = 60 min', `${h} h = ${h} · 60 min = ${h * 60} min`], trap: h * 100 }; } },
  { q: (r) => { const h = ri(r, 1, 3), m = ri(r, 1, 11) * 5; return { p: `${h} h ${m} min = ☐ min`, v: h * 60 + m, unit: 'min', tag: 'zeit', sol: ['1 h = 60 min', `${h} h = ${h * 60} min`, `${h * 60} + ${m} = ${h * 60 + m} min`], trap: h * 100 + m }; } },
  { q: (r) => { const m = ri(r, 2, 9); return { p: `${m} min = ☐ s`, v: m * 60, unit: 's', tag: 'zeit', sol: ['1 min = 60 s', `${m} min = ${m * 60} s`], trap: m * 100 }; } },
  { q: (r) => { const d = ri(r, 2, 4); return { p: `${d} Tage = ☐ h`, v: d * 24, unit: 'h', tag: 'zeit', sol: ['1 Tag = 24 h', `${d} · 24 h = ${d * 24} h`] }; } },
  { q: (r) => { const e = ri(r, 1, 9), c = ri(r, 1, 19) * 5; return { p: `${e},${pad(c)} € = ☐ ct`, v: e * 100 + c, unit: 'ct', tag: 'geld', sol: ['1 € = 100 ct', `${e} € = ${e * 100} ct`, `${e * 100} ct + ${c} ct = ${e * 100 + c} ct`], trap: e * 10 + c }; } },
  { q: (r) => { const k = ri(r, 2, 9), g = ri(r, 1, 9) * 100; return { p: `${k} kg ${g} g = ☐ g`, v: k * 1000 + g, unit: 'g', tag: 'gewicht', sol: ['1 kg = 1000 g', `${k * 1000} g + ${g} g = ${k * 1000 + g} g`], trap: k * 100 + g }; } },
  { q: (r) => { const k = ri(r, 2, 9), m = ri(r, 1, 9) * 100; return { p: `${k} km ${m} m = ☐ m`, v: k * 1000 + m, unit: 'm', tag: 'länge', sol: ['1 km = 1000 m', `${k * 1000} m + ${m} m = ${k * 1000 + m} m`], trap: k * 100 + m }; } },
  { q: (r) => { const t = ri(r, 2, 9); return { p: `${t * 1000} ml = ☐ l`, v: t, unit: 'l', tag: 'liter', sol: ['1000 ml = 1 l', `${t * 1000} ml = ${t} l`] }; } },
  // Tonne (NRW Kl. 4: t, kg, g)
  { q: (r) => { const t = ri(r, 2, 9); return { p: `${t} t = ☐ kg`, v: t * 1000, unit: 'kg', tag: 'gewicht', sol: ['1 t = 1000 kg', `${t} t = ${t} · 1000 kg = ${t * 1000} kg`], trap: t * 100 }; } },
  { q: (r) => { const t = ri(r, 1, 5), k = ri(r, 1, 9) * 100; return { p: `${t} t ${k} kg = ☐ kg`, v: t * 1000 + k, unit: 'kg', tag: 'gewicht', sol: ['1 t = 1000 kg', `${t * 1000} kg + ${k} kg = ${t * 1000 + k} kg`], trap: t * 100 + k }; } },
  // Kommaschreibweise (NRW Kl. 4): Zahl vor dem Komma = große Einheit, dahinter die kleinere
  { q: (r) => { const m = ri(r, 1, 9), c = ri(r, 1, 19) * 5; return { p: `${m},${pad(c)} m = ☐ cm`, v: m * 100 + c, unit: 'cm', tag: 'komma', sol: ['1 m = 100 cm', `${m},${pad(c)} m heißt: ${m} m und ${c} cm`, `${m * 100} cm + ${c} cm = ${m * 100 + c} cm`], trap: m * 10 + c }; } },
  { q: (r) => { const k = ri(r, 1, 9), h = ri(r, 1, 9); return { p: `${k},${h} km = ☐ m`, v: k * 1000 + h * 100, unit: 'm', tag: 'komma', sol: ['1 km = 1000 m', `Die erste Stelle nach dem Komma sind Hunderter: ${k},${h} km = ${k} km ${h * 100} m`, `${k * 1000} m + ${h * 100} m = ${k * 1000 + h * 100} m`], trap: k * 1000 + h }; } },
  { q: (r) => { const k = ri(r, 1, 9), h = ri(r, 1, 9); return { p: `${k},${h} kg = ☐ g`, v: k * 1000 + h * 100, unit: 'g', tag: 'komma', sol: ['1 kg = 1000 g', `${k},${h} kg = ${k} kg ${h * 100} g`, `${k * 1000} g + ${h * 100} g = ${k * 1000 + h * 100} g`], trap: k * 1000 + h }; } },
];
const groessen4 = M(4, 'm4-groessen', 'Größen umrechnen', '🔄', {
  text: ['Merke dir die Umrechnungszahlen:', '1 km = 1000 m · 1 m = 100 cm · 1 cm = 10 mm', '1 t = 1000 kg · 1 kg = 1000 g · 1 l = 1000 ml · 1 € = 100 ct', '1 Tag = 24 h · 1 h = 60 min · 1 min = 60 s', 'Achtung bei der Zeit: Hier ist die Umrechnungszahl 60, nicht 100!', 'Kommaschreibweise: 8,30 m sind 8 m und 30 cm, also 830 cm. 3,5 km sind 3500 m.'],
  videoQuery: 'Größen umrechnen Klasse 4 Längen Gewichte Zeit Hohlmaße',
}, (r, s) => {
  const g = GROESSEN[pick(r, s === 1 ? [0, 1, 3, 4, 8, 9] : s === 3 ? [2, 5, 6, 7, 10, 11, 12, 13] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])].q(r);
  return { key: g.p, prompt: g.p, answer: { type: 'number', value: g.v, unit: g.unit }, tags: [g.tag], traps: g.trap !== undefined ? [{ answer: String(g.trap), tag: 'umrechnungszahl', hint: g.tag === 'zeit' ? 'Bei der Zeit ist die Umrechnungszahl 60, nicht 100.' : 'Schau noch einmal auf die Umrechnungszahl.' }] : [], solution: g.sol };
}, { tagLabels: { liter: 'Liter und Milliliter', zeit: 'Zeiteinheiten', geld: 'Euro und Cent', gewicht: 'Gewichte', länge: 'Längen', komma: 'Kommaschreibweise', umrechnungszahl: 'falsche Umrechnungszahl' }, testSeconds: 30 });

const flaeche4 = M(4, 'm4-flaeche', 'Umfang und Fläche', '🟩', {
  text: ['Der Umfang ist der Weg einmal ganz außen herum: Alle Seiten zusammen.', 'Rechteck: Umfang = 2 · Länge + 2 · Breite.', 'Die Fläche sagt, wie viel Platz innen ist: Zähle die Kästchen oder rechne Länge · Breite.', 'Merke: Umfang = Zaun außen herum. Fläche = Rasen innen.'],
  visual: { kind: 'rect', w: 5, h: 3 },
  videoQuery: 'Umfang und Flächeninhalt Rechteck Grundschule Klasse 4',
}, (r, s) => {
  const w = s === 1 ? ri(r, 2, 5) : ri(r, 3, 9), h = s === 1 ? ri(r, 2, 4) : s === 3 ? ri(r, 4, 7) : ri(r, 2, 6);
  const umfang = chance(r, 0.5);
  const v = umfang ? 2 * (w + h) : w * h;
  const other = umfang ? w * h : 2 * (w + h);
  return { key: `${umfang ? 'u' : 'f'}${w}x${h}`, prompt: umfang ? `Wie lang ist der Umfang des Rechtecks? (1 Kästchen = 1 cm)` : 'Wie groß ist die Fläche? (Wie viele Kästchen?)', visual: { kind: 'rect', w, h }, answer: { type: 'number', value: v, unit: umfang ? 'cm' : 'Kästchen' }, tags: [umfang ? 'umfang' : 'fläche'], traps: other !== v ? [{ answer: String(other), tag: 'verwechselt', hint: umfang ? 'Das ist die Fläche (innen). Der Umfang ist der Weg außen herum.' : 'Das ist der Umfang (außen herum). Die Fläche sind die Kästchen innen.' }] : [], solution: umfang ? [`Länge ${w} cm, Breite ${h} cm`, `Umfang = ${w} + ${h} + ${w} + ${h} = ${v} cm`] : [`${h} Reihen mit je ${w} Kästchen`, `${h} · ${w} = ${v} Kästchen`], solutionVisual: { kind: 'rect', w, h, show: umfang ? 'umfang' : 'flaeche' } };
}, { tagLabels: { umfang: 'Umfang', fläche: 'Fläche', verwechselt: 'Umfang und Fläche verwechselt' }, testSeconds: 40 });

const kopf4 = M(4, 'm4-kopfrechnen', 'Rechnen mit großen Zahlen', '💭', {
  text: ['Bei glatten Zahlen rechnest du wie mit kleinen Zahlen und hängst die Nullen an.', '45 000 + 23 000: 45 + 23 = 68 → 68 000.', '600 · 4: 6 · 4 = 24 → 2400.', '2400 : 6: 24 : 6 = 4 → 400.'],
  videoQuery: 'Kopfrechnen große Zahlen Klasse 4',
}, (r) => {
  const v = ri(r, 0, 3);
  if (v === 0) { const a = ri(r, 11, 59), b = ri(r, 11, 39); return { key: `p${a}-${b}`, prompt: `${fmt(a * 1000)} + ${fmt(b * 1000)} = ☐`, answer: { type: 'number', value: (a + b) * 1000 }, tags: ['plus'], solution: [`${a} + ${b} = ${a + b}`, `also ${fmt(a * 1000)} + ${fmt(b * 1000)} = ${fmt((a + b) * 1000)}`] }; }
  if (v === 1) { const a = ri(r, 30, 99), b = ri(r, 11, a - 10); return { key: `m${a}-${b}`, prompt: `${fmt(a * 1000)} − ${fmt(b * 1000)} = ☐`, answer: { type: 'number', value: (a - b) * 1000 }, tags: ['minus'], solution: [`${a} − ${b} = ${a - b}`, `also ${fmt(a * 1000)} − ${fmt(b * 1000)} = ${fmt((a - b) * 1000)}`] }; }
  if (v === 2) { const a = ri(r, 2, 9), b = ri(r, 2, 9), z = pick(r, [100, 1000]); return { key: `x${a}-${b}-${z}`, prompt: `${fmt(a * z)} · ${b} = ☐`, answer: { type: 'number', value: a * b * z }, tags: ['mal'], traps: [{ answer: String(a * b * z / 10), tag: 'null-vergessen', hint: 'Zähle die Nullen genau und hänge alle an.' }], solution: [`${a} · ${b} = ${a * b}`, `Hänge ${z === 100 ? 'zwei' : 'drei'} Nullen an: ${fmt(a * b * z)}`] }; }
  const d = ri(r, 2, 9), q = ri(r, 2, 9), z = pick(r, [100, 1000]); return { key: `d${d}-${q}-${z}`, prompt: `${fmt(d * q * z)} : ${d} = ☐`, answer: { type: 'number', value: q * z }, tags: ['geteilt'], solution: [`${d * q} : ${d} = ${q}`, `Hänge ${z === 100 ? 'zwei' : 'drei'} Nullen an: ${fmt(q * z)}`] };
}, { tagLabels: { 'null-vergessen': 'Nullen vergessen' }, testSeconds: 25 });

const COLORS: Record<string, string> = { rot: '#E5484D', blau: '#3E7BFA', grün: '#30A46C', gelb: '#F5C518' };
const wahrsch4 = M(4, 'm4-wahrscheinlichkeit', 'Wahrscheinlichkeit', '🎲', {
  text: ['Sicher: Es passiert auf jeden Fall (nur rote Kugeln im Beutel → du ziehst sicher Rot).', 'Möglich: Es kann passieren, muss aber nicht.', 'Unmöglich: Es kann gar nicht passieren (keine grüne Kugel drin → Grün ist unmöglich).', 'Wahrscheinlich ist die Farbe, von der die meisten Kugeln im Beutel sind.'],
  visual: { kind: 'marbles', colors: { rot: 5, blau: 2 } },
  videoQuery: 'Wahrscheinlichkeit sicher möglich unmöglich Grundschule',
}, (r) => {
  const names = shuffle(r, Object.keys(COLORS));
  const colors: Record<string, number> = {};
  const k = ri(r, 1, 3);
  names.slice(0, k).forEach((c, i) => (colors[c] = i === 0 ? ri(r, 3, 7) : ri(r, 1, 3)));
  const ask = chance(r, 0.7) ? pick(r, names) : names[0];
  const cnt = colors[ask] ?? 0;
  const total = Object.values(colors).reduce(sumUp, 0);
  if (chance(r, 0.65) || k === 1) {
    const res = cnt === 0 ? 'unmöglich' : cnt === total ? 'sicher' : 'möglich';
    return { key: `${JSON.stringify(colors)}-${ask}`, prompt: `Du ziehst ohne hinzusehen eine Kugel.\nEine ${ask}e Kugel zu ziehen ist …`, visual: { kind: 'marbles', colors }, answer: fixedChoice(['sicher', 'möglich', 'unmöglich'], res), tags: [res], solution: [cnt === 0 ? `Im Beutel ist keine ${ask}e Kugel → unmöglich.` : cnt === total ? `Alle Kugeln sind ${ask} → sicher.` : `Es gibt ${cnt} ${ask}e von ${total} Kugeln → möglich.`] };
  }
  const best = Object.entries(colors).sort((a, b) => b[1] - a[1])[0][0];
  const opts = Object.keys(colors);
  return { key: `${JSON.stringify(colors)}-best`, prompt: 'Welche Farbe ziehst du am wahrscheinlichsten?', visual: { kind: 'marbles', colors }, answer: choice(r, best, opts), tags: ['wahrscheinlichste'], solution: [`Von ${best} gibt es die meisten Kugeln (${colors[best]} von ${total}).`] };
}, { tagLabels: { sicher: 'sicher', möglich: 'möglich', unmöglich: 'unmöglich', wahrscheinlichste: 'am wahrscheinlichsten' }, testSeconds: 25 });

const sach4 = M(4, 'm4-sachaufgaben', 'Sachaufgaben', '🗺️', sachEx('Klasse 4'), (r, s) => storyTask(r, 4, s), { tagLabels: SACH_TAGS, testSeconds: 120 });

export const MATHE: Skill[] = [
  zaehlen, vergleichen, nachbarn, zerlegen, plus10, minus10, plus20, minus20, verdoppeln1, formen,
  stellenwert2, plus100, minus100, einmaleins, geteilt, verdoppeln2, uhr2, geld2, laengen2, sach2,
  stellenwert3, runden3, kopf1000, schrPlus, schrMinus, mal3, rest3, uhr3, gewichte3, laengen3, koerper3, sach3,
  stellenwert4, runden4, kopf4, schrMal, schrGeteilt, groessen4, flaeche4, wahrsch4, sach4,
];

