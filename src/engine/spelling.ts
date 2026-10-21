// Rechtschreib-Analyse fürs Diktat: Buchstaben-Vergleich und Erkennen typischer Fehlermuster.

export type Seg = { t: 'ok' | 'sub' | 'ins' | 'del'; c: string; g: string };

/** Buchstaben-Abgleich (Levenshtein mit Rückverfolgung): was stimmt, was fehlt, was ist zu viel */
export function align(correct: string, given: string): Seg[] {
  const a = [...correct];
  const b = [...given];
  const D: number[][] = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  const out: Seg[] = [];
  let i = a.length;
  let j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && D[i][j] === D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      out.push({ t: a[i - 1] === b[j - 1] ? 'ok' : 'sub', c: a[i - 1], g: b[j - 1] });
      i--;
      j--;
    } else if (i > 0 && D[i][j] === D[i - 1][j] + 1) {
      out.push({ t: 'del', c: a[i - 1], g: '' });
      i--;
    } else {
      out.push({ t: 'ins', c: '', g: b[j - 1] });
      j--;
    }
  }
  return out.reverse();
}

export interface Rule {
  tag: string;
  label: string;
  hint: string;
  /** richtige Schreibung → typische falsche Schreibungen */
  wrong: (w: string) => string[];
}

/** jede Fundstelle des Musters einzeln ersetzen (je eine Variante pro Stelle) */
const replAll = (w: string, from: RegExp, to: string): string[] => {
  const out: string[] = [];
  const re = new RegExp(from.source, 'g');
  for (let m = re.exec(w); m; m = re.exec(w)) {
    out.push(w.slice(0, m.index) + to + w.slice(m.index + m[0].length));
    if (m[0].length === 0) re.lastIndex++;
  }
  return out;
};
/** einzelnes i (nicht in ei/ie/ai) durch ie ersetzen */
const iToIe = (w: string): string[] => {
  const out: string[] = [];
  for (let i = 0; i < w.length; i++) {
    if (w[i].toLowerCase() !== 'i' || w[i + 1] === 'e' || 'eaEA'.includes(w[i - 1] ?? '')) continue;
    out.push(w.slice(0, i + 1) + 'e' + w.slice(i + 1));
  }
  return out;
};
const sub = (w: string, from: string, to: string): string[] => {
  const out: string[] = [];
  for (let i = w.indexOf(from); i >= 0; i = w.indexOf(from, i + 1)) out.push(w.slice(0, i) + to + w.slice(i + from.length));
  return out;
};
const VOW = 'aeiouäöü';

