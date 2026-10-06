// Every track is a valid, drivable loop, and the four Step 7 tracks are frozen:
// their data must keep the SHA-256 pre-registered in DEVLOG.md (commit "pre-register Step 7a").

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, buildTrack } from '../src/sim/track.js';
import { segmentHit } from '../src/sim/geometry.js';
import { createWorld, stepWorld } from '../src/sim/world.js';
import { createCar, hitWall } from '../src/sim/car.js';
import { makeScriptedDriver } from '../tools/scripted-driver.js';
import { trackData, sha256 } from '../tools/track-hash.js';

const PRE_REGISTERED = 'f4fccfefb8b489772df3dfdfe32adfbdcaa68dbf872e67792e43de89036a2d9c';

test('the four Step 7 tracks are exactly the pre-registered ones', () => {
  assert.equal(sha256(trackData()), PRE_REGISTERED);
});

for (const def of TRACKS) {
  test(`${def.name}: a valid loop (walls never cross, full width everywhere, fits on screen, clear start)`, () => {
    const t = buildTrack(def);
    assert.equal(def.width, 90);
    let crossings = 0;
    for (let i = 0; i < t.walls.length; i++) for (let j = i + 1; j < t.walls.length; j++) {
      const a = t.walls[i], b = t.walls[j];
      if ((a.bx === b.ax && a.by === b.ay) || (b.bx === a.ax && b.by === a.ay)) continue;
      if (segmentHit(a.ax, a.ay, a.bx, a.by, b.ax, b.ay, b.bx, b.by) >= 0) crossings++;
    }
    assert.equal(crossings, 0);
    let narrowest = Infinity;
    for (const c of t.center) for (const w of [...t.inner, ...t.outer]) narrowest = Math.min(narrowest, Math.hypot(c.x - w.x, c.y - w.y));
    assert.ok(narrowest > def.width / 2 - 0.5, `narrowest ${narrowest}`);
    for (const p of [...t.inner, ...t.outer]) assert.ok(p.x > 60 && p.x < 1250 && p.y > 60 && p.y < 690, `wall point ${p.x},${p.y} too close to the screen edge`);
    assert.equal(hitWall(createCar(t.spawn), t.walls), null);
  });

  test(`${def.name}: drivable, the hand-written test driver (no AI) completes a lap`, () => {
    const t = buildTrack(def), w = createWorld(t), driver = makeScriptedDriver(t);
    let laps = 0;
    for (let s = 0; s < 3600 && !w.car.crashed && !laps; s++) for (const e of stepWorld(w, driver(w))) if (e.type === 'lap') laps++;
    assert.equal(laps, 1); // only that a lap is possible: its time isn't looked at here
  });
}
