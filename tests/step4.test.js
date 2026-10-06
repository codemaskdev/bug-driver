// Step 4 checks: selection, elitism, mutation and the next generation do what
// they claim, the best can never get worse, and the same seed evolves the same way.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, buildTrack } from '../src/sim/track.js';
import { makeRng } from '../src/sim/rng.js';
import { BRAIN_SIZE, randomBrain } from '../src/sim/brain.js';
import { POPULATION, LAP_BONUS, fitness, trackProgress, createGeneration, randomBrains, stepGeneration } from '../src/sim/generation.js';
import {
  PARENTS, createEvolution, selection, mutate, pickParent, gaussian, runEvolution, ancestors,
} from '../src/sim/evolution.js';

const track = buildTrack(TRACKS[0]);

test('fitness: distance first; a finished lap adds a bonus that is bigger the faster the lap', () => {
  const gen = createGeneration(track, randomBrains(makeRng(1), 3));
  const [a, b, c] = gen.cars;
  assert.equal(fitness(a), trackProgress(a.world)); // no lap: fitness is just how far it got
  b.bestLapSteps = 60 * 20; c.bestLapSteps = 60 * 15;
  assert.equal(fitness(b) - trackProgress(b.world), LAP_BONUS / 20);
  assert.ok(fitness(c) > fitness(b));
});

test('mutate: a copy where about 10% of the 70 numbers moved a little, the rest are identical', () => {
  const rand = makeRng(5);
  const parent = randomBrain(rand);
  let changed = 0, trials = 400, biggest = 0;
  for (let t = 0; t < trials; t++) {
    const child = mutate(parent, rand);
    assert.notEqual(child, parent);
    assert.equal(child.length, BRAIN_SIZE);
    child.forEach((w, i) => { if (w !== parent[i]) { changed++; biggest = Math.max(biggest, Math.abs(w - parent[i])); } });
  }
  const share = changed / (trials * BRAIN_SIZE);
  assert.ok(share > 0.09 && share < 0.11, `share changed ${share}`);
  assert.ok(biggest < 0.3 * 5, `a nudge of ${biggest}`); // a 5-sigma nudge would be suspicious
});

test('gaussian: mean about 0, spread about 1', () => {
  const rand = makeRng(9);
  const xs = Array.from({ length: 20000 }, () => gaussian(rand));
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
  assert.ok(Math.abs(mean) < 0.03 && Math.abs(sd - 1) < 0.03, `mean ${mean}, sd ${sd}`);
});

test('pickParent: weighted by rank, the best picked about 10x as often as the 10th', () => {
  const parents = Array.from({ length: PARENTS }, (_, i) => i);
  const counts = new Array(PARENTS).fill(0);
  const rand = makeRng(11);
  for (let t = 0; t < 55000; t++) counts[pickParent(parents, rand)]++;
  for (let i = 0; i < PARENTS; i++) {
    const expected = 1000 * (PARENTS - i);
    assert.ok(Math.abs(counts[i] - expected) < expected * 0.1, `rank ${i + 1}: ${counts[i]} vs ${expected}`);
  }
});

test('selection and nextGeneration: top 10 ranked, 1 unchanged elite + 99 children of those 10', () => {
  const evo = createEvolution(track, 1);
  runEvolution(evo, 1);
  const prev = evo.history[0];
  // rebuild the ranking of generation 1 from scratch to compare
  const gen1 = createEvolution(track, 1).gen;
  while (!gen1.over) stepGeneration(gen1);
  const top = selection(gen1.cars);
  assert.equal(top.length, PARENTS);
  for (let i = 1; i < top.length; i++) assert.ok(fitness(top[i - 1]) >= fitness(top[i]));
  assert.equal(prev.championId, top[0].id);

  const gen2 = evo.gen;
  assert.equal(gen2.number, 2);
  assert.equal(gen2.cars.length, POPULATION);
  assert.equal(gen2.cars[0].elite, true);
  assert.deepEqual(gen2.cars[0].brain, top[0].brain);
  const topIds = new Set(top.map((c) => c.id));
  for (const c of gen2.cars) assert.ok(topIds.has(c.parentId), `${c.id} has parent ${c.parentId}`);
  assert.deepEqual(ancestors(evo, gen2.cars[5].id), [gen2.cars[5].parentId]);
});

test('elitism: the best fitness never goes down from one generation to the next', () => {
  const evo = runEvolution(createEvolution(track, 2), 12);
  for (let i = 1; i < evo.history.length; i++) {
    assert.ok(evo.history[i].bestFitness >= evo.history[i - 1].bestFitness,
      `gen ${i + 1}: ${evo.history[i].bestFitness} < ${evo.history[i - 1].bestFitness}`);
  }
});

test('same seed, the exact same evolution; a different seed, a different one', () => {
  const a = runEvolution(createEvolution(track, 4), 6);
  const b = runEvolution(createEvolution(track, 4), 6);
  const c = runEvolution(createEvolution(track, 5), 6);
  assert.deepEqual(a.history, b.history);
  assert.deepEqual(a.gen.cars.map((x) => x.brain), b.gen.cars.map((x) => x.brain));
  assert.deepEqual(a.champions, b.champions);
  assert.notDeepEqual(a.history, c.history);
  assert.deepEqual(Object.keys(a.champions), ['1', '5']);
});
