// Weitere Themen (Nachtlauf 22./23.10.2026) nach Abgleich mit dem NRW-Lehrplan Mathematik, Klasse 1/2:
// „Daten, Häufigkeiten und Wahrscheinlichkeiten“ – Strichlisten und Tabellen, sicher/möglich/unmöglich.
import { chance, choice, fixedChoice, pick, ri, shuffle, type Rng } from '../engine/rng';
import type { Skill, Stage } from '../engine/types';
import { skill, type Gen } from './helpers';

const M = (grade: 1 | 2 | 3 | 4, ...a: Parameters<typeof skill> extends [unknown, unknown, ...infer R] ? R : never) => skill('mathe', grade, ...a);

// ---------- Sicher, möglich oder unmöglich? (Kl. 2) ----------

type Chance = 'sicher' | 'möglich' | 'unmöglich';
const EVENTS: [string, Chance, string, string][] = [
  ['Nach dem Montag kommt der Dienstag.', 'sicher', '📅', 'Das ist immer so.'],
  ['Morgen regnet es.', 'möglich', '🌧️', 'Es kann regnen, muss aber nicht.'],
  ['Mit einem normalen Würfel würfelst du eine 7.', 'unmöglich', '🎲', 'Auf dem Würfel gibt es nur 1 bis 6.'],
  ['Du würfelst eine 6.', 'möglich', '🎲', 'Die 6 kann kommen – genauso wie jede andere Zahl.'],
  ['Du würfelst eine Zahl, die kleiner als 7 ist.', 'sicher', '🎲', 'Alle Zahlen auf dem Würfel sind kleiner als 7.'],
  ['Nach dem Sommer kommt der Herbst.', 'sicher', '🍂', 'Die Jahreszeiten kommen immer in derselben Reihenfolge.'],
  ['Ein Fisch klettert auf einen Baum.', 'unmöglich', '🐟', 'Fische können nicht klettern.'],
  ['Beim Werfen einer Münze liegt die Zahl oben.', 'möglich', '🪙', 'Es kann die Zahl oder das Bild oben liegen.'],
  ['Ein Elefant passt in deine Schultasche.', 'unmöglich', '🐘', 'Ein Elefant ist viel zu groß.'],
  ['Morgen früh geht die Sonne auf.', 'sicher', '🌅', 'Die Sonne geht jeden Morgen auf.'],
  ['Heute Nachmittag ruft Oma an.', 'möglich', '📞', 'Das kann sein, muss aber nicht.'],
  ['Ein Baby ist älter als seine Mama.', 'unmöglich', '👶', 'Die Mama ist immer älter als ihr Baby.'],
  ['Ein Jahr hat 12 Monate.', 'sicher', '🗓️', 'Jedes Jahr hat genau 12 Monate.'],
  ['Im Winter schneit es.', 'möglich', '❄️', 'Im Winter kann es schneien – aber nicht in jedem Winter.'],
  ['Eine Woche hat 9 Tage.', 'unmöglich', '📆', 'Eine Woche hat immer 7 Tage.'],
  ['Du ziehst aus einer Tüte mit nur Gummibärchen ein Gummibärchen.', 'sicher', '🐻', 'In der Tüte ist nichts anderes.'],
];
const COL: Record<string, string> = { rot: 'rote', blau: 'blaue', grün: 'grüne', gelb: 'gelbe' };
function zufallTask(r: Rng, s: Stage): Gen {
  const opts = ['sicher', 'möglich', 'unmöglich'];
  // Kugeln im Beutel (Stufe 1 nur damit, danach gemischt mit Alltagsereignissen)
  if (s === 1 || chance(r, 0.45)) {
    const names = shuffle(r, Object.keys(COL));
    const k = s === 1 ? ri(r, 1, 2) : ri(r, 1, 3);
    const colors: Record<string, number> = {};
    names.slice(0, k).forEach((c) => (colors[c] = ri(r, 1, 6)));
    const ask = chance(r, 0.65) ? pick(r, names.slice(0, k)) : pick(r, names);
    const cnt = colors[ask] ?? 0;
    const total = Object.values(colors).reduce((a, b) => a + b, 0);
    const res: Chance = cnt === 0 ? 'unmöglich' : cnt === total ? 'sicher' : 'möglich';
    return {
      key: `${JSON.stringify(colors)}-${ask}`,
      prompt: `Du ziehst ohne hinzusehen eine Kugel.\nEine ${COL[ask]} Kugel ist …`,
      speak: `Du ziehst ohne hinzusehen eine Kugel. Ist eine ${COL[ask]} Kugel sicher, möglich oder unmöglich?`,
      visual: { kind: 'marbles', colors },
      answer: { ...fixedChoice(opts, res), big: true },
      tags: [res],
      solution: [cnt === 0 ? `Im Beutel ist keine ${COL[ask]} Kugel – also unmöglich.` : cnt === total ? `Alle Kugeln sind ${ask} – also sicher.` : `Es gibt ${cnt} ${COL[ask]} und noch andere Kugeln – also möglich.`],
      solutionVisual: { kind: 'marbles', colors },
    };
  }
  const [text, res, e, why] = pick(r, EVENTS);
  return {
    key: text,
    prompt: `Sicher, möglich oder unmöglich?\n${text}`,
    visual: { kind: 'emoji', chars: e },
    answer: { ...fixedChoice(opts, res), big: true },
    tags: [res],
    solution: [`${text} → ${res}`, why],
  };
}

