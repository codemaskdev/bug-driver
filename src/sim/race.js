// Me vs the AI: my ghost lap and one saved champion's best lap, driven at the
// same time on the same track. Cars don't collide. Best lap vs best lap: each
// side starts its best lap exactly where that lap really began.

import { STEPS_PER_SECOND } from './constants.js';
import { createCar, carState } from './car.js';
import { createLaps } from './laps.js';
import { createWorld, stepWorld } from './world.js';
import { getInputs } from './sensors.js';
import { think } from './brain.js';
import { decodeGhostInputs, ghostWorld } from './ghost.js';
import { createGeneration, stepGeneration, trackProgress, STALL_STEPS } from './generation.js';

// A champion's best lap: drive it alone for a whole generation (60 s) and keep its fastest lap,
// with the car's exact state when that lap began. null if it never finished a lap.
export function championBestLap(track, brain) {
  const gen = createGeneration(track, [brain]);
  let best = null;
  while (!gen.over) {
    for (const e of stepGeneration(gen)) if (e.type === 'lap' && (!best || e.steps < best.steps)) best = { steps: e.steps, start: e.start };
  }
  return best;
}

// A world that begins just over the start line, in exactly this state, as if the lap had just started.
function lapStartWorld(track, start) {
  const world = createWorld(track);
  world.car = createCar(start);
  // checkpointsPassed = 1: the start line counts as passed, the same as for a car that drove up to it
  world.laps = { ...createLaps(), started: true, nextCheckpoint: 1, checkpointsPassed: 1, lapStart: carState(world.car) };
  return world;
}

// The race: lane "me" replays my ghost's keys; lane "ai" lets the champion's brain drive.
// champion = {generation, brain}; its best lap is found by driving it, never typed in.
export function createRace(track, ghost, champion) {
  const meWorld = ghostWorld(track, ghost);
  meWorld.laps.checkpointsPassed = 1;
  const me = { name: 'ME', world: meWorld, inputs: decodeGhostInputs(ghost.inputs), finishSteps: null, out: null, progress: [] };

  const bestLap = championBestLap(track, champion.brain);
  const ai = {
    name: `GEN ${champion.generation}`,
    brain: champion.brain,
    bestLap,
    // no lap ever: it starts from the normal start spot and drives until it crashes or stalls
    world: bestLap ? lapStartWorld(track, bestLap.start) : createWorld(track),
    finishSteps: null, out: null, progress: [],
    lastProgress: 0, lastProgressStep: 0,
  };
  return { track, me, ai, step: 0, over: false };
}

// One step of the race (1/60 s) for both cars.
export function stepRace(race) {
  if (race.over) return;
  race.step++;
  const { me, ai } = race;
  if (!me.finishSteps && !me.out) {
    for (const e of stepWorld(me.world, me.inputs[race.step - 1] ?? 0)) if (e.type === 'lap') me.finishSteps = race.step;
    if (me.world.car.crashed) me.out = 'crash';
  }
  if (!ai.finishSteps && !ai.out) {
    const keys = think(ai.brain, getInputs(ai.world.car, race.track.walls));
    for (const e of stepWorld(ai.world, keys)) if (e.type === 'lap') ai.finishSteps = race.step;
    if (ai.world.car.crashed) ai.out = 'crash';
    if (ai.world.laps.checkpointsPassed > ai.lastProgress) { ai.lastProgress = ai.world.laps.checkpointsPassed; ai.lastProgressStep = race.step; }
    if (!ai.out && !ai.finishSteps && race.step - ai.lastProgressStep >= STALL_STEPS) ai.out = 'stall';
  }
  me.progress.push(trackProgress(me.world));
  ai.progress.push(trackProgress(ai.world));
  race.over = (me.finishSteps || me.out) && (ai.finishSteps || ai.out) ? true : false;
}

export function runRace(race) {
  while (!race.over) stepRace(race);
  return race;
}

// Who is ahead right now, and by how much time: when did the leader reach the spot where the other car is now?
export function raceGap(race) {
  const t = race.step;
  if (t === 0) return { ahead: null, seconds: 0 };
  const a = race.me.progress, b = race.ai.progress;
  const pm = a[t - 1], pa = b[t - 1];
  if (pm === pa) return { ahead: null, seconds: 0 };
  const [leader, trailerNow, aheadName] = pm > pa ? [a, pa, 'me'] : [b, pm, 'ai'];
  let reached = leader.findIndex((p) => p >= trailerNow);
  if (reached < 0) reached = t - 1;
  return { ahead: aheadName, seconds: (t - 1 - reached) / STEPS_PER_SECOND };
}

// The final result: who won, by how much, and how the AI got out if it never finished.
export function raceResult(race) {
  const { me, ai } = race;
  if (!race.over) return null;
  if (!ai.finishSteps) return { winner: 'me', by: null, aiOut: ai.out, aiProgress: progressShare(ai), meSteps: me.finishSteps, aiSteps: null };
  const diff = me.finishSteps - ai.finishSteps;
  return { winner: diff > 0 ? 'ai' : diff < 0 ? 'me' : 'tie', by: Math.abs(diff) / STEPS_PER_SECOND, meSteps: me.finishSteps, aiSteps: ai.finishSteps };
}

// How far a lane got, as a share of one lap (the start line counts as the first checkpoint).
export function progressShare(lane) {
  return trackProgress(lane.world) / (lane.world.track.checkpoints.length + 1);
}

