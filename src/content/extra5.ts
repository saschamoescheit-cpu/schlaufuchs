// Weitere Themen (Nachtlauf 23./24.10.2026) nach Abgleich mit dem Lehrplan Englisch, 2. Lernjahr:
// Ordnungszahlen und Datum – „When's your birthday? – It's on the 3rd of May.“
import { chance, choice, pick, ri, shuffle, type Rng } from '../engine/rng';
import type { Skill, Stage } from '../engine/types';
import { skill, type Gen } from './helpers';
import { spellTask, type Pair } from './deutsch';

const E = (year: 1 | 2, ...a: Parameters<typeof skill> extends [unknown, unknown, ...infer R] ? R : never) => skill('englisch', year === 1 ? 3 : 4, ...a);
const M = (grade: 1 | 2 | 3 | 4, ...a: Parameters<typeof skill> extends [unknown, unknown, ...infer R] ? R : never) => skill('mathe', grade, ...a);

// ---------- Rechendreiecke (Kl. 2) ----------
// Innen drei Zahlen (oben, links unten, rechts unten), außen an jeder Seite die Summe der beiden Nachbarn:
// links = oben + links unten, rechts = oben + rechts unten, unten = links unten + rechts unten.

type Cell = number | '?' | null;
const SIDE = ['linke Seite', 'rechte Seite', 'untere Seite'];
const CORNER = ['oben', 'links unten', 'rechts unten'];
/** welche Innenzahlen zu welcher Seite gehören */
const PAIR: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 2],
];

function triangleTask(r: Rng, s: Stage): Gen {
  const max = s === 1 ? 10 : s === 2 ? 30 : 50;
  const inner = [ri(r, 1, max), ri(r, 1, max), ri(r, 1, max)];
  const outer = PAIR.map(([a, b]) => inner[a] + inner[b]);
  const roll = r();
  const visual = (inn: Cell[], out: Cell[]) => ({ kind: 'triangle' as const, inner: inn, outer: out });
  // außen fehlt: zwei Innenzahlen zusammenzählen
  if (s === 1 || roll < 0.4) {
    const k = ri(r, 0, 2);
    const [a, b] = PAIR[k];
    return {
      key: `a-${inner.join('-')}-${k}`,
      prompt: 'Rechendreieck: Welche Zahl gehört außen in das Feld mit „?“?',
      visual: visual(inner, outer.map((v, i) => (i === k ? '?' : v))),
      answer: { type: 'number', value: outer[k] },
      tags: ['aussen'],
      solution: [`Außen steht die Summe der beiden Zahlen innen daneben (${SIDE[k]}).`, `${inner[a]} + ${inner[b]} = ${outer[k]}`],
      solutionVisual: visual(inner, outer),
    };
  }
  // innen fehlt: außen minus die bekannte Innenzahl
  if (s === 2 || roll < 0.75) {
    const c = ri(r, 0, 2);
    const k = PAIR.findIndex(([a, b]) => a === c || b === c);
    const other = PAIR[k][0] === c ? PAIR[k][1] : PAIR[k][0];
    return {
      key: `i-${inner.join('-')}-${c}`,
      prompt: 'Rechendreieck: Welche Zahl gehört innen in den Kreis mit „?“?',
      visual: visual(
        inner.map((v, i) => (i === c ? '?' : v)),
        outer,
      ),
      answer: { type: 'number', value: inner[c] },
      tags: ['innen'],
      traps: [{ answer: String(outer[k] + inner[other]), tag: 'plus-statt-minus', hint: 'Innen fehlt eine Zahl: Rechne die Zahl außen minus die bekannte Zahl innen.' }],
      solution: [`Die ${SIDE[k]}: ${inner[other]} + ? = ${outer[k]}`, `${outer[k]} − ${inner[other]} = ${inner[c]}`],
      solutionVisual: visual(inner, outer),
    };
  }
  // Knobeln (Stufe 3): nur die Außenzahlen – oben = (links + rechts − unten) : 2
  const c = ri(r, 0, 2);
  const opposite = PAIR.findIndex(([a, b]) => a !== c && b !== c);
  const touching = [0, 1, 2].filter((k) => k !== opposite);
  return {
    key: `k-${inner.join('-')}-${c}`,
    prompt: `Knobel-Dreieck: Innen steht keine Zahl. Welche Zahl gehört in den Kreis ${CORNER[c]}?`,
    visual: visual(
      inner.map((_, i) => (i === c ? '?' : null)),
      outer,
    ),
    answer: { type: 'number', value: inner[c] },
    tags: ['knobeln'],
    solution: [
      `Die beiden Seiten am Kreis ${CORNER[c]}: ${outer[touching[0]]} + ${outer[touching[1]]} = ${outer[touching[0]] + outer[touching[1]]}. Darin steckt die gesuchte Zahl zweimal und die beiden anderen Innenzahlen einmal.`,
      `Die beiden anderen Innenzahlen zusammen stehen gegenüber: ${outer[opposite]}.`,
      `${outer[touching[0]] + outer[touching[1]]} − ${outer[opposite]} = ${2 * inner[c]}, die Hälfte davon: ${inner[c]}.`,
      `Probe mit allen drei Innenzahlen (${inner.join(', ')}): ${PAIR.map(([a, b]) => `${inner[a]} + ${inner[b]} = ${inner[a] + inner[b]}`).join(' · ')} ✓`,
    ],
    solutionVisual: visual(inner, outer),
  };
}

// ---------- Präpositionen – Verhältniswörter (Deutsch Kl. 3) ----------