// ---------- Strichlisten und Tabellen (Kl. 2) ----------

const SURVEYS: { title: string; items: string[] }[] = [
  { title: 'Lieblingsobst der Klasse 2a', items: ['🍎 Apfel', '🍌 Banane', '🍓 Erdbeere', '🍇 Trauben'] },
  { title: 'Wie kommst du zur Schule?', items: ['🚶 zu Fuß', '🚲 Fahrrad', '🚌 Bus', '🚗 Auto'] },
  { title: 'Lieblingstier', items: ['🐶 Hund', '🐱 Katze', '🐰 Hase', '🐴 Pferd'] },
  { title: 'Lieblingsfarbe', items: ['🔴 Rot', '🔵 Blau', '🟢 Grün', '🟡 Gelb'] },
  { title: 'Wetter im Mai (Tage)', items: ['☀️ sonnig', '☁️ bewölkt', '🌧️ Regen'] },
  { title: 'Lieblingssport', items: ['⚽ Fußball', '🏊 Schwimmen', '🤸 Turnen', '🚴 Radfahren'] },
];
const short = (label: string) => label.replace(/^\S+\s/, '');
function datenTask(r: Rng, s: Stage): Gen {
  const sv = pick(r, SURVEYS);
  const k = s === 1 ? Math.min(3, sv.items.length) : sv.items.length;
  const items = sv.items.slice(0, k);
  // Anzahlen alle verschieden, damit „die meisten“ eindeutig ist
  const counts = shuffle(r, Array.from({ length: s === 3 ? 14 : 10 }, (_, i) => i + 1)).slice(0, k);
  const rows = items.map((label, i) => ({ label, n: counts[i] }));
  const visual = { kind: 'tally' as const, title: sv.title, rows };
  const key = `${sv.title}|${counts.join(',')}`;
  const kind = s === 1 ? pick(r, ['wie-viele', 'meisten']) : pick(r, ['wie-viele', 'meisten', 'wenigsten', 'unterschied', ...(s === 3 ? ['zusammen', 'zusammen'] : [])]);
  const max = rows.reduce((a, b) => (b.n > a.n ? b : a));
  const min = rows.reduce((a, b) => (b.n < a.n ? b : a));
  const bundles = (n: number) => (n >= 5 ? `${Math.floor(n / 5)} Fünferbündel${n % 5 ? ` und ${n % 5} Striche` : ''}` : `${n} Striche`);
  if (kind === 'wie-viele') {
    const row = pick(r, rows);
    return { key: `${key}|n|${row.label}`, prompt: `Wie viele Striche hat ${short(row.label)}?`, visual, answer: { type: 'number', value: row.n }, tags: ['strichliste-lesen'], traps: row.n >= 5 ? [{ answer: String(row.n - 1), tag: 'fuenferbuendel', hint: 'Der Querstrich zählt mit: Ein Bündel sind 5 Striche.' }] : [], solution: [`${short(row.label)}: ${bundles(row.n)} = ${row.n}`, 'Ein Bündel mit Querstrich sind 5 Striche.'] };
  }
  if (kind === 'meisten' || kind === 'wenigsten') {
    const ok = kind === 'meisten' ? max : min;
    return { key: `${key}|${kind}`, prompt: kind === 'meisten' ? 'Was kommt am häufigsten vor?' : 'Was kommt am seltensten vor?', visual, answer: fixedChoice(rows.map((x) => short(x.label)), short(ok.label)), tags: ['vergleichen'], solution: [`${short(ok.label)} hat ${kind === 'meisten' ? 'die meisten' : 'die wenigsten'} Striche: ${ok.n}.`] };
  }
  if (kind === 'unterschied') {
    return { key: `${key}|diff`, prompt: `Wie viele mehr hat ${short(max.label)} als ${short(min.label)}?`, visual, answer: { type: 'number', value: max.n - min.n }, tags: ['unterschied'], traps: [{ answer: String(max.n + min.n), tag: 'plus-statt-minus', hint: '„Wie viele mehr?“ – das ist der Unterschied: Rechne minus.' }], solution: [`${max.n} − ${min.n} = ${max.n - min.n}`] };
  }
  const total = rows.reduce((a, b) => a + b.n, 0);
  return { key: `${key}|sum`, prompt: 'Wie viele wurden insgesamt gezählt?', visual, answer: { type: 'number', value: total }, tags: ['zusammen'], solution: [rows.map((x) => x.n).join(' + ') + ` = ${total}`] };
}

