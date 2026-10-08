// The fact check of the two guides: every number they state, worked out again from the real code, the saved
// runs and the simulation itself, and looked up in the guide text. Writes guide-facts.md.
// Run with: node tools/guide-facts.js        (fails if a fact doesn't match the data or a guide doesn't say it)
//
// Part 1 is every claim of HOW-IT-WORKS.md and every claim the deep dive got from the video's corrections, one row
// each: what the guide says, the value worked out here, the step or run it comes from, and the source. Numbers next
// to a picture must come from the picture's own step or run (see PICTURES). Part 2 lists, section by section, every
// other number in DEEP-DIVE.md with the sources that section names in its "Reproduce it" notes.

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { TRACKS, buildTrack, trackDef } from '../src/sim/track.js';
import { makeRng } from '../src/sim/rng.js';
import { createGeneration, randomBrains, stepGeneration, fitness, progressPercent, POPULATION, STALL_STEPS, LAP_BONUS } from '../src/sim/generation.js';
import { BRAIN_SIZE, INPUTS, HIDDEN, OUTPUTS } from '../src/sim/brain.js';
import { SENSOR_RANGE, SENSOR_ANGLES, inputsFromView } from '../src/sim/sensors.js';
import { CAR } from '../src/sim/car.js';
import { STEPS_PER_SECOND } from '../src/sim/constants.js';
import { PARENTS, MUTATION_RATE, MUTATION_SIZE, createEvolution, finishGeneration, nextGeneration } from '../src/sim/evolution.js';
import { ghostWorld, decodeGhostInputs } from '../src/sim/ghost.js';
import { stepWorld, createWorld } from '../src/sim/world.js';
import { makeScriptedDriver } from './scripted-driver.js';

const root = new URL('../', import.meta.url);
const read = (f) => readFileSync(new URL(f, root), 'utf8');
const json = (f) => JSON.parse(read(f));
const s2 = (x) => x.toFixed(2);
const sec = (steps) => s2(steps / STEPS_PER_SECOND);
const guides = { simple: read('HOW-IT-WORKS.md'), deep: read('DEEP-DIVE.md') };

// ---- the data ------------------------------------------------------------------------------------------------

const runs = Object.fromEntries([1, 2, 3, 4, 5].map((n) => [n, json(`runs/seed-${n}.json`)]));
const lapOf = (seed, g) => { const r = runs[seed].history.find((x) => x.generation === g); return r.bestLapSteps === null ? null : r.bestLapSteps / STEPS_PER_SECOND; };
const firstUnder = (seed, limit) => runs[seed].history.find((r) => r.bestLapSteps !== null && r.bestLapSteps / STEPS_PER_SECOND < limit) ?? null;
const figure = json('docs/img/figure-data.json');
const champions3 = Object.values(json('champions/seed-3.json').champions);  // generations 1, 5, 10, 20, 40, 80
const exam = json('runs/exam.json'), exam7c = json('runs/exam-7c.json'), meExam = json('ghosts/me-exam.json'), me = json('ghosts/me-v3.json');
const neon = buildTrack(TRACKS[0]);

// generation 1 of a seed, run headless: how every car got out
function generationOne(seed) {
  const gen = createGeneration(neon, randomBrains(makeRng(seed)));
  const far = gen.cars.map(() => 0);
  while (!gen.over) {
    stepGeneration(gen);
    gen.cars.forEach((c, i) => { far[i] = Math.max(far[i], Math.hypot(c.world.car.x - neon.spawn.x, c.world.car.y - neon.spawn.y)); });
  }
  const cars = gen.cars.map((c, i) => ({ id: c.id, out: c.out, outSeconds: c.outStep / STEPS_PER_SECOND, fitness: fitness(c), progress: progressPercent(c.world), barely: far[i] < CAR.length }));
  const best = cars.reduce((a, b) => (b.fitness > a.fitness ? b : a));
  return { cars, best, stalled: cars.filter((c) => c.out === 'stall').length, crashed: cars.filter((c) => c.out === 'crash').length,
    barely: cars.filter((c) => c.barely).length, barelyStalled: cars.filter((c) => c.barely && c.out === 'stall').length };
}

// generation 1 of seed 3 bred into generation 2, exactly as the evolution does it: how many children each parent got
function breedOneToTwo() {
  const evo = createEvolution(neon, 3);
  while (!evo.gen.over) stepGeneration(evo.gen);
  const ranked = evo.gen.cars.slice().sort((a, b) => fitness(b) - fitness(a)).slice(0, PARENTS);
  finishGeneration(evo);
  const gen2 = nextGeneration(evo);
  const children = ranked.map((p) => gen2.cars.filter((c) => !c.elite && c.parentId === p.id).length);
  return { children, total: children.reduce((a, b) => a + b, 0), elite: gen2.cars.find((c) => c.elite).parentId };
}