const D = (grade: 1 | 2 | 3 | 4, ...a: Parameters<typeof skill> extends [unknown, unknown, ...infer R] ? R : never) => skill('deutsch', grade, ...a);
type Pos = 'in' | 'on' | 'under' | 'next to' | 'behind' | 'in front of';
const PREP_DE: Record<Pos, string> = { in: 'in', on: 'auf', under: 'unter', 'next to': 'neben', behind: 'hinter', 'in front of': 'vor' };
const PREP_ANIMALS: { e: string; who: string; verb: string }[] = [
  { e: '🐱', who: 'Die Katze', verb: 'sitzt' },
  { e: '🐶', who: 'Der Hund', verb: 'liegt' },
  { e: '🐭', who: 'Die Maus', verb: 'sitzt' },
  { e: '🐸', who: 'Der Frosch', verb: 'hockt' },
  { e: '🐰', who: 'Das Kaninchen', verb: 'sitzt' },
  { e: '🐦', who: 'Der Vogel', verb: 'sitzt' },
];
// Sätze mit genau einer Präposition – dazu kurze Wörter, damit die Länge nichts verrät
const PREP_SENTENCES: [string, string][] = [
  ['Der Ball rollt unter das Sofa.', 'unter'],
  ['Mia legt das Buch auf den Tisch.', 'auf'],
  ['Die Schule ist neben der Kirche.', 'neben'],
  ['Wir warten vor dem Kino.', 'vor'],
  ['Der Hund schläft hinter dem Haus.', 'hinter'],
  ['Ben geht mit der Oma einkaufen.', 'mit'],
  ['Nach der Schule spielen wir Fußball.', 'Nach'],
  ['Das Geschenk liegt in der Tasche.', 'in'],
  ['Die Lampe hängt über dem Tisch.', 'über'],
  ['Der Weg führt durch den Wald.', 'durch'],
  ['Ich bekomme einen Brief von der Tante.', 'von'],
  ['Die Katze sitzt zwischen den Blumen.', 'zwischen'],
  ['Das Bild hängt an der Wand.', 'an'],
  ['Wir gehen ohne Jacke raus.', 'ohne'],
  ['Das Geschenk ist für dich.', 'für'],
  ['Seit Montag hat Lea ein Fahrrad.', 'Seit'],
];

function prepTask(r: Rng, s: Stage): Gen {
  const roll = r();
  // Stufe 3 (und manchmal 2): die Präposition im Satz finden
  if (s === 3 ? roll < 0.6 : s === 2 && roll < 0.25) {
    const [sentence, prep] = pick(r, PREP_SENTENCES);
    const words = [...new Set(sentence.replace(/[.!?]/g, '').split(' '))];
    // Ablenker: ein kurzes Wort (der, den, wir …), damit die Länge nichts verrät, dazu zwei weitere Wörter des Satzes
    const others = words.filter((w) => w !== prep);
    const short = others.filter((w) => w.length <= prep.length);
    const first = short.length ? pick(r, short) : null;
    const rest = shuffle(
      r,
      others.filter((w) => w !== first),
    ).slice(0, first ? 2 : 3);
    return {
      key: `f-${sentence}`,
      prompt: `Welches Wort ist die Präposition (das Verhältniswort)?\n${sentence}`,
      answer: choice(r, prep, [...(first ? [first] : []), ...rest]),
      tags: ['finden'],
      solution: [`„${prep}“ ist die Präposition: Sie sagt, wie die Dinge zueinander stehen (wo, wann, wie).`],
    };
  }
  const pos = pick(r, Object.keys(PREP_DE) as Pos[]);
  const a = pick(r, PREP_ANIMALS);
  const art = 'der Kiste';
  const visual = { kind: 'prep' as const, pos, animal: a.e };
  const allPreps = Object.values(PREP_DE);
  // Stufe 1: Wo ist das Tier? – ganze Ortsangabe auswählen
  if (s === 1 || roll < 0.55) {
    const ok = `${PREP_DE[pos]} ${art}`;
    return {
      key: `w-${pos}`,
      prompt: `Wo ist das Tier? ${a.who} ${a.verb} …`,
      visual,
      answer: choice(r, ok, allPreps.filter((p) => p !== PREP_DE[pos]).map((p) => `${p} ${art}`)),
      tags: ['ort'],
      solution: [`${a.who} ${a.verb} ${ok}.`, `„${PREP_DE[pos]}“ ist eine Präposition.`],
    };
  }
  // Stufe 2: Lückensatz – die passende Präposition einsetzen
  return {
    key: `l-${pos}`,
    prompt: `Setze die passende Präposition ein:\n${a.who} ${a.verb} ☐ ${art}.`,
    speak: `Setze die passende Präposition ein: ${a.who} ${a.verb} Lücke ${art}.`,
    visual,
    answer: choice(r, PREP_DE[pos], allPreps.filter((p) => p !== PREP_DE[pos])),
    tags: ['luecke'],
    solution: [`${a.who} ${a.verb} ${PREP_DE[pos]} ${art}.`],
  };
}

// ---------- Wörter mit aa, ee, oo (Deutsch Kl. 3) ----------
// Merkwörter mit doppeltem Selbstlaut – dazu Gegenbeispiele, denn meistens steht der lange Selbstlaut nur einmal.

const DOPPEL: Pair[] = [
  ['Boot', 'Bot', '⛵'],
  ['Meer', 'Mer', '🌊'],
  ['Haar', 'Har', '💇'],
  ['Tee', 'Te', '🍵'],
  ['Zoo', 'Zo', '🦁'],
  ['Moos', 'Mos', '🌿'],
  ['Beere', 'Bere', '🫐'],
  ['Schnee', 'Schne', '❄️'],
  ['Fee', 'Fe', '🧚'],
  ['See', 'Se', '🏞️'],
  ['Paar', 'Par', '🧦'],
  ['Waage', 'Wage', '⚖️'],
  ['Klee', 'Kle', '☘️'],
  ['Kaffee', 'Kaffe', '☕'],
  ['leer', 'ler', '📭'],
  ['Beet', 'Bet', '🌱'],
  ['Idee', 'Ide', '💡'],
  ['Saal', 'Sal', '🏛️'],
  // Gegenbeispiele: langer Selbstlaut, aber nur einmal geschrieben
  ['Hase', 'Haase', '🐰'],
  ['Rose', 'Roose', '🌹'],
  ['Note', 'Noote', '🎵'],
  ['Besen', 'Beesen', '🧹'],
  ['Hose', 'Hoose', '👖'],
  ['Name', 'Naame', '📛'],
  ['Regen', 'Reegen', '🌧️'],
  ['Brot', 'Broot', '🍞'],
];
const doppelt = (p: Pair) => /aa|ee|oo/.test(p[0]);

// ---------- Oberbegriffe (Deutsch Kl. 2) ----------

