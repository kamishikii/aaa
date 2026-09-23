let AC = null;
export function unlock() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); AC.resume?.(); } catch (e) {} }
function tone(f, d, type = 'triangle', v = 0.13, delay = 0) {
  if (!AC) return;
  const t0 = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + d);
  o.connect(g).connect(AC.destination); o.start(t0); o.stop(t0 + d);
}
export function sfx(n) {
  switch (n) {
    case 'collect': tone(520, .08); tone(780, .12, 'triangle', .11, .06); break;
    case 'tick':    tone(230, .03, 'square', .04); break;
    case 'deplete': tone(150, .25, 'sawtooth', .07); break;
    case 'level':   [523, 659, 784, 1046].forEach((f, i) => tone(f, .18, 'triangle', .11, i * .09)); break;
    case 'eat':     tone(300, .06); tone(360, .08, 'sine', .1, .05); break;
    case 'denied':  tone(140, .15, 'square', .07); break;
  }
}