// my lap replayed twice through the real world code: identical, step for step?
function replayTwice() {
  const inputs = decodeGhostInputs(me.inputs);
  const run = () => { const w = ghostWorld(neon, me), path = []; for (const k of inputs) { stepWorld(w, k); path.push(`${w.car.x},${w.car.y}`); } return path; };
  const a = run(), b = run();
  return a.length === b.length && a.every((p, i) => p === b[i]);
}

// the hand-written test driver (tools/reference-lap.js): careful settings, the best of 980, and the floor
function benchmarks() {
  const run = (params) => {
    const world = createWorld(neon), driver = makeScriptedDriver(neon, params), laps = [];
    for (let i = 0; i < 60 * STEPS_PER_SECOND; i++) {
      for (const e of stepWorld(world, driver(world))) if (e.type === 'lap') laps.push(e.steps);
      if (world.car.crashed) return null;
    }
    return laps;
  };
  const careful = Math.min(...run({}));
  let best = Infinity, tried = 0;
  for (const lookahead of [32, 48, 64, 80, 96, 112, 128]) for (const previewDist of [30, 45, 60, 90, 120])
    for (const margin of [0.8, 1.0, 1.2, 1.3, 1.4, 1.5, 1.7]) for (const deadband of [0.02, 0.04, 0.08, 0.12]) {
      tried++;
      const laps = run({ lookahead, previewDist, margin, deadband });
      if (laps && laps.length) best = Math.min(best, ...laps);
    }
  return { careful: sec(careful), best: sec(best), tried, floor: sec(Math.round((neon.length / CAR.maxSpeed) * STEPS_PER_SECOND)) };
}

// Right-hand turns of 150° or more within 256 px of road, and the tightest radius of each (the circle through three
// neighbouring samples of the middle line, as src/sim/track-check.js measures a bend)
function rightTurns(id) {
  const center = buildTrack(trackDef(id)).center, n = center.length, out = [];
  const heading = center.map((p, i) => { const q = center[(i + 1) % n]; return Math.atan2(q.y - p.y, q.x - p.x); });
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const radiusAt = (i) => {
    const a = center[(i - 1 + n) % n], b = center[i], c = center[(i + 1) % n];
    const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    return cross === 0 ? Infinity : (Math.hypot(b.x - a.x, b.y - a.y) * Math.hypot(c.x - b.x, c.y - b.y) * Math.hypot(a.x - c.x, a.y - c.y)) / (2 * Math.abs(cross));
  };
  for (let i = 0; i < n; i++) {
    let turn = 0, radius = Infinity;
    for (let k = 0; k < 32; k++) { turn += wrap(heading[(i + k + 1) % n] - heading[(i + k) % n]); radius = Math.min(radius, radiusAt((i + k) % n)); }
    if (turn <= (150 * Math.PI) / 180) continue;  // y points down on screen: a right-hand turn adds up positive
    const mid = center[(i + 16) % n], same = out.find((h) => Math.hypot(h.x - mid.x, h.y - mid.y) < 200);
    if (same) same.r = Math.min(same.r, radius); else out.push({ x: mid.x, y: mid.y, r: radius });
  }
  return out.map((h) => Math.round(h.r)).sort((a, b) => b - a);
}

const examRow = (track, multi, g) => exam.results.find((r) => r.track === track && r.multi === multi && r.generation === g);
const changed = (() => { const a = champions3.find((c) => c.id === '1-85').brain, b = champions3.find((c) => c.id === '80-0').brain; return a.filter((x, i) => x !== b[i]).length; })();
const weights = champions3.flatMap((c) => c.brain);
const left = figure.frame.output[2], h6 = figure.frame.hidden[5];
const breed12 = breedOneToTwo();
const bm = benchmarks(), g1 = generationOne(3), g1all = [1, 2, 3, 4, 5].map((s) => ({ seed: s, ...generationOne(s) }));
const turns = Object.fromEntries(['neon-loop', 'zigzag', 'wide-sweepers', 'exam'].map((t) => [t, rightTurns(t)]));
const multiExam = [10, 20, 80, 100].map((g) => examRow('exam', true, g));
const four = exam7c.rows.filter((r) => [10, 20, 80, 100].includes(r.generation));
const oldWidth = Number(/width: (\d+)/.exec(execFileSync('git', ['show', 'a6c88e0~1:src/sim/track.js'], { cwd: new URL('.', root), encoding: 'utf8' }))[1]);

