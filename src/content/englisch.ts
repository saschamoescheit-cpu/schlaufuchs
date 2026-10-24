// Englisch in der Grundschule – 1. und 2. Lernjahr (Skill.grade 3 = 1. Lernjahr, 4 = 2. Lernjahr).
// In NRW beginnt Englisch in Klasse 3; in Ländern mit Beginn in Klasse 1 wird das 1. Lernjahr früher gezeigt (curriculum.ts).
import { chance, choice, fixedChoice, pick, pickN, ri, type Rng } from '../engine/rng';
import type { Skill, Stage } from '../engine/types';
import { skill, type Gen } from './helpers';
import { registerWords, visualOf, withWord, type VocabWord } from './words';

const E = (year: 1 | 2, ...a: Parameters<typeof skill> extends [unknown, unknown, ...infer R] ? R : never) => skill('englisch', year === 1 ? 3 : 4, ...a);

type Word = VocabWord;

const VTAGS = { 'bild-wort': 'Bild → englisches Wort', hören: 'Hörverstehen', übersetzen: 'Deutsch → Englisch', verstehen: 'Englisch → Deutsch', schreiben: 'Wörter schreiben' };

function vocabTask(r: Rng, words: Word[], year: 1 | 2, stage: Stage = 2): Gen {
  const w = pick(r, words);
  const others = words.filter((x) => x !== w);
  // Stufe 1: nur wiedererkennen (Bild, Hören), Stufe 3: viel selbst schreiben
  // gleich geschriebene Wörter (Hotel – hotel, Zebra – zebra) lohnen das Schreiben nicht
  const same = w.en.toLowerCase() === w.de.toLowerCase();
  const spell = stage === 1 || same ? 0 : w.en.length <= 8 && !w.en.includes(' ') ? (stage === 3 ? 0.45 : year === 1 ? 0.12 : 0.25) : 0;
  const roll = r();
  const say = { text: w.en, lang: 'en' as const };
  const sol = [`${w.de} heißt auf Englisch: ${w.en}`];
  if (roll < spell) {
    return { key: `s-${w.en}`, prompt: `Schreibe auf Englisch:\n${w.de}`, visual: visualOf(w), answer: { type: 'text', value: w.en, lang: 'en' }, tags: ['schreiben'], solution: [...sol, `Buchstabiert: ${w.en.toUpperCase().split('').join(' – ')}`], pronounce: say };
  }
  let mode: 'bild' | 'hören' | 'de-en' | 'en-de' = pick(r, same || stage === 1 ? (['bild', 'hören'] as const) : stage === 3 ? (['hören', 'de-en', 'de-en', 'en-de'] as const) : (['bild', 'hören', 'de-en', 'en-de'] as const));
  if (mode === 'hören' && !w.e && !w.hex) mode = same ? 'bild' : 'en-de';
  if (mode === 'bild') return { key: `b-${w.en}`, prompt: 'Wie heißt das auf Englisch?', visual: visualOf(w), answer: { ...choice(r, w.en, pickN(r, others, 3).map((x) => x.en)), speakOptions: 'en' }, tags: ['bild-wort'], solution: sol, solutionVisual: visualOf(w), pronounce: say };
  if (mode === 'hören' && (w.e || w.hex)) {
    const opts = pickN(r, others.filter((x) => x.e || x.hex), 3);
    if (w.hex) return { key: `h-${w.en}`, prompt: 'Hör gut zu! Welche Farbe ist es?', speak: 'Hör gut zu!', listen: say, answer: choice(r, w.de, opts.map((x) => x.de)), tags: ['hören'], solution: sol, solutionVisual: visualOf(w), pronounce: say };
    return { key: `h-${w.en}`, prompt: 'Hör gut zu! Welches Bild passt?', speak: 'Hör gut zu!', listen: say, answer: { ...choice(r, w.e!, opts.map((x) => x.e!)), big: true }, tags: ['hören'], solution: sol, solutionVisual: visualOf(w), pronounce: say };
  }
  if (mode === 'en-de') return { key: `v-${w.en}`, prompt: /Deutsch/.test(w.de) ? `Was bedeutet „${w.en}“?` : `Was heißt „${w.en}“ auf Deutsch?`, speak: /Deutsch/.test(w.de) ? 'Was bedeutet das?' : 'Was heißt das auf Deutsch?', listen: say, answer: choice(r, w.de, pickN(r, others, 3).map((x) => x.de)), tags: ['verstehen'], solution: [`${w.en} heißt auf Deutsch: ${w.de}`], solutionVisual: visualOf(w), pronounce: say };
  return { key: `u-${w.en}`, prompt: `Was heißt „${w.de}“ auf Englisch?`, answer: { ...choice(r, w.en, pickN(r, others, 3).map((x) => x.en)), speakOptions: 'en' }, tags: ['übersetzen'], solution: sol, solutionVisual: visualOf(w), pronounce: say };
}

/** extra: zusätzliche Aufgabenart für kleine Wortfelder (null = normale Vokabelaufgabe) */
function vocabSkill(year: 1 | 2, id: string, title: string, icon: string, words: Word[], tips: string[], q: string, extra?: (r: Rng, s: Stage) => Gen | null) {
  registerWords(id, words);
  return E(year, id, title, icon, { text: [...tips, 'Tipp: Tippe auf den Lautsprecher und sprich jedes Wort laut nach!'], visual: visualOf(words[0]), videoQuery: q }, (r, s) => extra?.(r, s) ?? withWord(vocabTask(r, words, year, s), words), { tagLabels: VTAGS, testSeconds: 15 });
}

// Wochentage: nur 7 Wörter – ab Stufe 2 auch die Reihenfolge (Welcher Tag kommt nach Tuesday?)
function dayOrderTask(r: Rng, s: Stage): Gen | null {
  if (s === 1 || !chance(r, 0.35)) return null;
  const i = ri(r, 0, 6);
  const after = chance(r, 0.6);
  const ok = DAYS[(i + (after ? 1 : 6)) % 7];
  const wrong = [DAYS[(i + (after ? 6 : 1)) % 7], DAYS[(i + 2) % 7], DAYS[(i + 4) % 7]].filter((d) => d !== ok).map((d) => d.en);
  return {
    key: `o-${DAYS[i].en}-${after}`,
    prompt: `Welcher Tag kommt ${after ? 'nach' : 'vor'} ${DAYS[i].en}?`,
    speak: `Welcher Tag kommt ${after ? 'nach' : 'vor'} ${DAYS[i].de}? Antworte auf Englisch.`,
    answer: { ...choice(r, ok.en, wrong), speakOptions: 'en' },
    tags: ['verstehen'],
    solution: [DAYS.map((d) => d.en).join(', '), `${after ? 'Nach' : 'Vor'} ${DAYS[i].en} (${DAYS[i].de}) kommt ${ok.en} (${ok.de}).`],
    pronounce: { text: ok.en, lang: 'en' },
  };
}

