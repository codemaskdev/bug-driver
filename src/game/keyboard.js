// Keyboard -> one input number per step (the same bits the simulation and the ghost use).

import { UP, DOWN, LEFT, RIGHT } from '../sim/car.js';

const KEYS = {
  ArrowUp: UP, KeyW: UP,
  ArrowDown: DOWN, KeyS: DOWN,
  ArrowLeft: LEFT, KeyA: LEFT,
  ArrowRight: RIGHT, KeyD: RIGHT,
};
const held = new Set();
let restartAsked = false;

window.addEventListener('keydown', (e) => {
  if (e.code in KEYS) { held.add(e.code); e.preventDefault(); }
  if (e.code === 'KeyR' && !e.repeat) restartAsked = true;
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

// True once per R press.
export function takeRestart() {
  const asked = restartAsked;
  restartAsked = false;
  return asked;
}