// ---- the facts ---------------------------------------------------------------------------------------------
// { claim, says: [strings the guide must contain], value (worked out here, must equal `says[0]` unless `check`), in, source }

const F = [];
const fact = (o) => F.push({ in: ['simple', 'deep'], ...o });
const SIM = 'the simulation, run headless by this tool';

fact({ chapter: '1. Three words', run: 'rules', claim: 'the brain is 70 numbers', says: ['70'], value: String(BRAIN_SIZE), source: '`BRAIN_SIZE` in src/sim/brain.js' });
fact({ chapter: '1. Three words', run: 'rules', claim: '100 cars a generation', says: ['hundred'], value: String(POPULATION) === '100' ? 'hundred' : POPULATION, in: ['simple'], source: '`POPULATION` in src/sim/generation.js' });
fact({ chapter: '2. The World', run: 'rules', claim: 'sixty ticks a second', says: ['sixty times a second'], value: STEPS_PER_SECOND === 60 ? 'sixty times a second' : STEPS_PER_SECOND, in: ['simple'], source: '`STEPS_PER_SECOND` in src/sim/constants.js' });
fact({ chapter: '2. The World', run: 'my Neon Loop lap', claim: 'the same key presses give exactly the same run', says: ['exactly the same run'], value: replayTwice() ? 'exactly the same run' : 'differs', in: ['simple'], source: `ghosts/me-v3.json replayed twice through \`stepWorld()\` (${SIM}); also tests/ghost.test.js and tools/replay-check.js` });
fact({ chapter: '2. The World', run: 'rules', claim: 'the road went from 64 to 90 px', says: ['64', '90'], value: `${oldWidth}`, check: () => oldWidth === 64 && trackDef('neon-loop').width === 90, source: 'width in src/sim/track.js now (90) and at a6c88e0~1 (64), git history' });
fact({ chapter: '2. The World', run: 'my Neon Loop lap', claim: 'my best lap is 26.40 s', says: ['26.40'], value: sec(me.steps), source: 'ghosts/me-v3.json (1584 steps)' });
fact({ chapter: '3. Eyes', run: 'rules', claim: 'five whiskers, up to 200 px', says: ['200'], value: String(SENSOR_RANGE), check: () => SENSOR_ANGLES.length === 5, source: '`SENSOR_ANGLES`, `SENSOR_RANGE` in src/sim/sensors.js' });
fact({ chapter: '3. Eyes', run: 'rules', claim: 'every input is squeezed between 0 and 1', says: ['0', '1'], in: ['simple'], value: '0', check: () => { const v = inputsFromView([0, 200, 100, 0, 0], 400); return v.every((x) => x >= 0 && x <= 1) && v[0] === 1 && v[1] === 0; }, source: '`inputsFromView()` in src/sim/sensors.js' });
fact({ chapter: '3. Eyes', run: 'rules', claim: 'speed tops out at 330 px/s', says: ['330'], value: String(CAR.maxSpeed), source: '`CAR.maxSpeed` in src/sim/car.js' });
fact({ chapter: '3. Eyes', run: 'seed 3 gen 40, step 368', claim: 'the hairpin moment: left whisker 23 px from the wall, input 0.88 (seed 3 gen 40 champion, step 368)', says: ['23', '0.88'], value: String(Math.round(figure.frame.view[0])),
  check: () => s2(figure.frame.inputs[0]) === '0.88', source: 'docs/img/figure-data.json `frame` (tools/figures.js, the real champion replayed to step 368)' });
fact({ chapter: '3. Eyes', run: 'rules', claim: '23 px is less than the car is wide', says: ['less than the width of the car'], value: CAR.width > 23.3 ? 'less than the width of the car' : 'no', in: ['simple'], source: `\`CAR.width\` = ${CAR.width} px in src/sim/car.js` });
fact({ chapter: '4. Generation 1', run: 'seed 3, gen 1', claim: '76 cars stalled (out by the 3-second rule), 24 crashed (seed 3)', says: ['76', '24'], value: String(g1.stalled), check: () => g1.crashed === 24 && STALL_STEPS === 3 * STEPS_PER_SECOND, source: `generation 1 of seed 3 (${SIM}); \`STALL_STEPS\` in src/sim/generation.js` });
fact({ chapter: '4. Generation 1', run: 'seed 3, gen 1', claim: 'car 1-85 got 65% of a lap, then crashed', says: ['1-85', '65'], value: g1.best.id, check: () => Math.round(g1.best.progress) === 65 && g1.best.out === 'crash', source: `the same run; runs/seed-3.json generation 1 (bestProgress ${runs[3].history[0].bestProgress.toFixed(3)})` });
fact({ chapter: '4. Generation 1', run: 'seed 3, gen 1', claim: 'nobody in generation 1 finished a lap', says: ['Nobody in the first generation finished a lap'], value: runs[3].history[0].finishedLap === 0 ? 'Nobody in the first generation finished a lap' : 'no', in: ['simple'], source: 'runs/seed-3.json generation 1, `finishedLap` 0' });
fact({ chapter: '5. The Brain', run: 'rules', claim: '6 middle tanks, 4 button tanks', says: ['six middle tanks'], value: HIDDEN === 6 && OUTPUTS === 4 && INPUTS === 6 ? 'six middle tanks' : 'no', in: ['simple'], source: '`INPUTS`, `HIDDEN`, `OUTPUTS` in src/sim/brain.js' });
fact({ chapter: '5. The Brain', run: 'seed 3 gen 40, step 368', claim: 'h6: the wall ahead fills it (+0.730), the left whisker drains it (−0.987)', says: ['0.730', '−0.987'], in: ['deep'], value: h6.terms[2].product.toFixed(3),
  check: () => (h6.terms[0].product).toFixed(3) === '-0.987', source: 'docs/img/figure-data.json `frame.hidden[5]` (the hidden neuron h6)' });
