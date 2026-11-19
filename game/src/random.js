// Deterministic seeded random: every run with the same seed builds the
// same city, the same traffic and the same mission layout.

// mulberry32 — small, fast, good enough for procedural placement.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    range(min, max) { return min + next() * (max - min); },
    int(min, max) { return Math.floor(min + next() * (max - min + 1)); },
    pick(arr) { return arr[Math.floor(next() * arr.length)]; },
    chance(p) { return next() < p; },
    // Deterministic Fisher-Yates shuffle, returns a new array.
    shuffle(arr) {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const t = out[i]; out[i] = out[j]; out[j] = t;
      }
      return out;
    },
  };
}

// Read the seed from the URL (?seed=) or fall back to a fixed default so
// screenshots and replays are reproducible.
export function seedFromUrl() {
  const q = new URLSearchParams(location.search);
  const s = parseInt(q.get('seed') || '', 10);
  return Number.isFinite(s) ? s : 20261119;
}
