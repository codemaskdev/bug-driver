// Bug Driver
// Plain canvas + vanilla JS ES modules, no build step.
// Serve the folder (npx serve) and open index.html to play,
// or index.html?autoplay=1&seed=42 to watch the AI from the start,
// or index.html?champion=3-40 to run one saved champion alone.
//
//   sim/     the simulation: track, car physics, laps, sensors, brain, generations, evolution. No DOM, runs in Node too.
//   render/  drawing: canvas, track image, car sprite, rays, sparks, HUD, chart, brain panels
//   game/    browser glue: keyboard, URL options, saving the best lap, champions, the picker
//
// Two modes, switched with Tab: "I drive" (arrows, lap timer, ghost recording)
// and "AI drives": the live evolution, or one saved champion running alone.
// The brain panels (E, B, F, N) only read the simulation; they never change it.

import { STEP, PHYSICS_VERSION } from './sim/constants.js';
import { TRACKS, buildTrack } from './sim/track.js';
import { createWorld, stepWorld, restartWorld } from './sim/world.js';
import { readSensors, getInputs } from './sim/sensors.js';
import { explainThink } from './sim/brain.js';
import { createGeneration, stepGeneration, aliveCount, leaderOf, progressPercent } from './sim/generation.js';
import { createEvolution, stepEvolution, CHAMPION_GENERATIONS } from './sim/evolution.js';
import { ctx, canvas, VIEW_W, VIEW_H } from './render/canvas.js';
import { renderTrack } from './render/track-view.js';
import { drawCar, smoothPose } from './render/car-sprite.js';
import { drawRays } from './render/rays.js';
import { drawExplainPanel, drawOutputsPanel } from './render/explain-panel.js';
import { burstSparks, clearSparks, drawSparks } from './render/sparks.js';
import { drawHud, drawAiHud, drawMaxSpeedScreen, drawChampionHud } from './render/hud.js';
import { drawChart } from './render/chart.js';
import { drawBrainPanel, BRAIN_PANEL_W, BRAIN_PANEL_H } from './render/brain-panel.js';
import { drawDecisionPanel, strongestHidden } from './render/decision-panel.js';
import { drawWeightsGrid, GRID_BLOCK_W } from './render/weights-grid.js';
import { readInput, takePress, clearPresses } from './game/keyboard.js';
import { loadBestLap, saveBestLap } from './game/best-lap.js';
import { AUTOPLAY, SEED, CHAMPION, COMPARE } from './game/params.js';
import { loadChampion, parseChampionName } from './game/champions.js';
import { setupPicker, showPicker } from './game/picker.js';

const track = buildTrack(TRACKS[0]);
const trackImage = renderTrack(track);

let mode = AUTOPLAY || CHAMPION ? 'ai' : 'drive';
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
const ai = {
  evo: null,
  speed: 1,
  flash: null, flashFor: 0,
  champion: null,      // when set: {seed, generation, record, gen, laps}, one saved champion running alone
  selected: null,      // the car I clicked on (null = follow the leader)
  brainPanel: false,   // B
  frozen: false,       // F: "explain one decision"
  explainKey: 2,       // which output F explains (0 gas, 1 brake, 2 left, 3 right)
  weights: false,      // N
  compare: null,       // {name, brain, title} shown next to the selected brain in the N grid
  panelSide: 'right',
};

// A fresh evolution from generation 1. Same seed, same 100 starting brains, same evolution.
function startEvolution() {
  ai.evo = createEvolution(track, SEED);
  ai.flash = null;
  ai.selected = null;
  clearSparks();
}
startEvolution();

// One saved champion, alone on the track, exactly as it drove during evolution.
async function startChampion(name) {
  const which = parseChampionName(name);
  const record = which && await loadChampion(which);
  if (!record) { ai.champion = null; return; }
  const gen = createGeneration(track, [record.brain], which.generation);
  gen.cars[0].id = record.id; // the id it had during evolution
  ai.champion = { ...which, record, gen, laps: [] };
  ai.selected = null;
  ai.frozen = false;
  acc = 0;
  clearSparks();
}

async function setCompare(name) {
  const which = parseChampionName(name);
  const record = which && await loadChampion(which);
  ai.compare = record ? { name, brain: record.brain, title: `seed ${which.seed} · gen ${which.generation} champion` } : null;
}

setupPicker({
  onRun: (name) => (name ? startChampion(name) : (ai.champion = null)),
  onCompare: (name) => setCompare(name),
});

