// Englisch in der Grundschule – 1. und 2. Lernjahr (Skill.grade 3 = 1. Lernjahr, 4 = 2. Lernjahr).
// In NRW beginnt Englisch in Klasse 3; in Ländern mit Beginn in Klasse 1 wird das 1. Lernjahr früher gezeigt (curriculum.ts).
import { chance, choice, fixedChoice, pick, pickN, ri, type Rng } from '../engine/rng';
import type { Skill, Stage, Visual } from '../engine/types';
import { skill, type Gen } from './helpers';

const E = (year: 1 | 2, ...a: Parameters<typeof skill> extends [unknown, unknown, ...infer R] ? R : never) => skill('englisch', year === 1 ? 3 : 4, ...a);

type Word = { en: string; de: string; e?: string; hex?: string; txt?: string };
const visualOf = (w: Word): Visual => (w.hex ? { kind: 'color', hex: w.hex } : w.e ? { kind: 'emoji', chars: w.e } : { kind: 'text', text: w.txt ?? w.de });

const VTAGS = { 'bild-wort': 'Bild → englisches Wort', hören: 'Hörverstehen', übersetzen: 'Deutsch → Englisch', verstehen: 'Englisch → Deutsch', schreiben: 'Wörter schreiben' };

function vocabTask(r: Rng, words: Word[], year: 1 | 2, stage: Stage = 2): Gen {
  const w = pick(r, words);
  const others = words.filter((x) => x !== w);
  // Stufe 1: nur wiedererkennen (Bild, Hören), Stufe 3: viel selbst schreiben
  const spell = stage === 1 ? 0 : w.en.length <= 8 && !w.en.includes(' ') ? (stage === 3 ? 0.45 : year === 1 ? 0.12 : 0.25) : 0;
  const roll = r();
  const say = { text: w.en, lang: 'en' as const };
  const sol = [`${w.de} heißt auf Englisch: ${w.en}`];
  if (roll < spell) {
    return { key: `s-${w.en}`, prompt: `Schreibe auf Englisch:\n${w.de}`, visual: visualOf(w), answer: { type: 'text', value: w.en, lang: 'en' }, tags: ['schreiben'], solution: [...sol, `Buchstabiert: ${w.en.toUpperCase().split('').join(' – ')}`], pronounce: say };
  }
  const same = w.en.toLowerCase() === w.de.toLowerCase();
  let mode: 'bild' | 'hören' | 'de-en' | 'en-de' = pick(r, same || stage === 1 ? (['bild', 'hören'] as const) : stage === 3 ? (['hören', 'de-en', 'de-en', 'en-de'] as const) : (['bild', 'hören', 'de-en', 'en-de'] as const));
  if (mode === 'hören' && !w.e && !w.hex) mode = same ? 'bild' : 'en-de';
  if (mode === 'bild') return { key: `b-${w.en}`, prompt: 'Wie heißt das auf Englisch?', visual: visualOf(w), answer: { ...choice(r, w.en, pickN(r, others, 3).map((x) => x.en)), speakOptions: 'en' }, tags: ['bild-wort'], solution: sol, solutionVisual: visualOf(w), pronounce: say };
  if (mode === 'hören' && (w.e || w.hex)) {
    const opts = pickN(r, others.filter((x) => x.e || x.hex), 3);
    if (w.hex) return { key: `h-${w.en}`, prompt: 'Hör gut zu! Welche Farbe ist es?', speak: 'Hör gut zu!', listen: say, answer: choice(r, w.de, opts.map((x) => x.de)), tags: ['hören'], solution: sol, solutionVisual: visualOf(w), pronounce: say };
    return { key: `h-${w.en}`, prompt: 'Hör gut zu! Welches Bild passt?', speak: 'Hör gut zu!', listen: say, answer: { ...choice(r, w.e!, opts.map((x) => x.e!)), big: true }, tags: ['hören'], solution: sol, solutionVisual: visualOf(w), pronounce: say };
  }
  if (mode === 'en-de') return { key: `v-${w.en}`, prompt: `Was heißt „${w.en}“ auf Deutsch?`, speak: 'Was heißt das auf Deutsch?', listen: say, answer: choice(r, w.de, pickN(r, others, 3).map((x) => x.de)), tags: ['verstehen'], solution: [`${w.en} heißt auf Deutsch: ${w.de}`], solutionVisual: visualOf(w), pronounce: say };
  return { key: `u-${w.en}`, prompt: `Was heißt „${w.de}“ auf Englisch?`, answer: { ...choice(r, w.en, pickN(r, others, 3).map((x) => x.en)), speakOptions: 'en' }, tags: ['übersetzen'], solution: sol, solutionVisual: visualOf(w), pronounce: say };
}

