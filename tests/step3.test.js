// Step 3 checks: the brain is 70 numbers and does the math it claims, and a
// generation of 100 cars runs by the rules, the same way every time.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, buildTrack } from '../src/sim/track.js';
import { makeRng } from '../src/sim/rng.js';
import { UP, DOWN, LEFT, RIGHT } from '../src/sim/car.js';
import { BRAIN_SIZE, INPUTS, HIDDEN, randomBrain, neuron, layer, outputs, think, sigmoid } from '../src/sim/brain.js';
import {
  POPULATION, STALL_STEPS, GENERATION_STEPS,
  createGeneration, randomBrains, stepGeneration, runGeneration, trackProgress, progressPercent, leaderOf,
} from '../src/sim/generation.js';

const track = buildTrack(TRACKS[0]);
const OUTPUT_START = HIDDEN * (INPUTS + 1);

test('the whole brain is 70 numbers, seeded random in -1..1', () => {
  assert.equal(BRAIN_SIZE, 70);
  const a = randomBrain(makeRng(7)), b = randomBrain(makeRng(7)), c = randomBrain(makeRng(8));
  assert.equal(a.length, 70);
  for (const w of a) assert.ok(w >= -1 && w < 1);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
});

test('neuron and layer do exactly: weights times inputs, plus bias, squashed', () => {
  // weights 1, 2, 3 and bias 0.5 on inputs 0.1, 0.2, 0.3: 0.1 + 0.4 + 0.9 + 0.5 = 1.9
  const brain = [1, 2, 3, 0.5, -1, 0, 0, 0];
  assert.equal(neuron([0.1, 0.2, 0.3], brain, 0, (x) => x), 0.1 + 0.4 + 0.9 + 0.5);
  assert.equal(neuron([0.1, 0.2, 0.3], brain, 0, sigmoid), sigmoid(1.9));
  assert.deepEqual(layer([0.1, 0.2, 0.3], brain, 0, 2, (x) => x), [1.9, -0.1]);
});

test('think presses exactly the keys whose output is above 0.5', () => {
  const rand = makeRng(3);
  for (let n = 0; n < 200; n++) {
    const brain = randomBrain(rand);
    const inputs = Array.from({ length: 6 }, () => rand());
    const out = outputs(brain, inputs);
    const expected = (out[0] > 0.5 ? UP : 0) | (out[1] > 0.5 ? DOWN : 0) | (out[2] > 0.5 ? LEFT : 0) | (out[3] > 0.5 ? RIGHT : 0);
    assert.equal(think(brain, inputs), expected);
  }
});

test('a brain that presses nothing is out for stalling after exactly 3 s', () => {
  const zero = new Array(BRAIN_SIZE).fill(0); // every output is sigmoid(0) = 0.5, not above 0.5
  const gen = runGeneration(createGeneration(track, [zero]));
  assert.equal(gen.cars[0].out, 'stall');
  assert.equal(gen.cars[0].outStep, STALL_STEPS);
  assert.equal(gen.cars[0].world.car.x, track.spawn.x);
});

test('a brain that only ever presses gas crashes into the first turn', () => {
  const gasOnly = new Array(BRAIN_SIZE).fill(0);
  gasOnly[OUTPUT_START + HIDDEN] = 5;       // gas bias: always pressed
  for (const k of [1, 2, 3]) gasOnly[OUTPUT_START + k * (HIDDEN + 1) + HIDDEN] = -5; // brake, left, right never
  const gen = runGeneration(createGeneration(track, [gasOnly]));
  assert.equal(gen.cars[0].out, 'crash');
  assert.ok(progressPercent(gen.cars[0].world) > 5);
});

test('generation 1: 100 cars, ends when all are out or at 60 s, same seed gives the same result', () => {
  const run = (seed) => runGeneration(createGeneration(track, randomBrains(makeRng(seed))));
  const a = run(1), b = run(1), c = run(2);
  assert.equal(a.cars.length, POPULATION);
  assert.ok(a.step <= GENERATION_STEPS);
  for (const car of a.cars) assert.ok(['crash', 'stall', 'time'].includes(car.out));
  assert.deepEqual(a.cars.map((x) => [x.out, x.outStep, trackProgress(x.world)]), b.cars.map((x) => [x.out, x.outStep, trackProgress(x.world)]));
  assert.notDeepEqual(a.cars.map((x) => x.outStep), c.cars.map((x) => x.outStep));
});

test('fitness grows as a car drives the right way, and the leader is the fittest car still driving', () => {
  const gasOnly = new Array(BRAIN_SIZE).fill(0);
  gasOnly[OUTPUT_START + HIDDEN] = 5;
  for (const k of [1, 2, 3]) gasOnly[OUTPUT_START + k * (HIDDEN + 1) + HIDDEN] = -5;
  const zero = new Array(BRAIN_SIZE).fill(0);
  const gen = createGeneration(track, [zero, gasOnly]);
  let last = trackProgress(gen.cars[1].world);
  for (let s = 0; s < 60; s++) {
    stepGeneration(gen);
    const f = trackProgress(gen.cars[1].world);
    assert.ok(f >= last, `fitness went down: ${last} -> ${f}`);
    last = f;
  }
  assert.equal(leaderOf(gen), gen.cars[1]);
});