fact({ chapter: '5. The Brain', run: 'seed 3 gen 40, step 368', claim: 'the left whisker and the wall ahead are h6\'s two biggest terms', says: ['the wall ahead fills it'], in: ['simple'], value: (() => { const big = h6.terms.map((t, i) => [Math.abs(t.product), i]).sort((a, b) => b[0] - a[0]).slice(0, 2).map((x) => x[1]).sort(); return big.join() === '0,2' ? 'the wall ahead fills it' : 'no'; })(), source: 'docs/img/figure-data.json `frame.hidden[5]`' });
fact({ chapter: '5. The Brain', run: 'rules', claim: '36 + 6 + 24 + 4 = 70', says: ['36', '24', '6', '4'], value: String(INPUTS * HIDDEN), check: () => HIDDEN * OUTPUTS === 24 && HIDDEN + OUTPUTS === 10, source: 'src/sim/brain.js (6 × 6 weights + 6 biases, 6 × 4 weights + 4 biases)' });
fact({ chapter: '5. The Brain', run: 'seed 3 champions', claim: 'weights can be negative: the seed 3 champions\' run from −1.96 to +2.28', says: ['−1.96', '+2.28'], in: ['deep'], value: s2(Math.min(...weights)).replace('-', '−'), check: () => s2(Math.max(...weights)) === '2.28', source: 'champions/seed-3.json, all six brains' });
fact({ chapter: '6. Evolution', run: 'rules', claim: 'the lap bonus is 6000 divided by the lap time', says: ['6000'], value: String(LAP_BONUS), source: '`LAP_BONUS` in src/sim/generation.js' });
fact({ chapter: '6. Evolution', run: 'rules', claim: 'the top ten become parents; one time in ten a tap is nudged', says: ['top ten', 'one time in ten'], in: ['simple'], value: PARENTS === 10 ? 'top ten' : 'no', check: () => MUTATION_RATE === 0.1 && MUTATION_SIZE === 0.3, source: '`PARENTS`, `MUTATION_RATE`, `MUTATION_SIZE` in src/sim/evolution.js' });
fact({ chapter: '6. Evolution', run: 'seed 3, gen 4→5', claim: 'the best parent got 20 of the 99 children, the tenth got 1 (generation 4 to 5)', in: ['deep'], says: ['20', '1'], value: String(figure.oneGeneration.top10[0].children), check: () => figure.oneGeneration.top10[9].children === 1, source: 'docs/img/figure-data.json `oneGeneration` (tools/figures.js)' });
fact({ chapter: '6. Evolution', run: 'seed 3, gen 1→2', claim: 'in the step in the picture (generation 1 to 2) the best parent got 15 of the 99 children, the second 16, the tenth 1', in: ['simple'], says: ['15', '16', '1', '99'],
  value: String(breed12.children[0]), check: () => breed12.children[1] === 16 && breed12.children[9] === 1 && breed12.total === 99, source: `generation 1 of seed 3 bred into generation 2 with \`nextGeneration()\` (${SIM}); the picture is the same step` });
