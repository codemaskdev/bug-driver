// The SHA-256 fingerprint of the Step 7 tracks' data, as pre-registered in DEVLOG.md.
// If these tracks ever change, this fingerprint changes and tests/tracks.test.js fails.
// Run with: node tools/track-hash.js

import { createHash } from 'node:crypto';
import { TRACKS } from '../src/sim/track.js';

export const STEP7_TRACKS = ['neon-loop-mirrored', 'zigzag', 'wide-sweepers', 'exam'];

// The data, written out in a fixed order (id, name, width, points), so the fingerprint never depends on formatting
export function trackData(ids = STEP7_TRACKS) {
  return JSON.stringify(ids.map((id) => {
    const t = TRACKS.find((x) => x.id === id);
    return { id: t.id, name: t.name, width: t.width, points: t.points };
  }));
}

export function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

if (process.argv[1]?.endsWith('track-hash.js')) {
  for (const id of STEP7_TRACKS) console.log(`${id.padEnd(20)} ${sha256(trackData([id]))}`);
  console.log(`${'all four'.padEnd(20)} ${sha256(trackData())}`);
}
