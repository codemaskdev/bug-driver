// Bug Driver
// Plain canvas + vanilla JS ES modules, no build step.
// Serve the folder (npx serve) and open index.html to play,
// or index.html?autoplay=1&seed=42 to watch the AI from the start,
// or index.html?champion=3-40 to run one saved champion alone,
// or index.html?race=3-10 (me vs a champion) / ?scoreboard=3 (add &autoplay=1 to start right away).
//
//   sim/     the simulation: track, car physics, laps, sensors, brain, generations, evolution. No DOM, runs in Node too.
//   render/  drawing: canvas, track image, car sprite, rays, sparks, HUD, chart, brain panels
//   game/    browser glue: keyboard, URL options, saving the best lap, champions, the picker
//
// Two modes, switched with Tab: "I drive" (arrows, lap timer, ghost recording)
// and "AI drives": the live evolution, or one saved champion running alone.
// Both happen on the current track, picked with T: a built-in one, my own from the editor, or one from a share link.
// (Exam is drive-only: no AI car ever goes on it here.)
// From AI mode, S opens "me vs the AI": the scoreboard and the races against my ghost.
// The brain panels (E, B, F, N) only read the simulation; they never change it.

import { STEP, PHYSICS_VERSION } from './sim/constants.js';
import { TRACKS, buildTrack, trackDef, trackKey } from './sim/track.js';
import { isHeldOut, HELD_OUT_ID, unlockExam, examIsUnlocked } from './sim/held-out.js';
import { decodeTrack } from './sim/share-link.js';
import { emptyExamRecord, countExamLap, bestExamLap, examGhost, COUNTED_LAPS } from './sim/exam.js';
import { encodeInputs } from './game/best-lap.js';
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
import { drawHud, drawAiHud, drawMaxSpeedScreen, drawChampionHud, drawNotice } from './render/hud.js';
import { drawChart, chartSpot } from './render/chart.js';
import { drawEditor } from './render/editor-view.js';
import { drawBrainPanel, BRAIN_PANEL_W, BRAIN_PANEL_H } from './render/brain-panel.js';
import { drawDecisionPanel, strongestHidden } from './render/decision-panel.js';
import { drawWeightsGrid, GRID_BLOCK_W } from './render/weights-grid.js';
import { readInput, takePress, clearPresses } from './game/keyboard.js';
import { loadBestLap, saveBestLap } from './game/best-lap.js';
import { AUTOPLAY, SEED, CHAMPION, COMPARE, RACE, SCOREBOARD, TRACK, TRACK_LINK } from './game/params.js';
import { loadChampion, loadChampionsFile, loadGhost, loadGhostFor, parseChampionName } from './game/champions.js';
import { createRace, stepRace, raceGap, raceResult, progressShare } from './sim/race.js';
import { buildScoreboard } from './sim/scoreboard.js';
import { drawRaceHud, drawScoreboard, drawTag, drawOutMark } from './render/race-view.js';
import { setupPicker, showPicker, championLabel } from './game/picker.js';
import { openEditor, editorOpen, editorState, finish as finishEditing, undoPoint, loadMyTrack } from './game/editor.js';
import { setupTrackMenu, openTrackMenu, closeTrackMenu, trackMenuOpen } from './game/track-menu.js';

// Every track, built (walls, checkpoints) and drawn once, the first time it's needed.
// Kept by the track's fingerprint, so a custom track with new points is a new track.
const views = {};
function viewOf(def) {
  const key = trackKey(def);
  if (!views[key]) { const t = buildTrack(def); views[key] = { def, track: t, image: renderTrack(t), chartAt: chartSpot(t) }; }
  return views[key];
}
const view = (id) => viewOf(trackDef(id));
// The races against my ghost and the scoreboard always run on Neon Loop
const neon = view(TRACKS[0].id);
const track = neon.track;

// A message across the screen for a few seconds
let notice = null, noticeFor = 0;
function say(text, seconds = 5) { notice = text; noticeFor = seconds; }

