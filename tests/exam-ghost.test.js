// My official Exam lap (ghosts/me-exam.json, 32.02 s) must replay headless to the exact step,
// and it must be the best of my first 3 counted laps on Exam. Only my ghost drives here: no brain.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { trackDef, buildTrack } from '../src/sim/track.js';
import { replayGhost } from '../src/sim/ghost.js';
import { PHYSICS_VERSION } from '../src/sim/constants.js';
import { COUNTED_LAPS } from '../src/sim/exam.js';

const exam = buildTrack(trackDef('exam'));
const ghost = JSON.parse(readFileSync(new URL('../ghosts/me-exam.json', import.meta.url)));

test('my Exam ghost is the best of my first 3 counted laps, for this exact track and physics', () => {
  assert.equal(ghost.track, exam.key);
  assert.equal(ghost.physicsVersion, PHYSICS_VERSION);
  assert.equal(ghost.countedLaps.length, COUNTED_LAPS);
  assert.equal(ghost.steps, Math.min(...ghost.countedLaps));
  assert.equal(ghost.inputs.length, ghost.steps);
  assert.deepEqual(ghost.countedLaps, [3242, 2658, 1921]);
});

test('my Exam ghost replays headless to the exact same lap time, to the step', () => {
  const result = replayGhost(exam, ghost);
  assert.deepEqual(result, { finished: true, steps: 1921, atInput: 1921 });
});