const COLOURS: Word[] = [
  { en: 'red', de: 'rot', hex: '#E5484D' }, { en: 'blue', de: 'blau', hex: '#3E7BFA' }, { en: 'green', de: 'grün', hex: '#30A46C' }, { en: 'yellow', de: 'gelb', hex: '#F5C518' },
  { en: 'orange', de: 'orange', hex: '#F7862A' }, { en: 'purple', de: 'lila', hex: '#8E4EC6' }, { en: 'pink', de: 'rosa', hex: '#F38BB7' }, { en: 'black', de: 'schwarz', hex: '#1F1F1F' },
  { en: 'white', de: 'weiß', hex: '#FFFFFF' }, { en: 'brown', de: 'braun', hex: '#8B5A2B' }, { en: 'grey', de: 'grau', hex: '#8D8D8D' },
];
const NUM_EN = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const TENS_EN = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety', 'one hundred'];
const numEn = (n: number) => (n <= 20 ? NUM_EN[n] : n % 10 === 0 ? TENS_EN[n / 10] : `${TENS_EN[Math.floor(n / 10)]}-${NUM_EN[n % 10]}`);
const ANIMALS: Word[] = [
  { en: 'dog', de: 'Hund', e: '🐶' }, { en: 'cat', de: 'Katze', e: '🐱' }, { en: 'bird', de: 'Vogel', e: '🐦' }, { en: 'fish', de: 'Fisch', e: '🐟' }, { en: 'horse', de: 'Pferd', e: '🐴' },
  { en: 'cow', de: 'Kuh', e: '🐮' }, { en: 'pig', de: 'Schwein', e: '🐷' }, { en: 'mouse', de: 'Maus', e: '🐭' }, { en: 'rabbit', de: 'Hase', e: '🐰' }, { en: 'duck', de: 'Ente', e: '🦆' },
  { en: 'sheep', de: 'Schaf', e: '🐑' }, { en: 'lion', de: 'Löwe', e: '🦁' }, { en: 'elephant', de: 'Elefant', e: '🐘' }, { en: 'monkey', de: 'Affe', e: '🐵' }, { en: 'frog', de: 'Frosch', e: '🐸' }, { en: 'tiger', de: 'Tiger', e: '🐯' }, { en: 'snake', de: 'Schlange', e: '🐍' },
];
const FAMILY: Word[] = [
  { en: 'mum', de: 'Mama', e: '👩' }, { en: 'dad', de: 'Papa', e: '👨' }, { en: 'sister', de: 'Schwester', e: '👧' }, { en: 'brother', de: 'Bruder', e: '👦' },
  { en: 'grandma', de: 'Oma', e: '👵' }, { en: 'grandpa', de: 'Opa', e: '👴' }, { en: 'baby', de: 'Baby', e: '👶' }, { en: 'family', de: 'Familie', e: '👨‍👩‍👧‍👦' }, { en: 'friend', de: 'Freund / Freundin', e: '🧑‍🤝‍🧑' },
  { en: 'parents', de: 'Eltern', e: '👩👨' }, { en: 'grandparents', de: 'Großeltern', e: '👵👴' },
];
const BODY: Word[] = [
  { en: 'head', de: 'Kopf', e: '🙂' }, { en: 'eye', de: 'Auge', e: '👁️' }, { en: 'ear', de: 'Ohr', e: '👂' }, { en: 'nose', de: 'Nase', e: '👃' }, { en: 'mouth', de: 'Mund', e: '👄' },
  { en: 'hand', de: 'Hand', e: '✋' }, { en: 'foot', de: 'Fuß', e: '🦶' }, { en: 'leg', de: 'Bein', e: '🦵' }, { en: 'arm', de: 'Arm', e: '💪' }, { en: 'tooth', de: 'Zahn', e: '🦷' }, { en: 'hair', de: 'Haare', e: '💇' },
  { en: 'finger', de: 'Finger', e: '☝️' }, { en: 'thumb', de: 'Daumen', e: '👍' }, { en: 'tongue', de: 'Zunge', e: '👅' }, { en: 'bone', de: 'Knochen', e: '🦴' },
];
const SCHOOL: Word[] = [
  { en: 'pen', de: 'Stift / Füller', e: '🖊️' }, { en: 'pencil', de: 'Bleistift', e: '✏️' }, { en: 'book', de: 'Buch', e: '📖' }, { en: 'ruler', de: 'Lineal', e: '📏' }, { en: 'scissors', de: 'Schere', e: '✂️' },
  { en: 'school bag', de: 'Schultasche', e: '🎒' }, { en: 'crayon', de: 'Wachsmalstift', e: '🖍️' }, { en: 'chair', de: 'Stuhl', e: '🪑' }, { en: 'teacher', de: 'Lehrer / Lehrerin', e: '🧑‍🏫' }, { en: 'school', de: 'Schule', e: '🏫' },
  { en: 'paper', de: 'Papier', e: '📄' }, { en: 'exercise book', de: 'Heft', e: '📓' }, { en: 'paintbrush', de: 'Pinsel', e: '🖌️' }, { en: 'computer', de: 'Computer', e: '💻' },
];
const FOOD: Word[] = [
  { en: 'apple', de: 'Apfel', e: '🍎' }, { en: 'banana', de: 'Banane', e: '🍌' }, { en: 'bread', de: 'Brot', e: '🍞' }, { en: 'milk', de: 'Milch', e: '🥛' }, { en: 'cheese', de: 'Käse', e: '🧀' },
  { en: 'egg', de: 'Ei', e: '🥚' }, { en: 'pizza', de: 'Pizza', e: '🍕' }, { en: 'cake', de: 'Kuchen', e: '🍰' }, { en: 'carrot', de: 'Karotte', e: '🥕' }, { en: 'orange', de: 'Orange', e: '🍊' },
  { en: 'water', de: 'Wasser', e: '💧' }, { en: 'ice cream', de: 'Eis', e: '🍦' }, { en: 'chocolate', de: 'Schokolade', e: '🍫' }, { en: 'tomato', de: 'Tomate', e: '🍅' }, { en: 'strawberry', de: 'Erdbeere', e: '🍓' },
];
const CLOTHES: Word[] = [
  { en: 'T-shirt', de: 'T-Shirt', e: '👕' }, { en: 'trousers', de: 'Hose', e: '👖' }, { en: 'dress', de: 'Kleid', e: '👗' }, { en: 'shoes', de: 'Schuhe', e: '👟' }, { en: 'cap', de: 'Mütze / Kappe', e: '🧢' },
  { en: 'socks', de: 'Socken', e: '🧦' }, { en: 'jacket', de: 'Jacke', e: '🧥' }, { en: 'scarf', de: 'Schal', e: '🧣' }, { en: 'gloves', de: 'Handschuhe', e: '🧤' }, { en: 'boots', de: 'Stiefel', e: '🥾' },
  { en: 'shorts', de: 'kurze Hose', e: '🩳' }, { en: 'hat', de: 'Hut', e: '👒' },
  { en: 'swimsuit', de: 'Badeanzug', e: '🩱' }, { en: 'sandals', de: 'Sandalen', e: '👡' }, { en: 'shirt', de: 'Hemd', e: '👔' },
];
const DAYS: Word[] = [
  { en: 'Monday', de: 'Montag', txt: 'Mo' }, { en: 'Tuesday', de: 'Dienstag', txt: 'Di' }, { en: 'Wednesday', de: 'Mittwoch', txt: 'Mi' }, { en: 'Thursday', de: 'Donnerstag', txt: 'Do' },
  { en: 'Friday', de: 'Freitag', txt: 'Fr' }, { en: 'Saturday', de: 'Samstag', txt: 'Sa' }, { en: 'Sunday', de: 'Sonntag', txt: 'So' },
];
const MONTHS: Word[] = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((en, i) => ({ en, de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][i], txt: String(i + 1) + '.' }));
const SEASONS: Word[] = [{ en: 'spring', de: 'Frühling', e: '🌷' }, { en: 'summer', de: 'Sommer', e: '🏖️' }, { en: 'autumn', de: 'Herbst', e: '🍂' }, { en: 'winter', de: 'Winter', e: '⛄' }];
const WEATHER: Word[] = [{ en: 'sunny', de: 'sonnig', e: '☀️' }, { en: 'rainy', de: 'regnerisch', e: '🌧️' }, { en: 'cloudy', de: 'bewölkt', e: '☁️' }, { en: 'windy', de: 'windig', e: '🌬️' }, { en: 'snowy', de: 'verschneit', e: '❄️' }, { en: 'stormy', de: 'stürmisch', e: '⛈️' }, { en: 'hot', de: 'heiß', e: '🥵' }, { en: 'cold', de: 'kalt', e: '🥶' }, { en: 'foggy', de: 'neblig', e: '🌫️' }, { en: 'icy', de: 'eisig', e: '🧊' }];
const FEELINGS: Word[] = [{ en: 'happy', de: 'fröhlich', e: '😀' }, { en: 'sad', de: 'traurig', e: '😢' }, { en: 'angry', de: 'wütend', e: '😠' }, { en: 'tired', de: 'müde', e: '😴' }, { en: 'scared', de: 'ängstlich', e: '😱' }, { en: 'hungry', de: 'hungrig', e: '😋' }, { en: 'bored', de: 'gelangweilt', e: '😑' }, { en: 'surprised', de: 'überrascht', e: '😮' }, { en: 'sick', de: 'krank', e: '🤒' }, { en: 'thirsty', de: 'durstig', e: '🥤' }, { en: 'excited', de: 'aufgeregt', e: '🤩' }, { en: 'worried', de: 'besorgt', e: '😟' }];
const ACTIONS: Word[] = [
  { en: 'run', de: 'rennen', e: '🏃' }, { en: 'swim', de: 'schwimmen', e: '🏊' }, { en: 'dance', de: 'tanzen', e: '💃' }, { en: 'sing', de: 'singen', e: '🎤' }, { en: 'read', de: 'lesen', e: '📚' },
  { en: 'write', de: 'schreiben', e: '✍️' }, { en: 'sleep', de: 'schlafen', e: '😴' }, { en: 'eat', de: 'essen', e: '🍽️' }, { en: 'play football', de: 'Fußball spielen', e: '⚽' }, { en: 'ride a bike', de: 'Fahrrad fahren', e: '🚴' },
  { en: 'climb', de: 'klettern', e: '🧗' }, { en: 'cook', de: 'kochen', e: '🧑‍🍳' }, { en: 'paint', de: 'malen', e: '🎨' },
  { en: 'laugh', de: 'lachen', e: '😂' }, { en: 'cry', de: 'weinen', e: '😭' }, { en: 'drink', de: 'trinken', e: '🥛' }, { en: 'listen', de: 'zuhören', e: '👂' },
];
const HOME: Word[] = [{ en: 'kitchen', de: 'Küche', e: '🍳' }, { en: 'bathroom', de: 'Badezimmer', e: '🛁' }, { en: 'bedroom', de: 'Schlafzimmer', e: '🛏️' }, { en: 'living room', de: 'Wohnzimmer', e: '🛋️' }, { en: 'garden', de: 'Garten', e: '🏡' }, { en: 'house', de: 'Haus', e: '🏠' }, { en: 'door', de: 'Tür', e: '🚪' }, { en: 'window', de: 'Fenster', e: '🪟' }, { en: 'chair', de: 'Stuhl', e: '🪑' }, { en: 'lamp', de: 'Lampe', e: '💡' }, { en: 'toilet', de: 'Toilette', e: '🚽' }, { en: 'mirror', de: 'Spiegel', e: '🪞' }, { en: 'shower', de: 'Dusche', e: '🚿' }, { en: 'key', de: 'Schlüssel', e: '🔑' }];

