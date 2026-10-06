// Step 7b, part 3: the exam. Run only now, after my Exam lap was saved (ghosts/me-exam.json).
// The old one-track seed 3 champions (gens 10, 20, 80) and the multi-track ones (gens 10, 20, 80, 100)
// each drive Exam and Neon Loop Mirrored alone, under the evolution rules (as in Step 7a).
// Then my Exam ghost races the best of them on Exam: best lap vs best lap, as in every race.
// Nothing trains on Exam: these are saved champions, unchanged. Writes runs/exam.json.
// Run with: node tools/exam-report.js

import { readFileSync, writeFileSync } from 'node:fs';
import { trackDef, buildTrack } from '../src/sim/track.js';
import { STEPS_PER_SECOND } from '../src/sim/constants.js';
import { unlockExam } from '../src/sim/held-out.js';
import { createGeneration, stepGeneration } from '../src/sim/generation.js';
import { createRace, runRace, raceResult } from '../src/sim/race.js';
import { trialRun } from './generalization-report.js';

const root = new URL('../', import.meta.url);
const json = (path) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const ghost = json('ghosts/me-exam.json');
unlockExam(ghost); // throws unless it's my real Exam lap

const CARS = [
  ...[10, 20, 80].map((g) => ({ name: `3-${g}`, label: `seed 3 · gen ${g} (one track)`, multi: false, generation: g })),
  ...[10, 20, 80, 100].map((g) => ({ name: `3-multi-${g}`, label: `seed 3 · gen ${g} (three tracks)`, multi: true, generation: g })),
];
const files = { false: json('champions/seed-3.json').champions, true: json('champions/seed-3-multi.json').champions };
const TRACKS = ['exam', 'neon-loop-mirrored'];

// How it drove: its lowest speed once it got going, how many steps it spent reversing, and where it first stopped dead
function behaviour(brain, track) {
  const gen = createGeneration(track, [brain]);
  let minSpeed = Infinity, reverseSteps = 0, firstStop = null, moving = false;
  while (!gen.over) {
    stepGeneration(gen);
    const c = gen.cars[0].world.car;
    if (c.crashed) break;
    if (c.speed > 200) moving = true; // off the start line and up to speed
    if (moving) minSpeed = Math.min(minSpeed, c.speed); // after the start: its slowest moment on the road
    if (c.speed < 0) reverseSteps++;
    if (moving && !firstStop && c.speed <= 0) firstStop = { seconds: +(gen.step / STEPS_PER_SECOND).toFixed(2), x: Math.round(c.x), y: Math.round(c.y) };
  }
  return { minSpeed: +minSpeed.toFixed(1), reverseSteps, firstStop };
}

const results = [];
for (const id of TRACKS) {
  const track = buildTrack(trackDef(id));
  for (const c of CARS) {
    const champ = files[c.multi][c.generation];
    const r = { track: id, ...c, id: champ.id, ...trialRun(champ.brain, track), ...behaviour(champ.brain, track) };
    results.push(r);
    const what = r.lapSeconds !== null ? `best lap ${r.lapSeconds} s (${r.laps} laps), out by ${r.out} at ${r.outSeconds} s`
      : `${r.progress}% of a lap, out by ${r.out} at ${r.outSeconds} s, at (${r.where.x}, ${r.where.y})`;
    console.log(`${id.padEnd(19)} ${c.label.padEnd(30)} ${what} · min speed ${r.minSpeed} · reversing ${r.reverseSteps} steps${r.firstStop ? ` · first dead stop at ${r.firstStop.seconds} s (${r.firstStop.x}, ${r.firstStop.y})` : ''}`);
  }
}

// The best of them on Exam: the fastest best lap; if nobody finishes a lap, the one that got furthest
const onExam = results.filter((r) => r.track === 'exam');
const best = onExam.filter((r) => r.lapSteps !== null).sort((a, b) => a.lapSteps - b.lapSteps)[0]
  ?? onExam.slice().sort((a, b) => b.progress - a.progress)[0];
const exam = buildTrack(trackDef('exam'));
const race = runRace(createRace(exam, ghost, { generation: best.generation, brain: files[best.multi][best.generation].brain }));
const result = raceResult(race);
console.log(`\nthe race on Exam: me (${(ghost.steps / STEPS_PER_SECOND).toFixed(2)} s) vs ${best.label}:`, JSON.stringify(result));
console.log(`watch it: index.html?race=exam&champion=${best.name}`);

writeFileSync(new URL('runs/exam.json', root), JSON.stringify({
  me: { steps: ghost.steps, seconds: +(ghost.steps / STEPS_PER_SECOND).toFixed(2), countedLaps: ghost.countedLaps },
  results,
  race: { champion: best.name, link: `index.html?race=exam&champion=${best.name}`, ...result, by: result.by === null ? null : +result.by.toFixed(2), aiProgress: result.aiProgress ?? null },
}, null, 1) + '\n');
