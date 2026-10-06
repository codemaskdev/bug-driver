// Bug Driver
// Plain canvas + vanilla JS ES modules, no build step.
// Serve the folder (npx serve) and open index.html to play.
//
//   sim/     the simulation: track, car physics, laps. No DOM, runs in Node too.
//   render/  drawing: canvas, track image, car sprite, sparks, HUD
//   game/    browser glue: keyboard, saving the best lap

import { STEP } from './sim/constants.js';
import { TRACKS, buildTrack } from './sim/track.js';
import { createWorld, stepWorld, restartWorld } from './sim/world.js';
import { ctx } from './render/canvas.js';
import { renderTrack } from './render/track-view.js';
import { drawCar } from './render/car-sprite.js';
import { burstSparks, clearSparks, drawSparks } from './render/sparks.js';
import { drawHud } from './render/hud.js';
import { readInput, takeRestart } from './game/keyboard.js';
import { loadBestLap, saveBestLap } from './game/best-lap.js';

const track = buildTrack(TRACKS[0]);
const trackImage = renderTrack(track);
const world = createWorld(track);

let best = loadBestLap(track);
let lastSteps = null;
let newBestFor = 0; // seconds left to show "NEW BEST LAP"

function handle(events) {
  for (const e of events) {
    if (e.type === 'crash') burstSparks(e.x, e.y, world.step);
    if (e.type === 'lap') {
      lastSteps = e.steps;
      if (!best || e.steps < best.steps) {
        best = { steps: e.steps, start: e.start, inputs: e.inputs };
        saveBestLap(track, best);
        newBestFor = 2;
      }
    }
  }
}

// Fixed timestep: the simulation always advances in 1/60 s steps; the screen
// just draws whatever the latest state is, however fast it refreshes.
let acc = 0;
let lastTime = performance.now();

function frame(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000); // after a long pause, don't try to catch up
  lastTime = now;
  acc += dt;

  if (takeRestart()) {
    restartWorld(world);
    clearSparks();
    acc = 0;
  }
  while (acc >= STEP) {
    handle(stepWorld(world, readInput()));
    acc -= STEP;
  }
  newBestFor = Math.max(0, newBestFor - dt);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(trackImage, 0, 0, trackImage.width * 2, trackImage.height * 2);
  drawCar(world.car, acc / STEP);
  drawSparks(dt);
  drawHud({
    trackName: track.name,
    laps: world.laps.laps,
    lapSteps: world.laps.lapSteps,
    started: world.laps.started,
    lastSteps,
    bestSteps: best ? best.steps : null,
    newBestFor,
    crashed: world.car.crashed,
  });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// For in-browser checks and, later, autoplay tooling
export { world, track };