export const MATHE_EXTRA4: Skill[] = [
  M(2, 'm2-zufall', 'Sicher, möglich oder unmöglich?', '🎲', { text: ['Sicher: Es passiert auf jeden Fall – nach dem Montag kommt der Dienstag.', 'Möglich: Es kann passieren, muss aber nicht – morgen regnet es.', 'Unmöglich: Es kann gar nicht passieren – ein Fisch klettert auf einen Baum.'], visual: { kind: 'marbles', colors: { rot: 4, blau: 2 } }, videoQuery: 'sicher möglich unmöglich Klasse 2 Mathe' }, zufallTask, { tagLabels: { sicher: 'sicher', möglich: 'möglich', unmöglich: 'unmöglich' }, testSeconds: 20 }),
  M(2, 'm2-daten', 'Strichlisten lesen', '📋', { text: ['Mit einer Strichliste zählt man schnell: Für jedes Mal kommt ein Strich dazu.', 'Der fünfte Strich geht quer über die anderen vier – so entsteht ein Fünferbündel.', 'Zählen: erst die Bündel in Fünferschritten (5, 10, 15 …), dann die einzelnen Striche dazu.'], visual: { kind: 'tally', rows: [{ label: '🍎 Apfel', n: 7 }, { label: '🍌 Banane', n: 4 }] }, videoQuery: 'Strichliste Klasse 2 Mathe' }, datenTask, { tagLabels: { 'strichliste-lesen': 'Strichliste lesen', fuenferbuendel: 'Fünferbündel falsch gezählt', vergleichen: 'am meisten / am wenigsten', unterschied: 'Unterschied („wie viele mehr?“)', 'plus-statt-minus': 'plus statt minus gerechnet', zusammen: 'alles zusammenzählen' }, testSeconds: 30 }),
];

