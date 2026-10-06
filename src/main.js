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
// and "AI drives" (100 cars with neural-network brains that evolve generation by generation).

import { STEP } from './sim/constants.js';
import { TRACKS, buildTrack } from './sim/track.js';
import { createWorld, stepWorld, restartWorld } from './sim/world.js';
import { readSensors, getInputs } from './sim/sensors.js';
import { outputs } from './sim/brain.js';
import { aliveCount, leaderOf, progressPercent } from './sim/generation.js';
import { createEvolution, stepEvolution, CHAMPION_GENERATIONS } from './sim/evolution.js';
import { PHYSICS_VERSION } from './sim/constants.js';
import { ctx } from './render/canvas.js';
import { renderTrack } from './render/track-view.js';
import { drawCar, smoothPose } from './render/car-sprite.js';
import { drawRays } from './render/rays.js';
import { drawExplainPanel, drawOutputsPanel } from './render/explain-panel.js';
import { burstSparks, clearSparks, drawSparks } from './render/sparks.js';
import { drawHud, drawAiHud, drawMaxSpeedScreen } from './render/hud.js';
import { drawChart } from './render/chart.js';
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
const MAX_FRAME_MS = 14;          // at max speed, simulate this long per frame, then let the page breathe
const FLASH_SECONDS = 3;
const ai = { evo: null, speed: 1, flash: null, flashFor: 0 };

// A fresh evolution from generation 1. Same seed, same 100 starting brains, same evolution.
function startEvolution() {
  ai.evo = createEvolution(track, SEED);
  ai.flash = null;
  clearSparks();
}
startEvolution();

function stepAi() {
  const { events, firstLap, finished } = stepEvolution(ai.evo);
  for (const e of events) {
    if (e.type === 'crash' && ai.speed !== 'max') burstSparks(e.x, e.y, ai.evo.gen.step * 1000 + e.index);
  }
  if (firstLap) { ai.flash = `FIRST LAP — GEN ${firstLap.generation}`; ai.flashFor = FLASH_SECONDS; }
  if (finished && CHAMPION_GENERATIONS.includes(finished.generation)) saveChampions();
}

// The champions of the fixed generations, kept in this browser too (the official ones come from tools/evolution-report.js).
function saveChampions() {
  try {
    localStorage.setItem(`bug-driver:champions:seed-${SEED}:physics-${PHYSICS_VERSION}`,
      JSON.stringify({ seed: SEED, track: track.key, champions: ai.evo.champions }));
  } catch {
    // no storage: fine, the run is reproducible from the seed anyway
  }
}

// Fastest lap of the whole evolution so far, finished generations and the one running now.
function bestLapSoFar() {
  const laps = ai.evo.history.map((r) => r.bestLapSteps).filter((s) => s !== null);
  for (const c of ai.evo.gen.cars) if (c.bestLapSteps !== null) laps.push(c.bestLapSteps);
  return laps.length ? Math.min(...laps) : null;
}

function drawAi(alpha) {
  const gen = ai.evo.gen;
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

function aiHudState() {
  const gen = ai.evo.gen;
  return {
    trackName: track.name,
    generation: gen.number,
    alive: aliveCount(gen),
    total: gen.cars.length,
    leaderPercent: progressPercent(leaderOf(gen).world),
    bestLapSteps: bestLapSoFar(),
    seconds: gen.step * STEP,
    speed: ai.speed,
    seed: SEED,
    flash: ai.flashFor > 0 ? ai.flash : null,
  };
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
    if (takePress('KeyR')) startEvolution();
    ai.flashFor = Math.max(0, ai.flashFor - dt);

    if (ai.speed === 'max') {
      // No track or cars drawn: just simulate as much as fits in this frame, generation after generation
      const until = performance.now() + MAX_FRAME_MS;
      while (performance.now() < until) stepAi();
      drawMaxSpeedScreen(aiHudState());
      drawChart(ai.evo.history);
    } else {
      // the arrow keys do nothing while the AI drives
      acc += dt * ai.speed;
      let steps = 0;
      while (acc >= STEP && steps < 20 * ai.speed) { stepAi(); acc -= STEP; steps++; }
      drawTrack();
      drawAi(Math.min(1, acc / STEP));
      drawSparks(dt);
      drawChart(ai.evo.history);
      drawAiHud(aiHudState());
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
