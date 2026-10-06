// Step 7c checks (pre-registered in DEVLOG.md): four training tracks, fitness = the sum of the four,
// Exam never one of them; the saved champions drive their recorded laps again; and every result of
// the one Exam test (runs/exam-7c.json), including the race against my Exam ghost, reproduces.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { trackDef, buildTrack } from '../src/sim/track.js';
import { fitness, createGeneration, runGeneration } from '../src/sim/generation.js';
import { createMultiEvolution, runMultiGeneration } from '../src/sim/multi-evolution.js';
import { unlockExam } from '../src/sim/held-out.js';
import { createRace, runRace, raceResult } from '../src/sim/race.js';
import { trialRun } from '../tools/generalization-report.js';

const TRAINING = ['neon-loop', 'neon-loop-mirrored', 'zigzag', 'wide-sweepers'];
const tracks = TRAINING.map((id) => buildTrack(trackDef(id)));
const json = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url)));
const championsFile = new URL('../champions/seed-3-multi4.json', import.meta.url);
const examFile = new URL('../runs/exam-7c.json', import.meta.url);

test('four training tracks, fitness = the sum of the four, and Exam is not one of them', () => {
  const evo = createMultiEvolution(tracks, 3);
  const cars = runMultiGeneration(evo);
  for (const c of cars) assert.equal(c.fitness, c.perTrack.reduce((s, x) => s + fitness(x), 0));
  assert.deepEqual(evo.tracks.map((t) => t.id), TRAINING);
  assert.throws(() => createMultiEvolution([...tracks, buildTrack(trackDef('exam'))], 3), /nobody trains on it/);
});

test('every saved four-track champion, alone, drives exactly its recorded lap on each training track', { skip: !existsSync(championsFile) }, () => {
  const champions = JSON.parse(readFileSync(championsFile)).champions;
  assert.deepEqual(Object.keys(champions), ['1', '5', '10', '20', '40', '80', '100']);
  for (const [generation, champ] of Object.entries(champions)) {
    assert.deepEqual(Object.keys(champ.lapSteps), TRAINING);
    let sum = 0;
    tracks.forEach((t) => {
      const car = runGeneration(createGeneration(t, [champ.brain])).cars[0];
      assert.equal(car.bestLapSteps, champ.lapSteps[t.id], `gen ${generation} on ${t.id}`);
      sum += fitness(car);
    });
    assert.ok(Math.abs(sum - champ.fitness) < 1e-9, `gen ${generation} fitness ${sum} vs ${champ.fitness}`);
  }
});

test('the Step 7c Exam results and the race reproduce to the step', { skip: !existsSync(examFile) }, () => {
  const report = JSON.parse(readFileSync(examFile));
  const champions = JSON.parse(readFileSync(championsFile)).champions;
  const ghost = json('ghosts/me-exam.json');
  unlockExam(ghost);
  const exam = buildTrack(trackDef('exam'));
  for (const r of report.rows) {
    const again = trialRun(champions[String(r.generation)].brain, exam);
    assert.deepEqual({ lapSteps: again.lapSteps, out: again.out, outSeconds: again.outSeconds, progress: again.progress },
      { lapSteps: r.exam.lapSteps, out: r.exam.out, outSeconds: r.exam.outSeconds, progress: r.exam.progress }, `gen ${r.generation} on Exam`);
  }
  const best = report.rows.find((r) => r.name === report.race.champion);
  const result = raceResult(runRace(createRace(exam, ghost, { generation: best.generation, brain: champions[String(best.generation)].brain })));
  assert.equal(result.winner, report.race.winner);
  assert.equal(result.meSteps, 1921);
  assert.equal(result.aiSteps, report.race.aiSteps);
});
