// A hand-written test driver (not AI): it follows the track's centerline
// and slows down before curves. It presses the same keys a player can
// (arrows), one input per step. Used by the tests and to get a reference
// lap time for a "decent" lap.

import { UP, DOWN, LEFT, RIGHT, CAR, steeringGrip } from '../src/sim/car.js';
import { wrapAngle } from '../src/sim/geometry.js';

export const DEFAULT_DRIVER = {
  lookahead: 40,   // px ahead on the centerline to aim at
  previewDist: 120,// px ahead to look for curves when choosing a speed
  margin: 0.8,     // use this share of the car's real turning ability
  deadband: 0.04,  // rad: don't touch the steering for smaller errors
};

// Returns a function world -> input. `reverse` drives the loop the wrong way round.
export function makeScriptedDriver(track, params = {}, reverse = false) {
  const p = { ...DEFAULT_DRIVER, ...params };
  const pts = reverse ? [...track.center].reverse() : track.center;
  const n = pts.length;
  const spacing = track.length / n;

  // How tightly the centerline bends at each sample (radians per px)
  const bend = pts.map((_, i) => {
    const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n];
    const h1 = Math.atan2(b.y - a.y, b.x - a.x), h2 = Math.atan2(c.y - b.y, c.x - b.x);
    return Math.abs(wrapAngle(h2 - h1)) / spacing;
  });

  let idx = nearest(pts, track.spawn, 0, n);
  return function drive(world) {
    const car = world.car;
    idx = nearest(pts, car, idx, 12);

    // Steer toward a point a little way ahead on the centerline
    const target = pts[(idx + Math.round(p.lookahead / spacing)) % n];
    const err = wrapAngle(Math.atan2(target.y - car.y, target.x - car.x) - car.angle);
    let input = 0;
    if (err > p.deadband) input |= RIGHT;
    else if (err < -p.deadband) input |= LEFT;

    // Fastest speed at which the car can still turn as tightly as the next curve needs
    let maxBend = 0;
    for (let k = 0; k < p.previewDist / spacing; k++) maxBend = Math.max(maxBend, bend[(idx + k) % n]);
    let safe = CAR.maxSpeed;
    while (safe > 40 && safe * maxBend > CAR.turnRate * steeringGrip(safe) * p.margin) safe -= 5;

    if (car.speed < safe - 4) input |= UP;
    else if (car.speed > safe + 12) input |= DOWN;
    return input;
  };
}

function nearest(pts, pos, from, window) {
  const n = pts.length;
  let best = from, bestD = Infinity;
  for (let k = -window; k <= window; k++) {
    const i = (from + k + n) % n;
    const d = (pts[i].x - pos.x) ** 2 + (pts[i].y - pos.y) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}