// The current track: ?t= (a share link), else ?track=, else Neon Loop. A broken link never crashes: it says why.
let shared = null; // the track from the share link, if it opened
let startDef = trackDef(TRACK);
if (TRACK_LINK !== null) {
  const opened = decodeTrack(TRACK_LINK);
  if (opened.track) startDef = shared = opened.track;
  else say(`${opened.error} Opening ${startDef.name} instead.`, 12);
}
let here = viewOf(startDef);
let myTrack = loadMyTrack(); // the last valid track I made in the editor (kept in this browser)
// The track the AI may train on: the current one, unless it's the held-out Exam (nobody trains there, ever)
const aiAllowedHere = () => !isHeldOut(here.def);
// Saved champions may also be tested on Exam, but only once my Exam lap is saved (ghosts/me-exam.json)
const examReady = loadGhostFor(HELD_OUT_ID).then((ghost) => {
  if (!ghost) return false;
  try { unlockExam(ghost); return true; } catch (err) { console.warn(err.message); return false; }
});
const NO_TRAINING = 'Nobody trains on Exam, ever. Pick a saved champion to test there.';

// 'drive', 'ai', 'race', 'scoreboard', 'edit', or 'loading' while the race files load
let mode = RACE || SCOREBOARD ? 'loading' : AUTOPLAY || CHAMPION ? 'ai' : 'drive';
// On Exam the AI view only ever shows a saved champion (startChampion() falls back to driving if Exam is locked)
if (mode === 'ai' && !aiAllowedHere()) {
  if (CHAMPION) mode = 'loading'; // until we know whether Exam is unlocked
  else { mode = 'drive'; say('Nobody trains on Exam, ever.'); }
}
let explain = false; // E: show the real sensor (and brain) numbers

// ---------- I drive ----------
// Each track keeps its own best lap (my ghost lap there).
let world = createWorld(here.track);
let best = loadBestLap(here.track);
let lastSteps = null;
let newBestFor = 0; // seconds left to show "NEW BEST LAP"
let exam = loadExamRecord(here.track);

// Switches everything to another track: my car goes to its start line, the AI starts over there
// (a fresh evolution, or the same champion again), unless it's Exam, where only I drive.
function setTrack(def) {
  here = viewOf(def);
  world = createWorld(here.track);
  best = loadBestLap(here.track);
  lastSteps = null;
  exam = loadExamRecord(here.track);
  acc = 0;
  clearSparks();
  if (!aiAllowedHere()) {
    // Exam: a champion that's running goes on to Exam (once it's unlocked); never a training run
    if (mode === 'ai' && ai.champion && examIsUnlocked()) { startChampion(ai.champion.name); return; }
    if (mode === 'ai') mode = 'drive';
    say(examIsUnlocked() ? NO_TRAINING : 'Exam is held out: you drive it, no AI does.');
    return;
  }
  startEvolution();
  if (ai.champion) startChampion(ai.champion.name);
}

