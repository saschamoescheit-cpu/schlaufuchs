import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../engine/rng';
import { DEUTSCH_EXTRA5, ENGLISCH_EXTRA5, MATHE_EXTRA5, ordEn, ordShort } from './extra5';

describe('Ordnungszahlen und Datum (e2-birthday)', () => {
  it('Wörter und Kurzformen stimmen – auch die Ausnahmen', () => {
    expect([1, 2, 3, 4, 5, 8, 9, 12, 20, 21, 22, 23, 30, 31].map(ordEn)).toEqual(['first', 'second', 'third', 'fourth', 'fifth', 'eighth', 'ninth', 'twelfth', 'twentieth', 'twenty-first', 'twenty-second', 'twenty-third', 'thirtieth', 'thirty-first']);
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 24, 31].map(ordShort)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '24th', '31st']);
  });
  it('jede Stufe erzeugt lösbare Aufgaben: richtige Antwort genau einmal unter den Möglichkeiten', () => {
    const s = ENGLISCH_EXTRA5.find((x) => x.id === 'e2-birthday')!;
    expect(s.id).toBe('e2-birthday');
    const r = mulberry32(7);
    for (const stage of [1, 2, 3] as const)
      for (let i = 0; i < 400; i++) {
        const t = s.generate(r, stage);
        expect(t.prompt.length, t.key).toBeGreaterThan(5);
        if (t.answer.type === 'choice') {
          const opts = t.answer.options;
          expect(new Set(opts).size, `${t.key}: ${opts.join('|')}`).toBe(opts.length);
          expect(opts.length, t.key).toBeGreaterThanOrEqual(3);
          expect(t.answer.correct, t.key).toBeGreaterThanOrEqual(0);
          // die Antwort steht nicht schon in der Frage
          expect(t.prompt.includes(opts[t.answer.correct]), `${t.key}: ${t.prompt}`).toBe(false);
        } else expect(t.answer.type).toBe('text');
        if (stage === 1) expect(t.key, 'Stufe 1: nur Plätze bis 5').toMatch(/^[ph]-[1-5]$/);
      }
  });
  it('das gehörte Datum passt zur richtigen Antwort', () => {
    const s = ENGLISCH_EXTRA5.find((x) => x.id === 'e2-birthday')!;
    const r = mulberry32(3);
    let seen = 0;
    for (let i = 0; i < 300; i++) {
      const t = s.generate(r, 2);
      if (!t.key.startsWith('b-') || t.answer.type !== 'choice') continue;
      seen++;
      const [, m, d] = t.key.split('-').map(Number);
      expect(t.answer.options[t.answer.correct]).toMatch(new RegExp(`^${d}\\. `));
      expect(t.listen?.text).toContain(`the ${ordEn(d)} of`);
      expect(m).toBeGreaterThanOrEqual(0);
    }
    expect(seen).toBeGreaterThan(20);
  });
});

describe('Rechendreiecke (m2-rechendreieck)', () => {
  it('Bild und Antwort passen zusammen: außen = Summe der Nachbarn innen, genau ein „?“', () => {
    const s = MATHE_EXTRA5.find((x) => x.id === 'm2-rechendreieck')!;
    const r = mulberry32(11);
    const kinds = new Set<string>();
    for (const stage of [1, 2, 3] as const)
      for (let i = 0; i < 500; i++) {
        const t = s.generate(r, stage);
        const v = t.solutionVisual;
        if (!v || v.kind !== 'triangle' || t.visual?.kind !== 'triangle' || t.answer.type !== 'number') throw new Error(t.key);
        const [a, b, c] = v.inner as number[];
        expect(v.outer, t.key).toEqual([a + b, a + c, b + c]);
        const shown = [...t.visual.inner, ...t.visual.outer];
        expect(shown.filter((x) => x === '?').length, t.key).toBe(1);
        // die gesuchte Zahl steht im Lösungsbild genau dort, wo im Aufgabenbild „?“ war
        const full = [...v.inner, ...v.outer];
        expect(full[shown.indexOf('?')], t.key).toBe(t.answer.value);
        if (stage === 1) expect(t.key.startsWith('a-'), t.key).toBe(true);
        if (stage === 1) expect(Math.max(...(full as number[])), t.key).toBeLessThanOrEqual(20);
        kinds.add(t.key[0]);
      }
    expect([...kinds].sort()).toEqual(['a', 'i', 'k']);
  });
});