function vocabSkill(year: 1 | 2, id: string, title: string, icon: string, words: Word[], tips: string[], q: string) {
  return E(year, id, title, icon, { text: [...tips, 'Tipp: Tippe auf den Lautsprecher und sprich jedes Wort laut nach!'], visual: visualOf(words[0]), videoQuery: q }, (r, s) => vocabTask(r, words, year, s), { tagLabels: VTAGS, testSeconds: 15 });
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
];
const BODY: Word[] = [
  { en: 'head', de: 'Kopf', e: '🙂' }, { en: 'eye', de: 'Auge', e: '👁️' }, { en: 'ear', de: 'Ohr', e: '👂' }, { en: 'nose', de: 'Nase', e: '👃' }, { en: 'mouth', de: 'Mund', e: '👄' },
  { en: 'hand', de: 'Hand', e: '✋' }, { en: 'foot', de: 'Fuß', e: '🦶' }, { en: 'leg', de: 'Bein', e: '🦵' }, { en: 'arm', de: 'Arm', e: '💪' }, { en: 'tooth', de: 'Zahn', e: '🦷' }, { en: 'hair', de: 'Haare', e: '💇' },
];
const SCHOOL: Word[] = [
  { en: 'pen', de: 'Stift / Füller', e: '🖊️' }, { en: 'pencil', de: 'Bleistift', e: '✏️' }, { en: 'book', de: 'Buch', e: '📖' }, { en: 'ruler', de: 'Lineal', e: '📏' }, { en: 'scissors', de: 'Schere', e: '✂️' },
  { en: 'school bag', de: 'Schultasche', e: '🎒' }, { en: 'crayon', de: 'Wachsmalstift', e: '🖍️' }, { en: 'chair', de: 'Stuhl', e: '🪑' }, { en: 'teacher', de: 'Lehrer / Lehrerin', e: '🧑‍🏫' }, { en: 'school', de: 'Schule', e: '🏫' },
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
];
const DAYS: Word[] = [
  { en: 'Monday', de: 'Montag', txt: 'Mo' }, { en: 'Tuesday', de: 'Dienstag', txt: 'Di' }, { en: 'Wednesday', de: 'Mittwoch', txt: 'Mi' }, { en: 'Thursday', de: 'Donnerstag', txt: 'Do' },
  { en: 'Friday', de: 'Freitag', txt: 'Fr' }, { en: 'Saturday', de: 'Samstag', txt: 'Sa' }, { en: 'Sunday', de: 'Sonntag', txt: 'So' },
];
const MONTHS: Word[] = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((en, i) => ({ en, de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][i], txt: String(i + 1) + '.' }));
const SEASONS: Word[] = [{ en: 'spring', de: 'Frühling', e: '🌷' }, { en: 'summer', de: 'Sommer', e: '🏖️' }, { en: 'autumn', de: 'Herbst', e: '🍂' }, { en: 'winter', de: 'Winter', e: '⛄' }];
const WEATHER: Word[] = [{ en: 'sunny', de: 'sonnig', e: '☀️' }, { en: 'rainy', de: 'regnerisch', e: '🌧️' }, { en: 'cloudy', de: 'bewölkt', e: '☁️' }, { en: 'windy', de: 'windig', e: '🌬️' }, { en: 'snowy', de: 'verschneit', e: '❄️' }, { en: 'stormy', de: 'stürmisch', e: '⛈️' }, { en: 'hot', de: 'heiß', e: '🥵' }, { en: 'cold', de: 'kalt', e: '🥶' }];
const FEELINGS: Word[] = [{ en: 'happy', de: 'fröhlich', e: '😀' }, { en: 'sad', de: 'traurig', e: '😢' }, { en: 'angry', de: 'wütend', e: '😠' }, { en: 'tired', de: 'müde', e: '😴' }, { en: 'scared', de: 'ängstlich', e: '😱' }, { en: 'hungry', de: 'hungrig', e: '😋' }, { en: 'bored', de: 'gelangweilt', e: '🥱' }, { en: 'surprised', de: 'überrascht', e: '😮' }, { en: 'sick', de: 'krank', e: '🤒' }, { en: 'thirsty', de: 'durstig', e: '🥤' }];
const ACTIONS: Word[] = [
  { en: 'run', de: 'rennen', e: '🏃' }, { en: 'swim', de: 'schwimmen', e: '🏊' }, { en: 'dance', de: 'tanzen', e: '💃' }, { en: 'sing', de: 'singen', e: '🎤' }, { en: 'read', de: 'lesen', e: '📚' },
  { en: 'write', de: 'schreiben', e: '✍️' }, { en: 'sleep', de: 'schlafen', e: '😴' }, { en: 'eat', de: 'essen', e: '🍽️' }, { en: 'play football', de: 'Fußball spielen', e: '⚽' }, { en: 'ride a bike', de: 'Fahrrad fahren', e: '🚴' },
  { en: 'climb', de: 'klettern', e: '🧗' }, { en: 'cook', de: 'kochen', e: '🧑‍🍳' }, { en: 'paint', de: 'malen', e: '🎨' },
];
const HOME: Word[] = [{ en: 'kitchen', de: 'Küche', e: '🍳' }, { en: 'bathroom', de: 'Badezimmer', e: '🛁' }, { en: 'bedroom', de: 'Schlafzimmer', e: '🛏️' }, { en: 'living room', de: 'Wohnzimmer', e: '🛋️' }, { en: 'garden', de: 'Garten', e: '🏡' }, { en: 'house', de: 'Haus', e: '🏠' }, { en: 'door', de: 'Tür', e: '🚪' }, { en: 'window', de: 'Fenster', e: '🪟' }, { en: 'chair', de: 'Stuhl', e: '🪑' }, { en: 'lamp', de: 'Lampe', e: '💡' }];

