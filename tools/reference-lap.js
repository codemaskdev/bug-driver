// What does a decent lap time look like? Runs the scripted test driver with
// many settings (headless, no rendering) and prints the fastest clean lap.
// Run with: node tools/reference-lap.js

import { TRACKS, buildTrack } from '../src/sim/track.js';
import { createWorld, stepWorld } from '../src/sim/world.js';
import { makeScriptedDriver, DEFAULT_DRIVER } from './scripted-driver.js';
import { STEPS_PER_SECOND } from '../src/sim/constants.js';

const track = buildTrack(TRACKS[0]);

// Drives 60 s; returns the lap times in steps, or null if the driver crashed
function run(params) {
  const world = createWorld(track);
  const driver = makeScriptedDriver(track, params);
  const laps = [];
  for (let i = 0; i < 60 * STEPS_PER_SECOND; i++) {
    for (const e of stepWorld(world, driver(world))) if (e.type === 'lap') laps.push(e.steps);
    if (world.car.crashed) return null;
  }
  return laps;
}

const seconds = (steps) => (steps / STEPS_PER_SECOND).toFixed(2) + ' s';

const careful = run({});
console.log(`careful driver (default settings): best lap ${seconds(Math.min(...careful))}`, DEFAULT_DRIVER);

let best = null, tried = 0, crashed = 0;
for (const lookahead of [32, 48, 64, 80, 96, 112, 128])
  for (const previewDist of [30, 45, 60, 90, 120])
    for (const margin of [0.8, 1.0, 1.2, 1.3, 1.4, 1.5, 1.7])
      for (const deadband of [0.02, 0.04, 0.08, 0.12]) {
        tried++;
        const laps = run({ lookahead, previewDist, margin, deadband });
        if (!laps) { crashed++; continue; }
        const lap = Math.min(...laps);
        if (laps.length && (!best || lap < best.lap)) best = { lap, lookahead, previewDist, margin, deadband };
      }
console.log(`tried ${tried} settings, ${crashed} crashed`);
console.log(`fastest scripted lap: ${seconds(best.lap)} (${best.lap} steps)`, best);
console.log(`flat out with no corners at all would be ${seconds(Math.round(track.length / 330 * STEPS_PER_SECOND))} (track length ${track.length.toFixed(0)} px)`);
