// Step 7a: did the champions learn to drive, or did they memorize Neon Loop?
// Runs the pre-registered tests (DEVLOG.md, "Step 7a pre-registration") and writes runs/step7a.json.
// Exam is held out: this tool refuses to run anything on it.
// Run with: node tools/generalization-report.js

import { readFileSync, writeFileSync } from 'node:fs';
import { TRACKS, buildTrack } from '../src/sim/track.js';
import { STEPS_PER_SECOND } from '../src/sim/constants.js';
import { createGeneration, runGeneration, progressPercent } from '../src/sim/generation.js';

const TEST_TRACKS = ['neon-loop-mirrored', 'zigzag', 'wide-sweepers'];
const CARS = [
  ...[1, 5, 10, 20, 40, 80].map((g) => ({ seed: 3, generation: g })),
  ...[2, 4, 5].map((s) => ({ seed: s, generation: 80 })),
];
if (TEST_TRACKS.includes('exam')) throw new Error('Exam is held out');

const root = new URL('../', import.meta.url);
const champions = (seed) => JSON.parse(readFileSync(new URL(`champions/seed-${seed}.json`, root))).champions;

// One champion alone on one track, under the evolution rules: out on a crash, after 3 s without progress, or at 60 s
export function trialRun(brain, track) {
  const gen = runGeneration(createGeneration(track, [brain]));
  const car = gen.cars[0];
  const pos = car.world.car.crash ?? { x: car.world.car.x, y: car.world.car.y };
  return {
    lapSeconds: car.bestLapSteps === null ? null : +(car.bestLapSteps / STEPS_PER_SECOND).toFixed(2),
    lapSteps: car.bestLapSteps,
    laps: car.world.laps.laps,
    progress: +progressPercent(car.world).toFixed(1),
    out: car.out,
    outSeconds: +(car.outStep / STEPS_PER_SECOND).toFixed(2),
    where: { x: Math.round(pos.x), y: Math.round(pos.y), checkpoint: car.world.laps.nextCheckpoint },
  };
}

if (process.argv[1]?.endsWith('generalization-report.js')) {
  const results = [];
  for (const id of TEST_TRACKS) {
    const track = buildTrack(TRACKS.find((t) => t.id === id));
    for (const c of CARS) {
      const champ = champions(c.seed)[c.generation];
      const r = trialRun(champ.brain, track);
      results.push({ track: id, ...c, id: champ.id, neonLoopLap: champ.lapSteps && +(champ.lapSteps / STEPS_PER_SECOND).toFixed(2), ...r });
      const what = r.lapSeconds !== null ? `best lap ${r.lapSeconds} s (${r.laps} laps)` : `${r.progress}% of a lap, out by ${r.out} at ${r.outSeconds} s, at (${r.where.x}, ${r.where.y}) before checkpoint ${r.where.checkpoint}`;
      console.log(`${id.padEnd(19)} seed ${c.seed} gen ${String(c.generation).padEnd(3)} ${what}`);
    }
  }
  writeFileSync(new URL('runs/step7a.json', root), JSON.stringify({ preRegistered: 'DEVLOG.md, Step 7a pre-registration (commit f543436)', results }, null, 1) + '\n');
}
