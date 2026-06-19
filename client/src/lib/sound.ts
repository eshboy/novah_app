let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function play(fn: (c: AudioContext) => void) {
  const c = getCtx();
  if (!c) return;
  try { fn(c); } catch { /* no audio device — silently skip */ }
}

export const sound = {
  tap() {
    play(c => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.08, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.08);
      o.start(); o.stop(c.currentTime + 0.08);
    });
  },

  approve() {
    play(c => {
      [523, 659, 784].forEach((freq, i) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.connect(g); g.connect(c.destination);
        o.type = 'sine';
        o.frequency.value = freq;
        const t = c.currentTime + i * 0.1;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.15, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        o.start(t); o.stop(t + 0.25);
      });
    });
  },

  deny() {
    play(c => {
      [330, 262].forEach((freq, i) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.connect(g); g.connect(c.destination);
        o.type = 'sawtooth';
        o.frequency.value = freq;
        const t = c.currentTime + i * 0.12;
        g.gain.setValueAtTime(0.1, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        o.start(t); o.stop(t + 0.2);
      });
    });
  },

  celebrate() {
    play(c => {
      const notes = [523, 659, 784, 1047, 1319];
      notes.forEach((freq, i) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.connect(g); g.connect(c.destination);
        o.type = 'sine';
        o.frequency.value = freq;
        const t = c.currentTime + i * 0.08;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.18, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        o.start(t); o.stop(t + 0.35);
      });
    });
  },

  alert() {
    play(c => {
      // Three sharp alarm pulses
      [0, 0.22, 0.44].forEach(offset => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.connect(g); g.connect(c.destination);
        o.type = 'square';
        o.frequency.setValueAtTime(880, c.currentTime + offset);
        o.frequency.setValueAtTime(660, c.currentTime + offset + 0.1);
        g.gain.setValueAtTime(0.18, c.currentTime + offset);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + offset + 0.18);
        o.start(c.currentTime + offset);
        o.stop(c.currentTime + offset + 0.18);
      });
    });
  },

  timerDone() {
    play(c => {
      [440, 370].forEach((freq, i) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.connect(g); g.connect(c.destination);
        o.type = 'sine';
        o.frequency.value = freq;
        const t = c.currentTime + i * 0.15;
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        o.start(t); o.stop(t + 0.4);
      });
    });
  },
};
