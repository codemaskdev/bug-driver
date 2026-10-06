// Runs generation 1 (100 random brains) headless for a few seeds and reports
// how the chaos went. Run with: node tools/generation-report.js [seeds...]

import { TRACKS, buildTrack } from '../src/sim/track.js';
import { makeRng } from '../src/sim/rng.js';
import { createGeneration, randomBrains, stepGeneration, leaderOf, progressPercent } from '../src/sim/generation.js';
import { CAR } from '../src/sim/car.js';
import { STEPS_PER_SECOND } from '../src/sim/constants.js';

const track = buildTrack(TRACKS[0]);
const seeds = process.argv.slice(2).map(Number);
if (!seeds.length) seeds.push(1, 2, 3, 4, 5);

const spacing = track.length / track.center.length;
const spawnIndex = nearestSample(track.spawn);

// Where a point is along the track, in px ahead of (+) or behind (-) the spawn
function alongTrack(p) {
  let d = (nearestSample(p) - spawnIndex) * spacing;
  if (d > track.length / 2) d -= track.length;
  if (d < -track.length / 2) d += track.length;
  return d;
}

function nearestSample(p) {
  let best = 0, bestD = Infinity;
  track.center.forEach((c, i) => {
    const d = (c.x - p.x) ** 2 + (c.y - p.y) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}

console.log(`Generation 1, ${track.name}. "barely moved" = never got ${CAR.length} px (one car length) from the start;`);
console.log(`"backwards" = got out more than ${CAR.length} px behind the start, measured along the track.\n`);

for (const seed of seeds) {
  const gen = createGeneration(track, randomBrains(makeRng(seed)));
  const farthest = gen.cars.map(() => 0);
  const t0 = performance.now();
  while (!gen.over) {
    stepGeneration(gen);
    gen.cars.forEach((c, i) => {
      const { car } = c.world;
      farthest[i] = Math.max(farthest[i], Math.hypot(car.x - track.spawn.x, car.y - track.spawn.y));
    });
  }
  const ms = performance.now() - t0;

  const barely = farthest.filter((d) => d < CAR.length).length;
  const backwards = gen.cars.filter((c) => alongTrack(c.world.car) < -CAR.length).length;
  const earlyCrash = gen.cars.filter((c) => c.out === 'crash' && c.outStep <= 2 * STEPS_PER_SECOND).length;
  const crashes = gen.cars.filter((c) => c.out === 'crash').length;
  const stalls = gen.cars.filter((c) => c.out === 'stall').length;
  const best = leaderOf(gen);
  console.log(`seed ${seed}: barely moved ${barely}, backwards ${backwards}, crashed in the first 2 s ${earlyCrash}` +
    ` | all crashes ${crashes}, stalls ${stalls} | best ${progressPercent(best.world).toFixed(1)}%,` +
    ` out by ${best.out} at ${(best.outStep / STEPS_PER_SECOND).toFixed(2)} s` +
    ` | generation lasted ${(gen.step / STEPS_PER_SECOND).toFixed(2)} s, simulated in ${ms.toFixed(0)} ms`);
}
