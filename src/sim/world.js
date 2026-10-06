// One drivable world: a track, the player's car and its lap state.
// The game (or a test in Node) calls stepWorld() once per 1/60 s step with
// the keys held during that step.

import { createCar, stepCar } from './car.js';
import { createLaps, updateLaps } from './laps.js';

export function createWorld(track) {
  const world = { track, step: 0, car: null, laps: null };
  restartWorld(world);
  return world;
}

// Back to the start line: new car, lap timer reset.
export function restartWorld(world) {
  world.car = createCar(world.track.spawn);
  world.laps = createLaps();
}

// Advances the world by exactly one step. Returns this step's events:
// {type: 'lap', steps, inputs, start} and {type: 'crash', x, y}.
export function stepWorld(world, input) {
  const events = [];
  const { car, laps, track } = world;
  const wasCrashed = car.crashed;
  world.step++;

  stepCar(car, car.crashed ? 0 : input, track.walls);
  if (car.crashed) {
    if (!wasCrashed) events.push({ type: 'crash', x: car.crash.x, y: car.crash.y });
    return events;
  }
  const lap = updateLaps(laps, car, input, track);
  if (lap) events.push({ type: 'lap', ...lap });
  return events;
}