describe('Präpositionen (d3-praepositionen)', () => {
  const PREPS = ['in', 'auf', 'unter', 'neben', 'hinter', 'vor', 'zwischen', 'über', 'an', 'mit', 'nach', 'von', 'durch', 'ohne', 'für', 'seit', 'bei', 'zu', 'aus', 'um', 'gegen'];
  it('„finden“: genau eine Präposition im Satz, sie ist die Lösung; Bild-Aufgaben passen zum Bild', () => {
    const s = DEUTSCH_EXTRA5.find((x) => x.id === 'd3-praepositionen')!;
    const r = mulberry32(5);
    const DE: Record<string, string> = { in: 'in', on: 'auf', under: 'unter', 'next to': 'neben', behind: 'hinter', 'in front of': 'vor' };
    const kinds = new Set<string>();
    for (const stage of [1, 2, 3] as const)
      for (let i = 0; i < 300; i++) {
        const t = s.generate(r, stage);
        if (t.answer.type !== 'choice') throw new Error(t.key);
        const ok = t.answer.options[t.answer.correct];
        expect(new Set(t.answer.options).size, t.key).toBe(t.answer.options.length);
        kinds.add(t.key[0]);
        if (t.key.startsWith('f-')) {
          const sentence = t.prompt.split('\n')[1];
          const found = sentence.replace(/[.!?]/g, '').split(' ').filter((w) => PREPS.includes(w.toLowerCase()));
          expect(found, sentence).toEqual([ok]);
          expect(t.answer.options.length, sentence).toBe(4);
        } else {
          if (t.visual?.kind !== 'prep') throw new Error(t.key);
          expect(ok.split(' ')[0], t.key).toBe(DE[t.visual.pos]);
        }
        if (stage === 1) expect(t.key.startsWith('w-'), t.key).toBe(true);
      }
    expect([...kinds].sort()).toEqual(['f', 'l', 'w']);
  });
});

describe('Punkt vor Strich (m4-punkt-vor-strich)', () => {
  // unabhängig nachgerechnet: · → *, : → /, − → -
  const evalText = (x: string) => Function(`return (${x.replace(/·/g, '*').replace(/:/g, '/').replace(/−/g, '-')})`)() as number;
  it('jede Aufgabe: Ergebnis stimmt, ganzzahlig, nicht negativ; der Fehler „von links“ ist eine Falle', () => {
    const s = MATHE_EXTRA5.find((x) => x.id === 'm4-punkt-vor-strich')!;
    const r = mulberry32(9);
    for (const stage of [1, 2, 3] as const)
      for (let i = 0; i < 500; i++) {
        const t = s.generate(r, stage);
        if (t.answer.type === 'number') {
          const text = t.prompt.split('\n')[1].replace(' = ☐', '');
          expect(evalText(text), text).toBe(t.answer.value);
          expect(Number.isInteger(t.answer.value) && t.answer.value >= 0, text).toBe(true);
          for (const trap of t.traps ?? []) expect(Number(trap.answer), text).not.toBe(t.answer.value);
        } else if (t.answer.type === 'choice') {
          const want = Number(/Ergebnis (\d+)/.exec(t.prompt)![1]);
          const hits = t.answer.options.filter((o) => evalText(o) === want);
          expect(hits, t.prompt).toEqual([t.answer.options[t.answer.correct]]);
        }
      }
  });
});

