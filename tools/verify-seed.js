// Proof that a code change changed no behavior: reruns the whole evolution of a seed
// and compares it, bit for bit, with the saved runs/seed-N.json and champions/seed-N.json.
// Nothing is written. Run with: node tools/verify-seed.js 3

import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { TRACKS, buildTrack } from '../src/sim/track.js';
import { createEvolution, runEvolution } from '../src/sim/evolution.js';

const seed = Number(process.argv[2] ?? 3);
const root = new URL('../', import.meta.url);
const saved = JSON.parse(readFileSync(new URL(`runs/seed-${seed}.json`, root)));
const savedChamps = JSON.parse(readFileSync(new URL(`champions/seed-${seed}.json`, root))).champions;

const t0 = performance.now();
const evo = runEvolution(createEvolution(buildTrack(TRACKS[0]), seed), saved.history.length);
const historySame = isDeepStrictEqual(JSON.parse(JSON.stringify(evo.history)), saved.history);
const champsSame = isDeepStrictEqual(JSON.parse(JSON.stringify(evo.champions)), savedChamps);
const firstDiff = evo.history.findIndex((row, i) => !isDeepStrictEqual(JSON.parse(JSON.stringify(row)), saved.history[i]));
console.log(`seed ${seed}: ${evo.history.length} generations rerun in ${((performance.now() - t0) / 1000).toFixed(0)} s`);
console.log(`history identical to runs/seed-${seed}.json: ${historySame}${firstDiff >= 0 ? ` (first difference at generation ${firstDiff + 1})` : ''}`);
console.log(`champions (all 70 numbers, laps, fitness, family lines) identical to champions/seed-${seed}.json: ${champsSame}`);
process.exit(historySame && champsSame ? 0 : 1);