fact({ chapter: '6. Evolution', run: 'seed 3, gen 4→5', claim: 'the ten parents\' children, best first: 20, 17, 17, 11, 10, 11, 4, 4, 4, 1', in: ['deep'], says: ['20, 17, 17, 11, 10, 11, 4, 4, 4 and 1'], value: figure.oneGeneration.top10.map((p) => p.children).join(', ').replace(/, 1$/, ' and 1'), source: 'docs/img/figure-data.json `oneGeneration`' });
fact({ chapter: '6. Evolution', run: 'seed 3, all generations', claim: 'the first lap: generation 4, 38 s (38.18 s), slower than me', says: ['38'], value: String(Math.round(runs[3].firstLap.steps / 60)), check: () => runs[3].firstLap.generation === 4 && sec(runs[3].firstLap.steps) === '38.18', source: `runs/seed-3.json \`firstLap\` (car ${runs[3].firstLap.id ?? '4-78'})` });
fact({ chapter: '6. Evolution', run: 'seed 3, all generations', claim: 'generation 6: 19.25 s, faster than me', says: ['19.25'], value: s2(lapOf(3, 6)), check: () => lapOf(3, 5) > 26.4, source: 'runs/seed-3.json generations 5 and 6' });
fact({ chapter: '7. Stuck', run: 'seeds 1–5', claim: 'four of five runs learned; one stuck for 95 generations at the same score', says: ['95'], value: (() => { const h = runs[1].history, v = h.find((r) => r.generation === 6).bestFitness; return String(h.filter((r) => r.generation >= 6 && r.bestFitness === v).length); })(),
  check: () => [2, 3, 4, 5].every((s) => runs[s].firstLap) && !runs[1].firstLap, source: 'runs/seed-1.json … seed-5.json `history`, `firstLap`' });
fact({ chapter: '7. Stuck', run: 'seed 1, gen 31', claim: 'in one of those generations not one of the 100 cars pressed the brake (seed 1, gen 31)', says: ['not one of the hundred cars ever pressed the brake'], in: ['simple'], value: figure.seed1.everBraked === 0 ? 'not one of the hundred cars ever pressed the brake' : 'no', source: 'docs/img/figure-data.json `seed1.everBraked` (tools/figures.js, generation 31 of seed 1)' });
fact({ chapter: '8. Reading the Brain', run: 'seed 3 gen 40, step 368', claim: 'LEFT ends at 0.66, above halfway', says: ['0.66'], value: s2(left.value), source: 'docs/img/figure-data.json `frame.output[2]`' });
fact({ chapter: '8. Reading the Brain', run: 'seed 3 gen 40, step 368', claim: 'the biggest contribution to LEFT comes through h6 (the left whisker\'s middle tank)', says: ['biggest contribution'], value: (() => { const i = left.terms.reduce((b, t, k) => (t.product > left.terms[b].product ? k : b), 0); return i === 5 && figure.frame.strongestHiddenForLeft === 6 ? 'biggest contribution' : 'no'; })(), source: 'docs/img/figure-data.json `frame.output[2].terms`, `strongestHiddenForLeft`' });
fact({ chapter: '8. Reading the Brain', run: 'seed 3 champions', claim: '62 of the 70 taps differ between the gen 1 and gen 80 champions', says: ['62'], value: String(changed), source: 'champions/seed-3.json, cars 1-85 and 80-0' });
fact({ chapter: '9. How well did it learn?', run: 'benchmarks', claim: 'benchmarks: careful rule 17.25 s, best of 980 settings 12.68 s, centre-line floor 11.93 s', says: ['17.25', '12.68', '11.93', '980'], value: bm.careful, check: () => bm.best === '12.68' && bm.floor === '11.93' && bm.tried === 980, source: `the hand-written driver of tools/reference-lap.js, run again (${SIM})` });
fact({ chapter: '9. How well did it learn?', run: 'seed 3, all generations', claim: 'the first generation under 12.68 s is 19 (12.67 s)', says: ['12.67'], value: s2(firstUnder(3, 12.68).bestLapSteps / 60), check: () => firstUnder(3, 12.68).generation === 19, source: 'runs/seed-3.json' });
fact({ chapter: '9. How well did it learn?', run: 'seed 3, all generations', claim: 'the first generation under the careful rule is 8 (15.43 s)', says: ['15.43'], in: ['deep'], value: s2(firstUnder(3, 17.25).bestLapSteps / 60), check: () => firstUnder(3, 17.25).generation === 8, source: 'runs/seed-3.json' });
fact({ chapter: '9. How well did it learn?', run: 'seed 3, all generations', claim: 'generation 20 to 80: 12.65 s to 12.47 s, less than two tenths', says: ['12.65', '12.47'], value: s2(lapOf(3, 20)), check: () => s2(lapOf(3, 80)) === '12.47' && lapOf(3, 20) - lapOf(3, 80) < 0.2, source: 'runs/seed-3.json' });
fact({ chapter: '9. How well did it learn?', run: 'seed 3, all generations', claim: 'nothing goes under the centre-line floor: the best of the run is 12.43 s', says: ['12.43'], in: ['deep'], value: s2(Math.min(...runs[3].history.filter((r) => r.bestLapSteps).map((r) => r.bestLapSteps / 60))), source: 'runs/seed-3.json' });
fact({ chapter: '10. Learned or memorized?', run: 'reversed track test', claim: 'the reversed track: gens 10 and 20 drive 13.33 s and 13.20 s', says: ['13.33', '13.20'], value: s2(examRow('neon-loop-mirrored', false, 10).lapSeconds), check: () => s2(examRow('neon-loop-mirrored', false, 20).lapSeconds) === '13.20', source: 'runs/exam.json (neon-loop-mirrored)' });
fact({ chapter: '10. Learned or memorized?', run: 'reversed track test', claim: 'gen 80 stops in the hairpin (7.10 s) and backs into the wall (7.63 s)', says: ['7.10', '7.63'], in: ['deep'], value: s2(figure.mirrorCrash.stopSeconds), check: () => s2(figure.mirrorCrash.crashSeconds) === '7.63', source: 'docs/img/figure-data.json `mirrorCrash`; runs/exam.json' });
fact({ chapter: '10. Learned or memorized?', run: 'rules', claim: 'reversing, the speed sensor reads zero', says: ['speed sensor reads zero'], in: ['simple'], value: inputsFromView([0, 0, 0, 0, 0], -50)[5] === 0 ? 'speed sensor reads zero' : 'no', source: '`inputsFromView()` in src/sim/sensors.js, run with a backwards speed' });
fact({ chapter: '11. The exam', run: 'my Exam laps', claim: 'my first three Exam laps: 54.03, 44.30, 32.02 s', says: ['54.03', '44.30', '32.02'], value: sec(meExam.countedLaps[0]), check: () => sec(meExam.countedLaps[1]) === '44.30' && sec(meExam.countedLaps[2]) === '32.02', source: 'ghosts/me-exam.json `countedLaps`' });
fact({ chapter: '11. The exam', run: 'exam, one track', claim: 'gens 10 and 20 pass the exam (13.87 s, 13.83 s); gen 80 stops at 5.60 s and backs into the wall at 6.17 s', says: ['13.87', '13.83', '5.60', '6.17'], in: ['deep'], value: s2(examRow('exam', false, 10).lapSeconds),
  check: () => s2(examRow('exam', false, 20).lapSeconds) === '13.83' && examRow('exam', false, 80).lapSeconds == null && examRow('exam', false, 80).outSeconds === 6.17, source: 'runs/exam.json (exam, one track)' });
