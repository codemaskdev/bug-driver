// Step 7b part 3, the exam: every result in runs/exam.json reproduces when the champion drives
// again, and so does the race against my Exam ghost. Saved champions only: nothing trains on Exam.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { trackDef, buildTrack } from '../src/sim/track.js';
import { unlockExam } from '../src/sim/held-out.js';
import { createRace, runRace, raceResult } from '../src/sim/race.js';
import { trialRun } from '../tools/generalization-report.js';

const json = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url)));
const ghost = json('ghosts/me-exam.json');
const report = json('runs/exam.json');
const files = { false: json('champions/seed-3.json').champions, true: json('champions/seed-3-multi.json').champions };
unlockExam(ghost);

test('every exam result reproduces to the step', () => {
  assert.equal(report.results.length, 14);
  for (const r of report.results) {
    const again = trialRun(files[r.multi][r.generation].brain, buildTrack(trackDef(r.track)));
    assert.deepEqual({ lapSteps: again.lapSteps, out: again.out, outSeconds: again.outSeconds, progress: again.progress },
      { lapSteps: r.lapSteps, out: r.out, outSeconds: r.outSeconds, progress: r.progress }, `${r.name} on ${r.track}`);
  }
});

test('the race on Exam: my ghost against the best champion there, best lap vs best lap', () => {
  const best = report.results.find((r) => r.track === 'exam' && r.name === report.race.champion);
  const race = runRace(createRace(buildTrack(trackDef('exam')), ghost, { generation: best.generation, brain: files[best.multi][best.generation].brain }));
  const result = raceResult(race);
  assert.equal(result.meSteps, 1921);
  assert.equal(result.aiSteps, report.race.aiSteps);
  assert.equal(result.winner, report.race.winner);
});
