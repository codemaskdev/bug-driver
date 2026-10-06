// Keyboard -> one input number per step (the same bits the simulation and the ghost use).

import { UP, DOWN, LEFT, RIGHT } from '../sim/car.js';

const KEYS = {
  ArrowUp: UP, KeyW: UP,
  ArrowDown: DOWN, KeyS: DOWN,
  ArrowLeft: LEFT, KeyA: LEFT,
  ArrowRight: RIGHT, KeyD: RIGHT,
};
const held = new Set();
// Keys that act once per press (R restart, E explain, Tab mode, 1/2/3 speed, B brain, F freeze, N numbers, ← → pick,
// T tracks, Backspace undo in the editor)
const ONCE = new Set(['KeyR', 'KeyE', 'Tab', 'Digit1', 'Digit2', 'Digit3', 'KeyB', 'KeyF', 'KeyN', 'ArrowLeft', 'ArrowRight',
  'ArrowUp', 'ArrowDown', 'KeyS', 'Space', 'Enter', 'Escape', 'KeyT', 'KeyG', 'Backspace', 'Delete']);
const pressed = new Set();

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement) return; // typing a seed is not driving
  if (e.code in KEYS) { held.add(e.code); e.preventDefault(); }
  if (ONCE.has(e.code)) {
    if (e.code === 'Tab' || e.code === 'Space') e.preventDefault(); // don't move focus or scroll the page
    if (!e.repeat) pressed.add(e.code);
  }
});
window.addEventListener('keyup', (e) => held.delete(e.code));
// Switching windows would otherwise leave a key stuck down
window.addEventListener('blur', () => held.clear());

// The keys held right now, as input bits.
export function readInput() {
  let input = 0;
  for (const code of held) input |= KEYS[code];
  return input;
}

// True once per press of `code` (e.g. 'KeyR').
export function takePress(code) {
  const was = pressed.has(code);
  pressed.delete(code);
  return was;
}

// Forget presses nobody has read yet (e.g. a speed key pressed while driving yourself).
export function clearPresses() {
  pressed.clear();
}