const GROUPS: { name: string; words: string[] }[] = [
  { name: 'Obst', words: ['Apfel', 'Birne', 'Kirsche', 'Banane', 'Pflaume', 'Erdbeere'] },
  { name: 'Gemüse', words: ['Möhre', 'Gurke', 'Paprika', 'Zwiebel', 'Kartoffel', 'Brokkoli'] },
  { name: 'Möbel', words: ['Tisch', 'Stuhl', 'Schrank', 'Bett', 'Sofa', 'Regal'] },
  { name: 'Fahrzeuge', words: ['Auto', 'Bus', 'Fahrrad', 'Zug', 'Lastwagen', 'Roller'] },
  { name: 'Kleidung', words: ['Hose', 'Pullover', 'Jacke', 'Rock', 'Mütze', 'Socke'] },
  { name: 'Werkzeug', words: ['Hammer', 'Säge', 'Zange', 'Bohrer', 'Schraubenzieher', 'Feile'] },
  { name: 'Musikinstrumente', words: ['Gitarre', 'Geige', 'Flöte', 'Trommel', 'Klavier', 'Trompete'] },
  { name: 'Blumen', words: ['Rose', 'Tulpe', 'Sonnenblume', 'Nelke', 'Gänseblümchen', 'Lilie'] },
  { name: 'Vögel', words: ['Amsel', 'Meise', 'Spatz', 'Taube', 'Adler', 'Eule'] },
  { name: 'Getränke', words: ['Wasser', 'Saft', 'Milch', 'Tee', 'Kakao', 'Limonade'] },
  { name: 'Schulsachen', words: ['Heft', 'Stift', 'Lineal', 'Radiergummi', 'Schere', 'Füller'] },
];

function categoryTask(r: Rng, s: Stage): Gen {
  const gi = ri(r, 0, GROUPS.length - 1);
  const g = GROUPS[gi];
  const others = GROUPS.filter((_, i) => i !== gi);
  const three = shuffle(r, g.words).slice(0, 3);
  const roll = r();
  // Stufe 1 (und manchmal 2): den Oberbegriff finden
  if (s === 1 || (s === 2 && roll < 0.4)) {
    return {
      key: `o-${three.join('-')}`,
      prompt: `Wie heißt der Oberbegriff?\n${three.join(', ')}`,
      answer: choice(r, g.name, shuffle(r, others).slice(0, 3).map((x) => x.name)),
      tags: ['oberbegriff'],
      solution: [`${three.join(', ')} – das ist alles ${g.name}.`, `„${g.name}“ ist der Oberbegriff, die einzelnen Wörter sind Unterbegriffe.`],
    };
  }
  // Stufe 3 (und manchmal 2): Welches Wort gehört dazu?
  if (s === 3 && roll < 0.4) {
    const ok = pick(r, g.words);
    const wrong = shuffle(r, others)
      .slice(0, 3)
      .map((x) => pick(r, x.words));
    return {
      key: `u-${g.name}-${ok}`,
      prompt: `Welches Wort gehört zum Oberbegriff „${g.name}“?`,
      answer: choice(r, ok, wrong),
      tags: ['unterbegriff'],
      solution: [`${ok} gehört zu ${g.name}.`, ...wrong.map((w) => `${w} gehört zu ${GROUPS.find((x) => x.words.includes(w))!.name}.`)],
    };
  }
  // Was passt nicht dazu?
  const other = pick(r, others);
  const odd = pick(r, other.words);
  return {
    key: `n-${three.join('-')}-${odd}`,
    prompt: 'Welches Wort passt nicht dazu?',
    answer: choice(r, odd, three),
    tags: ['passt-nicht'],
    solution: [`${three.join(', ')} gehören zum Oberbegriff ${g.name}.`, `${odd} gehört zu ${other.name} – es passt nicht dazu.`],
  };
}

// ---------- Redewendungen (Deutsch Kl. 4) ----------
// Feste Wendungen, die man nicht wörtlich nimmt. Je Wendung: Bild, Bedeutung und ein Satz, in den sie passt.