// Weitere Wortfelder nach den NRW-Themen (Nachtlauf 22.10.2026): Natur, Verkehr, Obst und Gemüse, Stadt, Berufe, Tiere
const FRUIT: Word[] = [
  { en: 'pear', de: 'Birne', e: '🍐' }, { en: 'grapes', de: 'Weintrauben', e: '🍇' }, { en: 'cherries', de: 'Kirschen', e: '🍒' }, { en: 'lemon', de: 'Zitrone', e: '🍋' }, { en: 'pineapple', de: 'Ananas', e: '🍍' },
  { en: 'watermelon', de: 'Wassermelone', e: '🍉' }, { en: 'peach', de: 'Pfirsich', e: '🍑' }, { en: 'kiwi', de: 'Kiwi', e: '🥝' }, { en: 'potato', de: 'Kartoffel', e: '🥔' }, { en: 'cucumber', de: 'Gurke', e: '🥒' },
  { en: 'corn', de: 'Mais', e: '🌽' }, { en: 'onion', de: 'Zwiebel', e: '🧅' }, { en: 'broccoli', de: 'Brokkoli', e: '🥦' }, { en: 'mushroom', de: 'Pilz', e: '🍄' }, { en: 'pepper', de: 'Paprika', e: '🫑' },
];
const TRANSPORT: Word[] = [
  { en: 'car', de: 'Auto', e: '🚗' }, { en: 'bus', de: 'Bus', e: '🚌' }, { en: 'train', de: 'Zug', e: '🚆' }, { en: 'plane', de: 'Flugzeug', e: '✈️' }, { en: 'ship', de: 'Schiff', e: '🚢' },
  { en: 'bike', de: 'Fahrrad', e: '🚲' }, { en: 'boat', de: 'Boot', e: '⛵' }, { en: 'taxi', de: 'Taxi', e: '🚕' }, { en: 'tractor', de: 'Traktor', e: '🚜' }, { en: 'helicopter', de: 'Hubschrauber', e: '🚁' },
  { en: 'lorry', de: 'Lastwagen', e: '🚚' }, { en: 'motorbike', de: 'Motorrad', e: '🏍️' }, { en: 'scooter', de: 'Roller', e: '🛴' }, { en: 'rocket', de: 'Rakete', e: '🚀' },
];
const NATURE: Word[] = [
  { en: 'tree', de: 'Baum', e: '🌳' }, { en: 'flower', de: 'Blume', e: '🌼' }, { en: 'sun', de: 'Sonne', e: '☀️' }, { en: 'moon', de: 'Mond', e: '🌙' }, { en: 'star', de: 'Stern', e: '⭐' },
  { en: 'mountain', de: 'Berg', e: '⛰️' }, { en: 'sea', de: 'Meer', e: '🌊' }, { en: 'rainbow', de: 'Regenbogen', e: '🌈' }, { en: 'leaf', de: 'Blatt', e: '🍃' }, { en: 'forest', de: 'Wald', e: '🌲🌲🌲' },
  { en: 'beach', de: 'Strand', e: '🏖️' }, { en: 'cloud', de: 'Wolke', e: '☁️' }, { en: 'stone', de: 'Stein', e: '🪨' }, { en: 'fire', de: 'Feuer', e: '🔥' },
];
const TOWN: Word[] = [
  { en: 'hospital', de: 'Krankenhaus', e: '🏥' }, { en: 'shop', de: 'Geschäft / Laden', e: '🏪' }, { en: 'bank', de: 'Bank', e: '🏦' }, { en: 'church', de: 'Kirche', e: '⛪' }, { en: 'post office', de: 'Post', e: '🏤' },
  { en: 'station', de: 'Bahnhof', e: '🚉' }, { en: 'hotel', de: 'Hotel', e: '🏨' }, { en: 'castle', de: 'Burg / Schloss', e: '🏰' }, { en: 'museum', de: 'Museum', e: '🏛️' }, { en: 'park', de: 'Park', e: '🌳' },
  { en: 'cinema', de: 'Kino', e: '🎬' }, { en: 'swimming pool', de: 'Schwimmbad', e: '🏊' }, { en: 'bridge', de: 'Brücke', e: '🌉' }, { en: 'street', de: 'Straße', e: '🛣️' }, { en: 'fire station', de: 'Feuerwache', e: '🚒' },
];
const JOBS: Word[] = [
  { en: 'doctor', de: 'Arzt / Ärztin', e: '🧑‍⚕️' }, { en: 'police officer', de: 'Polizist / Polizistin', e: '👮' }, { en: 'firefighter', de: 'Feuerwehrmann / Feuerwehrfrau', e: '🧑‍🚒' }, { en: 'cook', de: 'Koch / Köchin', e: '🧑‍🍳' },
  { en: 'farmer', de: 'Bauer / Bäuerin', e: '🧑‍🌾' }, { en: 'pilot', de: 'Pilot / Pilotin', e: '🧑‍✈️' }, { en: 'astronaut', de: 'Astronaut / Astronautin', e: '🧑‍🚀' }, { en: 'artist', de: 'Künstler / Künstlerin', e: '🧑‍🎨' },
  { en: 'mechanic', de: 'Mechaniker / Mechanikerin', e: '🧑‍🔧' }, { en: 'scientist', de: 'Forscher / Forscherin', e: '🧑‍🔬' }, { en: 'singer', de: 'Sänger / Sängerin', e: '🧑‍🎤' }, { en: 'teacher', de: 'Lehrer / Lehrerin', e: '🧑‍🏫' },
  { en: 'builder', de: 'Bauarbeiter / Bauarbeiterin', e: '👷' }, { en: 'detective', de: 'Detektiv / Detektivin', e: '🕵️' },
];
const WILD: Word[] = [
  { en: 'shark', de: 'Hai', e: '🦈' }, { en: 'whale', de: 'Wal', e: '🐳' }, { en: 'dolphin', de: 'Delfin', e: '🐬' }, { en: 'octopus', de: 'Krake', e: '🐙' }, { en: 'crab', de: 'Krebs', e: '🦀' },
  { en: 'turtle', de: 'Schildkröte', e: '🐢' }, { en: 'penguin', de: 'Pinguin', e: '🐧' }, { en: 'bear', de: 'Bär', e: '🐻' }, { en: 'fox', de: 'Fuchs', e: '🦊' }, { en: 'owl', de: 'Eule', e: '🦉' },
  { en: 'bee', de: 'Biene', e: '🐝' }, { en: 'butterfly', de: 'Schmetterling', e: '🦋' }, { en: 'spider', de: 'Spinne', e: '🕷️' }, { en: 'giraffe', de: 'Giraffe', e: '🦒' }, { en: 'zebra', de: 'Zebra', e: '🦓' },
  { en: 'hedgehog', de: 'Igel', e: '🦔' }, { en: 'squirrel', de: 'Eichhörnchen', e: '🐿️' },
];
const SUBJECTS: Word[] = [
  { en: 'Maths', de: 'Mathe', e: '🔢' }, { en: 'English', de: 'Englisch', e: '💂' }, { en: 'German', de: 'Deutsch', e: '📚' }, { en: 'Art', de: 'Kunst', e: '🎨' },
  { en: 'Music', de: 'Musik', e: '🎼' }, { en: 'PE', de: 'Sport', e: '🤸' }, { en: 'Science', de: 'Sachunterricht', e: '🔬' }, { en: 'timetable', de: 'Stundenplan', e: '🗓️' },
  { en: 'break', de: 'Pause', e: '🥪' }, { en: 'homework', de: 'Hausaufgaben', e: '📝' }, { en: 'lesson', de: 'Unterrichtsstunde', e: '🔔' },
];