// ---------- Deutsch: Geschichten ordnen (Kl. 2) – NRW „Texte planen“: Was passiert zuerst, was danach? ----------

const D = (grade: 1 | 2 | 3 | 4, ...a: Parameters<typeof skill> extends [unknown, unknown, ...infer R] ? R : never) => skill('deutsch', grade, ...a);
const ABLAUF: [string, string[]][] = [
  ['🦷', ['Ben nimmt seine Zahnbürste.', 'Er drückt Zahnpasta darauf.', 'Er putzt drei Minuten lang die Zähne.', 'Zum Schluss spült er den Mund aus.']],
  ['🌱', ['Lea gräbt ein kleines Loch.', 'Sie legt den Samen hinein.', 'Sie gießt die Erde.', 'Nach ein paar Tagen wächst eine kleine Pflanze.']],
  ['🥞', ['Papa holt Mehl, Milch und Eier.', 'Er verrührt alles zu einem Teig.', 'Er brät den Teig in der Pfanne.', 'Die Kinder essen die Pfannkuchen.']],
  ['⛄', ['Es schneit die ganze Nacht.', 'Am Morgen rollen die Kinder große Kugeln.', 'Sie setzen die Kugeln aufeinander.', 'Zum Schluss bekommt der Schneemann eine Möhre als Nase.']],
  ['✉️', ['Mia schreibt einen Brief an Oma.', 'Sie steckt ihn in einen Umschlag.', 'Sie klebt eine Briefmarke darauf.', 'Sie wirft den Brief in den Briefkasten.']],
  ['🚲', ['Tims Fahrrad hat einen Platten.', 'Opa holt das Flickzeug.', 'Zusammen flicken sie den Reifen.', 'Dann kann Tim wieder fahren.']],
  ['🛁', ['Mama lässt Wasser in die Wanne.', 'Lina steigt in die Wanne.', 'Sie wäscht sich die Haare.', 'Danach trocknet sie sich ab.']],
  ['🐣', ['Die Henne legt ein Ei.', 'Sie brütet das Ei aus.', 'Das Küken pickt die Schale auf.', 'Das Küken läuft hinter der Henne her.']],
  ['🎂', ['Jonas lädt seine Freunde ein.', 'Die Gäste kommen und bringen Geschenke.', 'Alle singen ein Lied und essen Kuchen.', 'Am Abend gehen die Gäste nach Hause.']],
  ['🍎', ['Im Frühling blüht der Apfelbaum.', 'Aus den Blüten wachsen kleine Äpfel.', 'Im Sommer werden die Äpfel größer.', 'Im Herbst pflücken wir die reifen Äpfel.']],
  ['🛒', ['Mama schreibt einen Einkaufszettel.', 'Im Laden legt sie alles in den Wagen.', 'An der Kasse bezahlt sie.', 'Zu Hause räumt sie alles in den Schrank.']],
  ['🦋', ['Ein Schmetterling legt ein Ei auf ein Blatt.', 'Aus dem Ei schlüpft eine Raupe.', 'Die Raupe frisst viel und verpuppt sich.', 'Aus der Puppe schlüpft ein neuer Schmetterling.']],
];
const LETTERS = ['A', 'B', 'C', 'D'];
function ordnenTask(r: Rng, s: Stage): Gen {
  const [e, steps] = pick(r, ABLAUF);
  const story = s === 1 ? steps.slice(0, 3) : steps;
  const sol = story.map((x, i) => `${i + 1}. ${x}`);
  // Stufe 3: die ganze Reihenfolge der Buchstaben finden
  if (s === 3 || (s === 2 && chance(r, 0.4))) {
    const mixed = shuffle(r, story.map((_, i) => i));
    // nicht schon richtig sortiert zeigen
    if (mixed.every((v, i) => v === i)) mixed.reverse();
    const lines = mixed.map((idx, k) => `${LETTERS[k]}: ${story[idx]}`);
    const ok = story.map((_, i) => LETTERS[mixed.indexOf(i)]).join(' – ');
    const wrong = new Set<string>();
    for (let t = 0; t < 30 && wrong.size < 3; t++) {
      const p = shuffle(r, LETTERS.slice(0, story.length)).join(' – ');
      if (p !== ok) wrong.add(p);
    }
    return { key: `r-${steps[0]}-${mixed.join('')}`, prompt: `In welcher Reihenfolge passiert es?\n${lines.join('\n')}`, speak: `In welcher Reihenfolge passiert es? ${lines.join(' ')}`, visual: { kind: 'emoji', chars: e }, answer: fixedChoice(shuffle(r, [ok, ...wrong]), ok), tags: ['reihenfolge'], solution: sol };
  }
  // was passiert zuerst / was passiert danach?
  if (s === 1 || chance(r, 0.4)) {
    return { key: `z-${steps[0]}`, prompt: 'Was passiert zuerst?', visual: { kind: 'emoji', chars: e }, answer: { ...choice(r, story[0], story.slice(1)), speakOptions: 'de' }, tags: ['zuerst'], solution: sol };
  }
  const i = ri(r, 0, story.length - 2);
  return { key: `n-${story[i]}`, prompt: `Was passiert danach?\n„${story[i]}“`, visual: { kind: 'emoji', chars: e }, answer: { ...choice(r, story[i + 1], story.filter((_, k) => k !== i && k !== i + 1)), speakOptions: 'de' }, tags: ['danach'], solution: sol };
}

