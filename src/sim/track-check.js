// Checks a track before anyone can drive or train on it (the editor, share links).
// Every problem comes with a plain message and the spot on the track where it is,
// so the editor can point at it. Nothing about the car or the road changes: the road is
// always 90 px wide and the physics are the frozen ones.

import { buildTrack } from './track.js';
import { isHeldOut } from './held-out.js';

export const ROAD_WIDTH = 90;
export const SCREEN_W = 1280, SCREEN_H = 720;
export const MIN_POINTS = 4;
export const MAX_POINTS = 60;
const MIN_POINT_GAP = 16;           // px: two clicked points closer than this are "on top of each other"
const SCREEN_MARGIN = 10;           // px: the walls keep this far from the edge of the screen
// The tightest turn, measured on the middle of the road: any tighter and the inside wall folds
// over itself. (The car can turn tighter than that on its own, about 20 px at walking pace.)
export const TIGHTEST_TURN = ROAD_WIDTH / 2;
const FAR_ALONG = 2 * ROAD_WIDTH;   // two parts of the road more than 180 px apart along the road...
const MIN_APART = ROAD_WIDTH + 10;  // ...must be 100 px apart on screen: 10 px of ground between their walls

// Returns {ok, problems: [{kind, message, x, y}], track}: track is the built track (null if it can't be built).
export function checkTrack(def) {
  const problems = [];
  const add = (kind, message, at) => problems.push({ kind, message, x: at.x, y: at.y });
  const points = def.points ?? [];
  const middle = { x: SCREEN_W / 2, y: SCREEN_H / 2 };

  if (isHeldOut(def)) {
    add('held-out', "That's the held-out Exam track: it can't be edited or shared.", middle);
    return { ok: false, problems, track: null };
  }
  if (def.width !== ROAD_WIDTH) add('width', `The road is always ${ROAD_WIDTH} px wide.`, middle);
  if (points.length < MIN_POINTS) add('few-points', `Click at least ${MIN_POINTS} points to make a loop.`, middle);
  if (points.length > MAX_POINTS) add('many-points', `Use at most ${MAX_POINTS} points.`, middle);
  for (const p of points) {
    const inside = Array.isArray(p) && Number.isInteger(p[0]) && Number.isInteger(p[1])
      && p[0] >= 0 && p[0] <= SCREEN_W && p[1] >= 0 && p[1] <= SCREEN_H;
    if (!inside) { add('off-screen', "A point is off the screen. Bring it back.", middle); break; }
  }
  if (problems.length) return { ok: false, problems, track: null };

  for (let i = 0; i < points.length; i++) {
    const [ax, ay] = points[i], [bx, by] = points[(i + 1) % points.length];
    if (Math.hypot(bx - ax, by - ay) < MIN_POINT_GAP) {
      add('same-spot', 'Two points are on top of each other. Move them apart.', { x: ax, y: ay });
      return { ok: false, problems, track: null };
    }
  }

  const track = buildTrack(def);
  const walls = [...track.inner, ...track.outer];
  const outside = walls.find((p) => p.x < SCREEN_MARGIN || p.x > SCREEN_W - SCREEN_MARGIN || p.y < SCREEN_MARGIN || p.y > SCREEN_H - SCREEN_MARGIN);
  if (outside) add('off-screen', "The track doesn't fit on the screen. Move it away from the edge.", outside);

  const tight = tightestTurn(track.center);
  if (tight.radius < TIGHTEST_TURN) add('too-tight', 'This turn is too tight for the car. Spread its points out.', tight.at);

  const touch = closestFarApart(track);
  if (touch) add('crosses', 'The road crosses or touches itself here. Pull the two parts apart.', touch.at);

  return { ok: problems.length === 0, problems, track };
}

// The sharpest bend of the road's middle line: the radius of the circle through each three neighbouring samples (8 px apart).
export function tightestTurn(center) {
  const n = center.length;
  let radius = Infinity, at = center[0];
  for (let i = 0; i < n; i++) {
    const a = center[(i - 1 + n) % n], b = center[i], c = center[(i + 1) % n];
    const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    if (cross === 0) continue; // dead straight
    const r = (Math.hypot(b.x - a.x, b.y - a.y) * Math.hypot(c.x - b.x, c.y - b.y) * Math.hypot(a.x - c.x, a.y - c.y)) / (2 * Math.abs(cross));
    if (r < radius) { radius = r; at = b; }
  }
  return { radius, at };
}

// The closest two parts of the road that are far apart along the road, if they are too close on screen.
function closestFarApart(track) {
  const c = track.center, n = c.length;
  const spacing = track.length / n;
  const skip = Math.ceil(FAR_ALONG / spacing); // samples closer than this along the road are neighbours
  let best = null;
  for (let i = 0; i < n; i++) {
    for (let j = i + skip; j < n; j++) {
      if (n - (j - i) < skip) break; // close again the other way round the loop
      const d = Math.hypot(c[i].x - c[j].x, c[i].y - c[j].y);
      if (d < MIN_APART && (!best || d < best.distance)) {
        best = { distance: d, at: { x: (c[i].x + c[j].x) / 2, y: (c[i].y + c[j].y) / 2 } };
      }
    }
  }
  return best;
}
