// Keyboard + pointer input, polled once per frame. No mouse-look aiming:
// the camera follows behind the player/car, GTA-style third person.

export const KEYS = {
  up: false, down: false, left: false, right: false,
  run: false, action: false, punch: false, shoot: false,
  horn: false, pause: false, map: false,
};

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
  KeyE: 'action',
  KeyF: 'punch',
  Space: 'shoot',
  KeyH: 'horn',
  KeyP: 'pause', Escape: 'pause',
  KeyM: 'map',
};

// Edge-triggered presses (true only on the frame the key went down).
const pressed = {};
const justPressed = {};

export function initInput() {
  window.addEventListener('keydown', (e) => {
    const k = KEYMAP[e.code];
    if (!k) return;
    if (!KEYS[k]) justPressed[k] = true;
    KEYS[k] = true;
    pressed[k] = true;
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    const k = KEYMAP[e.code];
    if (!k) return;
    KEYS[k] = false;
    pressed[k] = false;
  });
  window.addEventListener('blur', () => {
    for (const k of Object.keys(KEYS)) KEYS[k] = false;
  });
}

// Call at the end of each frame so just-pressed flags last one frame.
export function endFrameInput() {
  for (const k of Object.keys(justPressed)) justPressed[k] = false;
}

export function wasPressed(name) { return !!justPressed[name]; }
export function isDown(name) { return !!pressed[name]; }
