// Runs the evolution headless for one seed and saves what the video needs:
//   champions/seed-N.json  the champions' 70 numbers at generations 1, 5, 10, 20, 40, 80
//   runs/seed-N.json       per-generation stats and the first lap
// Run with: node tools/evolution-report.js <seed> [generations=100]

import { writeFileSync, mkdirSync } from 'node:fs';
import { TRACKS, buildTrack } from '../src/sim/track.js';
import { PHYSICS_VERSION, STEPS_PER_SECOND } from '../src/sim/constants.js';
import { createEvolution, runEvolution } from '../src/sim/evolution.js';

const seed = Number(process.argv[2] ?? 1);
const generations = Number(process.argv[3] ?? 100);
const track = buildTrack(TRACKS[0]);
const root = new URL('../', import.meta.url);

const t0 = performance.now();
const evo = runEvolution(createEvolution(track, seed), generations);
const seconds = (performance.now() - t0) / 1000;

const lapAt = (g) => {
  const row = evo.history[g - 1];
  return row && row.bestLapSteps !== null ? +(row.bestLapSteps / STEPS_PER_SECOND).toFixed(2) : null;
};
const checkpoints = [1, 5, 10, 20, 40, 80, 100].filter((g) => g <= generations);
const summary = {
  seed,
  generations,
  nodeSeconds: +seconds.toFixed(1),
  firstLap: evo.firstLap && { ...evo.firstLap, seconds: +(evo.firstLap.steps / STEPS_PER_SECOND).toFixed(2) },
  bestLapAt: Object.fromEntries(checkpoints.map((g) => [g, lapAt(g)])),
  bestProgressAt: Object.fromEntries(checkpoints.map((g) => [g, +(evo.history[g - 1].bestProgress * 100).toFixed(1)])),
  finishedLapAt: Object.fromEntries(checkpoints.map((g) => [g, evo.history[g - 1].finishedLap])),
};

mkdirSync(new URL('champions/', root), { recursive: true });
mkdirSync(new URL('runs/', root), { recursive: true });
writeFileSync(new URL(`champions/seed-${seed}.json`, root), JSON.stringify({
  seed, physicsVersion: PHYSICS_VERSION, track: track.key,
  note: 'The best car (by fitness) of each fixed generation. brain = its 70 numbers.',
  champions: evo.champions,
}, null, 1) + '\n');
writeFileSync(new URL(`runs/seed-${seed}.json`, root), JSON.stringify({
  ...summary, physicsVersion: PHYSICS_VERSION, track: track.key, history: evo.history,
}, null, 1) + '\n');
console.log(JSON.stringify(summary));
