// Step 7 checks: my Exam record keeps exactly my first 3 completed laps, and the champions'
// results on the new tracks are reproducible (the pre-registered tests give the same answer twice).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TRACKS, buildTrack } from '../src/sim/track.js';
import { emptyExamRecord, countExamLap, bestExamLap, examGhost } from '../src/sim/exam.js';
import { trialRun } from '../tools/generalization-report.js';

test('Exam: only the first 3 completed laps count, and the best of them is my time', () => {
  const rec = emptyExamRecord('exam-key');
  const lap = (steps) => ({ steps, start: { x: 0, y: 0, angle: 0, speed: 0, steer: 0 }, inputs: '1'.repeat(steps) });
  assert.equal(bestExamLap(rec), null);
  assert.equal(countExamLap(rec, lap(2000)), true);
  assert.equal(countExamLap(rec, lap(1800)), true);
  assert.equal(countExamLap(rec, lap(1900)), true);
  assert.equal(countExamLap(rec, lap(1500)), false); // a 4th lap, however fast, doesn't count
  assert.equal(bestExamLap(rec).steps, 1800);
  const ghost = examGhost(rec, 3);
  assert.deepEqual(ghost.countedLaps, [2000, 1800, 1900]);
  assert.equal(ghost.steps, 1800);
  assert.equal(ghost.track, 'exam-key');
});

test('the Step 7a results are reproducible: runs/step7a.json equals a fresh run of the same tests', () => {
  const saved = JSON.parse(readFileSync(new URL('../runs/step7a.json', import.meta.url))).results;
  for (const r of saved) {
    assert.notEqual(r.track, 'exam'); // held out
    const brain = JSON.parse(readFileSync(new URL(`../champions/seed-${r.seed}.json`, import.meta.url))).champions[r.generation].brain;
    const again = trialRun(brain, buildTrack(TRACKS.find((t) => t.id === r.track)));
    assert.deepEqual({ lap: again.lapSteps, out: again.out, progress: again.progress }, { lap: r.lapSteps, out: r.out, progress: r.progress }, `${r.track} seed ${r.seed} gen ${r.generation}`);
  }
});
