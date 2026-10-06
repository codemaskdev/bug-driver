// Exam is held out. Nobody trains on it, ever, and until my own Exam lap is saved
// (ghosts/me-exam.json) no AI car drives it at all. It can't be opened in the track editor
// or put in a share link either. Everything that could put it in front of an AI asks here first.

import { TRACKS } from './track.js';

export const HELD_OUT_ID = 'exam';
const EXAM_POINTS = TRACKS.find((t) => t.id === HELD_OUT_ID).points;

// The points as one text, in sorted order: the same shape gives the same text, whatever the start point or direction.
function shapeOf(points) {
  return points.map((p) => `${p[0]},${p[1]}`).sort().join(';');
}

// True for a list of points that is exactly Exam's (in any order, from any start point).
export function isExamShape(points) {
  return shapeOf(points) === shapeOf(EXAM_POINTS);
}

// True for Exam itself, and for a copy of it under another name.
export function isHeldOut(def) {
  return def.id === HELD_OUT_ID || isExamShape(def.points);
}

// Throws for a built track that is Exam (used before any AI car is put on a track).
export function refuseHeldOut(track) {
  if (track.id === HELD_OUT_ID || track.key.startsWith(`${HELD_OUT_ID}-`)) {
    throw new Error('Exam is held out: no AI car drives it until my Exam lap is saved (ghosts/me-exam.json)');
  }
}