export const RULES: Rule[] = [
  { tag: 'gross-klein', label: 'Groß- und Kleinschreibung', hint: 'Nomen und Satzanfänge schreibt man groß, alle anderen Wörter klein.', wrong: (w) => (w ? [w[0] === w[0].toUpperCase() ? w[0].toLowerCase() + w.slice(1) : w[0].toUpperCase() + w.slice(1)] : []) },
  { tag: 'ie', label: 'langes i (ie)', hint: 'Ein langes i schreibt man meistens ie: Biene, Wiese, vier.', wrong: (w) => sub(w, 'ie', 'i') },
  { tag: 'i-statt-ie', label: 'ie statt i geschrieben', hint: 'Bei einem kurzen i (oder Merkwörtern wie Tiger, Igel) schreibt man nur i.', wrong: iToIe },
  { tag: 'ck', label: 'ck nach kurzem Vokal', hint: 'Nach einem kurzen Selbstlaut schreibt man ck: Zucker, Jacke.', wrong: (w) => sub(w, 'ck', 'k').concat(sub(w, 'ck', 'kk')) },
  { tag: 'tz', label: 'tz nach kurzem Vokal', hint: 'Nach einem kurzen Selbstlaut schreibt man tz: Katze, Mütze.', wrong: (w) => sub(w, 'tz', 'z').concat(sub(w, 'tz', 'zz')) },
  {
    tag: 'doppel',
    label: 'doppelte Mitlaute',
    hint: 'Nach einem kurzen, betonten Selbstlaut wird der Mitlaut oft verdoppelt: Sonne, Ball, Wasser.',
    wrong: (w) => {
      const out: string[] = [];
      for (let i = 1; i < w.length; i++) if (w[i] === w[i - 1] && !VOW.includes(w[i].toLowerCase()) && w[i] !== 's') out.push(w.slice(0, i) + w.slice(i + 1));
      return out;
    },
  },
  {
    tag: 'dehnungs-h',
    label: 'Dehnungs-h',
    hint: 'Manche Wörter haben ein stummes h nach dem langen Selbstlaut: fahren, Zahl, Uhr. Diese Wörter muss man sich merken.',
    wrong: (w) => {
      const out: string[] = [];
      for (let i = 1; i < w.length; i++) if (w[i] === 'h' && VOW.includes(w[i - 1].toLowerCase()) && w[i - 2] !== 'c') out.push(w.slice(0, i) + w.slice(i + 1));
      return out;
    },
  },
  {
    tag: 'h-zu-viel',
    label: 'h zu viel',
    hint: 'Die meisten Wörter mit langem Selbstlaut haben kein h: Name, Hose, Schule.',
    wrong: (w) => {
      const out: string[] = [];
      for (let i = 1; i < w.length; i++) if (VOW.includes(w[i - 1].toLowerCase()) && !VOW.includes(w[i].toLowerCase()) && w[i] !== 'h') out.push(w.slice(0, i) + 'h' + w.slice(i));
      return out;
    },
  },
  { tag: 'auslaut', label: 'Wortende verlängern (d/t, g/k, b/p)', hint: 'Am Wortende klingen d/t, g/k und b/p gleich. Verlängere das Wort: Hund → Hunde, Zug → Züge.', wrong: (w) => [...replAll(w, /d(?=$|[^a-zäöüß])/, 't'), ...replAll(w, /g(?=$|[^a-zäöüß])/, 'k'), ...replAll(w, /b(?=$|[^a-zäöüß])/, 'p'), ...replAll(w, /t(?=$|[^a-zäöüß])/, 'd')] },
  { tag: 'ae-e', label: 'ä oder e', hint: 'Suche ein verwandtes Wort mit a: Hände kommt von Hand. Gibt es keins, schreibst du e.', wrong: (w) => [...sub(w, 'ä', 'e'), ...sub(w, 'Ä', 'E')] },
  { tag: 'aeu-eu', label: 'äu oder eu', hint: 'Gibt es ein verwandtes Wort mit au, schreibst du äu: Bäume kommt von Baum.', wrong: (w) => [...sub(w, 'äu', 'eu'), ...sub(w, 'eu', 'äu')] },
  { tag: 'umlaut', label: 'Umlaut vergessen', hint: 'Achte auf die Pünktchen: ä, ö, ü klingen anders als a, o, u.', wrong: (w) => [...sub(w, 'ä', 'a'), ...sub(w, 'ö', 'o'), ...sub(w, 'ü', 'u'), ...sub(w, 'Ä', 'A'), ...sub(w, 'Ö', 'O'), ...sub(w, 'Ü', 'U')] },
  { tag: 'ss-sz', label: 's, ss oder ß', hint: 'Nach kurzem Selbstlaut ss (Fluss), nach langem Selbstlaut oder ei/au ß (Straße, heiß), klingt das s weich: s (Hose).', wrong: (w) => [...sub(w, 'ß', 'ss'), ...sub(w, 'ß', 's'), ...sub(w, 'ss', 'ß'), ...sub(w, 'ss', 's')] },
  { tag: 'v-f', label: 'V oder F', hint: 'Manche Wörter schreibt man mit V, obwohl man F hört: Vogel, viel, vier, Vater.', wrong: (w) => [...sub(w, 'V', 'F'), ...sub(w, 'v', 'f')] },
  { tag: 'pf', label: 'pf', hint: 'Sprich deutlich: Apfel, Pferd, Kopf – man hört p und f.', wrong: (w) => [...sub(w, 'pf', 'f'), ...sub(w, 'Pf', 'F')] },
  { tag: 'ei-ie', label: 'ei und ie verwechselt', hint: 'ei klingt wie in „Eis“, ie ist ein langes i wie in „Biene“.', wrong: (w) => [...sub(w, 'ie', 'ei'), ...sub(w, 'ei', 'ie')] },
  { tag: 'sp-st', label: 'Sp und St am Anfang', hint: 'Am Wortanfang hört man „schp“ und „scht“, man schreibt aber Sp und St: Spiel, Stern.', wrong: (w) => [...sub(w, 'Sp', 'Schp'), ...sub(w, 'St', 'Scht'), ...sub(w, 'sp', 'schp'), ...sub(w, 'st', 'scht')] },
];
export const RULE_BY_TAG = Object.fromEntries(RULES.map((r) => [r.tag, r]));
export const SPELL_TAG_LABELS: Record<string, string> = { ...Object.fromEntries(RULES.map((r) => [r.tag, r.label])), 'wort-fehlt': 'Wort vergessen oder zu viel', komma: 'Komma vergessen', sonstige: 'sonstige Rechtschreibfehler' };