// ---------- 1. Lernjahr ----------
const colours = vocabSkill(1, 'e1-colours', 'Colours – Farben', '🎨', COLOURS, ['red = rot, blue = blau, green = grün, yellow = gelb.', 'Achtung: purple = lila, pink = rosa, grey = grau.', 'Im Englischen schreibt man Farben klein.'], 'colours song for kids English');
// Zahlwörter 1–20 auch für Vokabelkarten und Buchstabier-Diktat
const NUM_DE = ['null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig'];
registerWords('e1-numbers', Array.from({ length: 20 }, (_, i) => ({ en: NUM_EN[i + 1], de: NUM_DE[i + 1], txt: String(i + 1) })));
const numbers20 = E(1, 'e1-numbers', 'Numbers 1–20 – Zahlen', '🔢', { text: ['one, two, three, four, five, six, seven, eight, nine, ten', 'eleven, twelve – dann mit -teen: thirteen, fourteen, fifteen … nineteen.', 'twenty = 20.', 'Tipp: Zähle laut auf Englisch, z. B. beim Treppensteigen!'], visual: { kind: 'text', text: '1 one · 2 two · 3 three' }, videoQuery: 'numbers 1 to 20 song for kids' }, (r) => {
  const n = ri(r, 1, 20);
  const say = { text: numEn(n), lang: 'en' as const };
  const near = [n - 1, n + 1, n + 10, n - 10, n + 2].filter((x) => x >= 1 && x <= 20 && x !== n);
  const m = ri(r, 0, 3);
  if (m === 0) return { key: `b${n}`, prompt: 'Wie heißt die Zahl auf Englisch?', visual: { kind: 'text', text: String(n) }, answer: { ...choice(r, numEn(n), near.map(numEn)), speakOptions: 'en' }, tags: [n >= 13 ? 'teen' : 'bis-12'], solution: [`${n} = ${numEn(n)}`], pronounce: say };
  if (m === 1) return { key: `h${n}`, prompt: 'Hör gut zu! Welche Zahl ist es?', speak: 'Hör gut zu!', listen: say, answer: { ...choice(r, String(n), near.map(String)), big: true }, tags: ['hören'], solution: [`${numEn(n)} = ${n}`], pronounce: say };
  if (m === 2 && n <= 12) return { key: `s${n}`, prompt: `Schreibe auf Englisch:\n${n}`, answer: { type: 'text', value: numEn(n), lang: 'en' }, tags: ['schreiben'], solution: [`${n} = ${numEn(n)}`], pronounce: say };
  return { key: `r${n}`, prompt: `Welche Zahl ist „${numEn(n)}“?`, speak: 'Welche Zahl ist das?', listen: say, answer: { ...choice(r, String(n), near.map(String)), big: true }, tags: [n >= 13 ? 'teen' : 'bis-12'], solution: [`${numEn(n)} = ${n}`], pronounce: say };
}, { tagLabels: { teen: 'Zahlen 13–19 (-teen)', hören: 'Zahlen hören', schreiben: 'Zahlen schreiben' }, testSeconds: 15 });
const animals = vocabSkill(1, 'e1-animals', 'Animals – Tiere', '🐾', ANIMALS, ['dog = Hund, cat = Katze, bird = Vogel, fish = Fisch.', 'Manche Wörter sind fast wie im Deutschen: elephant, tiger, lion (Löwe).'], 'animals vocabulary for kids English');
const family = vocabSkill(1, 'e1-family', 'Family – Familie', '👨‍👩‍👧', FAMILY, ['mum = Mama, dad = Papa, sister = Schwester, brother = Bruder.', 'grandma = Oma, grandpa = Opa.', 'So stellst du jemanden vor: This is my sister.'], 'family members English for kids');
const body = vocabSkill(1, 'e1-body', 'My body – Körper', '🖐️', BODY, ['head = Kopf, eye = Auge, ear = Ohr, nose = Nase, mouth = Mund.', 'Mehrzahl: two eyes, two ears, two hands.', 'Besonders: one foot – two feet, one tooth – two teeth.'], 'head shoulders knees and toes body parts English');
const school = vocabSkill(1, 'e1-school', 'School things – Schulsachen', '🎒', SCHOOL, ['pen, pencil, ruler, book – Dinge in deiner Schultasche (school bag).', 'Frage: What is this? – It\'s a pencil.'], 'classroom objects English for kids');
const food = vocabSkill(1, 'e1-food', 'Food – Essen', '🍎', FOOD, ['apple, banana, bread, milk, cheese …', 'So sagst du, was du magst: I like apples. I don\'t like cheese.'], 'food vocabulary English for kids');
const clothes = vocabSkill(1, 'e1-clothes', 'Clothes – Kleidung', '👕', CLOTHES, ['T-shirt, trousers (Hose), dress (Kleid), shoes, socks.', 'trousers, shoes, socks und gloves benutzt man meistens in der Mehrzahl.'], 'clothes vocabulary English for kids');
const days = vocabSkill(1, 'e1-days', 'Days of the week – Wochentage', '📅', DAYS, ['Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.', 'Wochentage schreibt man im Englischen immer groß!', 'Wednesday spricht man „Wens-day“.'], 'days of the week song', dayOrderTask);
const fruit = vocabSkill(1, 'e1-fruit', 'Fruit and vegetables – Obst und Gemüse', '🍇', FRUIT, ['pear = Birne, grapes = Weintrauben, cherries = Kirschen, lemon = Zitrone.', 'potato = Kartoffel, cucumber = Gurke, onion = Zwiebel, mushroom = Pilz.', 'Achtung: pepper ist hier die Paprika (nicht der Pfeffer).', "I like grapes. I don't like onions."], 'fruits and vegetables vocabulary English for kids');
const transport = vocabSkill(1, 'e1-transport', 'Transport – Fahrzeuge', '🚌', TRANSPORT, ['car = Auto, bus = Bus, train = Zug, plane = Flugzeug, bike = Fahrrad.', 'In Großbritannien heißt der Lastwagen lorry, in Amerika truck.', 'How do you get to school? – By bus. / By bike. / On foot (zu Fuß).'], 'transport vocabulary English for kids');
const nature = vocabSkill(1, 'e1-nature', 'Nature – Natur', '🌳', NATURE, ['tree = Baum, flower = Blume, sun = Sonne, moon = Mond, star = Stern.', 'sea = Meer, beach = Strand, mountain = Berg, forest = Wald.', 'Look! A rainbow! = Schau! Ein Regenbogen!'], 'nature vocabulary English for kids');

