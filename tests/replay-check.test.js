// The replay check (tools/replay-check.js) as part of npm test: every scenario must match
// tools/replay-golden.json exactly. Only an intentional change may update it (--update), with a DEVLOG note.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runScenarios, compareWithGolden } from '../tools/replay-check.js';

test('replay check: my ghost, three champion laps, 3 generations of seed 3, and a shared custom track match the golden results', () => {
  const golden = JSON.parse(readFileSync(new URL('../tools/replay-golden.json', import.meta.url), 'utf8'));
  const changed = compareWithGolden(runScenarios(), golden).filter((r) => !r.ok);
  assert.deepEqual(changed, []);
  assert.equal(Object.keys(golden).length, 6);
});
