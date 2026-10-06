// Exam opens for testing champions only after my Exam ghost is checked, and never for training.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TRACKS, trackDef, buildTrack } from '../src/sim/track.js';
import { unlockExam, examIsUnlocked } from '../src/sim/held-out.js';
import { createGeneration } from '../src/sim/generation.js';
import { createEvolution } from '../src/sim/evolution.js';
import { createMultiEvolution } from '../src/sim/multi-evolution.js';

const exam = buildTrack(trackDef('exam'));
const ghost = JSON.parse(readFileSync(new URL('../ghosts/me-exam.json', import.meta.url)));

test('Exam stays locked until a real Exam ghost unlocks it; it never opens for training', () => {
  assert.throws(() => createGeneration(exam, []), /held out/);
  assert.throws(() => unlockExam({ ...ghost, steps: ghost.steps - 1, countedLaps: [3242, 2658, 1920] }), /not a valid/);
  assert.throws(() => unlockExam({ ...ghost, countedLaps: [1921] }), /not a valid/);
  assert.equal(examIsUnlocked(), false);

  unlockExam(ghost);
  assert.equal(examIsUnlocked(), true);
  assert.doesNotThrow(() => createGeneration(exam, [])); // champions may now be tested there
  assert.throws(() => createEvolution(exam, 3), /nobody trains on it/);
  assert.throws(() => createMultiEvolution([buildTrack(TRACKS[0]), exam], 3), /nobody trains on it/);
});