const PHRASES: { en: string; de: string; sit: string }[] = [
  { en: 'Hello!', de: 'Hallo!', sit: 'Du triffst einen Freund.' }, { en: 'Goodbye!', de: 'Tschüss! / Auf Wiedersehen!', sit: 'Du gehst nach Hause.' },
  { en: 'Good morning!', de: 'Guten Morgen!', sit: 'Es ist früh am Morgen und du kommst in die Klasse.' }, { en: 'Good night!', de: 'Gute Nacht!', sit: 'Du gehst ins Bett.' },
  { en: 'Thank you!', de: 'Danke!', sit: 'Jemand schenkt dir etwas.' }, { en: 'Please.', de: 'Bitte.', sit: 'Du möchtest höflich um etwas bitten.' },
  { en: 'Sorry!', de: 'Entschuldigung!', sit: 'Du hast jemanden aus Versehen angerempelt.' }, { en: 'How are you?', de: 'Wie geht es dir?', sit: 'Du möchtest wissen, wie es jemandem geht.' },
  { en: "I'm fine, thank you.", de: 'Mir geht es gut, danke.', sit: 'Jemand fragt dich, wie es dir geht.' }, { en: "What's your name?", de: 'Wie heißt du?', sit: 'Du möchtest den Namen eines Kindes wissen.' },
  { en: 'My name is Tom.', de: 'Ich heiße Tom.', sit: 'Tom stellt sich vor.' }, { en: 'Happy birthday!', de: 'Alles Gute zum Geburtstag!', sit: 'Deine Freundin hat Geburtstag.' },
  // Nachtlauf 23.10.2026: nur Situationen, zu denen genau ein Satz passt (nicht „Bis morgen“ neben „Goodbye“)
  { en: 'Well done!', de: 'Gut gemacht!', sit: 'Dein Freund hat ein Tor geschossen. Du lobst ihn.' }, { en: 'Here you are.', de: 'Bitte schön! (beim Geben)', sit: 'Du gibst jemandem etwas, um das er dich gebeten hat.' },
  { en: "I don't know.", de: 'Ich weiß es nicht.', sit: 'Die Lehrerin fragt dich etwas, aber du kennst die Antwort nicht.' }, { en: 'Can you help me, please?', de: 'Kannst du mir bitte helfen?', sit: 'Du schaffst etwas nicht allein und brauchst Hilfe.' },
  { en: 'Good luck!', de: 'Viel Glück!', sit: 'Deine Freundin schreibt gleich eine Klassenarbeit.' },
];
const phrases = E(1, 'e1-phrases', 'Hello! – Begrüßen und Sätze', '👋', { text: ['Hello = Hallo, Goodbye = Tschüss.', 'Good morning = Guten Morgen, Good night = Gute Nacht.', 'Höflich sein: Please = Bitte, Thank you = Danke, Sorry = Entschuldigung.', 'Fragen: How are you? – I\'m fine, thank you. What\'s your name? – My name is …'], visual: { kind: 'emoji', chars: '👋' }, videoQuery: 'hello song greetings for kids English' }, (r) => {
  const p = pick(r, PHRASES);
  const others = PHRASES.filter((x) => x !== p);
  const say = { text: p.en, lang: 'en' as const };
  if (chance(r, 0.45)) return { key: `s-${p.en}`, prompt: `${p.sit}\nWas sagst du?`, answer: { ...choice(r, p.en, pickN(r, others, 3).map((x) => x.en)), speakOptions: 'en' }, tags: ['situation'], solution: [`${p.en} = ${p.de}`], pronounce: say };
  if (chance(r, 0.5)) return { key: `v-${p.en}`, prompt: `Was bedeutet „${p.en}“?`, speak: 'Was bedeutet das?', listen: say, answer: choice(r, p.de, pickN(r, others, 3).map((x) => x.de)), tags: ['verstehen'], solution: [`${p.en} = ${p.de}`], pronounce: say };
  return { key: `h-${p.en}`, prompt: 'Hör gut zu! Was bedeutet das?', speak: 'Hör gut zu!', listen: say, answer: choice(r, p.de, pickN(r, others, 3).map((x) => x.de)), tags: ['hören'], solution: [`${p.en} = ${p.de}`], pronounce: say };
}, { tagLabels: { situation: 'passenden Satz wählen', verstehen: 'Sätze verstehen', hören: 'Sätze hören' }, testSeconds: 20 });