// On Exam, my first 3 completed laps are kept (in this browser) until they're saved as ghosts/me-exam.json
function examKey(t) {
  return `bug-driver:exam-first-laps:${t.key}:physics-${PHYSICS_VERSION}`;
}
function loadExamRecord(t) {
  if (t.id !== HELD_OUT_ID) return null;
  try {
    const saved = JSON.parse(localStorage.getItem(examKey(t)) ?? 'null');
    if (saved && saved.track === t.key) return saved;
  } catch {
    // no storage: the record lasts until the page is closed
  }
  return emptyExamRecord(t.key);
}
function saveExamRecord() {
  try { localStorage.setItem(examKey(here.track), JSON.stringify(exam)); } catch { /* no storage */ }
}
// G on Exam, after 3 counted laps: download ghosts/me-exam.json (the browser saves it to Downloads)
function downloadExamGhost() {
  if (!exam || exam.laps.length < COUNTED_LAPS) return;
  const blob = new Blob([JSON.stringify(examGhost(exam, PHYSICS_VERSION), null, 2) + '\n'], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'me-exam.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function handleDriveEvents(events) {
  for (const e of events) {
    if (e.type === 'crash') burstSparks(e.x, e.y, world.step);
    if (e.type === 'lap') {
      lastSteps = e.steps;
      if (!best || e.steps < best.steps) {
        best = { steps: e.steps, start: e.start, inputs: e.inputs };
        saveBestLap(here.track, best);
        newBestFor = 2;
      }
      if (exam && countExamLap(exam, { steps: e.steps, start: e.start, inputs: encodeInputs(e.inputs) })) saveExamRecord();
    }
  }
}

// ---------- AI drives ----------
const SPEEDS = { Digit1: 1, Digit2: 10, Digit3: 'max' };
const MAX_FRAME_MS = 14;          // at max speed, simulate this long per frame, then let the page breathe
const FLASH_SECONDS = 3;
const ai = {
  evo: null,
  view: null,          // the track the evolution runs on
  seed: SEED,          // ?seed=N, or picked in the corner picker
  speed: 1,
  flash: null, flashFor: 0,
  champion: null,      // when set: {name, seed, generation, multi, record, gen, laps, where}, one saved champion running alone
  selected: null,      // the car I clicked on (null = follow the leader)
  brainPanel: false,   // B
  frozen: false,       // F: "explain one decision"
  explainKey: 2,       // which output F explains (0 gas, 1 brake, 2 left, 3 right)
  weights: false,      // N
  compare: null,       // {name, brain, title} shown next to the selected brain in the N grid
  panelSide: 'right',
};

// A fresh evolution from generation 1 on the current track. Same track + same seed = same evolution.
function startEvolution() {
  ai.view = aiAllowedHere() ? here : neon;
  ai.evo = createEvolution(ai.view.track, ai.seed);
  ai.flash = null;
  ai.selected = null;
  clearSparks();
}
startEvolution();

// One saved champion, alone on the track, exactly as it drove during evolution.
async function startChampion(name) {
  const which = parseChampionName(name);
  const [record, examOpen] = await Promise.all([which && loadChampion(which), examReady]);
  if (!record) { ai.champion = null; return; }
  // it runs on the current track; on Exam only once my Exam lap is saved (else on Neon Loop)
  const where = aiAllowedHere() || examOpen ? here : neon;
  if (mode === 'loading' && !RACE && !SCOREBOARD) {
    mode = where === here ? 'ai' : 'drive';
    if (where !== here) say('Exam is held out: you drive it, no AI does.');
  }
  const gen = createGeneration(where.track, [record.brain], which.generation);
  gen.cars[0].id = record.id; // the id it had during evolution
  ai.champion = { name, ...which, record, gen, laps: [], where };
  ai.selected = null;
  ai.frozen = false;
  acc = 0;
  clearSparks();
}

async function setCompare(name) {
  const which = parseChampionName(name);
  const record = which && await loadChampion(which);
  ai.compare = record ? { name, brain: record.brain, title: `${championLabel(name)} champion` } : null;
}

setupPicker({
  onSeed: (n) => {
    if (!aiAllowedHere()) { say(NO_TRAINING); return; }
    ai.seed = n; ai.champion = null; startEvolution();
  },
  onRun: (name) => {
    if (name) startChampion(name);
    else if (!aiAllowedHere()) say(NO_TRAINING);
    else ai.champion = null;
  },
  onCompare: (name) => setCompare(name),
});

// The generation on screen: the champion's solo run, or the live evolution's current generation.
const currentGen = () => (ai.champion ? ai.champion.gen : ai.evo.gen);
const currentView = () => (ai.champion ? ai.champion.where : ai.view);
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
    localStorage.setItem(`bug-driver:champions:${ai.view.track.key}:seed-${ai.seed}:physics-${PHYSICS_VERSION}`,
      JSON.stringify({ seed: ai.seed, track: ai.view.track.key, champions: ai.evo.champions }));
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
  const view = c.view ?? readSensors(car, currentView().track.walls);
  const inputs = c.inputs ?? getInputs(car, currentView().track.walls);
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
  drawRays(pose, looking ? view : readSensors(pose, currentView().track.walls), explain || ai.frozen);
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
    trackName: ai.view.track.name,
    generation: gen.number,
    alive: aliveCount(gen),
    total: gen.cars.length,
    leaderPercent: progressPercent(leaderOf(gen).world),
    bestLapSteps: bestLapSoFar(),
    seconds: gen.step * STEP,
    speed: ai.speed,
    seed: ai.seed,
    flash: ai.flashFor > 0 ? ai.flash : null,
    frozen: ai.frozen,
  };
}

