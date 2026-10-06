// Bug Driver
// Plain canvas + vanilla JS ES modules, no build step.
// Serve the folder (npx serve) and open index.html to play,
// or index.html?autoplay=1&seed=42 to watch the AI from the start.
//
//   sim/     the simulation: track, car physics, laps, sensors, brain, generations. No DOM, runs in Node too.
//   render/  drawing: canvas, track image, car sprite, rays, sparks, HUD, explain panels
//   game/    browser glue: keyboard, URL options, saving the best lap
//
// Two modes, switched with Tab: "I drive" (arrows, lap timer, ghost recording)
// and "AI drives" (100 cars with neural-network brains).

import { STEP } from './sim/constants.js';
import { TRACKS, buildTrack } from './sim/track.js';
import { createWorld, stepWorld, restartWorld } from './sim/world.js';
import { readSensors, getInputs } from './sim/sensors.js';
import { outputs } from './sim/brain.js';
import { makeRng } from './sim/rng.js';
import {
  createGeneration, randomBrains, stepGeneration, aliveCount, leaderOf, progressPercent,
} from './sim/generation.js';
import { ctx } from './render/canvas.js';
import { renderTrack } from './render/track-view.js';
import { drawCar, smoothPose } from './render/car-sprite.js';
import { drawRays } from './render/rays.js';
import { drawExplainPanel, drawOutputsPanel } from './render/explain-panel.js';
import { burstSparks, clearSparks, drawSparks } from './render/sparks.js';
import { drawHud, drawAiHud, drawMaxSpeedScreen } from './render/hud.js';
import { readInput, takePress, clearPresses } from './game/keyboard.js';
import { loadBestLap, saveBestLap } from './game/best-lap.js';
import { AUTOPLAY, SEED } from './game/params.js';

const track = buildTrack(TRACKS[0]);
const trackImage = renderTrack(track);

let mode = AUTOPLAY ? 'ai' : 'drive';
let explain = false; // E: show the real sensor (and brain) numbers

// ---------- I drive ----------
const world = createWorld(track);
let best = loadBestLap(track);
let lastSteps = null;
let newBestFor = 0; // seconds left to show "NEW BEST LAP"

function handleDriveEvents(events) {
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

// ---------- AI drives ----------
const SPEEDS = { Digit1: 1, Digit2: 10, Digit3: 'max' };
const MAX_FRAME_MS = 12;          // at max speed, simulate this long per frame, then let the page breathe
const AUTOPLAY_PAUSE = 4;         // autoplay: seconds to show the result before running again
const ai = { gen: null, speed: 1, overFor: 0 };

// Generation 1: 100 random brains from the seeded random generator. Same seed, same 100 brains.
function startGeneration1() {
  ai.gen = createGeneration(track, randomBrains(makeRng(SEED)), 1);
  ai.overFor = 0;
  clearSparks();
}
startGeneration1();

function stepAi() {
  for (const e of stepGeneration(ai.gen)) {
    if (e.type === 'crash' && ai.speed !== 'max') burstSparks(e.x, e.y, ai.gen.step * 1000 + e.index);
  }
}

function drawAi(alpha) {
  const gen = ai.gen;
  const leader = leaderOf(gen);
  const at = (c) => smoothPose(c.world.car, explain ? 1 : alpha);
  // wrecks first, then the cars still driving, then the leader on top.
  // Wrecks parked in exactly the same spot (often dozens that never left the start line)
  // are drawn once, or their stacked transparency would make them look like a live car.
  const drawn = new Set();
  for (const c of gen.cars) {
    if (!c.out || c === leader) continue;
    const { x, y, angle } = c.world.car;
    const spot = `${x.toFixed(1)},${y.toFixed(1)},${angle.toFixed(2)}`;
    if (drawn.has(spot)) continue;
    drawn.add(spot);
    drawCar(at(c), c.out === 'crash', { alpha: 0.22, glow: 0 });
  }
  for (const c of gen.cars) if (!c.out && c !== leader) drawCar(at(c), false, { alpha: 0.45, glow: 0 });
  const pose = at(leader);
  drawRays(pose, readSensors(pose, track.walls), explain);
  drawCar(pose, leader.out === 'crash', { scale: 1.2, glow: 14 });
  if (explain) {
    const inputs = getInputs(leader.world.car, track.walls);
    drawExplainPanel(inputs);
    drawOutputsPanel(outputs(leader.brain, inputs));
  }
}

function drawAiHudNow() {
  const gen = ai.gen;
  const leader = leaderOf(gen);
  drawAiHud({
    trackName: track.name,
    generation: gen.number,
    alive: aliveCount(gen),
    total: gen.cars.length,
    leaderPercent: progressPercent(leader.world),
    seconds: gen.step * STEP,
    speed: ai.speed,
    seed: SEED,
    over: gen.over,
    best: { percent: progressPercent(leader.world), out: leader.out, seconds: leader.outStep * STEP },
  });
}

// ---------- the loop ----------
// Fixed timestep: the simulation always advances in 1/60 s steps; the screen
// just draws whatever the latest state is, however fast it refreshes.
let acc = 0;
let lastTime = performance.now();

function frame(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000); // after a long pause, don't try to catch up
  lastTime = now;

  if (takePress('Tab')) {
    mode = mode === 'drive' ? 'ai' : 'drive';
    acc = 0;
    clearSparks();
    clearPresses();
  }
  if (takePress('KeyE')) explain = !explain;

  if (mode === 'drive') {
    acc += dt;
    if (takePress('KeyR')) {
      restartWorld(world);
      clearSparks();
      acc = 0;
    }
    while (acc >= STEP) {
      handleDriveEvents(stepWorld(world, readInput()));
      acc -= STEP;
    }
    newBestFor = Math.max(0, newBestFor - dt);

    drawTrack();
    // With the explain overlay on, draw the exact simulation pose (no smoothing),
    // so the numbers on screen are exactly what the brain would get this step.
    const pose = smoothPose(world.car, explain ? 1 : acc / STEP);
    drawRays(pose, readSensors(pose, track.walls), explain);
    drawCar(pose, world.car.crashed);
    if (explain) drawExplainPanel(getInputs(world.car, track.walls));
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
  } else {
    for (const code in SPEEDS) if (takePress(code)) { ai.speed = SPEEDS[code]; acc = 0; }
    if (takePress('KeyR')) startGeneration1();
    if (ai.gen.over) {
      ai.overFor += dt;
      if (AUTOPLAY && ai.overFor > AUTOPLAY_PAUSE) startGeneration1();
    }

    if (ai.speed === 'max' && !ai.gen.over) {
      // No drawing until the generation ends: just simulate as much as fits in this frame
      const until = performance.now() + MAX_FRAME_MS;
      while (!ai.gen.over && performance.now() < until) stepAi();
      drawMaxSpeedScreen(ai.gen.number, ai.gen.step * STEP);
    } else {
      // the arrow keys do nothing while the AI drives
      acc += dt * ai.speed;
      let steps = 0;
      while (acc >= STEP && !ai.gen.over && steps < 20 * ai.speed) { stepAi(); acc -= STEP; steps++; }
      if (ai.gen.over) acc = 0;
      drawTrack();
      drawAi(Math.min(1, acc / STEP));
      drawSparks(dt);
      drawAiHudNow();
    }
  }
  requestAnimationFrame(frame);
}

function drawTrack() {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(trackImage, 0, 0, trackImage.width * 2, trackImage.height * 2);
}

requestAnimationFrame(frame);

// For in-browser checks and autoplay tooling
export { world, track, ai };
