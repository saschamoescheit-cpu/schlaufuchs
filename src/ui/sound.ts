// Kurze Töne für richtig/falsch/fertig (ohne Audiodateien).
let ctx: AudioContext | null = null;

function tone(freqs: number[], dur = 0.12, type: OscillatorType = 'sine', gap = 0.09, vol = 0.12) {
  try {
    ctx ??= new AudioContext();
    const t0 = ctx.currentTime;
    freqs.forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = type;
      o.frequency.value = f;
      const s = t0 + i * gap;
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(vol, s + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
      o.connect(g).connect(ctx!.destination);
      o.start(s);
      o.stop(s + dur + 0.02);
    });
  } catch {
    /* kein Ton möglich */
  }
}

export const sounds = {
  right: () => tone([660, 880], 0.16, 'sine', 0.1),
  wrong: () => tone([300, 240], 0.2, 'triangle', 0.14, 0.09),
  done: () => tone([523, 659, 784, 1046], 0.22, 'sine', 0.12),
  tick: () => tone([880], 0.05, 'square', 0, 0.03),
};
