// Step 7b checks: multi-track training does exactly what was pre-registered (every car drives all
// three training tracks, fitness = the sum), Exam is never part of it, and the saved champions
// drive their recorded laps again.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { TRACKS, buildTrack } from '../src/sim/track.js';
import { fitness, createGeneration, runGeneration } from '../src/sim/generation.js';
import { createMultiEvolution, runMultiGeneration, stepMultiEvolution } from '../src/sim/multi-evolution.js';

const TRAINING = ['neon-loop', 'zigzag', 'wide-sweepers'];
const tracks = TRAINING.map((id) => buildTrack(TRACKS.find((t) => t.id === id)));

test('fitness is the sum of the three single-track fitness scores, and Exam is not a training track', () => {
  const evo = createMultiEvolution(tracks, 3);
  const cars = runMultiGeneration(evo);
  for (const c of cars) assert.equal(c.fitness, c.perTrack.reduce((s, x) => s + fitness(x), 0));
  assert.deepEqual(evo.tracks.map((t) => t.id), TRAINING);
});

test('same seed, same multi-track evolution (first 3 generations, twice)', () => {
  const run = () => { const evo = createMultiEvolution(tracks, 3); for (let g = 0; g < 3; g++) stepMultiEvolution(evo); return evo; };
  const a = run(), b = run();
  assert.deepEqual(a.history, b.history);
  assert.deepEqual(a.brains, b.brains);
});

const file = new URL('../champions/seed-3-multi.json', import.meta.url);
test('every saved multi-track champion, alone, drives exactly its recorded lap on each training track', { skip: !existsSync(file) }, () => {
  const champions = JSON.parse(readFileSync(file)).champions;
  assert.deepEqual(Object.keys(champions), ['1', '5', '10', '20', '40', '80', '100']);
  for (const [generation, champ] of Object.entries(champions)) {
    assert.deepEqual(Object.keys(champ.lapSteps), TRAINING);
    let sum = 0;
    tracks.forEach((t) => {
      const car = runGeneration(createGeneration(t, [champ.brain])).cars[0];
      assert.equal(car.bestLapSteps, champ.lapSteps[t.id], `gen ${generation} on ${t.id}`);
      sum += fitness(car);
    });
    assert.ok(Math.abs(sum - champ.fitness) < 1e-9, `gen ${generation} fitness ${sum} vs ${champ.fitness}`);
  }
});
