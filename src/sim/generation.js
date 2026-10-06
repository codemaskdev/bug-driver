// A generation: 100 cars, each with its own brain, all starting together.
// Cars don't collide with each other, only with walls. A car is out when it
// crashes or stops making progress; the generation ends when every car is
// out, or after 60 seconds.

import { STEPS_PER_SECOND } from './constants.js';
import { createWorld, stepWorld } from './world.js';
import { readSensors, inputsFromView } from './sensors.js';
import { think, randomBrain } from './brain.js';

export const POPULATION = 100;
export const STALL_STEPS = 3 * STEPS_PER_SECOND;        // out after 3 s without a new checkpoint
export const GENERATION_STEPS = 60 * STEPS_PER_SECOND;  // a generation lasts at most 60 s
export const LAP_BONUS = 6000;                          // a finished lap adds 6000 / (lap time in seconds) to fitness

// Generation 1: 100 brains made of seeded random numbers.
export function randomBrains(rand, count = POPULATION) {
  return Array.from({ length: count }, () => randomBrain(rand));
}

// `family[i]` = {parentId, elite} for car i (generation 1 has no parents).
export function createGeneration(track, brains, number = 1, family = []) {
  return {
    number,
    track,
    step: 0,
    over: false,
    cars: brains.map((brain, i) => ({
      id: `${number}-${i}`,      // "generation-index", e.g. "12-0"
      parentId: family[i]?.parentId ?? null,
      elite: family[i]?.elite ?? false,
      brain,
      bestLapSteps: null,        // its fastest completed lap, in steps
      world: createWorld(track), // each car drives in its own world: no car-to-car collisions
      out: null,                 // null while driving, then 'crash', 'stall' or 'time'
      outStep: 0,
      lastProgressStep: 0,       // when it last passed a new checkpoint
      progressSeen: 0,
      // its last decision, kept so the brain panels can show exactly what was computed:
      view: null,                // the 5 distances (px) it saw
      inputs: null,              // the 6 numbers its brain got
      keys: 0,                   // the keys its brain pressed
    })),
  };
}

// How far a car got along the track: checkpoints passed in the right order, plus the fraction of the way to the next one.
export function trackProgress(world) {
  const { car, laps, track } = world;
  const cps = track.checkpoints;
  const next = cps[laps.nextCheckpoint];
  const prev = cps[(laps.nextCheckpoint - 1 + cps.length) % cps.length];
  const gap = (next.dist - prev.dist + track.length) % track.length;
  // how far the car still is from the next checkpoint, measured along the track
  const midX = (next.ax + next.bx) / 2, midY = (next.ay + next.by) / 2;
  const ahead = (midX - car.x) * next.tx + (midY - car.y) * next.ty;
  const near = Math.hypot(midX - car.x, midY - car.y) < gap + track.width; // not some other part of the track
  const fraction = near ? Math.max(0, Math.min(1, 1 - ahead / gap)) : 0;
  return laps.checkpointsPassed + fraction;
}

// How good a car was: go as far as you can; if you finish a lap, finish fast (a bonus that grows as the lap time shrinks).
export function fitness(car) {
  let score = trackProgress(car.world);
  if (car.bestLapSteps !== null) {
    const lapSeconds = car.bestLapSteps / STEPS_PER_SECOND;
    score += LAP_BONUS / lapSeconds;
  }
  return score;
}

// Fitness as a share of one lap. A full lap is the start line plus every checkpoint plus the start line again.
export function progressPercent(world) {
  return (trackProgress(world) / (world.track.checkpoints.length + 1)) * 100;
}

// Advances every car that's still driving by one step (1/60 s): look, think, press keys, move.
export function stepGeneration(gen) {
  if (gen.over) return [];
  gen.step++;
  const events = [];
  let driving = 0;
  for (let index = 0; index < gen.cars.length; index++) {
    const c = gen.cars[index];
    if (c.out) continue;
    c.view = readSensors(c.world.car, gen.track.walls);
    c.inputs = inputsFromView(c.view, c.world.car.speed);
    c.keys = think(c.brain, c.inputs);
    const happened = stepWorld(c.world, c.keys);
    for (const e of happened) {
      if (e.type === 'lap' && (c.bestLapSteps === null || e.steps < c.bestLapSteps)) c.bestLapSteps = e.steps;
      events.push({ ...e, index });
    }
    if (c.world.laps.checkpointsPassed > c.progressSeen) {
      c.progressSeen = c.world.laps.checkpointsPassed;
      c.lastProgressStep = gen.step;
    }
    if (c.world.car.crashed) c.out = 'crash';
    else if (gen.step - c.lastProgressStep >= STALL_STEPS) c.out = 'stall';
    else if (gen.step >= GENERATION_STEPS) c.out = 'time';
    if (c.out) c.outStep = gen.step;
    else driving++;
  }
  if (driving === 0) gen.over = true;
  return events;
}

export function aliveCount(gen) {
  return gen.cars.filter((c) => !c.out).length;
}

// The car to watch: the one with the highest fitness that's still driving (or the best overall once all are out).
export function leaderOf(gen) {
  let best = null, bestFit = -Infinity;
  const anyAlive = gen.cars.some((c) => !c.out);
  for (const c of gen.cars) {
    if (anyAlive && c.out) continue;
    const f = fitness(c);
    if (f > bestFit) { bestFit = f; best = c; }
  }
  return best;
}

// Runs a whole generation headless, as fast as possible.
export function runGeneration(gen) {
  while (!gen.over) stepGeneration(gen);
  return gen;
}