/** Welche Fehlermuster erklären die falsche Schreibung eines Wortes? (ein oder zwei Fehler) */
export function wordPatterns(correct: string, given: string): string[] {
  if (correct === given) return [];
  const hits = new Set<string>();
  for (const r of RULES) if (r.wrong(correct).includes(given)) hits.add(r.tag);
  if (hits.size) return [...hits];
  // zwei Fehler auf einmal (z. B. klein geschrieben und ie vergessen)
  for (const r1 of RULES)
    for (const w1 of r1.wrong(correct))
      for (const r2 of RULES) {
        if (r2 === r1) continue;
        if (r2.wrong(w1).includes(given)) {
          hits.add(r1.tag);
          hits.add(r2.tag);
        }
      }
  return hits.size ? [...hits] : ['sonstige'];
}

const words = (s: string) => s.trim().replace(/[.!?]+$/, '').split(/\s+/).filter(Boolean);

export interface Analysis {
  tags: string[];
  /** pro Wort: richtiges Wort, geschriebenes Wort, Abgleich */
  words: { c: string; g: string; segs: Seg[] }[];
}

/** Satz oder Wort analysieren (Wort für Wort, Satzzeichen am Ende zählen nicht) */
export function analyze(correct: string, given: string): Analysis {
  const cw = words(correct);
  const gw = words(given.replace(/[’‘`´]/g, "'"));
  const tags = new Set<string>();
  const out: Analysis['words'] = [];
  if (cw.length === gw.length) {
    cw.forEach((c, i) => {
      const g = gw[i];
      const strip = (x: string) => x.replace(/[,;:]$/, '');
      if (c !== g) wordPatterns(strip(c), strip(g)).forEach((t) => tags.add(t));
      if (/[,;:]$/.test(c) !== /[,;:]$/.test(g)) tags.add('komma');
      out.push({ c, g, segs: align(c, g) });
    });
  } else {
    tags.add('wort-fehlt');
    const segs = align(cw.join(' '), gw.join(' '));
    out.push({ c: cw.join(' '), g: gw.join(' '), segs });
  }
  tags.delete('');
  return { tags: [...tags], words: out };
}

const EXTRA_HINTS: Record<string, string> = {
  komma: 'Denk an das Komma – zum Beispiel vor „dass“, „weil“ oder bei Aufzählungen.',
  'wort-fehlt': 'Hör den Satz noch einmal an und zähle die Wörter mit.',
  sonstige: 'Sprich das Wort langsam und deutlich in Silben mit und schreibe Laut für Laut.',
};
export const spellHint = (tag: string) => RULE_BY_TAG[tag]?.hint ?? EXTRA_HINTS[tag] ?? '';