// ---------- 2. Lernjahr ----------
// Zehnerzahlen auch als Vokabelkarten und im Diktat
registerWords('e2-numbers100', [20, 30, 40, 50, 60, 70, 80, 90, 100].map((n) => ({ en: TENS_EN[n / 10], de: ['zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig', 'hundert'][n / 10 - 2], txt: String(n) })));
const numbers100 = E(2, 'e2-numbers100', 'Numbers to 100', '💯', { text: ['Zehner: twenty, thirty, forty, fifty, sixty, seventy, eighty, ninety, one hundred.', 'Achtung: Im Englischen sagt man die Zehner zuerst: 47 = forty-seven (nicht „seven-forty“!).', 'Verwechsle nicht: fourteen (14) und forty (40), fifteen (15) und fifty (50).'], visual: { kind: 'text', text: '47 = forty-seven' }, videoQuery: 'numbers 1 to 100 English for kids' }, (r) => {
  const n = chance(r, 0.25) ? pick(r, [13, 14, 15, 16, 17, 18, 19, 30, 40, 50, 60, 70, 80, 90]) : ri(r, 21, 99);
  const say = { text: numEn(n), lang: 'en' as const };
  const swap = n > 20 && n % 10 ? (n % 10) * 10 + Math.floor(n / 10) : undefined;
  const teenTy = n >= 13 && n <= 19 ? (n - 10) * 10 : n % 10 === 0 && n >= 30 ? n / 10 + 10 : undefined;
  const near = [swap, teenTy, n + 1, n - 1, n + 10, n - 10].filter((x): x is number => x !== undefined && x > 0 && x < 100 && x !== n);
  const traps = [...(teenTy ? [{ answer: String(teenTy), tag: 'teen-ty', hint: '-teen (13–19) und -ty (Zehner) klingen ähnlich: fourteen = 14, forty = 40.' }] : []), ...(swap ? [{ answer: String(swap), tag: 'zahlendreher', hint: 'Im Englischen kommt der Zehner zuerst: forty-seven = 47.' }] : [])];
  if (chance(r, 0.5)) return { key: `h${n}`, prompt: 'Hör gut zu! Welche Zahl ist es?', speak: 'Hör gut zu!', listen: say, answer: { ...choice(r, String(n), near.map(String)), big: true }, tags: ['hören'], traps, solution: [`${numEn(n)} = ${n}`], pronounce: say };
  return { key: `b${n}`, prompt: `Wie heißt ${n} auf Englisch?`, answer: { ...choice(r, numEn(n), near.map(numEn)), speakOptions: 'en' }, tags: ['zahlwort'], traps: traps.map((t) => ({ ...t, answer: numEn(Number(t.answer)) })), solution: [`${n} = ${numEn(n)}`], pronounce: say };
}, { tagLabels: { 'teen-ty': '-teen und -ty verwechselt', zahlendreher: 'Zahlendreher', hören: 'Zahlen hören', zahlwort: 'Zahlwörter' }, testSeconds: 15 });
const months = vocabSkill(2, 'e2-months', 'Months and seasons', '🗓️', [...MONTHS, ...SEASONS], ['January, February, March, April, May, June, July, August, September, October, November, December.', 'Jahreszeiten: spring (Frühling), summer (Sommer), autumn (Herbst), winter (Winter).', 'Monate schreibt man groß, Jahreszeiten klein.'], 'months of the year song');
const weather = vocabSkill(2, 'e2-weather', 'Weather – Wetter', '🌦️', WEATHER, ["What's the weather like? – It's sunny.", 'sun → sunny, rain → rainy, cloud → cloudy, wind → windy, snow → snowy.'], 'weather vocabulary English for kids');
const feelings = vocabSkill(2, 'e2-feelings', 'Feelings – Gefühle', '😊', FEELINGS, ['How are you? – I\'m happy. / I\'m sad. / I\'m tired.', 'happy = fröhlich, sad = traurig, angry = wütend, scared = ängstlich.'], 'feelings and emotions English for kids');
const actions = vocabSkill(2, 'e2-actions', 'Actions – Was ich tue', '🏃', ACTIONS, ['run, swim, dance, sing, read, write …', 'I can swim. = Ich kann schwimmen. I can\'t sing. = Ich kann nicht singen.'], 'action verbs English for kids');
const home = vocabSkill(2, 'e2-home', 'My home – Zuhause', '🏠', HOME, ['kitchen = Küche, bathroom = Bad, bedroom = Schlafzimmer, living room = Wohnzimmer.', "Where's mum? – She's in the kitchen."], 'rooms in the house English for kids');
const town = vocabSkill(2, 'e2-town', 'In town – In der Stadt', '🏙️', TOWN, ['hospital = Krankenhaus, station = Bahnhof, church = Kirche, cinema = Kino.', "Where's the station? – It's next to the park.", 'swimming pool = Schwimmbad, post office = Post, fire station = Feuerwache.'], 'places in town vocabulary English for kids');
const jobs = vocabSkill(2, 'e2-jobs', 'Jobs – Berufe', '🧑‍🚒', JOBS, ['doctor = Arzt / Ärztin, farmer = Bauer / Bäuerin, pilot = Pilot / Pilotin.', 'Im Englischen ist das Wort meist für Frauen und Männer gleich: She is a doctor. He is a doctor.', 'What do you want to be? – I want to be a firefighter.'], 'jobs and occupations vocabulary English for kids');
const subjects = vocabSkill(2, 'e2-subjects', 'School subjects – Schulfächer', '🗓️', SUBJECTS, ['Maths = Mathe, German = Deutsch, Art = Kunst, Music = Musik, PE = Sport.', 'Schulfächer schreibt man im Englischen groß: I like Maths.', "What's your favourite subject? – My favourite subject is Art."], 'school subjects vocabulary English for kids');
const wild = vocabSkill(2, 'e2-wildanimals', 'Wild animals – Wilde Tiere', '🦊', WILD, ['In the sea: shark (Hai), whale (Wal), dolphin (Delfin), octopus (Krake).', 'In the forest: fox (Fuchs), owl (Eule), hedgehog (Igel), squirrel (Eichhörnchen).', 'Mehrzahl: one butterfly – two butterflies, one fox – two foxes.'], 'wild animals vocabulary English for kids');

const clockEn = (h: number, m: number) => (m === 0 ? `${numEn(h)} o'clock` : m === 30 ? `half past ${numEn(h)}` : m === 15 ? `quarter past ${numEn(h)}` : `quarter to ${numEn(h % 12 + 1)}`);
const time = E(2, 'e2-time', "What's the time?", '🕐', { text: ["Volle Stunde: It's three o'clock.", "Halbe Stunde: It's half past three = 3:30.", 'Achtung: Auf Deutsch sagt man „halb vier“, auf Englisch „half past three“ (halb nach drei)!', "Viertel: quarter past three (3:15), quarter to four (3:45)."], visual: { kind: 'clock', h: 3, m: 30 }, videoQuery: "telling the time o'clock half past for kids" }, (r) => {
  const h = ri(r, 1, 12), m = pick(r, [0, 30, 0, 30, 15, 45]);
  const ok = clockEn(h, m);
  const say = { text: `It's ${ok}`, lang: 'en' as const };
  const wrongHalf = m === 30 ? `half past ${numEn(h % 12 + 1)}` : undefined;
  return { key: `${h}:${m}`, prompt: "What's the time?", speak: 'Wie spät ist es? Welche Antwort passt zur Uhr?', visual: { kind: 'clock', h, m }, answer: { ...choice(r, ok, [clockEn(h % 12 + 1, m), clockEn(h, (m + 30) % 60), ...(wrongHalf ? [wrongHalf] : []), clockEn(h === 1 ? 12 : h - 1, m)]), speakOptions: 'en' }, tags: [m === 0 ? 'oclock' : m === 30 ? 'half-past' : 'quarter'], traps: wrongHalf ? [{ answer: wrongHalf, tag: 'halb-falle', hint: `Auf Deutsch: halb ${['zwölf', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf'][h % 12 + 1]}. Auf Englisch: half past ${numEn(h)} – „halb nach ${h}“!` }] : [], solution: [`Es ist ${h}:${String(m).padStart(2, '0')} Uhr.`, `It's ${ok}.`], solutionVisual: { kind: 'clock', h, m }, pronounce: say };
}, { tagLabels: { oclock: "o'clock", 'half-past': 'half past', quarter: 'quarter past / to', 'halb-falle': 'half past wie „halb“ verstanden' }, testSeconds: 20 });

const PREPS: { pos: 'in' | 'on' | 'under' | 'next to' | 'behind' | 'in front of'; de: string }[] = [{ pos: 'in', de: 'in' }, { pos: 'on', de: 'auf' }, { pos: 'under', de: 'unter' }, { pos: 'next to', de: 'neben' }, { pos: 'behind', de: 'hinter' }, { pos: 'in front of', de: 'vor' }];
const PREP_ANIMALS = [
  { en: 'cat', de: 'Die Katze', e: '🐱' },
  { en: 'dog', de: 'Der Hund', e: '🐶' },
  { en: 'mouse', de: 'Die Maus', e: '🐭' },
  { en: 'rabbit', de: 'Das Kaninchen', e: '🐰' },
  { en: 'bird', de: 'Der Vogel', e: '🐦' },
  { en: 'frog', de: 'Der Frosch', e: '🐸' },
];
const preps = E(2, 'e2-prepositions', 'Where is the cat?', '📦', { text: ['in = in, on = auf, under = unter.', 'next to = neben, behind = hinter, in front of = vor.', "Where's the cat? – It's under the box."], visual: { kind: 'prep', pos: 'under' }, videoQuery: 'prepositions in on under song for kids' }, (r, s) => {
  const p = pick(r, PREPS);
  // Stufe 1 immer die Katze, danach auch andere Tiere
  const an = s === 1 ? PREP_ANIMALS[0] : pick(r, PREP_ANIMALS);
  const say = { text: `The ${an.en} is ${p.pos} the box.`, lang: 'en' as const };
  const tag = `prep-${p.pos.replace(/ /g, '-')}`;
  const sol = [`${p.pos} = ${p.de}`, `The ${an.en} is ${p.pos} the box. = ${an.de} ist ${p.de} der Kiste.`];
  // Stufe 3: Präposition selbst schreiben
  if (s === 3 && chance(r, 0.5)) return { key: `w-${p.pos}-${an.en}`, prompt: `Where is the ${an.en}? Write the missing word:\nThe ${an.en} is ☐ the box.`, speak: `Wo ist ${an.de.replace(/^D/, 'd')}? Schreibe das fehlende englische Wort.`, visual: { kind: 'prep', pos: p.pos, animal: an.e }, answer: { type: 'text', value: p.pos, lang: 'en' }, tags: [tag], solution: sol, pronounce: say };
  // Deutsch → Englisch (ohne Bild)
  if (s !== 1 && chance(r, 0.4)) return { key: `de-${p.pos}-${an.en}`, prompt: `Wie sagt man auf Englisch?\n„${an.de} ist ${p.de} der Kiste.“`, answer: { ...choice(r, `The ${an.en} is ${p.pos} the box.`, pickN(r, PREPS.filter((x) => x !== p), 3).map((x) => `The ${an.en} is ${x.pos} the box.`)), speakOptions: 'en' }, tags: [tag], solution: sol, solutionVisual: { kind: 'prep', pos: p.pos, animal: an.e }, pronounce: say };
  return { key: `${p.pos}-${an.en}`, prompt: `Where is the ${an.en}?`, speak: `Wo ist ${an.de.replace(/^D/, 'd')}? Welcher Satz passt?`, visual: { kind: 'prep', pos: p.pos, animal: an.e }, answer: { ...choice(r, `The ${an.en} is ${p.pos} the box.`, PREPS.filter((x) => x !== p).map((x) => `The ${an.en} is ${x.pos} the box.`)), speakOptions: 'en' }, tags: [tag], solution: sol, solutionVisual: { kind: 'prep', pos: p.pos, animal: an.e }, pronounce: say };
}, { tagLabels: Object.fromEntries(PREPS.map((p) => [`prep-${p.pos.replace(/ /g, '-')}`, p.pos])), testSeconds: 15 });

