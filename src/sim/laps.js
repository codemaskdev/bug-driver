// Lap counting with invisible checkpoints.
// A lap only counts if the car crosses every checkpoint, in order, in the
// driving direction, and then the start/finish line (checkpoint 0).
// Skipping one (a shortcut) or driving the wrong way never completes a lap.

import { segmentHit } from './geometry.js';
import { carState } from './car.js';

export function createLaps() {
  return {
    started: false,     // the timer starts when the car first crosses the start line
    nextCheckpoint: 0,  // index of the checkpoint the car has to cross next
    checkpointsPassed: 0, // total, across laps: how far the car got
    laps: 0,            // completed laps
    lapSteps: 0,        // steps since the current lap started
    inputs: [],         // the input of every step of the current lap (for the ghost)
    lapStart: null,     // the car's exact state when the current lap started
  };
}

// Did the car's center cross this checkpoint during the last step, moving forward along the track?
export function crossedCheckpoint(car, cp) {
  const dx = car.x - car.prevX, dy = car.y - car.prevY;
  if (dx * cp.tx + dy * cp.ty <= 0) return false; // moving backward along the track
  return segmentHit(car.prevX, car.prevY, car.x, car.y, cp.ax, cp.ay, cp.bx, cp.by) >= 0;
}

// Call once per step, after the car moved. Returns a finished lap {steps, inputs, start} or null.
export function updateLaps(laps, car, input, track) {
  if (laps.started) {
    laps.lapSteps++;
    laps.inputs.push(input);
  }

  let finished = null;
  const cps = track.checkpoints;
  // A loop, in case one step crosses two checkpoints that sit close together on a tight inside line
  for (let guard = 0; guard < cps.length; guard++) {
    if (!crossedCheckpoint(car, cps[laps.nextCheckpoint])) break;
    if (laps.nextCheckpoint === 0) {
      if (laps.started) {
        laps.laps++;
        finished = { steps: laps.lapSteps, inputs: laps.inputs, start: laps.lapStart };
      }
      laps.started = true;
      laps.lapSteps = 0;
      laps.inputs = [];
      laps.lapStart = carState(car);
    }
    laps.checkpointsPassed++;
    laps.nextCheckpoint = (laps.nextCheckpoint + 1) % cps.length;
  }
  return finished;
}
