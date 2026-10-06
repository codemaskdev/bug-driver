// The car's eyes: 5 distance sensors (rays) fanned out in front of it.
// Read-only: looking never changes the car, the physics or the ghost.

import { CAR } from './car.js';
import { segmentHit } from './geometry.js';

const DEG = Math.PI / 180;
// Where each eye looks, relative to the heading. Negative = left, positive = right.
export const SENSOR_ANGLES = [-60 * DEG, -30 * DEG, 0, 30 * DEG, 60 * DEG];
export const SENSOR_LABELS = ['left 60°', 'left 30°', 'ahead', 'right 30°', 'right 60°'];
export const SENSOR_RANGE = 200; // px: farther than this, an eye sees nothing

// Each eye sits on the car's outline (the hitbox), so a distance of 0 means the wall touches the car.
const EYE_OFFSETS = SENSOR_ANGLES.map((a) => edgeDistance(Math.cos(a), Math.sin(a)));

// How far can the car see in one direction: distance from (x, y) to the nearest wall along `angle`, up to `range`.
export function castRay(x, y, angle, walls, range = SENSOR_RANGE) {
  const ex = x + Math.cos(angle) * range, ey = y + Math.sin(angle) * range;
  const minX = Math.min(x, ex), maxX = Math.max(x, ex), minY = Math.min(y, ey), maxY = Math.max(y, ey);
  let nearest = 1; // as a share of the ray's length
  for (const w of walls) {
    if (Math.max(w.ax, w.bx) < minX || Math.min(w.ax, w.bx) > maxX) continue;
    if (Math.max(w.ay, w.by) < minY || Math.min(w.ay, w.by) > maxY) continue;
    const t = segmentHit(x, y, ex, ey, w.ax, w.ay, w.bx, w.by);
    if (t >= 0 && t < nearest) nearest = t;
  }
  return nearest * range;
}

// The car's whole view of the world: 5 numbers, the distance in px each eye sees (200 = nothing in range).
export function readSensors(car, walls) {
  return SENSOR_ANGLES.map((a, i) => {
    const angle = car.angle + a;
    const eye = eyePosition(car, i);
    return castRay(eye.x, eye.y, angle, walls);
  });
}

// Where eye number i sits on the car's outline, in world coordinates.
export function eyePosition(car, i) {
  const angle = car.angle + SENSOR_ANGLES[i];
  return { x: car.x + Math.cos(angle) * EYE_OFFSETS[i], y: car.y + Math.sin(angle) * EYE_OFFSETS[i] };
}

// The brain's input: the only 6 numbers the car will ever know.
// 5 eyes, each 0..1 (1 = wall touching the car, 0 = nothing in range), then speed 0..1 (reversing counts as 0).
export function getInputs(car, walls) {
  return inputsFromView(readSensors(car, walls), car.speed);
}

// The same 6 numbers, from 5 distances already measured with readSensors() and the car's speed.
export function inputsFromView(distances, speed) {
  const inputs = [];
  for (const distance of distances) {
    inputs.push(1 - distance / SENSOR_RANGE);
  }
  const speedShare = speed / CAR.maxSpeed;
  inputs.push(Math.max(0, Math.min(1, speedShare)));
  return inputs;
}

// Distance from the car's center to its hitbox outline in direction (dx, dy), in the car's own frame.
function edgeDistance(dx, dy) {
  const pts = CAR.hitbox;
  let best = 0;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
    const t = segmentHit(0, 0, dx * 100, dy * 100, ax, ay, bx, by);
    if (t >= 0) best = Math.max(best, t * 100);
  }
  return best;
}