// ---------- 1. Lernjahr ----------
const colours = vocabSkill(1, 'e1-colours', 'Colours – Farben', '🎨', COLOURS, ['red = rot, blue = blau, green = grün, yellow = gelb.', 'Achtung: purple = lila, pink = rosa, grey = grau.', 'Im Englischen schreibt man Farben klein.'], 'colours song for kids English');
const numbers20 = E(1, 'e1-numbers', 'Numbers 1–20 – Zahlen', '🔢', { text: ['one, two, three, four, five, six, seven, eight, nine, ten', 'eleven, twelve – dann mit -teen: thirteen, fourteen, fifteen … nineteen.', 'twenty = 20.', 'Tipp: Zähle laut auf Englisch, z. B. beim Treppensteigen!'], visual: { kind: 'text', text: '1 one · 2 two · 3 three' }, videoQuery: 'numbers 1 to 20 song for kids' }, (r) => {
  const n = ri(r, 1, 20);
  const say = { text: numEn(n), lang: 'en' as const };
  const near = [n - 1, n + 1, n + 10, n - 10, n + 2].filter((x) => x >= 1 && x <= 20 && x !== n);
  const m = ri(r, 0, 3);
  if (m === 0) return { key: `b${n}`, prompt: 'Wie heißt die Zahl auf Englisch?', visual: { kind: 'text', text: String(n) }, answer: { ...choice(r, numEn(n), near.map(numEn)), speakOptions: 'en' }, tags: [n >= 13 ? 'teen' : 'bis-12'], solution: [`${n} = ${numEn(n)}`], pronounce: say };
  if (m === 1) return { key: `h${n}`, prompt: 'Hör gut zu! Welche Zahl ist es?', speak: 'Hör gut zu!', listen: say, answer: { ...choice(r, String(n), near.map(String)), big: true }, tags: ['hören'], solution: [`${numEn(n)} = ${n}`], pronounce: say };
  if (m === 2 && n <= 12) return { key: `s${n}`, prompt: `Schreibe auf Englisch:\n${n}`, answer: { type: 'text', value: numEn(n), lang: 'en' }, tags: ['schreiben'], solution: [`${n} = ${numEn(n)}`], pronounce: say };
  return { key: `r${n}`, prompt: `Welche Zahl ist „${numEn(n)}“?`, listen: say, answer: { ...choice(r, String(n), near.map(String)), big: true }, tags: [n >= 13 ? 'teen' : 'bis-12'], solution: [`${numEn(n)} = ${n}`], pronounce: say };
}, { tagLabels: { teen: 'Zahlen 13–19 (-teen)', hören: 'Zahlen hören', schreiben: 'Zahlen schreiben' }, testSeconds: 15 });
const animals = vocabSkill(1, 'e1-animals', 'Animals – Tiere', '🐾', ANIMALS, ['dog = Hund, cat = Katze, bird = Vogel, fish = Fisch.', 'Manche Wörter sind fast wie im Deutschen: elephant, tiger, lion (Löwe).'], 'animals vocabulary for kids English');
const family = vocabSkill(1, 'e1-family', 'Family – Familie', '👨‍👩‍👧', FAMILY, ['mum = Mama, dad = Papa, sister = Schwester, brother = Bruder.', 'grandma = Oma, grandpa = Opa.', 'So stellst du jemanden vor: This is my sister.'], 'family members English for kids');
const body = vocabSkill(1, 'e1-body', 'My body – Körper', '🖐️', BODY, ['head = Kopf, eye = Auge, ear = Ohr, nose = Nase, mouth = Mund.', 'Mehrzahl: two eyes, two ears, two hands.', 'Besonders: one foot – two feet, one tooth – two teeth.'], 'head shoulders knees and toes body parts English');
const school = vocabSkill(1, 'e1-school', 'School things – Schulsachen', '🎒', SCHOOL, ['pen, pencil, ruler, book – Dinge in deiner Schultasche (school bag).', 'Frage: What is this? – It\'s a pencil.'], 'classroom objects English for kids');
const food = vocabSkill(1, 'e1-food', 'Food – Essen', '🍎', FOOD, ['apple, banana, bread, milk, cheese …', 'So sagst du, was du magst: I like apples. I don\'t like cheese.'], 'food vocabulary English for kids');
const clothes = vocabSkill(1, 'e1-clothes', 'Clothes – Kleidung', '👕', CLOTHES, ['T-shirt, trousers (Hose), dress (Kleid), shoes, socks.', 'trousers, shoes, socks und gloves benutzt man meistens in der Mehrzahl.'], 'clothes vocabulary English for kids');
const days = vocabSkill(1, 'e1-days', 'Days of the week – Wochentage', '📅', DAYS, ['Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.', 'Wochentage schreibt man im Englischen immer groß!', 'Wednesday spricht man „Wens-day“.'], 'days of the week song');

