// The replay check: a fixed set of scenarios run headless and compared with stored golden results
// (tools/replay-golden.json). If any of them changes, something in the simulation changed.
//
//   node tools/replay-check.js            run and compare (exit 1 on any difference)
//   node tools/replay-check.js --update   run and store the results as the new golden ones
//                                         (only for an intentional change, and say why in DEVLOG.md)
//
// Scenarios: my Neon Loop ghost, three champion laps, the first 3 generations of seed 3's evolution,
// and one custom track opened from a share link. Every car path is kept as a fingerprint of every
// step's exact position, heading and speed, so even a tiny difference anywhere shows up.
// Nothing here ever runs on Exam (it's held out).

import { readFileSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath } from 'node:url';
import { TRACKS, buildTrack } from '../src/sim/track.js';
import { replayGhost, ghostWorld, decodeGhostInputs } from '../src/sim/ghost.js';
import { stepWorld } from '../src/sim/world.js';
import { createGeneration, stepGeneration } from '../src/sim/generation.js';
import { createEvolution, runEvolution } from '../src/sim/evolution.js';
import { decodeTrack } from '../src/sim/share-link.js';

const root = new URL('../', import.meta.url);
const json = (path) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const GOLDEN = new URL('tools/replay-golden.json', root);

// The custom track of Step 8's 🎬 moment ("Paperclip": a hairpin that turns right), as its share link
export const PAPERCLIP_LINK = '1DcBkCgCgCgIwDcJsQkJsRgIwRgH-QaG4G4G4FsGgFUFoFsEwG4EYQaEYRgDSRgCgQkBkIwBk';

// A short fingerprint of a long list of numbers (FNV-1a over their exact text)
function fingerprint(numbers) {
  let h = 2166136261;
  for (const n of numbers) {
    const text = String(n);
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
    h = Math.imul(h ^ 59, 16777619); // ';' between numbers
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

// One champion alone on a track for a whole generation (60 s): its laps, how it got out, and its path
function championRun(track, brain) {
  const gen = createGeneration(track, [brain]);
  const laps = [], path = [];
  while (!gen.over) {
    for (const e of stepGeneration(gen)) if (e.type === 'lap') laps.push(e.steps);
    const c = gen.cars[0].world.car;
    path.push(c.x, c.y, c.angle, c.speed);
  }
  const car = gen.cars[0];
  return { laps, bestLapSteps: car.bestLapSteps, out: car.out, outStep: car.outStep, path: fingerprint(path) };
}

// My ghost lap: the lap time it reproduces, and the path its keys drive
function ghostRun(track, ghost) {
  const world = ghostWorld(track, ghost);
  const path = [];
  for (const input of decodeGhostInputs(ghost.inputs)) {
    stepWorld(world, input);
    path.push(world.car.x, world.car.y, world.car.angle, world.car.speed);
  }
  return { ...replayGhost(track, ghost), path: fingerprint(path) };
}

export function runScenarios() {
  const neon = buildTrack(TRACKS[0]);
  const seed3 = json('champions/seed-3.json').champions;
  const multi = json('champions/seed-3-multi.json').champions;
  const results = {};

  results['my Neon Loop ghost (ghosts/me-v3.json)'] = ghostRun(neon, json('ghosts/me-v3.json'));

  results['champion seed 3 gen 20 on Neon Loop'] = championRun(neon, seed3['20'].brain);
  results['champion seed 3 gen 80 on Neon Loop'] = championRun(neon, seed3['80'].brain);
  results['champion seed 3 multi-track gen 100 on Neon Loop'] = championRun(neon, multi['100'].brain);

  const evo = runEvolution(createEvolution(neon, 3), 3);
  results['seed 3 evolution, generations 1-3'] = {
    history: evo.history,
    champions: Object.fromEntries(Object.entries(evo.champions).map(([g, c]) => [g, { id: c.id, fitness: c.fitness, brain: fingerprint(c.brain) }])),
    nextBrains: fingerprint(evo.gen.cars.flatMap((c) => c.brain)), // generation 4's 100 brains, before they drive
  };

  const opened = decodeTrack(PAPERCLIP_LINK);
  if (!opened.track) throw new Error(`the Paperclip link doesn't open: ${opened.error}`);
  const paperclip = buildTrack(opened.track);
  results['custom track from a share link (Paperclip)'] = {
    key: paperclip.key,
    checkpoints: paperclip.checkpoints.length,
    length: paperclip.length,
    walls: fingerprint(paperclip.walls.flatMap((w) => [w.ax, w.ay, w.bx, w.by])),
    'champion seed 3 gen 80': championRun(paperclip, seed3['80'].brain),
  };
  return results;
}

// Each scenario: 'ok', or what's different
export function compareWithGolden(results, golden) {
  return Object.keys({ ...golden, ...results }).map((name) => {
    if (!(name in golden)) return { name, ok: false, why: 'new scenario, not in the golden results' };
    if (!(name in results)) return { name, ok: false, why: 'missing: the golden results have it, this run does not' };
    if (isDeepStrictEqual(results[name], golden[name])) return { name, ok: true };
    const fields = Object.keys({ ...golden[name], ...results[name] }).filter((k) => !isDeepStrictEqual(golden[name][k], results[name][k]));
    return { name, ok: false, why: `different: ${fields.join(', ')}` };
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const t0 = Date.now();
  const results = runScenarios();
  if (process.argv.includes('--update')) {
    writeFileSync(GOLDEN, JSON.stringify(results, null, 2) + '\n');
    console.log(`golden results updated: ${Object.keys(results).length} scenarios (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  } else {
    const rows = compareWithGolden(results, JSON.parse(readFileSync(GOLDEN, 'utf8')));
    for (const r of rows) console.log(`${r.ok ? 'ok      ' : 'MISMATCH'}  ${r.name}${r.ok ? '' : `: ${r.why}`}`);
    const bad = rows.filter((r) => !r.ok).length;
    console.log(bad ? `${bad} of ${rows.length} scenarios changed` : `all ${rows.length} scenarios identical (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    process.exit(bad ? 1 : 0);
  }
}