describe('Redewendungen (d4-redewendungen)', () => {
  it('alle Stufen: richtige Antwort einmal, Bedeutung passt zur Wendung', () => {
    const s = DEUTSCH_EXTRA5.find((x) => x.id === 'd4-redewendungen')!;
    const r = mulberry32(4);
    const kinds = new Set<string>();
    for (const stage of [1, 2, 3] as const)
      for (let i = 0; i < 300; i++) {
        const t = s.generate(r, stage);
        if (t.answer.type !== 'choice') throw new Error(t.key);
        // Stufe 1 lässt eine Möglichkeit weg (helpers.ts)
        expect(new Set(t.answer.options).size, t.key).toBe(stage === 1 ? 3 : 4);
        expect(t.solution[0], t.key).toContain(t.answer.options[t.answer.correct]);
        // ähnliche Bedeutungen (nicht verstehen) nie zusammen zur Auswahl
        const SAME = ['ein Brett vor dem Kopf haben', 'nur Bahnhof verstehen', 'auf dem Schlauch stehen', 'etwas gerade überhaupt nicht verstehen', 'gar nichts verstehen', 'etwas gerade nicht kapieren'];
        if (SAME.includes(t.answer.options[t.answer.correct])) expect(t.answer.options.filter((o) => SAME.includes(o)).length, t.key).toBe(1);
        kinds.add(t.key[0]);
      }
    expect([...kinds].sort()).toEqual(['b', 'c', 'r']);
  });
});

describe('Zahlenrätsel (m3-zahlenraetsel)', () => {
  it('die gedachte Zahl ergibt mit den genannten Schritten das Ergebnis; Zahlenraum der Stufe', () => {
    const s = MATHE_EXTRA5.find((x) => x.id === 'm3-zahlenraetsel')!;
    const r = mulberry32(12);
    const step = (x: number, op: string, n: number) => (op === '+' ? x + n : op === '−' ? x - n : op === '·' ? x * n : x / n);
    for (const stage of [1, 2, 3] as const)
      for (let i = 0; i < 400; i++) {
        const t = s.generate(r, stage);
        if (t.answer.type !== 'number' || t.visual?.kind !== 'text') throw new Error(t.key);
        // die Kette im Bild: „? → + 7 → · 2 → 30“
        const parts = t.visual.text.split(' → ');
        const end = Number(parts[parts.length - 1]);
        let x = t.answer.value;
        for (const p of parts.slice(1, -1)) {
          const [op, n] = p.split(' ');
          x = step(x, op, Number(n));
          expect(Number.isInteger(x) && x >= 0 && x <= (stage === 3 ? 1000 : stage === 2 ? 200 : 100), t.key).toBe(true);
        }
        expect(x, t.key).toBe(end);
        expect(parts.length - 2, t.key).toBe(stage);
        expect(t.prompt, t.key).toContain(`Heraus kommt ${end}.`);
      }
  });
});

describe('Wörter mit aa, ee, oo (d3-doppelvokal)', () => {
  it('richtige und falsche Schreibweise unterscheiden sich nur im doppelten Selbstlaut; Stufe 3 schreiben', () => {
    const s = DEUTSCH_EXTRA5.find((x) => x.id === 'd3-doppelvokal')!;
    const r = mulberry32(14);
    for (const stage of [1, 2, 3] as const)
      for (let i = 0; i < 200; i++) {
        const t = s.generate(r, stage);
        if (stage === 3) {
          expect(t.answer.type, t.key).toBe('text');
          continue;
        }
        if (t.answer.type !== 'choice') throw new Error(t.key);
        const ok = t.answer.options[t.answer.correct];
        const wrong = t.answer.options.find((o) => o !== ok)!;
        // aus der doppelten Form wird durch Weglassen eines Selbstlauts die einfache
        const [long, short] = /aa|ee|oo/.test(ok) ? [ok, wrong] : [wrong, ok];
        expect(long.replace(/(aa|ee|oo)/, (m) => m[0]), t.key).toBe(short);
        // Lösungsbild: bei Merkwörtern ist das Paar (aa/ee/oo) markiert
        const v = t.solutionVisual;
        if (v?.kind === 'word' && /aa|ee|oo/.test(ok)) {
          const at = ok.search(/aa|ee|oo/);
          expect(v.mark, t.key).toEqual([[at, at + 2]]);
        }
      }
  });
});

