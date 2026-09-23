// All sounds are synthesised live with WebAudio: no audio files to download.
let ac = null, master = null, muted = false, noiseBuf = null;

function ctx() {
  if (!ac) {
    ac = new AudioContext();
    master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
const live = () => ac && !muted; // don't create the context outside a user gesture
const noise = () => { const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s; };
const gain = v => { const g = ac.createGain(); g.gain.value = v; return g; };
const filt = (type, f, q = 0.7) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };

export function setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 1, ac.currentTime, 0.05); if (m) stopExhibit(); }

export function tone(f, d = 0.12, type = 'sine', vol = 0.12, when = 0, slide) {
  if (muted) return;
  ctx();
  const t = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(master); o.start(t); o.stop(t + d + 0.02);
}
// Short filtered noise burst: clicks, ticks, key presses
export function click(freq = 2000, dur = 0.015, vol = 0.2, when = 0) {
  if (muted) return;
  ctx();
  const t = ac.currentTime + when, s = noise(), b = filt('bandpass', freq, 1.5), g = gain(0);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(b).connect(g).connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.01);
}
export function whoosh(d = 2.5) {
  if (muted) return;
  ctx();
  const t = ac.currentTime, s = noise(), f = filt('lowpass', 300), g = gain(0);
  f.frequency.setValueAtTime(300, t); f.frequency.linearRampToValueAtTime(900, t + d * 0.6);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.22, t + d * 0.5); g.gain.linearRampToValueAtTime(0, t + d);
  s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + d);
}
export const keyClick = () => { click(3200, 0.012, 0.25); click(900, 0.03, 0.12, 0.012); };

// ---------- Continuous PC fan noise, follows the power level ----------
let fanNode = null, fanLevel = -1;
export function fans(level) {
  if (!live()) return;
  if (!fanNode) {
    const s = noise(), bp = filt('bandpass', 380, 0.6), lp = filt('lowpass', 1400), g = gain(0);
    const hum = ac.createOscillator(); hum.frequency.value = 96; const hg = gain(0);
    s.connect(bp).connect(lp).connect(g).connect(master); hum.connect(hg).connect(master);
    s.start(); hum.start();
    fanNode = { g, hg, bp };
  }
  if (Math.abs(level - fanLevel) < 0.01) return;
  fanLevel = level;
  const t = ac.currentTime;
  fanNode.g.gain.setTargetAtTime(level * 0.09, t, 0.2);
  fanNode.hg.gain.setTargetAtTime(level * 0.004, t, 0.2);
  fanNode.bp.frequency.setTargetAtTime(250 + level * 200, t, 0.3);
}

// ---------- Museum exhibit sounds ----------
let running = null; // { stop() }
export function stopExhibit() { running?.stop(); running = null; }

function loopEvery(ms, fn) { fn(); const id = setInterval(fn, ms); return () => clearInterval(id); }
function sustained(nodes, out) {
  // nodes: started sources; out: final gain. Fade out then stop.
  return () => { const t = ac.currentTime; out.gain.setTargetAtTime(0, t, 0.15); setTimeout(() => nodes.forEach(n => { try { n.stop(); } catch { /* already stopped */ } }), 800); };
}

