// Step 5 checks: what the brain panels show is exactly what the brain computed,
// saved champions drive their recorded laps again, and the evolution still
// reproduces the recorded runs (looking at a brain changes nothing).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TRACKS, buildTrack } from '../src/sim/track.js';
import { makeRng } from '../src/sim/rng.js';
import { explainThink, outputs, think, tanh, sigmoid } from '../src/sim/brain.js';
import { createEvolution, runEvolution, stepEvolution } from '../src/sim/evolution.js';
import { createGeneration, runGeneration, stepGeneration, fitness } from '../src/sim/generation.js';
import { readSensors, inputsFromView, getInputs } from '../src/sim/sensors.js';

const track = buildTrack(TRACKS[0]);
const json = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url)));
const close = (a, b) => Math.abs(a - b) <= 1e-9;

test('"explain one decision": every number equals what think() computed that step (100 random frames, 1e-9)', () => {
  const evo = createEvolution(track, 3);
  const pick = makeRng(12345); // which frames and cars to check: its own generator, separate from the evolution's
  let checked = 0;
  while (checked < 100) {
    stepEvolution(evo);
    if (pick() > 0.05) continue;
    const alive = evo.gen.cars.filter((c) => !c.out && c.inputs);
    if (!alive.length) continue;
    const c = alive[Math.floor(pick() * alive.length)];
    const ex = explainThink(c.brain, c.inputs);
    // the keys it explains are the keys the car really pressed this step
    assert.equal(ex.keys, c.keys);
    assert.equal(ex.keys, think(c.brain, c.inputs));
    // the final values are the network's outputs
    const out = outputs(c.brain, c.inputs);
    ex.output.forEach((n, k) => assert.ok(close(n.value, out[k]), `output ${k}: ${n.value} vs ${out[k]}`));
    // and every step of the arithmetic adds up, input x weight -> sum -> + bias -> squash
    for (const [layer, squash] of [[ex.hidden, tanh], [ex.output, sigmoid]]) {
      for (const n of layer) {
        let sum = 0;
        for (const t of n.terms) { assert.ok(close(t.product, t.input * t.weight)); sum += t.product; }
        assert.ok(close(n.sum, sum));
        assert.ok(close(n.total, n.sum + n.bias));
        assert.ok(close(n.value, squash(n.total)));
      }
    }
    // the inputs it explains are this car's, and each output neuron is fed by exactly these hidden values
    assert.deepEqual(ex.inputs, c.inputs);
    assert.deepEqual(ex.inputs.slice(0, 5), inputsFromView(c.view, 0).slice(0, 5));
    ex.hidden.forEach((n, h) => assert.ok(close(n.value, ex.output[0].terms[h].input)));
    checked++;
  }
});

test('the eyes the panels draw are the ones the brain used: view and inputs belong to the decision pose', () => {
  const gen = createGeneration(track, [json('champions/seed-3.json').champions['20'].brain]);
  for (let s = 0; s < 400; s++) {
    const before = { ...gen.cars[0].world.car };
    stepGeneration(gen);
    const c = gen.cars[0];
    if (c.out) break;
    // the decision was made at the pose the car had before moving, which the car keeps as prev*
    assert.deepEqual([c.world.car.prevX, c.world.car.prevY, c.world.car.prevAngle], [before.x, before.y, before.angle]);
    assert.deepEqual(c.view, readSensors({ x: before.x, y: before.y, angle: before.angle }, track.walls));
    assert.deepEqual(c.inputs, getInputs(before, track.walls));
  }
});

test('every saved champion, run alone, drives exactly the lap time and fitness recorded during evolution', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const file = json(`champions/seed-${seed}.json`);
    for (const [generation, champ] of Object.entries(file.champions)) {
      const gen = runGeneration(createGeneration(track, [champ.brain]));
      assert.equal(gen.cars[0].bestLapSteps, champ.lapSteps, `seed ${seed} gen ${generation}`);
      assert.equal(fitness(gen.cars[0]), champ.fitness, `seed ${seed} gen ${generation}`);
    }
  }
});

test('the evolution still reproduces the recorded run of seed 3, row for row (first 6 generations)', () => {
  const recorded = json('runs/seed-3.json').history.slice(0, 6);
  const evo = runEvolution(createEvolution(track, 3), 6);
  assert.deepEqual(evo.history, recorded);
});
