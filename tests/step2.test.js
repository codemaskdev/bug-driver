// Step 2 checks: the car's eyes (rays) measure the right distances, and
// looking never changes the simulation.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, buildTrack } from '../src/sim/track.js';
import { createWorld, stepWorld } from '../src/sim/world.js';
import { createCar } from '../src/sim/car.js';
import { castRay, readSensors, getInputs, eyePosition, SENSOR_ANGLES, SENSOR_RANGE } from '../src/sim/sensors.js';
import { makeScriptedDriver } from '../tools/scripted-driver.js';

const track = buildTrack(TRACKS[0]);
const HALF = TRACKS[0].width / 2;
const DEG = Math.PI / 180;

// A car parked on the centerline at sample i, facing along the track, turned by `turn` radians
function carAt(i, turn = 0) {
  const c = track.center[i], t = track.tangents[i];
  return createCar({ x: c.x, y: c.y, angle: Math.atan2(t.y, t.x) + turn });
}

test('castRay: hits a wall at the right distance, and reports 200 when nothing is in range', () => {
  const wall = [{ ax: 100, ay: -200, bx: 100, by: 200 }];
  assert.equal(castRay(0, 0, 0, wall), 100);
  assert.ok(Math.abs(castRay(0, 0, 30 * DEG, wall) - 100 / Math.cos(30 * DEG)) < 1e-9);
  assert.equal(castRay(0, 0, Math.PI, wall), SENSOR_RANGE);
  assert.equal(castRay(0, 0, 0, [{ ax: 300, ay: -50, bx: 300, by: 50 }]), SENSOR_RANGE);
});

test('straight, middle of the road: the side rays are symmetric and match the geometry', () => {
  const i = track.center.findIndex((p) => p.x > 750 && p.y > 600); // bottom straight
  const d = readSensors(carAt(i), track.walls);
  for (const [a, b] of [[0, 4], [1, 3]]) assert.ok(Math.abs(d[a] - d[b]) < 1.5, `left ${d[a]} vs right ${d[b]}`);
  // Each eye sits on the outline; from there the wall, 45 px to the side of the center, is this far along the ray
  for (const k of [0, 1, 3, 4]) {
    const eye = eyePosition(carAt(i), k);
    const side = Math.abs(Math.sin(SENSOR_ANGLES[k]));
    const sideFromCenter = Math.hypot(eye.x - track.center[i].x, eye.y - track.center[i].y) * side;
    const expected = (HALF - sideFromCenter) / side;
    assert.ok(Math.abs(d[k] - expected) < 1.5, `ray ${k}: ${d[k].toFixed(2)} vs expected ${expected.toFixed(2)}`);
  }
  assert.equal(d[2], SENSOR_RANGE); // nothing within 200 px straight ahead
});

test('facing a wall up close: the front ray is small, its input close to 1', () => {
  const i = track.center.findIndex((p) => p.x > 750 && p.y > 600);
  const car = carAt(i, 90 * DEG); // turned right, nose toward the outer wall
  car.y += 10;                    // 10 px closer to it: the wall is 35 px from the center
  const d = readSensors(car, track.walls);
  // the nose is 21 px in front of the center, so 35 - 21 = 14 px is left
  assert.ok(Math.abs(d[2] - 14) < 1, `front ray ${d[2]}`);
  assert.ok(getInputs(car, track.walls)[2] > 0.9);
});

test('getInputs: 6 numbers, all between 0 and 1', () => {
  const world = createWorld(track);
  const driver = makeScriptedDriver(track);
  for (let s = 0; s < 60 * 20; s++) {
    stepWorld(world, driver(world));
    const inputs = getInputs(world.car, track.walls);
    assert.equal(inputs.length, 6);
    for (const v of inputs) assert.ok(v >= 0 && v <= 1, `input ${v}`);
  }
});

// Independent check: walk along the ray in 0.25 px steps until the point leaves the road
// (farther than half the road width from the centerline), with no ray-wall math at all
function marchedDistance(x, y, angle) {
  const n = track.center.length;
  for (let d = 0; d <= SENSOR_RANGE; d += 0.25) {
    const px = x + Math.cos(angle) * d, py = y + Math.sin(angle) * d;
    let near = Infinity;
    for (let k = 0; k < n; k++) {
      const a = track.center[k], b = track.center[(k + 1) % n];
      const vx = b.x - a.x, vy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((px - a.x) * vx + (py - a.y) * vy) / (vx * vx + vy * vy)));
      near = Math.min(near, Math.hypot(px - a.x - vx * t, py - a.y - vy * t));
    }
    if (near > HALF) return d;
  }
  return SENSOR_RANGE;
}

test('during a scripted lap, every ray agrees with an independent walk along it', () => {
  const world = createWorld(track);
  const driver = makeScriptedDriver(track);
  let worst = 0, checked = 0;
  for (let s = 0; s < 1100; s++) {
    stepWorld(world, driver(world));
    if (s % 37) continue;
    const d = readSensors(world.car, track.walls);
    for (let k = 0; k < 5; k++) {
      const eye = eyePosition(world.car, k);
      const m = marchedDistance(eye.x, eye.y, world.car.angle + SENSOR_ANGLES[k]);
      worst = Math.max(worst, Math.abs(m - d[k]));
      checked++;
    }
  }
  assert.ok(checked >= 140);
  assert.ok(worst < 2, `worst disagreement ${worst.toFixed(2)} px`);
});

test('looking changes nothing: a lap with sensors read every step is identical to one without', () => {
  const a = createWorld(track), b = createWorld(track);
  const da = makeScriptedDriver(track), db = makeScriptedDriver(track);
  for (let s = 0; s < 60 * 40; s++) {
    stepWorld(a, da(a));
    const before = JSON.stringify(b.car);
    readSensors(b.car, track.walls);
    getInputs(b.car, track.walls);
    assert.equal(JSON.stringify(b.car), before);
    stepWorld(b, db(b));
  }
  assert.deepEqual(a.car, b.car);
  assert.deepEqual(a.laps, b.laps);
});