const PHRASES: { en: string; de: string; sit: string }[] = [
  { en: 'Hello!', de: 'Hallo!', sit: 'Du triffst einen Freund.' }, { en: 'Goodbye!', de: 'Tschüss! / Auf Wiedersehen!', sit: 'Du gehst nach Hause.' },
  { en: 'Good morning!', de: 'Guten Morgen!', sit: 'Es ist früh am Morgen und du kommst in die Klasse.' }, { en: 'Good night!', de: 'Gute Nacht!', sit: 'Du gehst ins Bett.' },
  { en: 'Thank you!', de: 'Danke!', sit: 'Jemand schenkt dir etwas.' }, { en: 'Please.', de: 'Bitte.', sit: 'Du möchtest höflich um etwas bitten.' },
  { en: 'Sorry!', de: 'Entschuldigung!', sit: 'Du hast jemanden aus Versehen angerempelt.' }, { en: 'How are you?', de: 'Wie geht es dir?', sit: 'Du möchtest wissen, wie es jemandem geht.' },
  { en: "I'm fine, thank you.", de: 'Mir geht es gut, danke.', sit: 'Jemand fragt: How are you?' }, { en: "What's your name?", de: 'Wie heißt du?', sit: 'Du möchtest den Namen eines Kindes wissen.' },
  { en: 'My name is Tom.', de: 'Ich heiße Tom.', sit: 'Tom stellt sich vor.' }, { en: 'Happy birthday!', de: 'Alles Gute zum Geburtstag!', sit: 'Deine Freundin hat Geburtstag.' },
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

const clockEn = (h: number, m: number) => (m === 0 ? `${numEn(h)} o'clock` : m === 30 ? `half past ${numEn(h)}` : m === 15 ? `quarter past ${numEn(h)}` : `quarter to ${numEn(h % 12 + 1)}`);
const time = E(2, 'e2-time', "What's the time?", '🕐', { text: ["Volle Stunde: It's three o'clock.", "Halbe Stunde: It's half past three = 3:30.", 'Achtung: Auf Deutsch sagt man „halb vier“, auf Englisch „half past three“ (halb nach drei)!', "Viertel: quarter past three (3:15), quarter to four (3:45)."], visual: { kind: 'clock', h: 3, m: 30 }, videoQuery: "telling the time o'clock half past for kids" }, (r) => {
  const h = ri(r, 1, 12), m = pick(r, [0, 30, 0, 30, 15, 45]);
  const ok = clockEn(h, m);
  const say = { text: `It's ${ok}`, lang: 'en' as const };
  const wrongHalf = m === 30 ? `half past ${numEn(h % 12 + 1)}` : undefined;
  return { key: `${h}:${m}`, prompt: "What's the time?", visual: { kind: 'clock', h, m }, answer: { ...choice(r, ok, [clockEn(h % 12 + 1, m), clockEn(h, (m + 30) % 60), ...(wrongHalf ? [wrongHalf] : []), clockEn(h === 1 ? 12 : h - 1, m)]), speakOptions: 'en' }, tags: [m === 0 ? 'oclock' : m === 30 ? 'half-past' : 'quarter'], traps: wrongHalf ? [{ answer: wrongHalf, tag: 'halb-falle', hint: `Auf Deutsch: halb ${['zwölf', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf'][h % 12 + 1]}. Auf Englisch: half past ${numEn(h)} – „halb nach ${h}“!` }] : [], solution: [`Es ist ${h}:${String(m).padStart(2, '0')} Uhr.`, `It's ${ok}.`], solutionVisual: { kind: 'clock', h, m }, pronounce: say };
}, { tagLabels: { oclock: "o'clock", 'half-past': 'half past', quarter: 'quarter past / to', 'halb-falle': 'half past wie „halb“ verstanden' }, testSeconds: 20 });

const PREPS: { pos: 'in' | 'on' | 'under' | 'next to' | 'behind' | 'in front of'; de: string }[] = [{ pos: 'in', de: 'in' }, { pos: 'on', de: 'auf' }, { pos: 'under', de: 'unter' }, { pos: 'next to', de: 'neben' }, { pos: 'behind', de: 'hinter' }, { pos: 'in front of', de: 'vor' }];
const preps = E(2, 'e2-prepositions', 'Where is the cat?', '📦', { text: ['in = in, on = auf, under = unter.', 'next to = neben, behind = hinter, in front of = vor.', "Where's the cat? – It's under the box."], visual: { kind: 'prep', pos: 'under' }, videoQuery: 'prepositions in on under song for kids' }, (r, s) => {
  const p = pick(r, PREPS);
  const say = { text: `The cat is ${p.pos} the box.`, lang: 'en' as const };
  const tag = `prep-${p.pos.replace(/ /g, '-')}`;
  const sol = [`${p.pos} = ${p.de}`, `The cat is ${p.pos} the box. = Die Katze ist ${p.de} der Kiste.`];
  // Stufe 3: Präposition selbst schreiben
  if (s === 3 && chance(r, 0.5)) return { key: `w-${p.pos}`, prompt: 'Where is the cat? Write the missing word:\nThe cat is ☐ the box.', visual: { kind: 'prep', pos: p.pos }, answer: { type: 'text', value: p.pos, lang: 'en' }, tags: [tag], solution: sol, pronounce: say };
  // Deutsch → Englisch (ohne Bild)
  if (s !== 1 && chance(r, 0.4)) return { key: `de-${p.pos}`, prompt: `Wie sagt man auf Englisch?\n„Die Katze ist ${p.de} der Kiste.“`, answer: { ...choice(r, `The cat is ${p.pos} the box.`, pickN(r, PREPS.filter((x) => x !== p), 3).map((x) => `The cat is ${x.pos} the box.`)), speakOptions: 'en' }, tags: [tag], solution: sol, solutionVisual: { kind: 'prep', pos: p.pos }, pronounce: say };
  return { key: p.pos, prompt: 'Where is the cat?', visual: { kind: 'prep', pos: p.pos }, answer: { ...choice(r, `The cat is ${p.pos} the box.`, PREPS.filter((x) => x !== p).map((x) => `The cat is ${x.pos} the box.`)), speakOptions: 'en' }, tags: [`prep-${p.pos.replace(/ /g, '-')}`], solution: [`${p.pos} = ${p.de}`, `The cat is ${p.pos} the box. = Die Katze ist ${p.de} der Kiste.`], solutionVisual: { kind: 'prep', pos: p.pos }, pronounce: say };
}, { tagLabels: Object.fromEntries(PREPS.map((p) => [`prep-${p.pos.replace(/ /g, '-')}`, p.pos])), testSeconds: 15 });

const AN = [['apple', '🍎'], ['egg', '🥚'], ['elephant', '🐘'], ['orange', '🍊'], ['ice cream', '🍦'], ['umbrella', '☂️'], ['owl', '🦉']];
const A = [['banana', '🍌'], ['cat', '🐱'], ['dog', '🐶'], ['house', '🏠'], ['pencil', '✏️'], ['ball', '⚽'], ['tiger', '🐯']];
const IRREG: [string, string, string][] = [['mouse', 'mice', '🐭'], ['child', 'children', '🧒'], ['foot', 'feet', '🦶'], ['tooth', 'teeth', '🦷'], ['man', 'men', '👨'], ['woman', 'women', '👩'], ['sheep', 'sheep', '🐑']];
const REG: [string, string, string][] = [['cat', 'cats', '🐱'], ['dog', 'dogs', '🐶'], ['book', 'books', '📖'], ['apple', 'apples', '🍎'], ['bus', 'buses', '🚌'], ['box', 'boxes', '📦'], ['baby', 'babies', '👶']];
const grammar1 = E(2, 'e2-a-an-plural', 'a / an and plurals', '🍏', { text: ['Vor Wörtern, die mit a, e, i, o, u anfangen (gesprochen!), steht „an“: an apple, an egg.', 'Sonst steht „a“: a banana, a dog.', 'Mehrzahl meistens mit -s: cat → cats. Nach s, x, sh, ch mit -es: bus → buses.', 'Besondere Mehrzahl: mouse → mice, child → children, foot → feet, tooth → teeth.'], visual: { kind: 'text', text: 'an apple · a banana' }, videoQuery: 'a or an for kids English grammar' }, (r) => {
  const v = ri(r, 0, 2);
  if (v === 0) {
    const an = chance(r, 0.5);
    const [w, e] = pick(r, an ? AN : A);
    return { key: `a-${w}`, prompt: `☐ ${w}`, speak: 'a oder an?', listen: { text: w, lang: 'en' }, visual: { kind: 'emoji', chars: e }, answer: { ...fixedChoice(['a', 'an'], an ? 'an' : 'a'), big: true }, tags: ['a-an'], solution: [an ? `${w} beginnt mit einem Selbstlaut (${w[0]}) → an ${w}` : `${w} beginnt mit einem Mitlaut (${w[0]}) → a ${w}`], pronounce: { text: `${an ? 'an' : 'a'} ${w}`, lang: 'en' } };
  }
  const irr = v === 2;
  const [s, p, e] = pick(r, irr ? IRREG : REG);
  const wrong = [s + 's', s + 'es', p === s ? s + 's' : p + 's', s.replace(/y$/, 'ys')].filter((x) => x !== p && x !== s);
  return { key: `p-${s}`, prompt: `one ${s} – two ☐`, speak: `One ${s}. Two what?`, visual: { kind: 'emoji', chars: `${e}${e}` }, answer: { ...choice(r, p, irr ? [...wrong, s + 'en'] : [...wrong, s + 'en']), speakOptions: 'en' }, tags: [irr ? 'plural-besonders' : 'plural-s'], solution: [`one ${s} – two ${p}`, irr ? 'Das ist eine besondere Mehrzahl – die musst du dir merken.' : s.endsWith('y') ? 'Nach Mitlaut + y wird -ies angehängt.' : /(s|x|sh|ch)$/.test(s) ? 'Nach s, x, sh, ch hängt man -es an.' : 'Meistens hängt man einfach -s an.'], pronounce: { text: `one ${s}, two ${p}`, lang: 'en' } };
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
];
const sentences = E(2, 'e2-sentences', 'Little sentences', '💬', { text: ['I am – you are – he/she/it is – we are – they are.', 'I can swim. I can\'t fly.', 'I like apples. He likes apples (mit -s!).', 'I have got a dog. She has got a cat.'], visual: { kind: 'text', text: 'I am · she is · we are' }, videoQuery: 'verb to be am is are for kids' }, (r) => {
  const b = pick(r, BE);
  const full = b.s.replace('☐', b.ok);
  return { key: b.s, prompt: `Was passt?\n${b.s}`, speak: 'Was passt in die Lücke?', answer: { ...choice(r, b.ok, b.opts), speakOptions: 'en' }, tags: [b.tag], solution: [full, b.why], pronounce: { text: full.replace(/[^\x20-\x7E']/g, '').trim(), lang: 'en' } };
}, { tagLabels: { 'to-be': 'am / is / are', can: "can / can't", like: 'like / likes', 'have-got': 'have got / has got', my: 'my' }, testSeconds: 20 });

export const ENGLISCH: Skill[] = [colours, numbers20, animals, family, body, school, food, clothes, days, phrases, numbers100, months, weather, feelings, actions, home, time, preps, grammar1, sentences];
