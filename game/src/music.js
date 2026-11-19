// Generative music: a lazy golden-hour groove sequenced live with
// WebAudio — a warm bass line, soft Rhodes-style chords and a hat tick.
// No samples, no files, everything derived from a seeded chord walk.

import { makeRng } from './random.js';

let ctx = null;
let master = null;
let timer = null;
let step = 0;
let playing = false;
let muted = false;

// A minor-key progression that never resolves too neatly: Am9 – Fmaj7 –
// Cmaj7 – G6, voiced as soft triangle stacks.
const CHORDS = [
  [57, 60, 64, 71],
  [53, 57, 60, 65],
  [55, 59, 62, 67],
  [55, 59, 62, 66],
];
const BASS = [45, 41, 48, 43];
const BPM = 92;

function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

function note(freq, when, dur, type, vol, dest) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(vol, when + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, when + dur);
  osc.connect(g); g.connect(dest);
  osc.start(when); osc.stop(when + dur + 0.05);
}

export function startMusic(audioCtx, masterGain) {
  if (playing) return;
  ctx = audioCtx; master = masterGain;
  if (!ctx || !master) return;
  playing = true;
  const rng = makeRng(77);
  const spb = 60 / BPM / 2; // eighth notes
  const tick = () => {
    if (!playing) return;
    const bar = Math.floor(step / 8) % 4;
    const chord = CHORDS[bar];
    const now = ctx.currentTime + 0.05;
    // Bass on beats 1 and 3, with a little walk on bar 4.
    if (step % 4 === 0) note(midiToFreq(BASS[bar]), now, spb * 3.5, 'sine', 0.16, master);
    if (bar === 3 && step % 8 === 6) note(midiToFreq(BASS[bar] + 7), now, spb, 'sine', 0.12, master);
    // Chord pad on the downbeat.
    if (step % 8 === 0) {
      for (const m of chord) note(midiToFreq(m), now, spb * 7, 'triangle', 0.045, master);
    }
    // Sparse pluck melody, seeded so the tune is the same every session.
    if (rng.next() < 0.34) {
      const m = chord[Math.floor(rng.next() * chord.length)] + 12;
      note(midiToFreq(m), now, spb * 1.6, 'sine', 0.07, master);
    }
    // Hat tick on off-beats.
    if (step % 2 === 1) {
      const len = Math.floor(ctx.sampleRate * 0.03);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 6000;
      const g = ctx.createGain();
      g.gain.value = 0.05;
      src.connect(f); f.connect(g); g.connect(master);
      src.start(now);
    }
    step++;
    timer = setTimeout(tick, spb * 1000);
  };
  tick();
}

export function stopMusic() {
  playing = false;
  if (timer) { clearTimeout(timer); timer = null; }
}

export function setMusicMuted(m) { muted = m; }
export function isMusicMuted() { return muted; }