export const DEUTSCH_EXTRA4: Skill[] = [
  D(2, 'd2-reihenfolge', 'Geschichten ordnen', '🔢', { text: ['Eine Geschichte erzählt Schritt für Schritt, was passiert.', 'Überlege: Was muss zuerst passieren, damit das Nächste klappt? Erst die Zahnpasta auf die Bürste, dann putzen!', 'Wörter wie zuerst, dann, danach und zum Schluss helfen dir.'], visual: { kind: 'row', items: ['1️⃣', '2️⃣', '3️⃣', '4️⃣'] }, videoQuery: 'Bildergeschichte Reihenfolge Klasse 2 Deutsch' }, ordnenTask, { tagLabels: { zuerst: 'Was passiert zuerst?', danach: 'Was passiert danach?', reihenfolge: 'ganze Reihenfolge' }, testSeconds: 40 }),
];

// ---------- Mathe: Tausch- und Umkehraufgaben (Kl. 1) – NRW „Rechenstrategien“ ----------

function tauschTask(r: Rng, s: Stage): Gen {
  const max = s === 1 ? 10 : 20;
  let a = ri(r, 1, max - 1);
  let b = ri(r, 1, max - a);
  if (a === b) b = Math.max(1, b - 1) === a ? b + 1 : Math.max(1, b - 1);
  const sum = a + b;
  const kind = s === 1 ? 'tausch' : pick(r, ['tausch', 'umkehr', 'umkehr', ...(s === 3 ? ['geschickt', 'geschickt'] : [])]);
  if (kind === 'tausch') {
    const ok = `${b} + ${a} = ${sum}`;
    return { key: `t-${a}+${b}`, prompt: `${a} + ${b} = ${sum}\nWie heißt die Tauschaufgabe?`, speak: `${a} plus ${b} ist ${sum}. Wie heißt die Tauschaufgabe?`, answer: choice(r, ok, [`${sum} − ${b} = ${a}`, `${a} + ${sum} = ${a + sum}`, `${b} − ${a} = ${b - a}`].filter((x) => !x.includes('−') || !/= -/.test(x))), tags: ['tauschaufgabe'], solution: [`Bei der Tauschaufgabe tauschen die beiden Zahlen den Platz: ${a} + ${b} → ${b} + ${a}.`, 'Das Ergebnis bleibt gleich!'] };
  }
  if (kind === 'umkehr') {
    const ok = `${sum} − ${b} = ${a}`;
    return { key: `u-${a}+${b}`, prompt: `${a} + ${b} = ${sum}\nWelche Minusaufgabe gehört dazu?`, speak: `${a} plus ${b} ist ${sum}. Welche Minusaufgabe gehört dazu?`, answer: choice(r, ok, [`${b} + ${a} = ${sum}`, `${sum} − ${a} = ${sum - a + 1}`, `${a} − ${b} = ${a - b}`].filter((x) => !/= -/.test(x) && x !== `${sum} − ${a} = ${b}`)), tags: ['umkehraufgabe'], solution: [`Die Umkehraufgabe geht rückwärts: Du startest beim Ergebnis ${sum} und nimmst ${b} wieder weg.`, `${sum} − ${b} = ${a}`] };
  }
  // geschickt rechnen: kleine Zahl zuerst → tauschen
  const small = Math.min(a, b), big = Math.max(a, b);
  return { key: `g-${small}+${big}`, prompt: `Rechne geschickt:\n${small} + ${big} = ☐`, speak: `Rechne geschickt: ${small} plus ${big}.`, answer: { type: 'number', value: sum }, tags: ['tauschaufgabe'], solution: [`Tausche: ${big} + ${small} ist leichter – starte bei der großen Zahl.`, `${big} + ${small} = ${sum}`] };
}

