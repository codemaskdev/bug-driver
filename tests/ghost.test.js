// The official ghost of my best lap (ghosts/me-v3.json) must replay to the exact same lap time.
// If this ever fails, the physics or the track changed: the ghost (and all training) is invalid.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TRACKS, buildTrack } from '../src/sim/track.js';
import { replayGhost } from '../src/sim/ghost.js';

const track = buildTrack(TRACKS[0]);
const ghost = JSON.parse(readFileSync(new URL('../ghosts/me-v3.json', import.meta.url)));

test('my ghost lap replays headless to the exact same lap time, to the step', () => {
  const result = replayGhost(track, ghost);
  assert.equal(result.finished, true, `ghost did not finish: ${JSON.stringify(result)}`);
  assert.equal(result.steps, ghost.steps);
  assert.equal(result.atInput, ghost.inputs.length); // the lap ends on the very last recorded input
});