/** g: Gruppe ähnlicher Bedeutung – nie zusammen als Auswahl (sonst wären zwei Antworten richtig) */
const IDIOMS: { say: string; mean: string; e: string; ctx: string; g?: string }[] = [
  { say: 'Tomaten auf den Augen haben', mean: 'etwas nicht sehen, das direkt vor einem liegt', e: '🍅👀', ctx: 'Tim sucht seine Brille – dabei liegt sie direkt vor ihm. Tim hat …' },
  { say: 'Schwein haben', mean: 'großes Glück haben', e: '🐷🍀', ctx: 'Der Ball prallt an die Latte und springt doch noch ins Tor. Da hatte Lea …' },
  { say: 'jemandem einen Bären aufbinden', mean: 'jemandem eine Lüge erzählen', e: '🐻🎒', ctx: 'Ben erzählt, er habe im Garten einen Dinosaurier gesehen. Er will uns …' },
  { say: 'die Daumen drücken', mean: 'jemandem Glück wünschen', e: '👍👍', ctx: 'Morgen schreibt Mia ihre Mathearbeit. Ihre Freundin sagt: „Ich werde dir …“' },
  { say: 'ins Fettnäpfchen treten', mean: 'aus Versehen etwas Peinliches sagen oder tun', e: '🙊🥘', ctx: 'Paul fragt Frau Kern, wann ihr Baby kommt – aber sie bekommt gar keins. Paul ist …' },
  { say: 'mit dem falschen Fuß aufstehen', mean: 'den ganzen Tag schlechte Laune haben', e: '🦶😠', ctx: 'Seit dem Aufwachen ist Jonas mürrisch und meckert über alles. Er ist wohl …' },
  { say: 'zwei Fliegen mit einer Klappe schlagen', mean: 'zwei Dinge auf einmal erledigen', e: '🪰🪰', ctx: 'Auf dem Weg zum Training bringt Emma gleich den Brief zur Post. So …' },
  { say: 'die Nase voll haben', mean: 'keine Lust mehr auf etwas haben', e: '👃😩', ctx: 'Schon wieder regnet es und das Fußballspiel fällt aus. Lukas hat …' },
  { say: 'etwas auf die lange Bank schieben', mean: 'etwas immer wieder verschieben', e: '🪑⏳', ctx: 'Seit Wochen will Nina ihr Zimmer aufräumen, macht es aber nie. Sie …' },
  { say: 'die Ohren spitzen', mean: 'ganz genau zuhören', e: '👂❗', ctx: 'Gleich verrät die Lehrerin, wohin der Ausflug geht. Alle Kinder …' },
  { say: 'ein Brett vor dem Kopf haben', mean: 'etwas gerade überhaupt nicht verstehen', e: '🪵🙃', ctx: 'Die Aufgabe ist eigentlich leicht, aber Max kommt einfach nicht drauf. Er hat …', g: 'verstehen' },
  { say: 'Kohldampf haben', mean: 'großen Hunger haben', e: '🥬😋', ctx: 'Nach dem langen Ausflug knurrt allen der Magen. Alle haben …' },
  { say: 'nur einen Katzensprung entfernt sein', mean: 'ganz nah sein', e: '🐈📍', ctx: 'Zur Schule muss Lina nur über die Straße gehen. Die Schule ist …' },
  { say: 'die Katze aus dem Sack lassen', mean: 'ein Geheimnis verraten', e: '🐱🎁', ctx: 'Endlich sagt Papa, wohin die Reise in den Ferien geht. Er lässt …' },
  { say: 'unter einer Decke stecken', mean: 'heimlich zusammenarbeiten', e: '🛏️🤫', ctx: 'Die beiden Brüder haben zusammen die Kekse versteckt und verraten nichts. Sie …' },
  { say: 'nur Bahnhof verstehen', mean: 'gar nichts verstehen', e: '🚉❓', ctx: 'Der Onkel erklärt, wie ein Computer innen funktioniert. Anna versteht …', g: 'verstehen' },
  { say: 'jemandem den Kopf waschen', mean: 'jemanden deutlich ausschimpfen', e: '🧼🗣️', ctx: 'Tom hat die Fensterscheibe kaputt gemacht und es verschwiegen. Seine Mutter wird ihm …' },
  { say: 'sich in die Haare kriegen', mean: 'miteinander streiten', e: '💇⚡', ctx: 'Wer darf vorne sitzen? Darüber streiten Kim und Ole jeden Morgen. Die beiden …' },
  { say: 'Hals über Kopf', mean: 'ganz schnell und ohne nachzudenken', e: '🤸💨', ctx: 'Als es klingelt, rennt Finn ohne Jacke los – …' },
  { say: 'auf dem Schlauch stehen', mean: 'etwas gerade nicht kapieren', e: '🧯🤔', ctx: 'Alle lachen über den Witz, nur Ida weiß nicht, warum. Sie steht …', g: 'verstehen' },
];

function idiomTask(r: Rng, s: Stage): Gen {
  const i = ri(r, 0, IDIOMS.length - 1);
  const d = IDIOMS[i];
  const others = IDIOMS.filter((x, k) => k !== i && !(d.g && x.g === d.g));
  const visual = { kind: 'emoji' as const, chars: d.e };
  const roll = r();
  // Stufe 3 (und manchmal 2): Welche Redewendung passt in die Geschichte?
  if (s === 3 ? roll < 0.6 : s === 2 && roll < 0.3) {
    return {
      key: `c-${i}`,
      prompt: `Welche Redewendung passt?\n${d.ctx}`,
      answer: choice(r, d.say, shuffle(r, others).slice(0, 3).map((x) => x.say)),
      tags: ['geschichte'],
      solution: [`„${d.say}“ bedeutet: ${d.mean}.`],
      solutionVisual: visual,
    };
  }
  // Stufe 2: von der Bedeutung zur Redewendung
  if (s === 2 && roll < 0.6) {
    return {
      key: `r-${i}`,
      prompt: `Welche Redewendung bedeutet: ${d.mean}?`,
      answer: choice(r, d.say, shuffle(r, others).slice(0, 3).map((x) => x.say)),
      tags: ['wendung'],
      solution: [`„${d.say}“ bedeutet: ${d.mean}.`],
      solutionVisual: visual,
    };
  }
  // Stufe 1: Was bedeutet die Redewendung?
  return {
    key: `b-${i}`,
    prompt: `Was bedeutet „${d.say}“?`,
    visual,
    answer: choice(r, d.mean, shuffle(r, others).slice(0, 3).map((x) => x.mean)),
    tags: ['bedeutung'],
    solution: [`„${d.say}“ bedeutet: ${d.mean}.`, 'Redewendungen nimmt man nicht wörtlich.'],
  };
}

