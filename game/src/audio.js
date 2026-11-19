// Procedural WebAudio sound effects — every sound is synthesised, no
// audio files, no network. Created lazily on first user gesture.

let ctx = null;
let master = null;
let muted = false;
let engineOsc = null;
let engineGain = null;
let sirenOn = false;
let sirenNodes = null;

export function ensureAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  } catch { ctx = null; }
}

export function getAudio() { return { ctx, master }; }

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.5;
}

function tone(freq, dur, type, vol, slideTo) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
  g.gain.setValueAtTime(vol || 0.2, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g); g.connect(master);
  osc.start(t); osc.stop(t + dur + 0.02);
}

function noiseBurst(dur, vol, lowpass) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = lowpass || 1200;
  const g = ctx.createGain();
  g.gain.value = vol || 0.3;
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t);
}

export const sfx = {
  click() { tone(880, 0.06, 'square', 0.12); },
  coin() { tone(1320, 0.09, 'sine', 0.18); setTimeout(() => tone(1760, 0.12, 'sine', 0.18), 70); },
  punch() { noiseBurst(0.12, 0.35, 900); tone(160, 0.1, 'triangle', 0.25, 60); },
  shoot() { noiseBurst(0.09, 0.3, 3000); tone(220, 0.08, 'square', 0.15, 90); },
  crash() { noiseBurst(0.25, 0.5, 700); tone(90, 0.25, 'sawtooth', 0.25, 40); },
  horn() { tone(370, 0.25, 'square', 0.12); tone(466, 0.25, 'square', 0.1); },
  door() { tone(300, 0.08, 'triangle', 0.15, 180); noiseBurst(0.06, 0.12, 800); },
  missionStart() { [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.14, 'triangle', 0.2), i * 90)); },
  missionDone() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.22), i * 100)); },
  wantedUp() { tone(220, 0.3, 'sawtooth', 0.2, 440); },
  wantedDown() { tone(440, 0.3, 'sawtooth', 0.15, 220); },
  pickup() { tone(990, 0.1, 'sine', 0.18, 1320); },
  checkpoint() { tone(784, 0.12, 'sine', 0.2); setTimeout(() => tone(1047, 0.16, 'sine', 0.2), 90); },
};

// Continuous engine hum whose pitch follows speed; call every frame.
export function engineSound(speed01, on) {
  if (!ctx || muted) return;
  if (!on) {
    if (engineOsc) { try { engineOsc.stop(); } catch { /* already stopped */ } engineOsc = null; engineGain = null; }
    return;
  }
  if (!engineOsc) {
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineGain = ctx.createGain();
    engineGain.gain.value = 0.05;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 500;
    engineOsc.connect(f); f.connect(engineGain); engineGain.connect(master);
    engineOsc.start();
  }
  engineOsc.frequency.setTargetAtTime(60 + speed01 * 160, ctx.currentTime, 0.08);
  engineGain.gain.setTargetAtTime(0.03 + speed01 * 0.05, ctx.currentTime, 0.1);
}

// Two-tone police siren, toggled by the wanted level.
export function sirenSound(on) {
  if (!ctx || muted) { sirenOn = false; return; }
  if (on === sirenOn) return;
  sirenOn = on;
  if (!on) {
    if (sirenNodes) { sirenNodes.osc.stop(); sirenNodes = null; }
    return;
  }
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  const g = ctx.createGain();
  g.gain.value = 0.045;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.7;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 220;
  lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
  osc.frequency.value = 880;
  osc.connect(g); g.connect(master);
  osc.start(); lfo.start();
  sirenNodes = { osc, lfo };
}