export const MATHE_EXTRA4B: Skill[] = [
  M(1, 'm1-tausch', 'Tausch- und Umkehraufgaben', '🔄', { text: ['Tauschaufgabe: Die beiden Zahlen tauschen den Platz – das Ergebnis bleibt gleich. 3 + 5 = 8 und 5 + 3 = 8.', 'Trick: Starte bei der größeren Zahl, dann geht es schneller: 2 + 9 → 9 + 2.', 'Umkehraufgabe: Rückwärts gerechnet. 3 + 5 = 8, also 8 − 5 = 3.'], visual: { kind: 'tenframe', a: 3, b: 5 }, videoQuery: 'Tauschaufgabe Umkehraufgabe Klasse 1' }, tauschTask, { tagLabels: { tauschaufgabe: 'Tauschaufgaben', umkehraufgabe: 'Umkehraufgaben' }, testSeconds: 20 }),
];

// ---------- Englisch: Sätze bauen (2. Lernjahr) – NRW „Verfügbarkeit von sprachlichen Mitteln“ ----------

const E = (year: 1 | 2, ...a: Parameters<typeof skill> extends [unknown, unknown, ...infer R] ? R : never) => skill('englisch', year === 1 ? 3 : 4, ...a);
const SENT: [string, string][] = [
  ['I like apples.', 'Ich mag Äpfel.'], ['She has got a cat.', 'Sie hat eine Katze.'], ['We go to school by bus.', 'Wir fahren mit dem Bus zur Schule.'],
  ['My dog is brown.', 'Mein Hund ist braun.'], ['Can you swim?', 'Kannst du schwimmen?'], ['I have got two brothers.', 'Ich habe zwei Brüder.'],
  ['The cat is under the table.', 'Die Katze ist unter dem Tisch.'], ['He likes football.', 'Er mag Fußball.'], ['What is your name?', 'Wie heißt du?'],
  ['Where is the station?', 'Wo ist der Bahnhof?'], ['I get up at seven.', 'Ich stehe um sieben auf.'], ['My favourite colour is blue.', 'Meine Lieblingsfarbe ist Blau.'],
  ['It is sunny today.', 'Heute ist es sonnig.'], ['They are in the garden.', 'Sie sind im Garten.'], ['I can ride a bike.', 'Ich kann Fahrrad fahren.'],
  ['Do you like pizza?', 'Magst du Pizza?'], ['The bird is on the roof.', 'Der Vogel ist auf dem Dach.'], ['My mum is a doctor.', 'Meine Mama ist Ärztin.'],
  ["I don't like spiders.", 'Ich mag keine Spinnen.'], ['How old are you?', 'Wie alt bist du?'],
];
const capFirst = (w: string) => w[0].toUpperCase() + w.slice(1);
// Satzanfang klein zeigen (sonst verrät der große Buchstabe das erste Wort) – außer „I“
const lowFirst = (w: string) => (w === 'I' || w.startsWith("I'") ? w : w[0].toLowerCase() + w.slice(1));
function wordOrderTask(r: Rng, s: Stage): Gen {
  const [en, de] = pick(r, SENT);
  const end = en.slice(-1);
  const words = en.slice(0, -1).split(' ');
  const plain = words.map((w, i) => (i === 0 ? lowFirst(w) : w));
  const sentence = (ws: string[]) => capFirst(ws.join(' ')) + end;
  const mixed = shuffle(r, plain);
  // Ablenker = typische Lernerfehler: zwei Nachbarwörter vertauscht (auch zweimal). Nicht als Ablenker:
  // Aussagen, die wie eine Frage anfangen (Is it sunny today.), und Umstellungen, die mit dem letzten Wort beginnen
  // (Apples I like.) – die wären teils richtiges Englisch.
  const swap = (ws: string[], i: number) => ws.map((w, k) => (k === i ? ws[i + 1] : k === i + 1 ? ws[i] : w));
  const once = plain.slice(0, -1).map((_, i) => swap(plain, i));
  const twice = once.flatMap((ws) => ws.slice(0, -1).map((_, i) => swap(ws, i)));
  const ok = (ws: string[]) => {
    const t = sentence(ws);
    if (t === en) return false;
    if (end === '.' && /^(Is|Are|Can|Do|Does|Has|Have|Don't|Can't) /.test(t)) return false;
    // Frage ohne Umstellung (You can swim?) – gesprochen möglich, also kein Ablenker
    if (end === '?' && ws[0] === plain[1] && ws[1] === plain[0]) return false;
    return ws[0] !== plain[plain.length - 1];
  };
  const wrong = new Set<string>();
  for (const ws of [...shuffle(r, once), ...shuffle(r, twice)]) if (wrong.size < 3 && ok(ws)) wrong.add(sentence(ws));
  return {
    key: en,
    prompt: `${s === 1 ? `„${de}“\n` : ''}Bring die Wörter in die richtige Reihenfolge:\n${mixed.join(' · ')}`,
    speak: 'Bring die Wörter in die richtige Reihenfolge.',
    answer: { ...choice(r, en, [...wrong]), speakOptions: 'en' },
    tags: [end === '?' ? 'fragesatz' : 'aussagesatz'],
    solution: [`${en} = ${de}`, end === '?' ? 'Bei Fragen steht das Fragewort oder das Verb (can, do, is …) vorne.' : 'Englische Sätze: Wer? – tut was? – den Rest: I – like – apples.'],
    pronounce: { text: en, lang: 'en' },
  };
}

export const ENGLISCH_EXTRA4: Skill[] = [
  E(2, 'e2-wordorder', 'Sentence builder – Sätze bauen', '🧱', { text: ['Im Englischen ist die Reihenfolge wichtig: Wer? – tut was? – Rest. I like apples.', 'Fragen beginnen mit einem Fragewort (What, Where, How) oder mit can, do, is: Can you swim?', 'Tipp: Lies den Satz am Ende laut – klingt er richtig?'], visual: { kind: 'text', text: 'I · like · apples' }, videoQuery: 'English word order simple sentences for kids' }, wordOrderTask, { tagLabels: { aussagesatz: 'Aussagesätze bauen', fragesatz: 'Fragen bauen' }, testSeconds: 30 }),
];