export const DEUTSCH_EXTRA5: Skill[] = [
  D(
    3,
    'd3-doppelvokal',
    'Wörter mit aa, ee, oo',
    '⛵',
    {
      text: [
        'Bei manchen Wörtern wird der lange Selbstlaut doppelt geschrieben: aa, ee oder oo – Boot, Meer, Haar.',
        'Das sind Merkwörter. Meistens schreibt man einen langen Selbstlaut nur einmal: Hase, Rose, Brot.',
        'Doppelt gibt es nur aa, ee und oo – nie ii oder uu.',
        'Achtung: Umlaute verdoppelt man nie: das Haar – das Härchen, das Boot – das Bötchen.',
      ],
      visual: { kind: 'word', word: 'Boot', mark: [[1, 3]] },
      videoQuery: 'Doppelte Selbstlaute aa ee oo Grundschule',
    },
    (r, s) => {
      const t = spellTask(
        r,
        s,
        DOPPEL,
        (p) => (doppelt(p) ? 'doppelt' : 'einfach'),
        (p) => (doppelt(p) ? ['Das ist ein Merkwort mit doppeltem Selbstlaut (aa, ee oder oo).'] : ['Hier steht der lange Selbstlaut nur einmal – doppelte Selbstlaute gibt es nur in wenigen Merkwörtern.']),
      );
      // im Lösungsbild den doppelten Selbstlaut als Paar markieren (Kaff·ee·, nicht nur das letzte e)
      const v = t.solutionVisual;
      const at = v?.kind === 'word' ? v.word.search(/aa|ee|oo/) : -1;
      return v?.kind === 'word' && at >= 0 ? { ...t, solutionVisual: { ...v, mark: [[at, at + 2]] } } : t;
    },
    { tagLabels: { doppelt: 'Merkwörter mit aa, ee, oo', einfach: 'langer Selbstlaut nur einmal' }, testSeconds: 15 },
  ),
  D(
    2,
    'd2-oberbegriffe',
    'Oberbegriffe',
    '🗂️',
    {
      text: ['Ein Oberbegriff fasst viele Wörter zusammen: Apfel, Birne und Kirsche sind Obst.', '„Obst“ ist der Oberbegriff, Apfel, Birne und Kirsche sind Unterbegriffe.', 'Mit Oberbegriffen kannst du Wörter ordnen – und merken, wenn eines nicht dazu passt.'],
      visual: { kind: 'table', head: ['Oberbegriff', 'Unterbegriffe'], rows: [['Obst', 'Apfel, Birne, Kirsche'], ['Möbel', 'Tisch, Stuhl, Bett'], ['Fahrzeuge', 'Auto, Bus, Zug']] },
      videoQuery: 'Oberbegriff finden Grundschule',
    },
    categoryTask,
    { tagLabels: { oberbegriff: 'Oberbegriff finden', unterbegriff: 'Unterbegriff zuordnen', 'passt-nicht': 'Was passt nicht?' }, testSeconds: 20 },
  ),
  D(
    4,
    'd4-redewendungen',
    'Redewendungen',
    '🍅',
    {
      text: [
        'Redewendungen sind feste Ausdrücke, die man nicht wörtlich nimmt.',
        '„Schwein haben“ heißt: Glück haben – mit einem Schwein hat das nichts zu tun.',
        '„Tomaten auf den Augen haben“ heißt: etwas nicht sehen, das direkt vor einem liegt.',
        'Redewendungen machen die Sprache bildhaft und oft lustig.',
      ],
      visual: { kind: 'emoji', chars: '🍅👀' },
      videoQuery: 'Redewendungen für Kinder erklärt',
    },
    idiomTask,
    { tagLabels: { bedeutung: 'Bedeutung erkennen', wendung: 'Redewendung finden', geschichte: 'Passt in die Geschichte' }, testSeconds: 30 },
  ),
  D(
    3,
    'd3-praepositionen',
    'Präpositionen – Verhältniswörter',
    '📦',
    {
      text: [
        'Präpositionen (Verhältniswörter) sagen, wo etwas ist oder wohin es geht: in, auf, unter, neben, hinter, vor, zwischen, über.',
        'Sie stehen meist vor einem Nomen mit Begleiter: auf dem Tisch, unter das Sofa, neben der Kirche.',
        'Es gibt auch Präpositionen für die Zeit und für das Wie: nach der Schule, seit Montag, mit dem Rad, ohne Jacke.',
      ],
      visual: { kind: 'prep', pos: 'on' },
      videoQuery: 'Präpositionen Grundschule Klasse 3',
    },
    prepTask,
    { tagLabels: { ort: 'Wo ist das Tier?', luecke: 'Präposition einsetzen', finden: 'Präposition im Satz finden' }, testSeconds: 25 },
  ),
];

// ---------- Zahlenrätsel mit Rechenketten (Kl. 3) ----------
// „Ich denke mir eine Zahl …“ – rückwärts lösen: jeder Schritt mit der Umkehraufgabe.

type Op = { k: '+' | '−' | '·' | ':'; n: number };
const opWord = (o: Op, first: boolean) => {
  const it = first ? 'sie' : 'das Ergebnis';
  return o.k === '+' ? `addiere ${o.n}` : o.k === '−' ? `ziehe ${o.n} ab` : o.k === '·' ? (o.n === 2 ? `verdopple ${it}` : `multipliziere ${it} mit ${o.n}`) : o.n === 2 ? `halbiere ${it}` : `teile ${it} durch ${o.n}`;
};
const apply = (x: number, o: Op) => (o.k === '+' ? x + o.n : o.k === '−' ? x - o.n : o.k === '·' ? x * o.n : x / o.n);
const undo = (o: Op): Op => ({ k: o.k === '+' ? '−' : o.k === '−' ? '+' : o.k === '·' ? ':' : '·', n: o.n });

function riddleTask(r: Rng, s: Stage): Gen {
  const steps = s === 1 ? 1 : s === 2 ? 2 : 3;
  const max = s === 1 ? 100 : s === 2 ? 200 : 1000;
  for (;;) {
    const start = ri(r, 2, s === 3 ? 60 : 40);
    const ops: Op[] = [];
    let x = start;
    let ok = true;
    for (let i = 0; i < steps; i++) {
      const kinds: Op['k'][] = s === 1 ? ['+', '−'] : ['+', '−', '·', ...(s === 3 ? [':' as const] : [])];
      const k = pick(r, i === 0 && s > 1 ? (['·', ...kinds] as Op['k'][]) : kinds);
      const n = k === '·' || k === ':' ? ri(r, 2, s === 3 ? 6 : 4) : ri(r, 2, s === 1 ? 30 : 50);
      const o: Op = { k, n };
      const y = apply(x, o);
      if (!Number.isInteger(y) || y < 0 || y > max || (k === '−' && y === 0)) {
        ok = false;
        break;
      }
      ops.push(o);
      x = y;
    }
    if (!ok || ops.some((o, i) => i > 0 && o.k === ops[i - 1].k)) continue;
    const end = x;
    const words = ops.map((o, i) => opWord(o, i === 0));
    const told = `Ich ${words.length === 1 ? words[0] : `${words.slice(0, -1).join(', ')} und ${words[words.length - 1]}`}`;
    // rückwärts: vom Ergebnis aus jeden Schritt umkehren
    const back: string[] = [];
    let y = end;
    for (const o of [...ops].reverse()) {
      const u = undo(o);
      const z = apply(y, u);
      back.push(`${y} ${u.k} ${u.n} = ${z}`);
      y = z;
    }
    const chain = `? → ${ops.map((o) => `${o.k} ${o.n}`).join(' → ')} → ${end}`;
    // typischer Fehler: vorwärts weiterrechnen statt umkehren (nur bei einem Schritt eindeutig)
    const wrong = steps === 1 ? apply(end, ops[0]) : null;
    return {
      key: `z-${start}-${ops.map((o) => o.k + o.n).join('')}`,
      prompt: `Ich denke mir eine Zahl. ${told}. Heraus kommt ${end}.\nWelche Zahl habe ich mir gedacht?`,
      visual: { kind: 'text', text: chain },
      answer: { type: 'number', value: start },
      tags: [steps === 1 ? 'ein-schritt' : 'kette'],
      traps: wrong !== null && wrong >= 0 && wrong !== start ? [{ answer: String(wrong), tag: 'vorwaerts', hint: 'Rechne rückwärts mit der Umkehraufgabe: Aus plus wird minus, aus minus wird plus.' }] : [],
      solution: ['Rückwärts rechnen – jeden Schritt umkehren:', ...back, `Probe: ${[start, ...ops.map((_, i) => ops.slice(0, i + 1).reduce(apply, start))].join(' → ')} ✓`],
    };
  }
}