fact({ chapter: '12. The fix', run: 'exam, three tracks', claim: 'trained on three tracks: zero of four pass; three crash in the right-hand hairpin, the fourth (gen 100) later, at 11.60 s', says: ['11.60'], in: ['deep'], value: s2(multiExam[3].outSeconds),
  check: () => multiExam.every((r) => r.lapSeconds == null) && multiExam.slice(0, 3).every((r) => r.outSeconds < 6), source: 'runs/exam.json (exam, multi)' });
fact({ chapter: '12. The fix', run: 'exam, three tracks', claim: 'zero out of four', says: ['Zero out of four'], in: ['simple'], value: multiExam.every((r) => r.lapSeconds == null) ? 'Zero out of four' : 'no', source: 'runs/exam.json (exam, multi)' });
fact({ chapter: '12. The fix', run: 'track shapes', claim: 'no right-hand turn this tight in training: Neon Loop r 62 px, Zigzag and Wide Sweepers none; Exam r 49 and 45 px', says: ['r 62 px', 'r 49 px and r 45 px'], in: ['deep'], value: `r ${turns['neon-loop'].join(', ')} px`,
  check: () => !turns.zigzag.length && !turns['wide-sweepers'].length && turns.exam.join() === '49,45', source: 'the track data in src/sim/track.js through `buildTrack()`, every right-hand turn of 150°+ measured here' });
fact({ chapter: '12. The fix', run: 'exam, four tracks', claim: 'trained on four tracks: four of four, best Exam lap 13.25 s, the fastest of any car so far', says: ['13.25'], value: s2(Math.min(...four.map((r) => r.exam.lapSeconds ?? Infinity))),
  check: () => four.every((r) => r.exam.lapSeconds != null) && Math.min(...four.map((r) => r.exam.lapSeconds)) < Math.min(...exam.results.filter((r) => r.track === 'exam' && r.lapSeconds).map((r) => r.lapSeconds)), source: 'runs/exam-7c.json, against runs/exam.json' });
fact({ chapter: '12. The fix', run: 'rules', claim: 'the four-track plan was decided after the exam, and pre-registered before training', says: ['after the exam'], value: 'after the exam', check: () => /Step 7c pre-registration/.test(read('DEVLOG.md')), source: 'DEVLOG.md, "Step 7c pre-registration" (commit 41039bd)' });

