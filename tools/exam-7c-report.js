// Step 7c, as pre-registered in DEVLOG.md: the four-track champions (champions/seed-3-multi4.json)
// on their 4 training tracks and, once, on Exam. Then my Exam ghost races the best of them on Exam.
// Nothing trains on Exam: these are saved champions, unchanged. Writes runs/exam-7c.json.
//   node tools/exam-7c-report.js           the Step 7c test (run once, after training)
//   node tools/exam-7c-report.js multi     the same report for the Step 7b champions, printed only:
//                                          a check of this tool against results we already have

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

const NAME = process.argv[2] ?? 'multi4';
const TRAINING = { multi: ['neon-loop', 'zigzag', 'wide-sweepers'], multi4: ['neon-loop', 'neon-loop-mirrored', 'zigzag', 'wide-sweepers'] }[NAME];
if (!TRAINING) throw new Error(`unknown champions file "${NAME}"`);
const champions = json(`champions/seed-3-${NAME}.json`).champions;
const GENERATIONS = ['1', '5', '10', '20', '40', '80', '100'];

// How it drove: its lowest speed once up to speed, how long it reversed, and where it first stopped dead
function behaviour(brain, track) {
  const gen = createGeneration(track, [brain]);
  let minSpeed = Infinity, reverseSteps = 0, firstStop = null, moving = false;
  while (!gen.over) {
    stepGeneration(gen);
    const c = gen.cars[0].world.car;
    if (c.crashed) break;
    if (c.speed > 200) moving = true; // off the start line and up to speed
    if (moving) minSpeed = Math.min(minSpeed, c.speed);
    if (c.speed < 0) reverseSteps++;
    if (moving && !firstStop && c.speed <= 0) firstStop = { seconds: +(gen.step / STEPS_PER_SECOND).toFixed(2), x: Math.round(c.x), y: Math.round(c.y) };
  }
  return { minSpeed: minSpeed === Infinity ? null : +minSpeed.toFixed(1), reverseSteps, firstStop };
}
const say = (r) => (r.lapSeconds !== null ? `${r.lapSeconds} s (${r.laps} laps)` : `${r.out} at ${r.progress}% (${r.outSeconds} s)`);

const rows = GENERATIONS.map((g) => {
  const brain = champions[g].brain;
  const training = Object.fromEntries(TRAINING.map((id) => [id, trialRun(brain, buildTrack(trackDef(id)))]));
  const exam = { ...trialRun(brain, buildTrack(trackDef('exam'))), ...behaviour(brain, buildTrack(trackDef('exam'))) };
  console.log(`gen ${g.padEnd(3)} ${TRAINING.map((id) => `${id} ${say(training[id])}`).join(' · ')}  ||  EXAM ${say(exam)}${exam.lapSeconds === null ? ` at (${exam.where.x}, ${exam.where.y}), min speed ${exam.minSpeed}, reversing ${exam.reverseSteps} steps` : ''}`);
  return { generation: Number(g), name: `3-${NAME}-${g}`, id: champions[g].id, training, exam };
});

// The best of them on Exam: the fastest best lap; if nobody finishes a lap, the one that got furthest
const best = rows.filter((r) => r.exam.lapSteps !== null).sort((a, b) => a.exam.lapSteps - b.exam.lapSteps)[0]
  ?? rows.slice().sort((a, b) => b.exam.progress - a.exam.progress)[0];
const race = runRace(createRace(buildTrack(trackDef('exam')), ghost, { generation: best.generation, brain: champions[String(best.generation)].brain }));
const result = raceResult(race);
console.log(`\nthe race on Exam: me (${(ghost.steps / STEPS_PER_SECOND).toFixed(2)} s) vs ${best.name}:`, JSON.stringify(result));
console.log(`watch it: index.html?race=exam&champion=${best.name}`);

if (NAME === 'multi4') {
  writeFileSync(new URL('runs/exam-7c.json', root), JSON.stringify({
    preRegistered: 'DEVLOG.md, Step 7c pre-registration (commit 41039bd)',
    note: 'The second time Exam is used for testing; Step 7c was decided after seeing the first exam.',
    me: { steps: ghost.steps, seconds: +(ghost.steps / STEPS_PER_SECOND).toFixed(2) },
    training: TRAINING, rows,
    race: { champion: best.name, link: `index.html?race=exam&champion=${best.name}`, ...result, by: result.by === null ? null : +result.by.toFixed(2), aiProgress: result.aiProgress ?? null },
  }, null, 1) + '\n');
}