describe('There is / There are (e2-there-is-are)', () => {
  it('Bild und Satz passen: eins → There is a/an, mehr → There are + Zahlwort + Mehrzahl', () => {
    const s = ENGLISCH_EXTRA5.find((x) => x.id === 'e2-there-is-are')!;
    const r = mulberry32(15);
    const NUM = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    for (const stage of [1, 2, 3] as const)
      for (let i = 0; i < 300; i++) {
        const t = s.generate(r, stage);
        if (t.visual?.kind !== 'row') throw new Error(t.key);
        const n = t.visual.items.length;
        const said = t.pronounce!.text;
        if (n === 1) expect(said, t.key).toMatch(/^There is an? [a-z]+\.$/);
        else expect(said, t.key).toMatch(new RegExp(`^There are ${NUM[n]} [a-z]+s\\.$`));
        if (t.answer.type === 'choice') {
          expect(new Set(t.answer.options).size, t.key).toBe(t.answer.options.length);
          if (t.key.startsWith('b-')) expect(t.answer.options[t.answer.correct], t.key).toBe(said);
          else expect(t.answer.options[t.answer.correct], t.key).toBe(n === 1 ? 'There is' : 'There are');
        } else if (t.answer.type === 'text') expect(t.answer.value, t.key).toBe(NUM[n]);
      }
  });
});

describe('Zusammengesetzte Adjektive (d4-adjektive-zusammengesetzt)', () => {
  it('Lösung klein und zusammen; die Antwort steht nicht in der Frage', () => {
    const s = DEUTSCH_EXTRA5.find((x) => x.id === 'd4-adjektive-zusammengesetzt')!;
    const r = mulberry32(16);
    for (const stage of [1, 2, 3] as const)
      for (let i = 0; i < 300; i++) {
        const t = s.generate(r, stage);
        const ok = t.answer.type === 'choice' ? t.answer.options[t.answer.correct] : t.answer.type === 'text' ? t.answer.value : '';
        expect(ok, t.key).toMatch(/^[a-zäöüß]+$/);
        expect(t.prompt.includes(ok), t.key).toBe(false);
        if (t.answer.type === 'choice') expect(new Set(t.answer.options).size, t.key).toBe(t.answer.options.length);
      }
  });
});

describe('Gerade und ungerade (m2-gerade-ungerade)', () => {
  it('Antwort passt zur Zahl, Socken zur Anzahl, Summenregel zur Rechnung', () => {
    const s = MATHE_EXTRA5.find((x) => x.id === 'm2-gerade-ungerade')!;
    const r = mulberry32(17);
    const par = (n: number) => (n % 2 ? 'ungerade' : 'gerade');
    for (const stage of [1, 2, 3] as const)
      for (let i = 0; i < 300; i++) {
        const t = s.generate(r, stage);
        if (t.answer.type !== 'choice') throw new Error(t.key);
        const ok = t.answer.options[t.answer.correct];
        const sum = /\n(\d+) \+ (\d+)$/.exec(t.prompt);
        const one = /^Ist (\d+) gerade/.exec(t.prompt) ?? /Ist (\d+) gerade oder ungerade\?$/.exec(t.prompt);
        const which = /^Welche Zahl ist (gerade|ungerade)\?$/.exec(t.prompt);
        if (sum) expect(ok, t.prompt).toBe(par(Number(sum[1]) + Number(sum[2])));
        else if (which) {
          expect(par(Number(ok)), t.prompt).toBe(which[1]);
          expect(t.answer.options.filter((o) => par(Number(o)) === which[1]), t.prompt).toEqual([ok]);
        } else if (one) expect(ok, t.prompt).toBe(par(Number(one[1])));
        else throw new Error(t.prompt);
        if (t.visual?.kind === 'text') expect([...t.visual.text.matchAll(/👟/gu)].length, t.prompt).toBe(Number(one![1]));
      }
  });
});

describe('Oberbegriffe (d2-oberbegriffe)', () => {
  it('genau eine Antwort passt; „passt nicht“ hat drei Wörter einer Gruppe', () => {
    const s = DEUTSCH_EXTRA5.find((x) => x.id === 'd2-oberbegriffe')!;
    const r = mulberry32(13);
    const kinds = new Set<string>();
    for (const stage of [1, 2, 3] as const)
      for (let i = 0; i < 300; i++) {
        const t = s.generate(r, stage);
        if (t.answer.type !== 'choice') throw new Error(t.key);
        expect(new Set(t.answer.options).size, t.key).toBe(t.answer.options.length);
        expect(t.answer.options.length, t.key).toBeGreaterThanOrEqual(3);
        kinds.add(t.key[0]);
      }
    expect([...kinds].sort()).toEqual(['n', 'o', 'u']);
  });
});
