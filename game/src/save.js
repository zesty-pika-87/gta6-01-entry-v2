// Save / load: a single localStorage slot holding cash, rank, completed
// missions, owned garage cars and the best combo chain.

const KEY = 'solara-bay-save-v1';

export const DEFAULT_SAVE = {
  cash: 120,
  rank: 1,
  missionsDone: [],
  garage: [],
  upgrades: { engine: 0, armor: 0, tires: 0 },
  bestChain: 0,
  totalEarned: 0,
  playSeconds: 0,
};

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SAVE };
    const data = JSON.parse(raw);
    return { ...DEFAULT_SAVE, ...data };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

export function writeSave(save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Storage full or blocked: the game keeps running, progress just
    // does not persist this session.
  }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