// deep-dive-only corrections the video made
fact({ chapter: 'deep: generation 1', run: 'seed 3, gen 1', claim: 'seed 3: 58 of the 61 cars that barely moved were then out by the 3-second rule', says: ['58 of the 61'], in: ['deep'], value: `${g1.barelyStalled} of the ${g1.barely}`, source: `generation 1 of seed 3 (${SIM})` });
for (const g of g1all) fact({ chapter: 'deep: generation 1', run: 'generation 1, seeds 1–5', claim: `seed ${g.seed}: ${g.stalled} stalled, ${g.crashed} crashed`, says: [`| ${g.seed} | ${g.stalled} | ${g.crashed} |`], in: ['deep'], value: `| ${g.seed} | ${g.stalled} | ${g.crashed} |`, source: `generation 1 of seed ${g.seed} (${SIM})` });

// ---- the pictures of HOW-IT-WORKS.md and the step or run each one shows ----------------------------------------
// Rule: every number in a picture's caption, and in the paragraph right above the picture (the text the picture
// illustrates), must be a fact of this list from the same step or run as the picture (or a rule of the game, true of
// every run). A number from another step next to a picture reads as if the picture showed it.

const PICTURES = {
  'guide-01-ai-blocks.webp': ['rules'], 'guide-02-determinism.webp': ['my Neon Loop lap'], 'guide-03-rays.webp': ['seed 3 gen 40, step 368'],
  'guide-03-zero-to-one.webp': ['rules'], 'guide-04-generation-1.webp': ['seed 3, gen 1'], 'guide-05-one-tank.webp': ['rules'],
  'guide-05-middle-tank.webp': ['seed 3 gen 40, step 368'], 'guide-05-caveat.webp': ['seed 3 gen 40, step 368'], 'guide-05-seventy.webp': ['rules'],
  'guide-06-ranking.webp': ['seed 3, gen 1→2'], 'guide-06-mutation.webp': ['seed 3, gen 1→2'], 'guide-07-five-seeds.webp': ['seeds 1–5'],
  'guide-07-hill.webp': ['seeds 1–5', 'seed 1, gen 31'], 'guide-08-decision.webp': ['seed 3 gen 40, step 368'], 'guide-08-racing-lines.webp': ['seed 3 champions'],
  'guide-09-lap-chart.webp': ['seed 3, all generations', 'benchmarks', 'my Neon Loop lap'], 'guide-10-stacks.webp': ['rules'], 'guide-11-exam-lock.webp': ['rules'],
  'guide-11-my-laps.webp': ['my Exam laps'], 'guide-12-zero-of-four.webp': ['exam, three tracks'], 'guide-12-training-tracks.webp': ['track shapes'],
  'guide-12-four-of-four.webp': ['exam, four tracks'], 'guide-12-exam-retired.webp': ['rules'], 'guide-13-retro.webp': ['rules'], 'guide-14-editor.webp': ['rules'],
};
const pictureProblems = [];
{
  const paras = guides.simple.replace(/<!-- look-at-the-code[\s\S]*?<!-- \/look-at-the-code -->/g, '').split(/\n\s*\n/).map((p) => p.trim());
  paras.forEach((p, i) => {
    const m = /^!\[[^\]]*\]\(docs\/img\/([^)]+)\)$/.exec(p);
    if (!m) return;
    const pic = m[1], runsOf = PICTURES[pic];
    if (!runsOf) { pictureProblems.push(`${pic}: not in PICTURES (which step or run does it show?)`); return; }
    const above = paras[i - 1] ?? '', caption = /^\*.*\*$/.test(paras[i + 1] ?? '') ? paras[i + 1] : '';
    for (const [where, text] of [['the paragraph above', above], ['its caption', caption]]) {
      if (/^!\[/.test(text) || /^#/.test(text)) continue;
      // generation names ("generation 1 to 2", "generations 10, 20, 80 and 100") and list markers are labels, not facts
      const plainText = text.replace(/\]\([^)]*\)/g, ']').replace(/^\d+\. /gm, '').replace(/\bgen(?:eration)?s? \d+(?:(?:, | and | to )\d+)*/gi, 'gen');
      for (const n of plainText.match(/\d+(?:[.,-]\d+)*/g) ?? []) {
        const candidates = F.filter((f) => f.in.includes('simple') && f.says.includes(n));
        const elsewhere = F.filter((f) => f.says.includes(n)).map((f) => f.run);
        if (!candidates.length) pictureProblems.push(`${pic} (${runsOf.join(', ')}), ${where}: "${n}" ${elsewhere.length ? `comes from ${[...new Set(elsewhere)].join(', ')}` : 'is no fact of this list'}`);
        else if (!candidates.some((f) => f.run === 'rules' || runsOf.includes(f.run)))
          pictureProblems.push(`${pic} (${runsOf.join(', ')}), ${where}: "${n}" comes from ${[...new Set(candidates.map((f) => f.run))].join(', ')}`);
      }
    }
  });
}