// The generation on screen: the champion's solo run, or the live evolution's current generation.
const currentGen = () => (ai.champion ? ai.champion.gen : ai.evo.gen);
const championDone = () => ai.champion && ai.champion.gen.over;

function stepAi() {
  if (ai.champion) {
    for (const e of stepGeneration(ai.champion.gen)) {
      if (e.type === 'lap') ai.champion.laps.push(e.steps);
      if (e.type === 'crash' && ai.speed !== 'max') burstSparks(e.x, e.y, ai.champion.gen.step);
    }
    return;
  }
  const { events, firstLap, finished } = stepEvolution(ai.evo);
  for (const e of events) {
    if (e.type === 'crash' && ai.speed !== 'max') burstSparks(e.x, e.y, ai.evo.gen.step * 1000 + e.index);
  }
  if (firstLap) { ai.flash = `FIRST LAP — GEN ${firstLap.generation}`; ai.flashFor = FLASH_SECONDS; }
  if (finished) {
    ai.selected = null; // the clicked car belonged to the generation that just ended
    if (CHAMPION_GENERATIONS.includes(finished.generation)) saveChampions();
  }
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

// The car the panels are about: the one I clicked, or else the leader.
function subjectOf(gen) {
  return ai.selected && gen.cars.includes(ai.selected) ? ai.selected : leaderOf(gen);
}

// Click a car to watch its brain; click empty track to go back to the leader.
canvas.addEventListener('mousedown', (e) => {
  if (mode !== 'ai') return;
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * VIEW_W;
  const y = ((e.clientY - rect.top) / rect.height) * VIEW_H;
  let nearest = null, nearestD = 30;
  for (const c of currentGen().cars) {
    const d = Math.hypot(c.world.car.x - x, c.world.car.y - y);
    if (d < nearestD) { nearestD = d; nearest = c; }
  }
  ai.selected = nearest;
});

// The decision a car made on its last step: what it saw, and the full calculation.
// Before its first step it hasn't decided anything yet, so show what it sees right now.
function decisionOf(c) {
  const car = c.world.car;
  const view = c.view ?? readSensors(car, track.walls);
  const inputs = c.inputs ?? getInputs(car, track.walls);
  return { view, ex: explainThink(c.brain, inputs) };
}

function drawAi(alpha) {
  const gen = currentGen();
  const subject = subjectOf(gen);
  const looking = explain || ai.brainPanel || ai.frozen;
  const at = (c) => smoothPose(c.world.car, alpha);
  // wrecks first, then the cars still driving, then the subject on top.
  // Wrecks parked in exactly the same spot (often dozens that never left the start line)
  // are drawn once, or their stacked transparency would make them look like a live car.
  const drawn = new Set();
  for (const c of gen.cars) {
    if (!c.out || c === subject) continue;
    const { x, y, angle } = c.world.car;
    const spot = `${x.toFixed(1)},${y.toFixed(1)},${angle.toFixed(2)}`;
    if (drawn.has(spot)) continue;
    drawn.add(spot);
    drawCar(at(c), c.out === 'crash', { alpha: 0.22, glow: 0 });
  }
  for (const c of gen.cars) if (!c.out && c !== subject) drawCar(at(c), false, { alpha: 0.45, glow: 0 });

  // While we look inside its head, the subject is drawn exactly where it stood when it made
  // its last decision (smoothPose at 0 = the pose before its last move), with the rays it saw then.
  const { view, ex } = decisionOf(subject);
  const pose = looking && subject.view ? smoothPose(subject.world.car, 0) : at(subject);
  drawRays(pose, looking ? view : readSensors(pose, track.walls), explain || ai.frozen);
  drawCar(pose, subject.out === 'crash', { scale: 1.2, glow: 14 });
  if (subject === ai.selected) drawSelectionRing(pose);

  // panels go on the half of the screen the car isn't on
  if (pose.x > VIEW_W / 2 + 120) ai.panelSide = 'left';
  if (pose.x < VIEW_W / 2 - 120) ai.panelSide = 'right';
  const px = ai.panelSide === 'left' ? 16 : VIEW_W - 16 - BRAIN_PANEL_W;
  let py = 64;
  const who = subject === ai.selected ? ' (clicked)' : ai.champion ? '' : ' (leader)';
  const title = `car ${subject.id}${who}`;
  if (ai.brainPanel || ai.frozen) {
    const highlight = ai.frozen ? { output: ai.explainKey, hidden: strongestHidden(ex, ai.explainKey) } : null;
    drawBrainPanel(px, py, ex, title, highlight);
    py += BRAIN_PANEL_H + 8;
  }
  if (ai.frozen) {
    drawDecisionPanel(px, py, ex, view, ai.explainKey, strongestHidden(ex, ai.explainKey),
      `${title} · gen ${gen.number} · step ${gen.step}`);
  } else if (ai.weights) {
    const brains = [{ brain: subject.brain, title }];
    if (ai.compare) brains.push({ brain: ai.compare.brain, title: ai.compare.title });
    const gx = ai.panelSide === 'left' ? 16 : VIEW_W - 16 - GRID_BLOCK_W * brains.length;
    drawWeightsGrid(gx, py, brains);
  }
  if (explain && !ai.brainPanel && !ai.frozen) {
    drawExplainPanel(ex.inputs);
    drawOutputsPanel(ex.output.map((n) => n.value));
  }
}

function drawSelectionRing(pose) {
  ctx.save();
  ctx.strokeStyle = '#ffd23f';
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(pose.x, pose.y, 30, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
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
    frozen: ai.frozen,
  };
}

function championHudState() {
  const ch = ai.champion;
  const car = ch.gen.cars[0];
  return {
    trackName: track.name,
    name: `seed ${ch.seed} · gen ${ch.generation}`,
    id: ch.record.id,
    laps: ch.laps,
    bestLapSteps: car.bestLapSteps,
    recordedLapSteps: ch.record.lapSteps,
    over: ch.gen.over,
    out: car.out,
    percent: progressPercent(car.world),
    seconds: ch.gen.step * STEP,
    speed: ai.speed,
    frozen: ai.frozen,
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
  const left = takePress('ArrowLeft'), right = takePress('ArrowRight'); // only used by "explain one decision"
  showPicker(mode === 'ai', {
    running: ai.champion ? `${ai.champion.seed}-${ai.champion.generation}` : '',
    comparing: ai.compare?.name ?? '',
  });

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
    if (takePress('KeyB')) ai.brainPanel = !ai.brainPanel;
    if (takePress('KeyN')) ai.weights = !ai.weights;
    if (takePress('KeyF')) { ai.frozen = !ai.frozen; acc = 0; }
    if (ai.frozen && left) ai.explainKey = (ai.explainKey + 3) % 4;
    if (ai.frozen && right) ai.explainKey = (ai.explainKey + 1) % 4;
    if (takePress('KeyR')) {
      if (ai.champion) startChampion(`${ai.champion.seed}-${ai.champion.generation}`);
      else startEvolution();
    }
    ai.flashFor = Math.max(0, ai.flashFor - dt);

    if (ai.speed === 'max' && !ai.frozen && !championDone()) {
      // No track or cars drawn: just simulate as much as fits in this frame
      const until = performance.now() + MAX_FRAME_MS;
      while (performance.now() < until && !championDone()) stepAi();
      if (ai.champion) {
        drawMaxSpeedScreen({ generation: ai.champion.generation, seconds: ai.champion.gen.step * STEP, bestLapSteps: ai.champion.gen.cars[0].bestLapSteps });
      } else {
        drawMaxSpeedScreen(aiHudState());
        drawChart(ai.evo.history);
      }
    } else {
      // the arrow keys do nothing while the AI drives; frozen = no steps at all
      if (!ai.frozen) {
        const speed = ai.speed === 'max' ? 1 : ai.speed;
        acc += dt * speed;
        let steps = 0;
        while (acc >= STEP && steps < 20 * speed && !championDone()) { stepAi(); acc -= STEP; steps++; }
      }
      drawTrack();
      if (!ai.champion) drawChart(ai.evo.history);
      drawAi(ai.frozen ? 1 : Math.min(1, acc / STEP));
      drawSparks(ai.frozen ? 0 : dt);
      if (ai.champion) drawChampionHud(championHudState());
      else drawAiHud(aiHudState());
    }
  }
  requestAnimationFrame(frame);
}

function drawTrack() {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(trackImage, 0, 0, trackImage.width * 2, trackImage.height * 2);
}

if (CHAMPION) startChampion(CHAMPION);
if (COMPARE) setCompare(COMPARE);
requestAnimationFrame(frame);

// For in-browser checks and autoplay tooling
export { world, track, ai };