function championHudState() {
  const ch = ai.champion;
  const car = ch.gen.cars[0];
  return {
    trackName: ch.where.track.name,
    name: championLabel(ch.name),
    id: ch.record.id,
    laps: ch.laps,
    bestLapSteps: car.bestLapSteps,
    // its recorded lap is only comparable on a track it trained on (multi-track champions: one per track)
    recordedLapSteps: typeof ch.record.lapSteps === 'object' && ch.record.lapSteps !== null
      ? ch.record.lapSteps[ch.where.track.id]
      : ch.where === neon ? ch.record.lapSteps : undefined,
    over: ch.gen.over,
    out: car.out,
    percent: progressPercent(car.world),
    seconds: ch.gen.step * STEP,
    speed: ai.speed,
    frozen: ai.frozen,
  };
}

// ---------- me vs the AI ----------
// My ghost lap (ghosts/me-v3.json) against saved champions, nothing typed in by hand.
const REVEAL_SECONDS = 1.2; // autoplay: one scoreboard row every 1.2 s
const versus = { seed: 3, ghost: null, file: null, board: null, race: null, generation: null, started: false, selected: 0, reveal: 0, speed: 1 };

async function loadVersus(seed) {
  if (versus.board && versus.seed === seed) return true;
  const [ghost, file] = await Promise.all([loadGhost(), loadChampionsFile(seed)]);
  if (!ghost || !file) return false;
  Object.assign(versus, { seed, ghost, file, board: buildScoreboard(ghost, file.champions) });
  return true;
}

// A race: my ghost lap against the best lap of the champion of this generation.
async function startRace(seed, generation, autostart) {
  if (!(await loadVersus(seed)) || !versus.file.champions[generation]) { mode = 'ai'; return; }
  versus.generation = generation;
  versus.race = createRace(track, versus.ghost, { generation, brain: versus.file.champions[generation].brain });
  versus.view = neon;
  versus.restart = () => startRace(seed, generation, true);
  versus.started = autostart;
  versus.selected = Math.max(0, versus.board.rows.findIndex((r) => r.generation === generation));
  acc = 0;
  mode = 'race';
}

// A race on another track: ?race=exam&champion=3-multi-100. Only where I have a ghost lap
// (on Exam that's ghosts/me-exam.json, which exists only after my first 3 laps there).
async function startTrackRace(trackId, championName, autostart) {
  const which = parseChampionName(championName);
  const [ghost, record] = await Promise.all([loadGhostFor(trackId), which ? loadChampion(which) : null, examReady]);
  if (!ghost || !record) { console.warn(`no race: ${!ghost ? `no ghost lap of mine on ${trackId}` : `no champion ${championName}`}`); mode = 'ai'; return; }
  const v = view(trackId);
  try {
    versus.race = createRace(v.track, ghost, { generation: which.generation, brain: record.brain, name: `GEN ${which.generation}${which.multi ? ' ×3 TRACKS' : ''}` });
  } catch (err) {
    say(err.message, 8); // e.g. Exam is held out
    mode = 'ai';
    return;
  }
  versus.view = v;
  versus.restart = () => startTrackRace(trackId, championName, true);
  versus.started = autostart;
  acc = 0;
  mode = 'race';
}

async function openScoreboard(seed, animate) {
  if (!(await loadVersus(seed))) { mode = 'ai'; return; }
  versus.reveal = animate ? 0 : versus.board.rows.length;
  mode = 'scoreboard';
}

function drawRace(alpha) {
  const { me, ai } = versus.race;
  drawTrack(versus.view);
  // a car that has finished or is out stands still: draw it where it stopped
  const poseOf = (lane) => smoothPose(lane.world.car, lane.finishSteps || lane.out ? 1 : alpha);
  if (ai.out) {
    const c = ai.world.car;
    drawOutMark(c.x, c.y, `${ai.out === 'crash' ? 'crashed' : 'stalled'} here`);
  }
  const aiPose = poseOf(ai), mePose = poseOf(me);
  drawCar(aiPose, ai.out === 'crash', { color: 'yellow', glow: 12 });
  drawCar(mePose, false, { glow: 12 });
  const close = Math.hypot(aiPose.x - mePose.x, aiPose.y - mePose.y) < 60;
  drawTag(aiPose, ai.name, '#ffd23f');
  drawTag(mePose, me.name, '#00f0ff', close);
}

