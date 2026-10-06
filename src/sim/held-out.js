// Exam is held out. Nobody trains on it, ever, and until my own Exam lap is saved
// (ghosts/me-exam.json) no AI car drives it at all. It can't be opened in the track editor
// or put in a share link either. Everything that could put it in front of an AI asks here first.
// Once my Exam ghost is checked (unlockExam), saved champions may be tested and raced there.
// Training on it stays refused, always.

import { TRACKS, trackDef, buildTrack } from './track.js';
import { replayGhost } from './ghost.js';
import { COUNTED_LAPS } from './exam.js';

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

const isExamTrack = (track) => track.id === HELD_OUT_ID || track.key.startsWith(`${HELD_OUT_ID}-`);
let examUnlocked = false;

// My Exam lap is saved: check it really is (this exact track and physics, my first 3 counted laps,
// and it replays to its own lap time), then let saved champions be tested and raced on Exam.
export function unlockExam(ghost) {
  const exam = buildTrack(trackDef(HELD_OUT_ID));
  const replay = replayGhost(exam, ghost);
  const ok = ghost.track === exam.key && ghost.countedLaps?.length === COUNTED_LAPS
    && ghost.steps === Math.min(...ghost.countedLaps) && replay.finished && replay.steps === ghost.steps;
  if (!ok) throw new Error('this is not a valid ghosts/me-exam.json: Exam stays locked');
  examUnlocked = true;
}
export const examIsUnlocked = () => examUnlocked;

// Throws for a built track that is Exam, until unlockExam() (used before any AI car is put on a track).
export function refuseHeldOut(track) {
  if (isExamTrack(track) && !examUnlocked) {
    throw new Error('Exam is held out: no AI car drives it until my Exam lap is saved (ghosts/me-exam.json)');
  }
}

// Throws for Exam, always: nobody trains on it, ever (used by every evolution).
export function refuseTraining(track) {
  if (isExamTrack(track)) throw new Error('Exam is held out: nobody trains on it, ever');
}
