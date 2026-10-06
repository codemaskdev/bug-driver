// Step 1 checks: the track is valid, laps count only when they should,
// crashes stop the car, and a recorded lap replays exactly from its inputs.
// Run with: npm test   (or: node --test tests/)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, buildTrack } from '../src/sim/track.js';
import { createWorld, stepWorld, restartWorld } from '../src/sim/world.js';
import { createCar, carState, hitWall, UP, DOWN } from '../src/sim/car.js';
import { createLaps } from '../src/sim/laps.js';
import { segmentHit } from '../src/sim/geometry.js';
import { makeScriptedDriver } from '../tools/scripted-driver.js';

const track = buildTrack(TRACKS[0]);

// Drives `steps` steps with `driver`, collecting every event
function drive(world, driver, steps) {
  const events = [];
  for (let i = 0; i < steps; i++) events.push(...stepWorld(world, driver(world)));
  return events;
}

test('track: walls never cross themselves or each other, the car spawns clear of them', () => {
  const segs = track.walls;
  let crossings = 0;
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      const a = segs[i], b = segs[j];
      // neighbours share an endpoint, that is not a crossing
      if (a.bx === b.ax && a.by === b.ay) continue;
      if (b.bx === a.ax && b.by === a.ay) continue;
      if (segmentHit(a.ax, a.ay, a.bx, a.by, b.ax, b.ay, b.bx, b.by) >= 0) crossings++;
    }
  }
  assert.equal(crossings, 0);
  assert.equal(hitWall(createCar(track.spawn), track.walls), null);
  assert.ok(track.checkpoints.length > 40, `only ${track.checkpoints.length} checkpoints`);
});

test('a full lap in the right direction counts, with a sensible time', () => {
  const world = createWorld(track);
  const laps = drive(world, makeScriptedDriver(track), 60 * 60).filter((e) => e.type === 'lap');
  assert.ok(laps.length >= 3, `only ${laps.length} laps in 60 s`);
  for (const lap of laps) {
    assert.ok(lap.steps > 60 * 8 && lap.steps < 60 * 30, `lap of ${lap.steps} steps`);
    assert.equal(lap.inputs.length, lap.steps);
  }
  assert.equal(world.car.crashed, false);
  assert.equal(world.laps.laps, laps.length);
});

test('driving the whole loop the wrong way never counts a lap', () => {
  const world = createWorld(track);
  world.car.angle += Math.PI; // facing backwards on the start grid
  world.car.prevAngle = world.car.angle;
  let traveled = 0;
  const driver = makeScriptedDriver(track, {}, true);
  for (let i = 0; i < 60 * 60; i++) {
    stepWorld(world, driver(world));
    traveled += Math.hypot(world.car.x - world.car.prevX, world.car.y - world.car.prevY);
  }
  assert.equal(world.car.crashed, false);
  assert.ok(traveled > track.length * 2, `only traveled ${traveled.toFixed(0)} px`);
  assert.equal(world.laps.laps, 0);
  assert.equal(world.laps.started, false);
});

test('starting a lap, then turning back over the line, does not count a lap', () => {
  const world = createWorld(track);
  drive(world, () => UP, 30);                 // over the start line
  assert.equal(world.laps.started, true);
  drive(world, () => DOWN, 90);               // brake and reverse back over it
  assert.ok(world.car.x < track.center[0].x, 'car should be behind the line again');
  drive(world, () => UP, 80);                 // and forward over it again
  assert.ok(world.car.x > track.center[0].x);
  assert.equal(world.laps.laps, 0);
});

test('a shortcut (skipping checkpoints) does not count a lap', () => {
  const world = createWorld(track);
  const driver = makeScriptedDriver(track);
  while (world.laps.nextCheckpoint < 20) stepWorld(world, driver(world));
  // Jump back to the start grid, as if the car had cut straight across the infield
  Object.assign(world.car, createCar(track.spawn), { speed: 200 });
  const before = world.laps.nextCheckpoint;
  drive(world, () => UP, 30);
  assert.ok(world.car.x > track.center[0].x, 'car should be past the finish line');
  assert.equal(world.laps.laps, 0);
  assert.equal(world.laps.nextCheckpoint, before);
});

test('hitting a wall crashes: the car stops dead, stays put, and R restarts', () => {
  const world = createWorld(track);
  const events = drive(world, () => UP, 60 * 10); // flat out, no steering
  const crashes = events.filter((e) => e.type === 'crash');
  assert.equal(crashes.length, 1);
  assert.equal(world.car.crashed, true);
  assert.equal(world.car.speed, 0);
  const { x, y, angle } = world.car;
  drive(world, () => UP, 60);
  assert.deepEqual([world.car.x, world.car.y, world.car.angle], [x, y, angle], 'crashed car moved');
  restartWorld(world);
  assert.equal(world.car.crashed, false);
  assert.deepEqual([world.car.x, world.car.y], [track.spawn.x, track.spawn.y]);
});

test('a recorded lap replays exactly from its start state and inputs (the ghost)', () => {
  const world = createWorld(track);
  const laps = drive(world, makeScriptedDriver(track), 60 * 60).filter((e) => e.type === 'lap');
  const lap = laps[1]; // a flying lap, so the start state has speed and steering in it
  const ghost = createWorld(track);
  ghost.car = createCar(JSON.parse(JSON.stringify(lap.start))); // like loading it from localStorage
  ghost.laps = { ...createLaps(), started: true, nextCheckpoint: 1, lapStart: lap.start };
  let replayed = null;
  for (const input of lap.inputs) {
    for (const e of stepWorld(ghost, input)) if (e.type === 'lap') replayed = e;
  }
  assert.ok(replayed, 'ghost did not finish the lap');
  assert.equal(replayed.steps, lap.steps);
  assert.deepEqual(replayed.inputs, lap.inputs);
  // where the ghost finished = where the real car started its next lap
  assert.deepEqual(carState(ghost.car), laps[2].start, 'ghost ended in a different state');
});

test('same inputs, same result: two runs are identical', () => {
  const a = createWorld(track), b = createWorld(track);
  drive(a, makeScriptedDriver(track), 60 * 30);
  drive(b, makeScriptedDriver(track), 60 * 30);
  assert.deepEqual(a.car, b.car);
  assert.deepEqual(a.laps, b.laps);
});