const AN = [['apple', '🍎'], ['egg', '🥚'], ['elephant', '🐘'], ['orange', '🍊'], ['ice cream', '🍦'], ['umbrella', '☂️'], ['owl', '🦉'], ['ant', '🐜'], ['octopus', '🐙'], ['onion', '🧅'], ['ear', '👂'], ['eagle', '🦅']];
const A = [['banana', '🍌'], ['cat', '🐱'], ['dog', '🐶'], ['house', '🏠'], ['pencil', '✏️'], ['ball', '⚽'], ['tiger', '🐯'], ['frog', '🐸'], ['horse', '🐴'], ['car', '🚗'], ['cake', '🎂'], ['rabbit', '🐰']];
const IRREG: [string, string, string][] = [['mouse', 'mice', '🐭'], ['child', 'children', '🧒'], ['foot', 'feet', '🦶'], ['tooth', 'teeth', '🦷'], ['man', 'men', '👨'], ['woman', 'women', '👩'], ['sheep', 'sheep', '🐑'], ['deer', 'deer', '🦌'], ['leaf', 'leaves', '🍃'], ['knife', 'knives', '🔪']];
const REG: [string, string, string][] = [['cat', 'cats', '🐱'], ['dog', 'dogs', '🐶'], ['book', 'books', '📖'], ['apple', 'apples', '🍎'], ['bus', 'buses', '🚌'], ['box', 'boxes', '📦'], ['baby', 'babies', '👶'], ['bird', 'birds', '🐦'], ['car', 'cars', '🚗'], ['fox', 'foxes', '🦊'], ['dress', 'dresses', '👗'], ['cherry', 'cherries', '🍒'], ['watch', 'watches', '⌚']];
const grammar1 = E(2, 'e2-a-an-plural', 'a / an and plurals', '🍏', { text: ['Vor Wörtern, die mit a, e, i, o, u anfangen (gesprochen!), steht „an“: an apple, an egg.', 'Sonst steht „a“: a banana, a dog.', 'Mehrzahl meistens mit -s: cat → cats. Nach s, x, sh, ch mit -es: bus → buses.', 'Besondere Mehrzahl: mouse → mice, child → children, foot → feet, tooth → teeth.'], visual: { kind: 'text', text: 'an apple · a banana' }, videoQuery: 'a or an for kids English grammar' }, (r) => {
  const v = ri(r, 0, 2);
  if (v === 0) {
    const an = chance(r, 0.5);
    const [w, e] = pick(r, an ? AN : A);
    return { key: `a-${w}`, prompt: `☐ ${w}`, speak: 'a oder an?', listen: { text: w, lang: 'en' }, visual: { kind: 'emoji', chars: e }, answer: { ...fixedChoice(['a', 'an'], an ? 'an' : 'a'), big: true }, tags: ['a-an'], solution: [an ? `${w} beginnt mit einem Selbstlaut (${w[0]}) → an ${w}` : `${w} beginnt mit einem Mitlaut (${w[0]}) → a ${w}`], pronounce: { text: `${an ? 'an' : 'a'} ${w}`, lang: 'en' } };
  }
  const irr = v === 2;
  const [s, p, e] = pick(r, irr ? IRREG : REG);
  // Ablenker mit deutscher Endung -en – aber keine, die zufällig ein deutsches Wort ergeben (bus → „busen“)
  const enForm = (w: string) => (['busen'].includes(w + 'en') ? [] : [w + 'en']);
  const wrong = [s + 's', s + 'es', p === s ? s + 's' : p + 's', s.replace(/y$/, 'ys')].filter((x) => x !== p && x !== s);
  return { key: `p-${s}`, prompt: `one ${s} – two ☐`, speak: `One ${s}. Two what?`, visual: { kind: 'emoji', chars: `${e}${e}` }, answer: { ...choice(r, p, p === s ? [...wrong, ...enForm(s)] : [s, ...pickN(r, [...new Set([...wrong, ...enForm(s)])], 2)]), speakOptions: 'en' }, tags: [irr ? 'plural-besonders' : 'plural-s'], solution: [`one ${s} – two ${p}`, irr ? 'Das ist eine besondere Mehrzahl – die musst du dir merken.' : s.endsWith('y') ? 'Nach Mitlaut + y wird -ies angehängt.' : /(s|x|sh|ch)$/.test(s) ? 'Nach s, x, sh, ch hängt man -es an.' : 'Meistens hängt man einfach -s an.'], pronounce: { text: `one ${s}, two ${p}`, lang: 'en' } };
}, { tagLabels: { 'a-an': 'a oder an', 'plural-s': 'Mehrzahl mit -s', 'plural-besonders': 'besondere Mehrzahl (mice, feet …)' }, testSeconds: 15 });