// ---------- Punkt vor Strich und Klammern (Kl. 4) ----------

/** Rechnung als Text (· und :, Minus als −) und ihr Wert; bad = Ergebnis „einfach von links nach rechts“ */
type Expr = { text: string; value: number; bad: number; steps: string[] };

function pvsExpr(r: Rng, s: Stage): Expr {
  const kind = s === 1 ? pick(r, ['a+b*c', 'a*b+c']) : s === 2 ? pick(r, ['a+b*c', 'a-b*c', 'a+b:c', 'a*b+c*d', '(a+b)*c']) : pick(r, ['a*b+c*d', 'a*b-c*d', '(a+b)*c', 'a*(b-c)', 'a+b*c-d', 'a:b+c*d']);
  const n = (lo: number, hi: number) => ri(r, lo, hi);
  switch (kind) {
    case 'a+b*c': {
      const [a, b, c] = [n(2, s === 1 ? 10 : 30), n(2, 9), n(2, 9)];
      return { text: `${a} + ${b} · ${c}`, value: a + b * c, bad: (a + b) * c, steps: [`Erst mal: ${b} · ${c} = ${b * c}`, `Dann plus: ${a} + ${b * c} = ${a + b * c}`] };
    }
    case 'a*b+c': {
      const [a, b, c] = [n(2, 9), n(2, 9), n(2, s === 1 ? 10 : 30)];
      return { text: `${a} · ${b} + ${c}`, value: a * b + c, bad: a * b + c, steps: [`Erst mal: ${a} · ${b} = ${a * b}`, `Dann plus: ${a * b} + ${c} = ${a * b + c}`] };
    }
    case 'a-b*c': {
      const [b, c] = [n(2, 9), n(2, 9)];
      const a = b * c + n(1, 40);
      return { text: `${a} − ${b} · ${c}`, value: a - b * c, bad: (a - b) * c, steps: [`Erst mal: ${b} · ${c} = ${b * c}`, `Dann minus: ${a} − ${b * c} = ${a - b * c}`] };
    }
    case 'a+b:c': {
      const [c, q] = [n(2, 9), n(2, 9)];
      const a = n(2, 40);
      const b = c * q;
      return { text: `${a} + ${b} : ${c}`, value: a + q, bad: (a + b) / c, steps: [`Erst geteilt: ${b} : ${c} = ${q}`, `Dann plus: ${a} + ${q} = ${a + q}`] };
    }
    case 'a*b+c*d':
    case 'a*b-c*d': {
      let [a, b, c, d] = [n(2, 9), n(2, 9), n(2, 9), n(2, 9)];
      const minus = kind === 'a*b-c*d';
      if (minus && a * b < c * d) [a, b, c, d] = [c, d, a, b];
      const v = minus ? a * b - c * d : a * b + c * d;
      return { text: `${a} · ${b} ${minus ? '−' : '+'} ${c} · ${d}`, value: v, bad: (minus ? a * b - c : a * b + c) * d, steps: [`Erst beide Malaufgaben: ${a} · ${b} = ${a * b} und ${c} · ${d} = ${c * d}`, `Dann ${minus ? 'minus' : 'plus'}: ${a * b} ${minus ? '−' : '+'} ${c * d} = ${v}`] };
    }
    case '(a+b)*c': {
      const [a, b, c] = [n(2, 15), n(2, 15), n(2, 9)];
      return { text: `(${a} + ${b}) · ${c}`, value: (a + b) * c, bad: a + b * c, steps: [`Klammer zuerst: ${a} + ${b} = ${a + b}`, `Dann mal: ${a + b} · ${c} = ${(a + b) * c}`] };
    }
    case 'a*(b-c)': {
      const [a, c] = [n(2, 9), n(2, 9)];
      const b = c + n(2, 12);
      return { text: `${a} · (${b} − ${c})`, value: a * (b - c), bad: a * b - c, steps: [`Klammer zuerst: ${b} − ${c} = ${b - c}`, `Dann mal: ${a} · ${b - c} = ${a * (b - c)}`] };
    }
    case 'a+b*c-d': {
      const [a, b, c] = [n(5, 40), n(2, 9), n(2, 9)];
      const d = n(1, a);
      return { text: `${a} + ${b} · ${c} − ${d}`, value: a + b * c - d, bad: (a + b) * c - d, steps: [`Erst mal: ${b} · ${c} = ${b * c}`, `Dann von links: ${a} + ${b * c} = ${a + b * c}, ${a + b * c} − ${d} = ${a + b * c - d}`] };
    }
    default: {
      const [b, q, c, d] = [n(2, 9), n(2, 9), n(2, 9), n(2, 9)];
      const a = b * q;
      return { text: `${a} : ${b} + ${c} · ${d}`, value: q + c * d, bad: (q + c) * d, steps: [`Erst die Punktaufgaben: ${a} : ${b} = ${q} und ${c} · ${d} = ${c * d}`, `Dann plus: ${q} + ${c * d} = ${q + c * d}`] };
    }
  }
}