// ---------- the loop ----------
// Fixed timestep: the simulation always advances in 1/60 s steps; the screen
// just draws whatever the latest state is, however fast it refreshes.
let acc = 0;
let lastTime = performance.now();

function frame(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000); // after a long pause, don't try to catch up
  lastTime = now;

  if (mode !== 'edit' && takePress('Tab')) {
    const championOnExam = examIsUnlocked() && ai.champion?.where === here;
    if (mode === 'drive' && !aiAllowedHere() && !championOnExam) {
      say(examIsUnlocked() ? 'Nobody trains on Exam. To test a champion there: ?track=exam&champion=3-80'
        : 'Exam is held out: you drive it, no AI does. T picks another track.');
    } else {
      mode = mode === 'drive' ? 'ai' : 'drive';
      closeTrackMenu();
      acc = 0;
      clearSparks();
    }
    clearPresses();
  }
  // T: the track menu (pick a track, the editor, share links). The game waits while it's open.
  if ((mode === 'drive' || mode === 'ai') && takePress('KeyT')) {
    if (trackMenuOpen()) closeTrackMenu();
    else openTrackMenu(menuState());
  }
  const paused = trackMenuOpen();
  if (paused && takePress('Escape')) closeTrackMenu();
  if (takePress('KeyE')) explain = !explain;
  const left = takePress('ArrowLeft'), right = takePress('ArrowRight'); // only used by "explain one decision"
  if (mode !== 'drive' && mode !== 'edit' && takePress('KeyS')) {
    if (mode === 'scoreboard') mode = 'ai';
    else openScoreboard(versus.seed, false);
  }
  showPicker(mode === 'ai' && !paused, {
    seed: ai.seed,
    running: ai.champion?.name ?? '',
    comparing: ai.compare?.name ?? '',
  });

  if (mode === 'edit') {
    if (!editorOpen()) mode = 'drive';
    if (takePress('Backspace') || takePress('Delete')) undoPoint();
    if (takePress('Enter')) finishEditing('drive');
    if (takePress('Escape')) finishEditing(null);
    if (mode === 'edit') drawEditor(editorState());
  } else if (mode === 'loading') {
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, 1280, 720);
  } else if (mode === 'scoreboard') {
    const rows = versus.board.rows;
    if (takePress('ArrowUp')) versus.selected = (versus.selected + rows.length - 1) % rows.length;
    if (takePress('ArrowDown')) versus.selected = (versus.selected + 1) % rows.length;
    if (takePress('Enter')) startRace(versus.seed, rows[versus.selected].generation, true);
    if (takePress('Escape')) mode = 'ai';
    if (versus.reveal < rows.length) versus.reveal = Math.min(rows.length, versus.reveal + dt / REVEAL_SECONDS);
    drawTrack();
    drawScoreboard({ seed: versus.seed, rows, total: versus.board.total, reveal: Math.floor(versus.reveal), selected: versus.selected });
  } else if (mode === 'race') {
    const race = versus.race;
    if (takePress('Digit1')) versus.speed = 1;
    if (takePress('Digit2')) versus.speed = 10;
    if (takePress('Escape')) mode = 'ai';
    if (takePress('Space')) {
      if (!versus.started) versus.started = true;
      else if (race.over) versus.restart();
    }
    if (versus.started && !race.over) {
      acc += dt * versus.speed;
      let steps = 0;
      while (acc >= STEP && !race.over && steps < 20 * versus.speed) { stepRace(race); acc -= STEP; steps++; }
    }
    if (race.over) acc = 0;
    drawRace(Math.min(1, acc / STEP));
    drawRaceHud({
      aiName: race.ai.name,
      seconds: race.step * STEP,
      started: versus.started,
      gap: raceGap(race),
      meTime: race.me.finishSteps,
      aiTime: race.ai.finishSteps,
      aiOut: race.ai.out,
      aiProgress: progressShare(race.ai),
      result: raceResult(race),
      speed: versus.speed,
    });
  } else if (mode === 'drive') {
    acc = paused ? 0 : acc + dt;
    if (takePress('KeyR')) {
      restartWorld(world);
      clearSparks();
      acc = 0;
    }
    if (takePress('KeyG')) downloadExamGhost();
    while (acc >= STEP) {
      handleDriveEvents(stepWorld(world, readInput()));
      acc -= STEP;
    }
    newBestFor = Math.max(0, newBestFor - dt);

    drawTrack(here);
    // With the explain overlay on, draw the exact simulation pose (no smoothing),
    // so the numbers on screen are exactly what the brain would get this step.
    const pose = smoothPose(world.car, explain ? 1 : acc / STEP);
    drawRays(pose, readSensors(pose, here.track.walls), explain);
    drawCar(pose, world.car.crashed);
    if (explain) drawExplainPanel(getInputs(world.car, here.track.walls));
    drawSparks(dt);
    drawHud({
      exam: exam && { counted: exam.laps.length, of: COUNTED_LAPS, best: bestExamLap(exam)?.steps ?? null },
      trackName: here.track.name,
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
      if (ai.champion) startChampion(ai.champion.name);
      else startEvolution();
    }
    ai.flashFor = Math.max(0, ai.flashFor - dt);

    if (ai.speed === 'max' && !ai.frozen && !championDone() && !paused) {
      // No track or cars drawn: just simulate as much as fits in this frame
      const until = performance.now() + MAX_FRAME_MS;
      while (performance.now() < until && !championDone()) stepAi();
      if (ai.champion) {
        drawMaxSpeedScreen({ generation: ai.champion.generation, seconds: ai.champion.gen.step * STEP, bestLapSteps: ai.champion.gen.cars[0].bestLapSteps });
      } else {
        drawMaxSpeedScreen(aiHudState());
        drawChart(ai.evo.history, ai.view.chartAt);
      }
    } else {
      // the arrow keys do nothing while the AI drives; frozen = no steps at all
      if (!ai.frozen && !paused) {
        const speed = ai.speed === 'max' ? 1 : ai.speed;
        acc += dt * speed;
        let steps = 0;
        while (acc >= STEP && steps < 20 * speed && !championDone()) { stepAi(); acc -= STEP; steps++; }
      }
      drawTrack(currentView());
      if (!ai.champion) drawChart(ai.evo.history, ai.view.chartAt);
      drawAi(ai.frozen ? 1 : Math.min(1, acc / STEP));
      drawSparks(ai.frozen ? 0 : dt);
      if (ai.champion) drawChampionHud(championHudState());
      else drawAiHud(aiHudState());
    }
  }
  noticeFor = Math.max(0, noticeFor - dt);
  if (noticeFor > 0) drawNotice(notice);
  requestAnimationFrame(frame);
}

