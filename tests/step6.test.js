// Step 6 checks: every race against my ghost ends with exactly the recorded lap
// times, and the scoreboard (built only from the saved files) comes out 4:2 to the AI.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TRACKS, buildTrack } from '../src/sim/track.js';
import { STEPS_PER_SECOND } from '../src/sim/constants.js';
import { createRace, runRace, stepRace, raceResult, raceGap, championBestLap } from '../src/sim/race.js';
import { buildScoreboard } from '../src/sim/scoreboard.js';

const track = buildTrack(TRACKS[0]);
const json = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url)));
const ghost = json('ghosts/me-v3.json');
const champions = json('champions/seed-3.json').champions;

test('each race ends with exactly the recorded lap times: my 1584 steps vs the champion\'s best lap', () => {
  for (const [generation, champ] of Object.entries(champions)) {
    const race = runRace(createRace(track, ghost, { generation: +generation, brain: champ.brain }));
    const res = raceResult(race);
    assert.equal(race.me.finishSteps, ghost.steps, `gen ${generation}: my lap`);
    assert.equal(race.ai.finishSteps, champ.lapSteps, `gen ${generation}: its lap`);
    if (champ.lapSteps !== null) {
      assert.equal(res.by, Math.abs(ghost.steps - champ.lapSteps) / STEPS_PER_SECOND);
      assert.equal(res.winner, champ.lapSteps < ghost.steps ? 'ai' : 'me');
    }
  }
});

test('the AI races its best lap, not its first one: gen 40 drives 12.53 s, not its standing-start 12.78 s', () => {
  const best = championBestLap(track, champions['40'].brain);
  assert.equal(best.steps, 752);
  const race = runRace(createRace(track, ghost, { generation: 40, brain: champions['40'].brain }));
  assert.equal(race.ai.finishSteps, 752);
});

test('a champion that never finished a lap drives until it is out, and I win by default', () => {
  assert.equal(champions['1'].lapSteps, null);
  const race = runRace(createRace(track, ghost, { generation: 1, brain: champions['1'].brain }));
  const res = raceResult(race);
  assert.equal(res.winner, 'me');
  assert.equal(res.aiSteps, null);
  assert.ok(['crash', 'stall'].includes(res.aiOut));
  assert.ok(res.aiProgress > 0 && res.aiProgress < 1);
});

test('the scoreboard, built from the files, is me, me, AI, AI, AI, AI: 4:2 to the AI', () => {
  const board = buildScoreboard(ghost, champions);
  assert.deepEqual(board.rows.map((r) => r.generation), [1, 5, 10, 20, 40, 80]);
  assert.deepEqual(board.rows.map((r) => r.winner), ['me', 'me', 'ai', 'ai', 'ai', 'ai']);
  assert.deepEqual(board.total, { me: 2, ai: 4 });
  assert.deepEqual(board.rows.at(-1).score, { me: 2, ai: 4 });
});

test('the live gap: AI ahead in a race it wins, me ahead in one I win, and it ends at the real margin', () => {
  const gap = (generation, atStep) => {
    const race = createRace(track, ghost, { generation, brain: champions[generation].brain });
    while (race.step < atStep && !race.over) stepRace(race);
    return raceGap(race);
  };
  assert.equal(gap('10', 700).ahead, 'ai');
  assert.equal(gap('5', 1500).ahead, 'me');
  // when the faster car crosses the line, the gap is how long the other one still needs... at most the final margin
  const g = gap('10', 790);
  assert.ok(g.seconds > 0 && g.seconds <= (ghost.steps - 790) / STEPS_PER_SECOND + 1e-9, `gap ${g.seconds}`);
});