// ---- check, write --------------------------------------------------------------------------------------------

const problems = [...pictureProblems];
for (const f of F) {
  f.ok = String(f.value) === f.says[0] && (!f.check || f.check());
  if (!f.ok) problems.push(`${f.chapter}: "${f.claim}" — the data gives ${f.value}`);
  for (const where of f.in) for (const s of f.says) if (!guides[where].includes(s)) problems.push(`${f.chapter}: ${where === 'simple' ? 'HOW-IT-WORKS.md' : 'DEEP-DIVE.md'} doesn't say "${s}"`);
}

// Part 2: every other number of the deep dive, section by section, with the sources the section names
const sections = guides.deep.split(/\n(?=## )/).slice(1).map((block) => {
  const title = block.split('\n')[0].replace(/^## /, '');
  const prose = block.replace(/<!-- full-code[\s\S]*?<!-- \/full-code -->/g, '').replace(/```[\s\S]*?```/g, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\([^)]*\.(md|js|json)[^)]*\)/g, '');
  const numbers = [...new Set(prose.match(/−?\d+(?:[.,]\d+)?(?:\s?(?:%|px|s\b|px\/s))?/g) ?? [])];
  const sources = [...new Set([...block.matchAll(/\*Reproduce it: (.*?)\*/g)].map((m) => m[1]))];
  return { title, numbers, sources };
});

const esc = (t) => String(t).replace(/\|/g, '\\|');
const out = [
  '# Guide fact check',
  '',
  'Generated by `node tools/guide-facts.js`, which works every fact out again from the code, the saved runs and the simulation, and checks that the guides say it. Don\'t edit by hand.',
  '',
  `**Part 1** has every claim of [HOW-IT-WORKS.md](HOW-IT-WORKS.md) and every claim of [DEEP-DIVE.md](DEEP-DIVE.md) that the video's corrections touched: ${F.length} facts, ${F.filter((f) => f.ok).length} confirmed. **Part 2** lists every other number of the deep dive, section by section, with the sources that section names.`,
  '',
  '## Part 1: checked facts',
  '',
  'Each fact also names the step or run it comes from. A number next to a picture of HOW-IT-WORKS.md (in its caption or in the paragraph right above it) must come from the same step or run as the picture, or be a rule of the game; the build fails otherwise.',
  '',
  '| chapter | claim | the guide says | worked out | step or run | source | ✓ |',
  '| --- | --- | --- | --- | --- | --- | --- |',
  ...F.map((f) => `| ${esc(f.chapter)} | ${esc(f.claim)} | ${f.says.map((s) => `"${esc(s)}"`).join(', ')} (${f.in.map((w) => (w === 'simple' ? 'simple' : 'deep')).join(' + ')}) | ${esc(f.value)} | ${esc(f.run)} | ${esc(f.source)} | ${f.ok ? '✓' : '✗'} |`),
  '',
  'Not numbers, but claims with a source too: the four steps of a neuron and the halfway mark (`neuron()`, `think()` in src/sim/brain.js); the elite copy that keeps the best result (`nextGeneration()` in src/sim/evolution.js); the held-out Exam (`refuseTraining()`, `unlockExam()` in src/sim/held-out.js); Claude Code wrote the code (PROMPTS.md, every entry). The explanations marked "our best explanation" are inferences, and the guides say so. The kinds of networks and of training (MLP, CNN, RNN, transformers; supervised, reinforcement, neuroevolution) are general definitions, not results of this project.',
  '',
  '## Part 2: the deep dive, section by section',
  '',
  ...sections.flatMap((s) => [`### ${s.title}`, '', `Numbers (${s.numbers.length}): ${s.numbers.join(' · ') || '—'}`, '', s.sources.length ? `Sources named in this section: ${s.sources.join('; ')}` : 'No "Reproduce it" note in this section: its numbers are definitions from the code (constants and functions it names) or repeat numbers sourced in earlier sections.', '']),
];
writeFileSync(new URL('guide-facts.md', root), out.join('\n'));
if (problems.length) {
  console.error(`guide-facts.md written, but:\n${problems.map((p) => `  ✗ ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(`guide-facts.md: ${F.length} facts confirmed, every picture's numbers from its own step or run, ${sections.length} deep-dive sections listed`);