const SOUNDS = {
  // 7,200 RPM = 120 revolutions a second: that's the pitch of a hard drive's hum
  hdd() {
    const o = ac.createOscillator(), lp = filt('lowpass', 900), g = gain(0);
    o.type = 'sawtooth'; o.frequency.setValueAtTime(20, ac.currentTime); o.frequency.exponentialRampToValueAtTime(120, ac.currentTime + 3);
    g.gain.linearRampToValueAtTime(0.05, ac.currentTime + 1);
    const w = ac.createOscillator(); w.frequency.setValueAtTime(800, ac.currentTime); w.frequency.exponentialRampToValueAtTime(5200, ac.currentTime + 3); const wg = gain(0.004);
    o.connect(lp).connect(g).connect(master); w.connect(wg).connect(g);
    o.start(); w.start();
    const seek = loopEvery(260, () => { if (Math.random() < 0.7) { click(1800 + Math.random() * 1500, 0.012, 0.3); if (Math.random() < 0.5) click(2400, 0.01, 0.2, 0.05); } });
    const fade = sustained([o, w], g);
    return { stop() { seek(); fade(); } };
  },
  // Stepper motor moving the head track by track: the classic floppy "grrrk"
  floppy() {
    const motor = noise(), lp = filt('lowpass', 500), g = gain(0.05);
    motor.connect(lp).connect(g).connect(master); motor.start();
    const steps = loopEvery(900, () => {
      const n = 6 + Math.floor(Math.random() * 18), gap = 0.012 + Math.random() * 0.01;
      for (let i = 0; i < n; i++) click(900 + (i % 3) * 180, 0.008, 0.35, i * gap);
    });
    const fade = sustained([motor], g);
    return { stop() { steps(); fade(); } };
  },
  cd() {
    const o = ac.createOscillator(), g = gain(0);
    o.frequency.setValueAtTime(180, ac.currentTime); o.frequency.exponentialRampToValueAtTime(1500, ac.currentTime + 2.5);
    g.gain.linearRampToValueAtTime(0.02, ac.currentTime + 0.8);
    const s = noise(), hp = filt('bandpass', 2600, 0.8), ng = gain(0.03);
    o.connect(g).connect(master); s.connect(hp).connect(ng).connect(g);
    o.start(); s.start();
    const tick = loopEvery(1400, () => click(1200, 0.02, 0.15));
    const fade = sustained([o, s], g);
    return { stop() { tick(); fade(); } };
  },
  // Mains hum from the tube heaters (60 Hz in the USA, where ENIAC was built)
  hum() {
    const a = ac.createOscillator(), b = ac.createOscillator(), g = gain(0);
    a.frequency.value = 60; b.frequency.value = 120; b.type = 'triangle';
    g.gain.linearRampToValueAtTime(0.05, ac.currentTime + 1.5);
    a.connect(g); b.connect(g); g.connect(master); a.start(); b.start();
    const crackle = loopEvery(300, () => Math.random() < 0.4 && click(4000, 0.004, 0.08));
    const fade = sustained([a, b], g);
    return { stop() { crackle(); fade(); } };
  },
  // An original chiptune on square and triangle waves, like 8-bit consoles made
  chiptune() {
    const lead = [659, 784, 880, 784, 659, 587, 523, 587, 659, 659, 784, 1047, 988, 880, 784, 0];
    const bass = [131, 131, 196, 196, 175, 175, 196, 196];
    const bar = () => {
      const t0 = 0.02;
      lead.forEach((f, i) => f && tone(f, 0.11, 'square', 0.035, t0 + i * 0.125));
      bass.forEach((f, i) => tone(f, 0.22, 'triangle', 0.08, t0 + i * 0.25));
      [0, 0.5, 1, 1.5].forEach(t => click(6000, 0.02, 0.06, t0 + t + 0.25));
    };
    return { stop: loopEvery(2000, bar) };
  },
  typing() {
    return { stop: loopEvery(95, () => Math.random() < 0.75 && keyClick()) };
  },
  chime() { tone(1047, 0.25, 'sine', 0.08); tone(1568, 0.5, 'sine', 0.07, 0.12); return { stop() {} }; },
  usb() { tone(740, 0.14, 'sine', 0.09); tone(1109, 0.25, 'sine', 0.09, 0.13); return { stop() {} }; },
  // Dial-up handshake: dial tone, touch-tone digits, answer tone, then the famous screech
  modem() {
    const t = ac.currentTime, out = gain(0.12); out.connect(master);
    const osc = (f, a, b, type = 'sine', v = 1) => { const o = ac.createOscillator(), g = gain(0); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, t + a); g.gain.linearRampToValueAtTime(v, t + a + 0.01); g.gain.setValueAtTime(v, t + b - 0.01); g.gain.linearRampToValueAtTime(0, t + b); o.connect(g).connect(out); o.start(t + a); o.stop(t + b + 0.05); return o; };
    osc(350, 0, 1.2); osc(440, 0, 1.2);
    const DTMF = { 5: [770, 1336], 1: [697, 1209], 2: [697, 1336], 3: [697, 1477], 4: [770, 1209], 0: [941, 1336] };
    [...'5551234'].forEach((d, i) => { const a = 1.4 + i * 0.16; osc(DTMF[d][0], a, a + 0.1); osc(DTMF[d][1], a, a + 0.1); });
    osc(2100, 3.0, 4.6, 'sine', 0.8);
    for (let i = 0; i < 18; i++) { const a = 4.7 + i * 0.035; osc(i % 2 ? 980 : 1650, a, a + 0.035, 'square', 0.25); }
    osc(1200, 5.4, 5.7, 'sine', 0.6); osc(2400, 5.8, 6.1, 'sine', 0.5);
    const s = noise(), bp = filt('bandpass', 1800, 0.9), ng = gain(0);
    ng.gain.setValueAtTime(0, t + 6.1); ng.gain.linearRampToValueAtTime(0.9, t + 6.3); ng.gain.setValueAtTime(0.9, t + 7.6); ng.gain.linearRampToValueAtTime(0.3, t + 8.4); ng.gain.linearRampToValueAtTime(0, t + 9.5);
    bp.frequency.setValueAtTime(1800, t + 6.1); bp.frequency.linearRampToValueAtTime(2600, t + 7.4);
    s.connect(bp).connect(ng).connect(out); s.start(t + 6.1); s.stop(t + 9.6);
    for (let i = 0; i < 12; i++) osc(1000 + Math.random() * 1800, 6.2 + i * 0.1, 6.28 + i * 0.1, 'sawtooth', 0.15);
    return { stop() { out.gain.setTargetAtTime(0, ac.currentTime, 0.05); } };
  },
};
const EXHIBIT_SOUND = { hdd: 'hdd', floppy8: 'floppy', floppy525: 'floppy', floppy35: 'floppy', cd: 'cd', tube: 'hum', eniac: 'hum', nes: 'chiptune', gameboy: 'chiptune', ibmpc: 'typing', iphone: 'chime', usb: 'usb', modem: 'modem' };

export function exhibit(id, on) {
  stopExhibit();
  if (!on || muted || !EXHIBIT_SOUND[id]) return;
  ctx();
  running = SOUNDS[EXHIBIT_SOUND[id]]();
}
