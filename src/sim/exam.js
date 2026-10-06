// My drive on the held-out Exam track: only my first 3 completed laps count, and my
// Exam time is the best of those three. Crashed attempts are not laps. Laps after the
// third still happen in the game but never change the record.

export const COUNTED_LAPS = 3;

export function emptyExamRecord(trackKey) {
  return { track: trackKey, laps: [] }; // each lap: {steps, start, inputs (hex string)}
}

// Adds a completed lap if fewer than 3 have counted so far. Returns true if it counted.
export function countExamLap(record, lap) {
  if (record.laps.length >= COUNTED_LAPS) return false;
  record.laps.push({ steps: lap.steps, start: lap.start, inputs: lap.inputs });
  return true;
}

// The best of the counted laps, or null before the first one.
export function bestExamLap(record) {
  return record.laps.reduce((best, lap) => (!best || lap.steps < best.steps ? lap : best), null);
}

// The ghost file for my Exam drive (ghosts/me-exam.json): the same format as ghosts/me-v3.json,
// plus the times of all counted laps, in the order I drove them.
export function examGhost(record, physicsVersion) {
  const best = bestExamLap(record);
  return {
    name: 'me',
    note: 'My Exam drive: the best of my first 3 completed laps on the held-out Exam track. inputs: one hex digit per 1/60 s step, bits 1=gas 2=brake 4=left 8=right.',
    physicsVersion,
    track: record.track,
    steps: best.steps,
    seconds: best.steps / 60,
    countedLaps: record.laps.map((l) => l.steps),
    start: best.start,
    inputs: best.inputs,
  };
}
