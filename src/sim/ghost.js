// Ghost laps: a lap stored as the car's exact starting state plus one input per step.
// Replaying the inputs through the simulation drives exactly the same lap again.

import { createCar, carState } from './car.js';
import { createLaps } from './laps.js';
import { createWorld, stepWorld } from './world.js';
import { PHYSICS_VERSION } from './constants.js';

// One hex digit per step (each input is 4 key bits: 0..15) -> numbers.
export function decodeGhostInputs(text) {
  return Array.from(text, (c) => parseInt(c, 16));
}

// A world set up exactly as it was the moment the ghost's lap started (just over the start line).
export function ghostWorld(track, ghost) {
  if (ghost.physicsVersion !== PHYSICS_VERSION) throw new Error(`ghost is for physics ${ghost.physicsVersion}, the game is ${PHYSICS_VERSION}`);
  if (ghost.track !== track.key) throw new Error(`ghost is for track ${ghost.track}, not ${track.key}`);
  const world = createWorld(track);
  world.car = createCar(ghost.start);
  world.laps = { ...createLaps(), started: true, nextCheckpoint: 1, lapStart: carState(world.car) };
  return world;
}

// Drives the ghost's whole lap headless. Returns {finished, steps}: the lap time it really reproduces.
export function replayGhost(track, ghost) {
  const world = ghostWorld(track, ghost);
  const inputs = decodeGhostInputs(ghost.inputs);
  for (let i = 0; i < inputs.length; i++) {
    for (const e of stepWorld(world, inputs[i])) if (e.type === 'lap') return { finished: true, steps: e.steps, atInput: i + 1 };
    if (world.car.crashed) return { finished: false, steps: i + 1, crashed: true };
  }
  return { finished: false, steps: inputs.length };
}