// ---------- tracks: the menu (T) and the editor ----------
function menuState() {
  const champion = mode === 'ai' && ai.champion ? { name: ai.champion.name, label: championLabel(ai.champion.name) } : null;
  return { current: here.def, mine: myTrack, shared, champion };
}

setupTrackMenu({
  onPick: (def) => setTrack(def),
  onEdit: () => editTrack(),
});

// The editor opens on a copy of the current track (Exam never: then on my track, or empty)
function editTrack() {
  const back = mode;
  const from = aiAllowedHere() ? here.def.points : (myTrack?.points ?? []);
  mode = 'edit';
  clearPresses();
  openEditor(from, {
    onDrive: (def) => { myTrack = def; mode = 'drive'; setTrack(def); },
    onTrain: (def) => { myTrack = def; ai.champion = null; mode = 'ai'; setTrack(def); },
    onBack: () => { mode = back; },
  });
}

function drawTrack(v = neon) {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(v.image, 0, 0, v.image.width * 2, v.image.height * 2);
}

if (CHAMPION && !RACE) startChampion(CHAMPION);
if (RACE) {
  const which = parseChampionName(RACE);
  if (which) startRace(which.seed, which.generation, AUTOPLAY);
  else if (TRACKS.some((t) => t.id === RACE)) startTrackRace(RACE, CHAMPION, AUTOPLAY);
  else mode = 'ai';
}
if (SCOREBOARD) openScoreboard(SCOREBOARD, AUTOPLAY);
if (COMPARE) setCompare(COMPARE);
requestAnimationFrame(frame);

// For in-browser checks and autoplay tooling
export { world, track, ai, versus };
export const current = () => ({ here, mode, world });
