// Solara Bay — every tuning number and colour in one place.
// The city is a fixed 8x8 block grid on a 640x640 metre playfield; the
// renderer scales the view to the window, so no rule depends on screen size.

export const STEP = 1 / 60;

export const CITY = {
  blocks: 8,          // blocks per side
  blockSize: 64,      // metres of buildings per block
  roadWidth: 16,      // metres of road between blocks
  size: 640,          // whole playfield side, metres
  seaAt: 340,         // x beyond this is beach + sea (east edge)
  beachWidth: 36,
};

export const PLAYER = {
  walkSpeed: 7.2,
  runSpeed: 11.5,
  radius: 0.7,
  health: 100,
};

export const CAR = {
  accel: 26,
  brake: 42,
  reverseAccel: 14,
  maxSpeed: 38,
  maxReverse: 12,
  turnRate: 2.1,
  grip: 6.5,
};

export const WANTED = {
  decayPerSec: 0.06,      // stars fall slowly when unseen
  stealCar: 1,
  hitPed: 1,
  hitCop: 2,
  killCop: 1,
  max: 5,
  heliAt: 4,
  roadblockAt: 3,
};

export const PALETTE = {
  skyTop: 0x2e4a7a,
  skyHorizon: 0xffb36b,
  sun: 0xffd9a0,
  sea: 0x1f6f8b,
  sand: 0xe8c98a,
  grass: 0x5d8a4a,
  asphalt: 0x3a3f4a,
  asphaltLine: 0xf2e394,
  sidewalk: 0x9a938a,
  buildingA: 0xf2e3c6,
  buildingB: 0xe8b48a,
  buildingC: 0x8fb8d8,
  buildingD: 0xd87a6a,
  buildingE: 0x7fb08a,
  glass: 0x2c4a66,
  palm: 0x3f7a3a,
  trunk: 0x8a6a4a,
  text: '#f5efe2',
  muted: '#c9bda6',
  gold: '#ffc94d',
  red: '#ff5a4d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

// Money / progression.
export const ECONOMY = {
  startCash: 120,
  missionBase: 350,
  missionPerStar: 150,
  taxiFare: 60,
  collectible: 75,
  carPrice: 900,
};

export const MISSION_NAMES = [
  'First Light',
  'The Broker\'s Errand',
  'Old Sal\'s Debt',
  'Hot Wheels',
  'Harbour Lights',
  'The Long Way Home',
  'Storm Warning',
  'Solara Rising',
];