function pvsTask(r: Rng, s: Stage): Gen {
  // Stufe 3 manchmal: Welche Rechnung hat dieses Ergebnis? (mit und ohne Klammer)
  if (s === 3 && chance(r, 0.3)) {
    const [a, b, c] = [ri(r, 2, 9), ri(r, 2, 9), ri(r, 2, 9)];
    const opts = [`${a} + ${b} · ${c}`, `(${a} + ${b}) · ${c}`, `${a} · ${b} + ${c}`, `${a} · (${b} + ${c})`];
    const vals = [a + b * c, (a + b) * c, a * b + c, a * (b + c)];
    const k = ri(r, 0, 3);
    if (vals.filter((v) => v === vals[k]).length > 1) return pvsTask(r, 2);
    return {
      key: `w-${a}-${b}-${c}-${k}`,
      prompt: `Welche Rechnung hat das Ergebnis ${vals[k]}?`,
      answer: choice(r, opts[k], opts.filter((_, i) => i !== k)),
      tags: ['klammer'],
      solution: opts.map((o, i) => `${o} = ${vals[i]}`),
    };
  }
  const e = pvsExpr(r, s);
  return {
    key: `p-${e.text}`,
    prompt: `Rechne. Denk an die Regel: Klammer zuerst, dann Punkt vor Strich.\n${e.text} = ☐`,
    speak: `Rechne. ${e.text.replace('(', 'Klammer auf, ').replace(')', ', Klammer zu,')} ist gleich wie viel?`,
    answer: { type: 'number', value: e.value },
    tags: [e.text.includes('(') ? 'klammer' : 'punkt-strich'],
    traps: e.bad !== e.value && Number.isInteger(e.bad) && e.bad >= 0 ? [{ answer: String(e.bad), tag: 'links-nach-rechts', hint: e.text.includes('(') ? 'Was in der Klammer steht, rechnest du zuerst.' : 'Punkt vor Strich: Erst mal und geteilt, dann plus und minus.' }] : [],
    solution: e.steps,
  };
}

export const MATHE_EXTRA5: Skill[] = [
  M(
    3,
    'm3-zahlenraetsel',
    'Zahlenrätsel und Rechenketten',
    '🕵️',
    {
      text: ['„Ich denke mir eine Zahl …“ – solche Rätsel löst du rückwärts.', 'Fang beim Ergebnis an und kehre jeden Schritt um: Aus plus wird minus, aus mal wird geteilt.', 'Beispiel: Ich verdopple meine Zahl und addiere 4, heraus kommt 30. Rückwärts: 30 − 4 = 26, 26 : 2 = 13.', 'Probe: 13 · 2 = 26, 26 + 4 = 30 ✓'],
      visual: { kind: 'text', text: '? → · 2 → + 4 → 30\n13 ← : 2 ← − 4 ← 30' },
      videoQuery: 'Zahlenrätsel Rechenketten rückwärts rechnen Klasse 3',
    },
    riddleTask,
    { tagLabels: { 'ein-schritt': 'Ein Schritt', kette: 'Rechenkette', vorwaerts: 'vorwärts statt rückwärts gerechnet' }, testSeconds: 45 },
  ),
  M(
    4,
    'm4-punkt-vor-strich',
    'Punkt vor Strich und Klammern',
    '✖️',
    {
      text: ['Mal (·) und geteilt (:) sind Punktrechnungen, plus und minus Strichrechnungen.', 'Regel: Punkt vor Strich – erst mal und geteilt, dann plus und minus.', 'Was in Klammern steht, rechnest du immer zuerst.', 'Beispiel: 3 + 4 · 5 = 3 + 20 = 23, aber (3 + 4) · 5 = 7 · 5 = 35.'],
      visual: { kind: 'text', text: '3 + 4 · 5 = 23\n(3 + 4) · 5 = 35' },
      videoQuery: 'Punkt vor Strich Klammern Klasse 4',
    },
    pvsTask,
    { tagLabels: { 'punkt-strich': 'Punkt vor Strich', klammer: 'Klammern zuerst', 'links-nach-rechts': 'einfach von links gerechnet' }, testSeconds: 40 },
  ),
  M(
    2,
    'm2-rechendreieck',
    'Rechendreiecke',
    '🔺',
    {
      text: ['Im Rechendreieck stehen innen drei Zahlen.', 'Außen an jeder Seite steht die Summe der beiden Zahlen innen daneben: außen = innen + innen.', 'Fehlt innen eine Zahl, rechnest du: außen minus die bekannte Zahl innen.'],
      visual: { kind: 'triangle', inner: [3, 5, 4], outer: [8, 7, 9] },
      videoQuery: 'Rechendreiecke Klasse 2 erklärt',
    },
    triangleTask,
    { tagLabels: { aussen: 'Summe außen', innen: 'Zahl innen ergänzen', knobeln: 'Knobeln ohne Innenzahlen', 'plus-statt-minus': 'plus statt minus gerechnet' }, testSeconds: 40 },
  ),
];

// ---------- Ordnungszahlen und Geburtstag (2. Lernjahr) ----------

const ORD = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth', 'twentieth'];
const CARD = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
/** 1 → first … 31 → thirty-first */
export function ordEn(n: number): string {
  if (n <= 20) return ORD[n];
  if (n === 30) return 'thirtieth';
  return `${n < 30 ? 'twenty' : 'thirty'}-${ORD[n % 10]}`;
}
/** 1 → 1st, 2 → 2nd, 3 → 3rd, 11–13 → th, sonst th */
export function ordShort(n: number): string {
  const end = n % 100 >= 11 && n % 100 <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th';
  return `${n}${end}`;
}
const MONTH_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const DAYS_IN = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const KIDS = ['Tom', 'Emma', 'Ben', 'Lily', 'Sam', 'Mia'];
const DE_ORD = ['', 'erste', 'zweite', 'dritte', 'vierte', 'fünfte', 'sechste', 'siebte', 'achte', 'neunte', 'zehnte', 'elfte', 'zwölfte'];

/** falsche Endungen, die Kinder gern schreiben: 1th, 2th, 3th, 21th … */
const wrongShort = (n: number) => [`${n}th`, `${n}st`, `${n}nd`, `${n}rd`].filter((x) => x !== ordShort(n));
/** typische Fehler bei den Wörtern: threeth, twoth, fiveth … */
const wrongWords = (n: number): string[] => {
  const ok = ordEn(n);
  const near = [ordEn(n === 1 ? 2 : n - 1), ordEn(n === 31 ? 30 : n + 1)];
  const base = n <= 20 ? CARD[n] : `${n < 30 ? 'twenty' : 'thirty'}-${CARD[n % 10]}`;
  return [...new Set([`${base}th`, base, ...near])].filter((x) => x !== ok);
};