const BE: { s: string; ok: string; opts: string[]; tag: string; why: string }[] = [
  { s: 'I ☐ nine years old.', ok: 'am', opts: ['is', 'are'], tag: 'to-be', why: 'Nach „I“ steht immer „am“: I am (I\'m).' },
  { s: 'She ☐ my sister.', ok: 'is', opts: ['am', 'are'], tag: 'to-be', why: 'Nach he, she, it steht „is“.' },
  { s: 'We ☐ friends.', ok: 'are', opts: ['am', 'is'], tag: 'to-be', why: 'Nach we, you, they steht „are“.' },
  { s: 'The dog ☐ hungry.', ok: 'is', opts: ['am', 'are'], tag: 'to-be', why: 'The dog = it → „is“.' },
  { s: 'They ☐ in the garden.', ok: 'are', opts: ['am', 'is'], tag: 'to-be', why: 'Nach they steht „are“.' },
  { s: 'I ☐ swim. 🏊', ok: 'can', opts: ['is', 'am'], tag: 'can', why: 'I can swim. = Ich kann schwimmen.' },
  { s: "Fish ☐ walk. They can only swim.", ok: "can't", opts: ['can', 'are'], tag: 'can', why: "can't = kann nicht." },
  { s: 'I ☐ pizza. 😋', ok: 'like', opts: ['likes', 'am'], tag: 'like', why: 'I like … = Ich mag …' },
  { s: 'He ☐ football.', ok: 'likes', opts: ['like', 'is'], tag: 'like', why: 'Nach he, she, it bekommt das Verb ein -s: he likes.' },
  { s: 'I have ☐ a dog. 🐶', ok: 'got', opts: ['get', 'go'], tag: 'have-got', why: 'I have got a dog. = Ich habe einen Hund.' },
  { s: 'She ☐ got a cat.', ok: 'has', opts: ['have', 'is'], tag: 'have-got', why: 'Nach he, she, it: has got.' },
  { s: '☐ name is Tom.', ok: 'My', opts: ['I', 'Me'], tag: 'my', why: 'My name is … = Mein Name ist …' },
  { s: 'You ☐ my best friend.', ok: 'are', opts: ['am', 'is'], tag: 'to-be', why: 'Nach you steht „are“.' },
  { s: 'It ☐ cold today. ❄️', ok: 'is', opts: ['am', 'are'], tag: 'to-be', why: 'Nach it steht „is“.' },
  { s: 'Birds ☐ fly. 🐦', ok: 'can', opts: ["can't", 'is'], tag: 'can', why: 'Birds can fly. = Vögel können fliegen.' },
  { s: 'Penguins ☐ fly. 🐧', ok: "can't", opts: ['can', 'are'], tag: 'can', why: "Penguins can't fly. = Pinguine können nicht fliegen." },
  { s: 'My sister ☐ bananas. 🍌', ok: 'likes', opts: ['like', 'are'], tag: 'like', why: 'My sister = she → likes (mit -s).' },
  { s: 'We ☐ ice cream. 🍦', ok: 'like', opts: ['likes', 'is'], tag: 'like', why: 'Nach we steht „like“ ohne -s.' },
  { s: 'He ☐ got a bike. 🚲', ok: 'has', opts: ['have', 'is'], tag: 'have-got', why: 'Nach he, she, it: has got.' },
  { s: 'They have ☐ two rabbits. 🐰', ok: 'got', opts: ['get', 'go'], tag: 'have-got', why: 'They have got … = Sie haben …' },
  { s: 'This is ☐ bag. 🎒', ok: 'my', opts: ['I', 'me'], tag: 'my', why: 'my bag = meine Tasche.' },
  // Nachtlauf 22.10.2026: mehr Sätze
  { s: 'My mum ☐ a teacher.', ok: 'is', opts: ['am', 'are'], tag: 'to-be', why: 'My mum = she → „is“.' },
  { s: 'I ☐ happy today. 😀', ok: 'am', opts: ['is', 'are'], tag: 'to-be', why: 'Nach „I“ steht immer „am“: I am (I\'m).' },
  { s: 'Tom and Lea ☐ in my class.', ok: 'are', opts: ['is', 'am'], tag: 'to-be', why: 'Tom and Lea = they → „are“.' },
  { s: 'Cats ☐ climb trees. 🐱', ok: 'can', opts: ["can't", 'is'], tag: 'can', why: 'Cats can climb. = Katzen können klettern.' },
  { s: 'Elephants ☐ jump. 🐘', ok: "can't", opts: ['can', 'are'], tag: 'can', why: "Elephants can't jump. = Elefanten können nicht springen." },
  { s: 'She ☐ chocolate. 🍫', ok: 'likes', opts: ['like', 'is'], tag: 'like', why: 'Nach he, she, it bekommt das Verb ein -s: she likes.' },
  { s: "I don't ☐ spiders. 🕷️", ok: 'like', opts: ['likes', 'am'], tag: 'like', why: "I don't like … = Ich mag … nicht." },
  { s: 'We have ☐ a big garden. 🏡', ok: 'got', opts: ['get', 'go'], tag: 'have-got', why: 'We have got … = Wir haben …' },
  { s: 'My dad ☐ got a car. 🚗', ok: 'has', opts: ['have', 'is'], tag: 'have-got', why: 'My dad = he → has got.' },
  { s: '☐ favourite colour is red.', ok: 'My', opts: ['I', 'Me'], tag: 'my', why: 'My favourite colour … = Meine Lieblingsfarbe …' },
  { s: 'They ☐ my friends.', ok: 'are', opts: ['is', 'am'], tag: 'to-be', why: 'Nach we, you, they steht „are“.' },
  { s: 'It ☐ a big dog. 🐕', ok: 'is', opts: ['are', 'am'], tag: 'to-be', why: 'Nach he, she, it steht „is“.' },
  { s: 'Fish ☐ swim. 🐟', ok: 'can', opts: ["can't", 'are'], tag: 'can', why: 'Fish can swim. = Fische können schwimmen.' },
  { s: 'Snakes ☐ run. 🐍', ok: "can't", opts: ['can', 'are'], tag: 'can', why: "Snakes can't run. = Schlangen können nicht rennen." },
  { s: 'My brother ☐ football. ⚽', ok: 'likes', opts: ['like', 'are'], tag: 'like', why: 'My brother = he → likes (mit -s).' },
  { s: 'My friends ☐ dancing. 💃', ok: 'like', opts: ['likes', 'is'], tag: 'like', why: 'My friends = they → like ohne -s.' },
  { s: 'She ☐ got long hair.', ok: 'has', opts: ['have', 'is'], tag: 'have-got', why: 'Nach he, she, it: has got.' },
  { s: 'I ☐ got a sister.', ok: 'have', opts: ['has', 'am'], tag: 'have-got', why: 'Nach I: have got.' },
  { s: 'You ☐ very tall.', ok: 'are', opts: ['is', 'am'], tag: 'to-be', why: 'Nach you steht „are“.' },
  { s: 'The dog ☐ hungry. 🐶', ok: 'is', opts: ['are', 'am'], tag: 'to-be', why: 'The dog = it → is.' },
  { s: 'Birds ☐ fly. 🐦', ok: 'can', opts: ["can't", 'are'], tag: 'can', why: 'Birds can fly. = Vögel können fliegen.' },
  { s: 'Fish ☐ walk. 🐟', ok: "can't", opts: ['can', 'is'], tag: 'can', why: "Fish can't walk. = Fische können nicht laufen." },
  { s: 'Tom ☐ pizza. 🍕', ok: 'likes', opts: ['like', 'is'], tag: 'like', why: 'Tom = he → likes (mit -s).' },
  { s: 'They ☐ got a big house. 🏠', ok: 'have', opts: ['has', 'are'], tag: 'have-got', why: 'Nach they: have got.' },
  // Nachtlauf 24.10.2026: mehr Sätze
  { s: 'He ☐ ten years old.', ok: 'is', opts: ['am', 'are'], tag: 'to-be', why: 'Nach he, she, it steht „is“.' },
  { s: 'The cats ☐ asleep. 😴', ok: 'are', opts: ['is', 'am'], tag: 'to-be', why: 'The cats = they → „are“.' },
  { s: 'Monkeys ☐ climb. 🐒', ok: 'can', opts: ["can't", 'is'], tag: 'can', why: 'Monkeys can climb. = Affen können klettern.' },
  { s: 'My grandma ☐ cats. 🐈', ok: 'likes', opts: ['like', 'are'], tag: 'like', why: 'My grandma = she → likes (mit -s).' },
  { s: 'We ☐ got a new teacher.', ok: 'have', opts: ['has', 'are'], tag: 'have-got', why: 'Nach we: have got.' },
  { s: 'It ☐ got four legs. 🐴', ok: 'has', opts: ['have', 'is'], tag: 'have-got', why: 'Nach he, she, it: has got.' },
  { s: 'This is ☐ bike. 🚲', ok: 'my', opts: ['I', 'me'], tag: 'my', why: 'my bike = mein Fahrrad.' },
];
const sentences = E(2, 'e2-sentences', 'Little sentences', '💬', { text: ['I am – you are – he/she/it is – we are – they are.', 'I can swim. I can\'t fly.', 'I like apples. He likes apples (mit -s!).', 'I have got a dog. She has got a cat.'], visual: { kind: 'text', text: 'I am · she is · we are' }, videoQuery: 'verb to be am is are for kids' }, (r) => {
  const b = pick(r, BE);
  const full = b.s.replace('☐', b.ok);
  return { key: b.s, prompt: `Was passt?\n${b.s}`, speak: 'Was passt in die Lücke?', answer: { ...choice(r, b.ok, b.opts), speakOptions: 'en' }, tags: [b.tag], solution: [full, b.why], pronounce: { text: full.replace(/[^\x20-\x7E']/g, '').trim(), lang: 'en' } };
}, { tagLabels: { 'to-be': 'am / is / are', can: "can / can't", like: 'like / likes', 'have-got': 'have got / has got', my: 'my' }, testSeconds: 20 });

export const ENGLISCH: Skill[] = [colours, numbers20, animals, family, body, school, food, clothes, days, fruit, transport, nature, phrases, numbers100, months, weather, feelings, actions, home, town, jobs, wild, subjects, time, preps, grammar1, sentences];
