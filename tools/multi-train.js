// Step 7b, as pre-registered: seed 3, from scratch, 100 generations on Neon Loop + Zigzag + Wide Sweepers.
// Writes champions/seed-3-multi.json (gens 1, 5, 10, 20, 40, 80, 100) and runs/seed-3-multi.json.
// Exam is held out: it's not in the training set and this tool never touches it.
// Run with: node tools/multi-train.js

import { writeFileSync } from 'node:fs';
import { TRACKS, buildTrack } from '../src/sim/track.js';
import { PHYSICS_VERSION, STEPS_PER_SECOND } from '../src/sim/constants.js';
import { createMultiEvolution, stepMultiEvolution } from '../src/sim/multi-evolution.js';

const SEED = 3, GENERATIONS = 100;
const TRAINING = ['neon-loop', 'zigzag', 'wide-sweepers'];
if (TRAINING.includes('exam')) throw new Error('Exam is held out');
const tracks = TRAINING.map((id) => buildTrack(TRACKS.find((t) => t.id === id)));
const root = new URL('../', import.meta.url);

const t0 = performance.now();
const evo = createMultiEvolution(tracks, SEED);
while (evo.history.length < GENERATIONS) {
  const row = stepMultiEvolution(evo);
  const laps = row.perTrack.map((p) => `${p.track} ${p.championLapSteps ? (p.championLapSteps / STEPS_PER_SECOND).toFixed(2) + ' s' : (p.championProgress * 100).toFixed(0) + '%'}`).join(' · ');
  if ([1, 5, 10, 20, 40, 80, 100].includes(row.generation) || row.generation % 10 === 0) console.log(`gen ${row.generation}: best ${row.bestFitness.toFixed(1)} · champion ${row.championId}: ${laps}`);
}
const seconds = (performance.now() - t0) / 1000;
writeFileSync(new URL('champions/seed-3-multi.json', root), JSON.stringify({
  seed: SEED, physicsVersion: PHYSICS_VERSION, training: tracks.map((t) => t.key),
  note: 'Step 7b: trained on Neon Loop + Zigzag + Wide Sweepers, fitness = sum of the three. lapSteps per track; brain = its 70 numbers.',
  champions: evo.champions,
}, null, 1) + '\n');
writeFileSync(new URL('runs/seed-3-multi.json', root), JSON.stringify({ seed: SEED, training: TRAINING, nodeSeconds: +seconds.toFixed(1), history: evo.history }, null, 1) + '\n');
console.log(`done in ${seconds.toFixed(0)} s`);