function birthdayTask(r: Rng, s: Stage): Gen {
  const roll = r();
  // Stufe 1: Ordnungszahlen bis 10 erkennen (Platz beim Wettlauf)
  if (s === 1 || roll < 0.3) {
    const n = ri(r, 1, s === 1 ? 5 : 10);
    const medal = n === 1 ? '🥇' : n === 2 ? '🥈' : n === 3 ? '🥉' : '🏃';
    const word = ordEn(n);
    if (chance(r, 0.5))
      return {
        key: `p-${n}`,
        prompt: `Beim Wettlauf bist du auf Platz ${n}. Wie sagst du das auf Englisch?\nI'm …`,
        speak: `Beim Wettlauf bist du auf Platz ${n}. Wie sagst du das auf Englisch?`,
        visual: { kind: 'emoji', chars: medal },
        answer: { ...choice(r, word, wrongWords(n)), speakOptions: 'en' },
        tags: ['wort'],
        solution: [`${n}. heißt auf Englisch ${word} (kurz: ${ordShort(n)}).`, `I'm ${word}.`],
        pronounce: { text: `I'm ${word}.`, lang: 'en' },
      };
    return {
      key: `h-${n}`,
      prompt: 'Hör gut zu! Auf welchem Platz ist das Kind?',
      speak: 'Hör gut zu!',
      listen: { text: `I'm ${word}!`, lang: 'en' },
      answer: choice(r, `Platz ${n}`, [n + 1, n - 1, n + 2, n + 10].filter((x) => x >= 1 && x !== n).map((x) => `Platz ${x}`)),
      tags: ['hören'],
      solution: [`${word} = ${n}. (${ordShort(n)})`],
      pronounce: { text: word, lang: 'en' },
    };
  }
  const m = ri(r, 0, 11);
  const d = ri(r, 1, DAYS_IN[m]);
  const kid = pick(r, KIDS);
  const sentence = `My birthday is on the ${ordEn(d)} of ${MONTH_EN[m]}.`;
  // Kurzform: 21st, 22nd, 23rd, 24th – Stufe 2 auswählen, Stufe 3 die Endung wissen
  if (roll < 0.5) {
    const n = s === 3 ? pick(r, [1, 2, 3, 11, 12, 13, 21, 22, 23, 31, d]) : d;
    return {
      key: `k-${n}`,
      prompt: `Wie schreibt man „${ordEn(n)}“ kurz?`,
      speak: 'Wie schreibt man das kurz?',
      listen: { text: ordEn(n), lang: 'en' },
      answer: choice(r, ordShort(n), wrongShort(n)),
      tags: ['kurzform'],
      traps: [{ answer: `${n}th`, tag: 'endung', hint: 'Bei 1, 2 und 3 am Ende heißt es st, nd, rd – außer bei 11, 12, 13 (eleventh, twelfth, thirteenth).' }].filter((t) => t.answer !== ordShort(n)),
      solution: [`${ordEn(n)} = ${ordShort(n)}`, 'first → 1st, second → 2nd, third → 3rd, sonst meist th: 4th, 5th … (auch 11th, 12th, 13th).'],
      pronounce: { text: ordEn(n), lang: 'en' },
    };
  }
  // Stufe 3: das Wort selbst schreiben (bis 12 – die Wörter, die Kinder kennen müssen)
  if (s === 3 && roll < 0.7) {
    const n = ri(r, 1, 12);
    return {
      key: `s-${n}`,
      prompt: `Schreibe auf Englisch:\nder ${DE_ORD[n]} (${n}.)`,
      speak: `Schreibe auf Englisch: der ${DE_ORD[n]}.`,
      answer: { type: 'text', value: ordEn(n), lang: 'en' },
      tags: ['schreiben'],
      solution: [`${n}. = ${ordEn(n)} (${ordShort(n)})`, ...(n === 5 || n === 12 ? ['Achtung: fifth und twelfth – das v wird zu f!'] : n === 8 || n === 9 ? ['Achtung: eighth (nur ein t) und ninth (ohne e)!'] : [])],
      pronounce: { text: ordEn(n), lang: 'en' },
    };
  }
  // Geburtstag hören: welches Datum?
  const wrongDays = [d === DAYS_IN[m] ? d - 1 : d + 1, d > 10 ? d - 10 : d + 10, d].map((x) => `${x}. ${MONTH_DE[x === d ? (m + 1) % 12 : m]}`);
  return {
    key: `b-${m}-${d}`,
    prompt: `Hör gut zu! Wann hat ${kid} Geburtstag?`,
    speak: `Hör gut zu! Wann hat ${kid} Geburtstag?`,
    listen: { text: sentence, lang: 'en' },
    visual: { kind: 'emoji', chars: '🎂' },
    answer: choice(r, `${d}. ${MONTH_DE[m]}`, wrongDays),
    tags: ['datum'],
    solution: [`„${sentence}“`, `the ${ordEn(d)} of ${MONTH_EN[m]} = ${d}. ${MONTH_DE[m]} (${ordShort(d)} ${MONTH_EN[m]})`],
    pronounce: { text: sentence, lang: 'en' },
  };
}

export const ENGLISCH_EXTRA5: Skill[] = [
  E(
    2,
    'e2-birthday',
    "When's your birthday? – Ordnungszahlen und Datum",
    '🎂',
    {
      text: [
        'first = 1st, second = 2nd, third = 3rd.',
        'Danach meist mit -th: fourth (4th), fifth (5th), sixth (6th) … twentieth (20th).',
        'Achtung: fifth und twelfth (v wird f), eighth (ein t), ninth (ohne e). 21st heißt twenty-first.',
        "When's your birthday? – My birthday is on the third of May.",
        'Kurz geschrieben: 3rd May oder May 3rd.',
      ],
      visual: { kind: 'table', head: ['1.', '2.', '3.', '4.'], rows: [['1st', '2nd', '3rd', '4th'], ['first', 'second', 'third', 'fourth']] },
      videoQuery: 'ordinal numbers song for kids first second third',
    },
    birthdayTask,
    { tagLabels: { wort: 'Ordnungszahl als Wort', hören: 'Hörverstehen', kurzform: 'Kurzform 1st, 2nd, 3rd', schreiben: 'Wörter schreiben', datum: 'Datum verstehen', endung: 'Endung st/nd/rd/th' }, testSeconds: 20 },
  ),
];
