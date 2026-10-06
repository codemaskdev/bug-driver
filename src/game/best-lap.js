// The player's best lap, saved in localStorage: its time, the car's exact state
// when the lap started, and the input of every step. Inputs, not positions:
// replaying them through the simulation drives the same lap again (the ghost).

import { PHYSICS_VERSION } from '../sim/constants.js';

function storageKey(track) {
  return `bug-driver:best:${track.key}:physics-${PHYSICS_VERSION}`;
}

// One hex character per step (each input is 4 key bits: 0..15).
export function encodeInputs(inputs) {
  return inputs.map((i) => i.toString(16)).join('');
}

export function decodeInputs(text) {
  return Array.from(text, (c) => parseInt(c, 16));
}

// {steps, start, inputs} or null. Storage can be missing or blocked, so every access is guarded.
export function loadBestLap(track) {
  try {
    const raw = localStorage.getItem(storageKey(track));
    if (!raw) return null;
    const saved = JSON.parse(raw);
    return { steps: saved.steps, start: saved.start, inputs: decodeInputs(saved.inputs) };
  } catch {
    return null;
  }
}

export function saveBestLap(track, lap) {
  try {
    localStorage.setItem(storageKey(track), JSON.stringify({
      steps: lap.steps, start: lap.start, inputs: encodeInputs(lap.inputs),
    }));
  } catch {
    // no storage: the best lap just lasts until the page is closed
  }
}
