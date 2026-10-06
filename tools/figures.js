// Generates every figure of the guide (HOW-IT-WORKS.md and DEEP-DIVE.md) from the real simulation:
// real frames, real weights, real generation stats. Nothing is drawn by hand.
// It also writes docs/img/figure-data.json with every number the guide quotes.
// Run with: node tools/figures.js   (about half a minute)

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { TRACKS, buildTrack } from '../src/sim/track.js';
import { CAR } from '../src/sim/car.js';
import { SENSOR_ANGLES, SENSOR_LABELS, SENSOR_RANGE, eyePosition } from '../src/sim/sensors.js';
import { explainThink, OUTPUT_LABELS, BRAIN_SIZE, INPUTS, HIDDEN, OUTPUTS, tanh, sigmoid } from '../src/sim/brain.js';
import { createGeneration, stepGeneration, fitness, progressPercent } from '../src/sim/generation.js';
import { createEvolution, runEvolution, finishGeneration, nextGeneration } from '../src/sim/evolution.js';
import { STEPS_PER_SECOND } from '../src/sim/constants.js';
import { createRace, stepRace, raceResult } from '../src/sim/race.js';
import { buildScoreboard } from '../src/sim/scoreboard.js';
import { checkTrack } from '../src/sim/track-check.js';
import { unlockExam } from '../src/sim/held-out.js';
import { trackDef } from '../src/sim/track.js';
import { encodeTrack, decodeTrack, LETTERS } from '../src/sim/share-link.js';
import { PAPERCLIP_LINK } from './replay-check.js';

const root = new URL('../', import.meta.url);
const OUT = new URL('docs/img/', root);
mkdirSync(OUT, { recursive: true });
const json = (path) => JSON.parse(readFileSync(new URL(path, root)));
const track = buildTrack(TRACKS[0]);
const data = {}; // every number the guide quotes, written to figure-data.json

// ---------- style ----------
const C = {
  bg: '#0b0d13', road: '#141826', cyan: '#00f0ff', pink: '#ff2e63', magenta: '#ff4dd8',
  yellow: '#ffd23f', green: '#39ff88', text: '#e6ebf2', dim: '#9fb3c8',
};
const FONT = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const r1 = (v) => Math.round(v * 10) / 10;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// fixed decimals without "-0.000"
const fx = (v, d = 3) => { const s = v.toFixed(d); return /^-0\.0*$/.test(s) ? s.slice(1) : s; };
const sec = (steps) => (steps / STEPS_PER_SECOND).toFixed(2);

function svg(w, h, title, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="${FONT}">
<title>${esc(title)}</title>
<defs><filter id="glow" filterUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.dim}"/></marker></defs>
<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="16" fill="${C.bg}" stroke="${C.cyan}" stroke-opacity="0.25"/>
${body}
</svg>
`;
}
function text(x, y, s, o = {}) {
  const { size = 13, color = C.text, anchor = 'start', weight = 'normal', opacity = 1, glow = false } = o;
  return `<text x="${r1(x)}" y="${r1(y)}" font-size="${size}" fill="${color}" fill-opacity="${opacity}" text-anchor="${anchor}" font-weight="${weight}"${glow ? ' filter="url(#glow)"' : ''}>${esc(s)}</text>`;
}
function line(x1, y1, x2, y2, color, width = 1, o = {}) {
  const { opacity = 1, dash = '', arrow = false, glow = false } = o;
  return `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="${color}" stroke-width="${width}" stroke-opacity="${opacity}"${dash ? ` stroke-dasharray="${dash}"` : ''}${arrow ? ' marker-end="url(#arrow)"' : ''}${glow ? ' filter="url(#glow)"' : ''}/>`;
}
function poly(points, o = {}) {
  const { stroke = 'none', width = 1, fill = 'none', opacity = 1, fillOpacity = 1, closed = false, dash = '', glow = false, rule = '' } = o;
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${r1(p.x)},${r1(p.y)}`).join('') + (closed ? 'Z' : '');
  return `<path d="${d}" stroke="${stroke}" stroke-width="${width}" stroke-opacity="${opacity}" fill="${fill}" fill-opacity="${fillOpacity}"${rule ? ` fill-rule="${rule}"` : ''}${dash ? ` stroke-dasharray="${dash}"` : ''} stroke-linejoin="round"${glow ? ' filter="url(#glow)"' : ''}/>`;
}
function rect(x, y, w, h, o = {}) {
  const { fill = 'none', stroke = 'none', width = 1, opacity = 1, rx = 6, strokeOpacity = 1 } = o;
  return `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="${rx}" fill="${fill}" fill-opacity="${opacity}" stroke="${stroke}" stroke-width="${width}" stroke-opacity="${strokeOpacity}"/>`;
}
function circle(cx, cy, rad, o = {}) {
  const { fill = 'none', stroke = 'none', width = 1, opacity = 1, glow = false } = o;
  return `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(rad)}" fill="${fill}" fill-opacity="${opacity}" stroke="${stroke}" stroke-width="${width}"${glow ? ' filter="url(#glow)"' : ''}/>`;
}
// A rounded box with a title and lines of text (for the concept diagrams)
function box(x, y, w, h, title, lines, color = C.cyan) {
  let s = rect(x, y, w, h, { fill: C.road, stroke: color, strokeOpacity: 0.7, rx: 10 });
  s += text(x + w / 2, y + 24, title, { anchor: 'middle', size: 15, weight: 'bold', color, glow: true });
  lines.forEach((l, i) => { s += text(x + w / 2, y + 46 + i * 17, l, { anchor: 'middle', size: 11.5, color: C.text, opacity: 0.85 }); });
  return s;
}
function save(name, content, about) {
  writeFileSync(new URL(name, OUT), content);
  figures.push({ name, about });
}
const figures = [];

// ---------- drawing the track and the car ----------
// view = {x0, y0, scale, ox, oy}: world point -> figure point
const at = (v, p) => ({ x: v.ox + (p.x - v.x0) * v.scale, y: v.oy + (p.y - v.y0) * v.scale });
function drawTrack(v, o = {}) {
  const { checkpoints = false, centerline = false, clip = null } = o;
  const outer = track.outer.map((p) => at(v, p)), inner = track.inner.map((p) => at(v, p));
  const d = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${r1(p.x)},${r1(p.y)}`).join('') + 'Z';
  let s = `<path d="${d(outer)}${d(inner)}" fill="${C.road}" fill-rule="evenodd"/>`;
  if (centerline) s += poly(track.center.map((p) => at(v, p)), { stroke: C.text, opacity: 0.25, width: 1, closed: true, dash: '6 8' });
  if (checkpoints) {
    track.checkpoints.forEach((cp, i) => {
      const a = at(v, { x: cp.ax, y: cp.ay }), b = at(v, { x: cp.bx, y: cp.by });
      s += line(a.x, a.y, b.x, b.y, i === 0 ? C.text : C.cyan, i === 0 ? 3 : 1, { opacity: i === 0 ? 1 : 0.35 });
    });
  }
  s += poly(outer, { stroke: C.magenta, width: 2, closed: true, glow: true });
  s += poly(inner, { stroke: C.magenta, width: 2, closed: true, glow: true });
  if (clip) s = `<clipPath id="map"><rect x="0" y="0" width="${clip.w}" height="${clip.h}"/></clipPath><g clip-path="url(#map)">${s}</g>`;
  return s;
}
// The ladybug from above: a round shell with a center line and dots, a small head. Same size as the hitbox.
function drawBug(v, pose, o = {}) {
  const { opacity = 1, color = C.cyan, scale = 1 } = o;
  const p = at(v, pose), k = v.scale * scale, deg = (pose.angle * 180) / Math.PI;
  return `<g transform="translate(${r1(p.x)},${r1(p.y)}) rotate(${r1(deg)}) scale(${k})" opacity="${opacity}">
<ellipse cx="0" cy="0" rx="15" ry="13" fill="#0aa3b5" stroke="${color}" stroke-width="${2 / k}"/>
<circle cx="18" cy="0" r="4.5" fill="#0d0e12" stroke="${color}" stroke-width="${1.5 / k}"/>
<line x1="-14" y1="0" x2="13" y2="0" stroke="#03262c" stroke-width="1.6"/>
<circle cx="-5" cy="-6" r="2" fill="#03262c"/><circle cx="5" cy="-7" r="2" fill="#03262c"/><circle cx="-5" cy="6" r="2" fill="#03262c"/><circle cx="5" cy="7" r="2" fill="#03262c"/>
</g>`;
}
// cyan when far, pink-red when close, like in the game
function rayColor(d) {
  const k = 1 - d / SENSOR_RANGE, a = [0, 240, 255], b = [255, 46, 99];
  return `rgb(${a.map((c, i) => Math.round(c + (b[i] - c) * k)).join(',')})`;
}
function drawRays(v, pose, view, labels = true) {
  let s = '';
  view.forEach((d, i) => {
    const e = eyePosition(pose, i), ang = pose.angle + SENSOR_ANGLES[i];
    const hit = { x: e.x + Math.cos(ang) * d, y: e.y + Math.sin(ang) * d };
    const a = at(v, e), b = at(v, hit);
    s += line(a.x, a.y, b.x, b.y, rayColor(d), 2, { glow: true });
    if (d < SENSOR_RANGE) s += circle(b.x, b.y, 4, { fill: rayColor(d) });
    if (labels) {
      const lx = b.x + Math.cos(ang) * 22, ly = b.y + Math.sin(ang) * 16;
      s += rect(lx - 26, ly - 11, 52, 18, { fill: C.bg, opacity: 0.85, rx: 4 });
      s += text(lx, ly + 3, `${d.toFixed(0)} px`, { anchor: 'middle', size: 12, color: rayColor(d), weight: 'bold' });
    }
  });
  return s;
}

// ---------- the real data ----------
const runs = Object.fromEntries([1, 2, 3, 4, 5].map((s) => [s, json(`runs/seed-${s}.json`)]));
const champs = Object.fromEntries([1, 2, 3, 4, 5].map((s) => [s, json(`champions/seed-${s}.json`).champions]));

// One saved champion alone on the track; calls onStep(car record, generation) after every step.
function solo(brain, onStep, maxSteps = 3600) {
  const gen = createGeneration(track, [brain]);
  while (!gen.over && gen.step < maxSteps) { stepGeneration(gen); onStep(gen.cars[0], gen); }
  return gen;
}

// The hairpin frame: the seed 3 generation 40 champion, step 368 of its solo run.
const FRAME = { seed: 3, generation: 40, step: 368 };
let frame = null;
solo(champs[3]['40'].brain, (c, gen) => {
  if (gen.step === FRAME.step) {
    const car = c.world.car;
    frame = { pose: { x: car.prevX, y: car.prevY, angle: car.prevAngle }, view: c.view.slice(), inputs: c.inputs.slice(), keys: c.keys, ex: explainThink(c.brain, c.inputs) };
  }
}, FRAME.step);
const LEFT = 2;
const hBig = frame.ex.output[LEFT].terms.reduce((b, t, h, all) => (Math.abs(t.product) > Math.abs(all[b].product) ? h : b), 0);
data.frame = {
  ...FRAME, view: frame.view, inputs: frame.inputs, speed: frame.inputs[5] * CAR.maxSpeed, keys: frame.keys,
  hidden: frame.ex.hidden.map((n) => ({ terms: n.terms, sum: n.sum, bias: n.bias, total: n.total, value: n.value })),
  output: frame.ex.output.map((n) => ({ terms: n.terms, sum: n.sum, bias: n.bias, total: n.total, value: n.value })),
  strongestHiddenForLeft: hBig + 1,
};

// ===================================================================
// Chapter 0
// ===================================================================
save('00-four-parts.svg', svg(900, 380, 'The four parts of Bug Driver', [
  box(30, 40, 190, 120, 'WORLD', ['the track and its walls', 'car physics', 'checkpoints, lap timer']),
  box(250, 40, 190, 120, 'EYES', ['5 rays look for walls', '→ 6 numbers'], C.cyan),
  box(470, 40, 190, 120, 'BRAIN', ['70 numbers', '6 → 6 → 4 neurons'], C.yellow),
  box(690, 40, 180, 120, 'KEYS', ['gas · brake', 'left · right', '(the same 4 as mine)'], C.pink),
  line(220, 100, 248, 100, C.dim, 2, { arrow: true }), line(440, 100, 468, 100, C.dim, 2, { arrow: true }), line(660, 100, 688, 100, C.dim, 2, { arrow: true }),
  poly([{ x: 780, y: 160 }, { x: 780, y: 190 }, { x: 125, y: 190 }, { x: 125, y: 162 }], { stroke: C.dim, width: 2 }).replace('/>', ' marker-end="url(#arrow)"/>'),
  text(340, 184, 'the keys move the car · 60 times a second', { anchor: 'middle', size: 11, color: C.dim }),
  box(170, 225, 560, 105, 'EVOLUTION', ['100 cars try · the best 10 are kept', 'their numbers are copied with small random changes', '→ the next 100 cars'], C.green),
  poly([{ x: 565, y: 225 }, { x: 565, y: 162 }], { stroke: C.green, width: 2 }).replace('/>', ' marker-end="url(#arrow)"/>'),
  text(575, 205, 'better numbers', { size: 11, color: C.green }),
  text(450, 360, 'No AI knowledge needed: each part is a few short, plain functions.', { anchor: 'middle', size: 13, color: C.text, opacity: 0.8 }),
].join('\n')), 'The four parts (world, eyes, brain, evolution) and how they connect.');

// ===================================================================
// Chapter 1: the world
// ===================================================================
{
  const v = { x0: 80, y0: 40, scale: 0.62, ox: 20, oy: 40 };
  const parts = [drawTrack(v, { checkpoints: true })];
  // chevrons past the start line, like in the game
  for (const dist of [60, 92, 124]) {
    const i = Math.round(dist / (track.length / track.center.length));
    const p = at(v, track.center[i]), t = track.tangents[i];
    parts.push(poly([{ x: p.x - t.x * 5 - t.y * 8, y: p.y - t.y * 5 + t.x * 8 }, { x: p.x + t.x * 5, y: p.y + t.y * 5 }, { x: p.x - t.x * 5 + t.y * 8, y: p.y - t.y * 5 - t.x * 8 }], { stroke: C.cyan, width: 2.5, opacity: 0.8 }));
  }
  parts.push(drawBug(v, track.spawn));
  const lbl = (x, y, s, o) => parts.push(text(v.ox + (x - v.x0) * v.scale, v.oy + (y - v.y0) * v.scale, s, o));
  lbl(560, 712, 'start / finish', { anchor: 'middle', size: 12, color: C.text });
  lbl(150, 175, 'hairpin', { anchor: 'middle', size: 12, color: C.yellow });
  lbl(905, 300, 'U-turn', { anchor: 'middle', size: 12, color: C.yellow });
  lbl(1010, 470, '82 checkpoints', { anchor: 'middle', size: 12, color: C.cyan });
  lbl(1010, 492, '(thin lines, every 48 px)', { anchor: 'middle', size: 11, color: C.cyan, opacity: 0.7 });
  parts.push(text(430, 470, `Neon Loop: road ${TRACKS[0].width} px wide, ${track.length.toFixed(0)} px around. Driving direction: the chevrons.`, { anchor: 'middle', size: 12, color: C.dim }));
  save('01-track.svg', svg(860, 490, 'The track with its checkpoints', parts.join('\n')), 'The real track: walls, the 82 invisible checkpoints, start line and driving direction.');
  data.track = { width: TRACKS[0].width, length: +track.length.toFixed(0), checkpoints: track.checkpoints.length, checkpointEvery: 48 };
}
{
  // road cross-sections at 64 and 90 px, the car to scale (26 px wide)
  const parts = [];
  const k = 3.2;
  [[64, 806, 13.0, 17.2], [90, 543, 12.68, 17.25]].forEach(([w, crashes, fastest, careful], n) => {
    const cx = 220 + n * 420, top = 50, len = 150;
    const half = (w / 2) * k;
    parts.push(rect(cx - half, top, half * 2, len, { fill: C.road, rx: 0 }));
    parts.push(line(cx - half, top, cx - half, top + len, C.magenta, 3, { glow: true }), line(cx + half, top, cx + half, top + len, C.magenta, 3, { glow: true }));
    parts.push(drawBug({ x0: 0, y0: 0, scale: k, ox: cx, oy: top + len / 2 }, { x: 0, y: 0, angle: -Math.PI / 2 }));
    const room = (w - CAR.width) / 2;
    parts.push(line(cx - half, top + len + 14, cx - (CAR.width / 2) * k, top + len + 14, C.yellow, 1.5));
    parts.push(text(cx - half - 6, top + len + 34, `${room} px of room on each side`, { size: 12, color: C.yellow }));
    parts.push(text(cx, top - 14, `road ${w} px · car ${CAR.width} px wide`, { anchor: 'middle', size: 14, weight: 'bold', color: w === 90 ? C.cyan : C.dim }));
    parts.push(text(cx, top + len + 60, `scripted test driver, 980 settings: ${crashes} crashed`, { anchor: 'middle', size: 12, color: C.text }));
    parts.push(text(cx, top + len + 78, `careful lap ${careful.toFixed(2)} s · fastest ${fastest.toFixed(2)} s`, { anchor: 'middle', size: 12, color: C.dim }));
  });
  save('01-road-width.svg', svg(860, 320, 'Road width 64 px vs 90 px', parts.join('\n')), 'Why the road got wider: the car to scale on a 64 px and a 90 px road, with the crash counts.');
  data.roadWidth = { before: { width: 64, crashed: 806, careful: 17.2, fastest: 13.0 }, after: { width: 90, crashed: 543, careful: 17.25, fastest: 12.68 }, roomBefore: (64 - CAR.width) / 2, roomAfter: (90 - CAR.width) / 2 };
}
{
  // fixed timestep: screens tick at different rates, the simulation always at 1/60 s
  const parts = [];
  const x0 = 170, w = 640, ms = 100; // a 100 ms window
  const rows = [['60 Hz screen', 1000 / 60, C.dim], ['144 Hz screen', 1000 / 144, C.dim], ['30 Hz screen', 1000 / 30, C.dim], ['simulation', 1000 / 60, C.cyan]];
  rows.forEach(([label, every, color], n) => {
    const y = 50 + n * 50;
    parts.push(text(20, y + 5, label, { size: 13, color: n === 3 ? C.cyan : C.text, weight: n === 3 ? 'bold' : 'normal' }));
    parts.push(line(x0, y, x0 + w, y, C.dim, 1, { opacity: 0.4 }));
    for (let t = 0; t <= ms + 0.01; t += every) parts.push(line(x0 + (t / ms) * w, y - 10, x0 + (t / ms) * w, y + 10, color, n === 3 ? 3 : 2, { glow: n === 3 }));
  });
  parts.push(line(20, 210, 840, 210, C.dim, 1, { opacity: 0.25 }));
  parts.push(text(x0, 250, '0 ms', { size: 11, color: C.dim }), text(x0 + w, 250, '100 ms', { size: 11, color: C.dim, anchor: 'end' }));
  parts.push(text(430, 280, 'Screens draw as often as they can. The simulation always moves in steps of exactly 1/60 s,', { anchor: 'middle', size: 12, color: C.text }));
  parts.push(text(430, 298, 'so the same keys give the same lap on every computer.', { anchor: 'middle', size: 12, color: C.text }));
  save('01-fixed-steps.svg', svg(860, 320, 'Fixed timestep', parts.join('\n')), 'Fixed timestep: screens refresh at different rates, the simulation always steps at 1/60 s.');
}

// ===================================================================
// Chapter 2: eyes
// ===================================================================
const hairpinView = { x0: 190, y0: 52, scale: 1.9, ox: 20, oy: 20 };
const HAIRPIN_CLIP = { clip: { w: 800, h: 556 } };
{
  const v = hairpinView, parts = [drawTrack(v, HAIRPIN_CLIP)];
  parts.push(drawRays(v, frame.pose, frame.view));
  parts.push(drawBug(v, frame.pose));
  const legend = SENSOR_LABELS.map((l, i) => `${l}: ${frame.view[i].toFixed(1)} px`);
  legend.forEach((l, i) => parts.push(text(30 + (i % 3) * 250, 580 + Math.floor(i / 3) * 22, l, { size: 13, color: rayColor(frame.view[i]) })));
  parts.push(text(530, 602, `speed: ${data.frame.speed.toFixed(0)} px/s`, { size: 13, color: C.yellow }));
  parts.push(text(30, 640, `Seed 3, generation 40 champion, alone on the track, step ${FRAME.step}: the moment it decided.`, { size: 11, color: C.dim }));
  save('02-eyes-hairpin.svg', svg(800, 660, 'The five eyes at the hairpin', parts.join('\n')), 'A real frame at the hairpin: the 5 rays and the distance each one measures.');
}
{
  const parts = [];
  // the ruler: distance -> number
  const x0 = 40, w = 330, y = 70;
  parts.push(text(x0, 40, 'distance to the wall → the number the brain gets', { size: 13, weight: 'bold', color: C.cyan }));
  parts.push(line(x0, y, x0 + w, y, C.dim, 2));
  for (const d of [0, 50, 100, 150, 200]) {
    const x = x0 + (d / 200) * w;
    parts.push(line(x, y - 8, x, y + 8, C.dim, 2));
    parts.push(text(x, y - 14, `${d} px`, { anchor: 'middle', size: 11, color: C.dim }));
    parts.push(text(x, y + 26, (1 - d / 200).toFixed(2), { anchor: 'middle', size: 13, color: rayColor(d), weight: 'bold' }));
  }
  parts.push(text(x0, y + 54, 'touching = 1 · nothing within 200 px = 0', { size: 12, color: C.text }));
  // the 6 real inputs at the hairpin frame
  const bx = 430, by = 30;
  parts.push(text(bx, by + 10, `the 6 inputs at step ${FRAME.step}`, { size: 13, weight: 'bold', color: C.yellow }));
  frame.inputs.forEach((val, i) => {
    const yy = by + 34 + i * 26;
    const src = i < 5 ? `${frame.view[i].toFixed(0)} px` : `${data.frame.speed.toFixed(0)} px/s`;
    parts.push(text(bx, yy + 11, `${(i < 5 ? SENSOR_LABELS[i] : 'speed').padEnd(9)} ${src.padStart(8)}`, { size: 12, color: C.text }));
    parts.push(rect(bx + 190, yy, 150, 14, { fill: C.road, rx: 3 }));
    parts.push(rect(bx + 190, yy, 150 * val, 14, { fill: i < 5 ? rayColor((1 - val) * 200) : C.yellow, rx: 3 }));
    parts.push(text(bx + 350, yy + 11, val.toFixed(3), { size: 12, color: C.text }));
  });
  parts.push(text(bx, by + 200, 'speed: 330 px/s (flat out) = 1, standing still = 0', { size: 11, color: C.dim }));
  save('02-distance-to-input.svg', svg(860, 260, 'From distances to the 6 inputs', parts.join('\n')), 'How a distance becomes a number between 0 and 1, and the 6 real inputs at the hairpin frame.');
}

// ===================================================================
// Chapter 3: brain
// ===================================================================
{
  const n = frame.ex.hidden[hBig], parts = [];
  const labels = [...SENSOR_LABELS, 'speed'];
  parts.push(text(20, 30, `one neuron, really: hidden neuron h${hBig + 1}, seed 3 gen 40 champion, step ${FRAME.step}`, { size: 13, weight: 'bold', color: C.cyan }));
  parts.push(text(20, 56, 'input', { size: 11, color: C.dim }), text(230, 56, '×  weight', { size: 11, color: C.dim }), text(350, 56, '=', { size: 11, color: C.dim }));
  n.terms.forEach((t, i) => {
    const y = 82 + i * 30;
    parts.push(text(20, y, labels[i], { size: 12, color: C.text }));
    parts.push(text(160, y, fx(t.input), { size: 13, color: C.cyan }));
    parts.push(text(230, y, `×  ${fx(t.weight)}`, { size: 13, color: t.weight >= 0 ? C.cyan : C.pink }));
    parts.push(text(350, y, `=  ${fx(t.product)}`, { size: 13, color: C.text }));
    parts.push(line(450, y - 4, 560, 175, C.dim, 1, { opacity: 0.5 }));
  });
  parts.push(circle(600, 175, 40, { fill: C.road, stroke: C.cyan, width: 2, glow: true }));
  parts.push(text(600, 170, 'add up', { anchor: 'middle', size: 11, color: C.text }), text(600, 186, fx(n.sum), { anchor: 'middle', size: 13, color: C.cyan, weight: 'bold' }));
  parts.push(text(600, 245, `+ bias ${fx(n.bias)}`, { anchor: 'middle', size: 12, color: C.text }));
  parts.push(text(600, 265, `= ${fx(n.total)}`, { anchor: 'middle', size: 12, color: C.text }));
  parts.push(line(642, 175, 700, 175, C.dim, 2, { arrow: true }));
  parts.push(rect(705, 150, 70, 50, { fill: C.road, stroke: C.yellow, rx: 8 }), text(740, 172, 'squash', { anchor: 'middle', size: 11, color: C.yellow }), text(740, 188, '(tanh)', { anchor: 'middle', size: 11, color: C.yellow }));
  parts.push(line(775, 175, 800, 175, C.dim, 2, { arrow: true }));
  parts.push(text(830, 180, fx(n.value), { anchor: 'middle', size: 16, color: C.pink, weight: 'bold', glow: true }));
  parts.push(text(430, 300, 'Multiply each input by its weight, add them up, add the bias, squash. That is all a neuron does.', { anchor: 'middle', size: 12, color: C.text, opacity: 0.85 }));
  save('03-neuron.svg', svg(870, 320, 'One neuron with real numbers', parts.join('\n')), `One real neuron (h${hBig + 1}) worked through: inputs × weights, sum, + bias, squash.`);
}
{
  const parts = [];
  const plot = (x0, y0, w, h, f, xr, yr, title, points, mid) => {
    let s = text(x0, y0 - 12, title, { size: 13, weight: 'bold', color: C.cyan });
    s += rect(x0, y0, w, h, { fill: C.road, rx: 6 });
    const X = (v) => x0 + ((v - xr[0]) / (xr[1] - xr[0])) * w, Y = (v) => y0 + h - ((v - yr[0]) / (yr[1] - yr[0])) * h;
    s += line(X(0), y0, X(0), y0 + h, C.dim, 1, { opacity: 0.4 }) + line(x0, Y(mid), x0 + w, Y(mid), C.dim, 1, { opacity: 0.4, dash: '4 4' });
    for (const yv of [yr[0], mid, yr[1]]) s += text(x0 - 6, Y(yv) + 4, String(yv), { anchor: 'end', size: 11, color: C.dim });
    for (const xv of [xr[0], 0, xr[1]]) s += text(X(xv), y0 + h + 16, String(xv), { anchor: 'middle', size: 11, color: C.dim });
    const pts = Array.from({ length: 121 }, (_, i) => { const xv = xr[0] + ((xr[1] - xr[0]) * i) / 120; return { x: X(xv), y: Y(f(xv)) }; });
    s += poly(pts, { stroke: C.cyan, width: 2.5, glow: true });
    for (const [px, label, color] of points) {
      s += circle(X(px), Y(f(px)), 5, { fill: color, glow: true });
      s += text(X(px) + 10, Y(f(px)) + (f(px) > mid ? 18 : -10), label, { size: 11, color });
    }
    return s;
  };
  const hn = frame.ex.hidden[hBig], out = frame.ex.output[LEFT];
  parts.push(plot(50, 50, 330, 200, tanh, [-4, 4], [-1, 1], 'tanh: for the 6 hidden neurons', [[hn.total, `h${hBig + 1}: ${fx(hn.total)} → ${fx(hn.value)}`, C.pink]], 0));
  parts.push(plot(480, 50, 330, 200, sigmoid, [-6, 6], [0, 1], 'sigmoid: for the 4 keys', [[out.total, `LEFT: ${fx(out.total)} → ${fx(out.value)}`, C.yellow]], 0.5));
  parts.push(text(645, 275, 'above the dashed line (0.5) = key pressed', { anchor: 'middle', size: 11, color: C.dim }));
  parts.push(text(430, 300, 'Any number goes in, a tidy number comes out: big stays big, small stays small, but nothing runs off to infinity.', { anchor: 'middle', size: 11.5, color: C.text, opacity: 0.85 }));
  save('03-squash-curves.svg', svg(870, 320, 'The two squash curves', parts.join('\n')), 'The two squash functions, tanh and sigmoid, with the real values from the hairpin frame marked.');
}
{
  // the whole network of the gen 40 champion, with the values of the hairpin frame
  const parts = [], ex = frame.ex;
  const inX = 210, hidX = 450, outX = 690;
  const inY = (i) => 60 + i * 48, hidY = (h) => 60 + h * 48, outY = (k) => 96 + k * 60;
  const conn = (x1, y1, x2, y2, w) => {
    const size = Math.min(1, Math.abs(w) / 2);
    return line(x1, y1, x2, y2, w >= 0 ? C.cyan : C.pink, 0.6 + 3 * size, { opacity: 0.15 + 0.65 * size });
  };
  ex.hidden.forEach((n, h) => n.terms.forEach((t, i) => parts.push(conn(inX, inY(i), hidX, hidY(h), t.weight))));
  ex.output.forEach((n, k) => n.terms.forEach((t, h) => parts.push(conn(hidX, hidY(h), outX, outY(k), t.weight))));
  const labels = [...SENSOR_LABELS, 'speed'];
  ex.inputs.forEach((v, i) => {
    parts.push(circle(inX, inY(i), 13, { fill: C.cyan, opacity: 0.1 + 0.9 * v, stroke: C.text, width: 1 }));
    parts.push(text(inX - 22, inY(i) + 4, `${labels[i]} ${v.toFixed(2)}`, { anchor: 'end', size: 12, color: C.text }));
  });
  ex.hidden.forEach((n, h) => {
    parts.push(circle(hidX, hidY(h), 13, { fill: n.value >= 0 ? C.cyan : C.pink, opacity: 0.1 + 0.9 * Math.abs(n.value), stroke: C.text, width: 1 }));
    parts.push(text(hidX + 20, hidY(h) - 12, `h${h + 1} ${n.value.toFixed(2)}`, { size: 11, color: C.dim }));
  });
  ex.output.forEach((n, k) => {
    const on = n.value > 0.5;
    parts.push(circle(outX, outY(k), 14, { fill: C.yellow, opacity: on ? 1 : 0.1 + 0.5 * n.value, stroke: C.text, width: 1, glow: on }));
    parts.push(text(outX + 24, outY(k) + 4, `${OUTPUT_LABELS[k].toUpperCase()} ${n.value.toFixed(3)}${on ? '  pressed' : ''}`, { size: 12, color: on ? C.yellow : C.dim, weight: on ? 'bold' : 'normal' }));
  });
  parts.push(text(inX, 22, '6 inputs', { anchor: 'middle', size: 12, color: C.cyan, weight: 'bold' }), text(hidX, 22, '6 hidden neurons', { anchor: 'middle', size: 12, color: C.cyan, weight: 'bold' }), text(outX, 22, '4 outputs = 4 keys', { anchor: 'middle', size: 12, color: C.yellow, weight: 'bold' }));
  const hiddenCount = HIDDEN * (INPUTS + 1), outCount = OUTPUTS * (HIDDEN + 1);
  parts.push(text(450, 360, `hidden layer: 6 neurons × (6 weights + 1 bias) = ${hiddenCount} numbers`, { anchor: 'middle', size: 12, color: C.text }));
  parts.push(text(450, 380, `output layer: 4 neurons × (6 weights + 1 bias) = ${outCount} numbers`, { anchor: 'middle', size: 12, color: C.text }));
  parts.push(text(450, 404, `${hiddenCount} + ${outCount} = ${BRAIN_SIZE}: the whole brain is ${BRAIN_SIZE} numbers`, { anchor: 'middle', size: 14, color: C.yellow, weight: 'bold', glow: true }));
  parts.push(text(450, 424, 'line thickness = size of the weight · cyan = positive · pink = negative', { anchor: 'middle', size: 11, color: C.dim }));
  save('03-network.svg', svg(900, 440, 'The whole network', parts.join('\n')), 'The real 6 → 6 → 4 network of the seed 3 gen 40 champion at the hairpin frame, and the count to 70.');
  data.brainCount = { hidden: hiddenCount, output: outCount, total: BRAIN_SIZE };
}
{
  // generation 1 chaos: seed 2 at 1.5 s
  const evo = createEvolution(track, 2);
  for (let s = 0; s < 90; s++) stepGeneration(evo.gen);
  const v = { x0: 80, y0: 40, scale: 0.62, ox: 20, oy: 30 }, parts = [drawTrack(v)];
  const out = evo.gen.cars.filter((c) => c.out), alive = evo.gen.cars.filter((c) => !c.out);
  for (const c of out) parts.push(drawBug(v, c.world.car, { opacity: 0.35, color: C.pink }));
  for (const c of alive) parts.push(drawBug(v, c.world.car, { opacity: 0.8 }));
  parts.push(text(430, 470, `Seed 2, generation 1, 1.5 s in: ${out.length} of 100 already out (pink), ${alive.length} still driving.`, { anchor: 'middle', size: 12, color: C.text }));
  save('03-gen1-chaos.svg', svg(860, 490, 'Generation 1 chaos', parts.join('\n')), 'Generation 1 (random brains), seed 2 at 1.5 s: wrecks and confused cars around the start.');
  data.gen1Chaos = { seed: 2, step: 90, out: out.length, alive: alive.length };
}

// ===================================================================
// Chapter 4: evolution
// ===================================================================
let gen4 = null, gen5 = null;
{
  // one generation, really: seed 3, generation 4 (the first lap ever) -> generation 5
  const evo = runEvolution(createEvolution(track, 3), 3);
  while (!evo.gen.over) stepGeneration(evo.gen);
  gen4 = evo.gen;
  const ranked = [...gen4.cars].sort((a, b) => fitness(b) - fitness(a)); // the same ranking selection() makes
  finishGeneration(evo);
  gen5 = nextGeneration(evo);
  const parents = ranked.slice(0, 10);
  const kids = parents.map((p) => gen5.cars.filter((c, i) => i > 0 && c.parentId === p.id).length);
  const parts = [];
  parts.push(text(20, 30, 'generation 4 (seed 3): all 100 cars, ranked by fitness', { size: 13, weight: 'bold', color: C.cyan }));
  const maxF = fitness(ranked[0]);
  ranked.forEach((c, i) => {
    const h = Math.max(1, (fitness(c) / maxF) * 120);
    parts.push(rect(20 + i * 8.4, 170 - h, 6.4, h, { fill: i < 10 ? C.yellow : C.cyan, opacity: i < 10 ? 1 : 0.45, rx: 1 }));
  });
  parts.push(text(20, 192, `best ${fitness(ranked[0]).toFixed(1)} (car ${ranked[0].id}: the first lap ever)`, { size: 11, color: C.yellow }));
  parts.push(text(860, 192, `worst ${fitness(ranked[99]).toFixed(1)}`, { anchor: 'end', size: 11, color: C.dim }));
  parts.push(line(450, 200, 450, 228, C.dim, 2, { arrow: true }));
  parts.push(text(460, 220, 'keep the top 10 as parents', { size: 11, color: C.dim }));
  parents.forEach((p, i) => {
    const x = 20 + i * 86;
    parts.push(rect(x, 236, 78, 56, { fill: C.road, stroke: C.yellow, rx: 6 }));
    parts.push(text(x + 39, 254, `#${i + 1} ${p.id}`, { anchor: 'middle', size: 11, color: C.yellow }));
    parts.push(text(x + 39, 270, fitness(p).toFixed(1), { anchor: 'middle', size: 11, color: C.text }));
    parts.push(text(x + 39, 285, `${kids[i]} children`, { anchor: 'middle', size: 10, color: C.dim }));
  });
  parts.push(line(450, 298, 450, 326, C.dim, 2, { arrow: true }));
  parts.push(rect(20, 334, 160, 46, { fill: C.road, stroke: C.green, rx: 6 }), text(100, 352, '1 elite', { anchor: 'middle', size: 12, color: C.green, weight: 'bold' }), text(100, 370, `copy of ${parents[0].id}, unchanged`, { anchor: 'middle', size: 10, color: C.text }));
  parts.push(rect(200, 334, 660, 46, { fill: C.road, stroke: C.cyan, rx: 6 }), text(530, 352, '99 children', { anchor: 'middle', size: 12, color: C.cyan, weight: 'bold' }), text(530, 370, 'each: a copy of one parent (better ranks picked more often), with about 10% of its 70 numbers nudged', { anchor: 'middle', size: 10, color: C.text }));
  parts.push(text(450, 404, '= generation 5: 100 new cars', { anchor: 'middle', size: 12, color: C.text }));
  save('04-one-generation.svg', svg(880, 420, 'One generation becomes the next', parts.join('\n')), 'One real generation (seed 3, gen 4): 100 ranked cars → top 10 parents → 1 elite + 99 children.');
  data.oneGeneration = { seed: 3, generation: 4, best: { id: ranked[0].id, fitness: fitness(ranked[0]) }, top10: parents.map((p, i) => ({ id: p.id, fitness: fitness(p), children: kids[i] })), worst: fitness(ranked[99]) };
}
{
  // mutation, really: a typical child of generation 5 next to its parent from generation 4
  const parentOf = (c) => gen4.cars.find((p) => p.id === c.parentId);
  const counts = gen5.cars.slice(1).map((c) => c.brain.filter((w, i) => w !== parentOf(c).brain[i]).length);
  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  const typical = gen5.cars.slice(1).find((c, i) => counts[i] === Math.round(mean)); // the first child with the usual number of changes
  const child = typical, parent = parentOf(child);
  const changed = child.brain.map((w, i) => w !== parent.brain[i]);
  const parts = [];
  const grid = (x0, brain, title) => {
    let s = text(x0, 36, title, { size: 12, weight: 'bold', color: C.cyan });
    brain.forEach((w, i) => {
      const col = i % 7, row = Math.floor(i / 7), x = x0 + col * 52, y = 50 + row * 22 + (row >= 6 ? 8 : 0);
      const size = Math.min(1, Math.abs(w) / 2);
      s += rect(x, y, 48, 18, { fill: w >= 0 ? C.cyan : C.pink, opacity: 0.12 + 0.6 * size, rx: 3, stroke: changed[i] ? C.yellow : 'none', width: 2 });
      s += text(x + 24, y + 13, w.toFixed(2), { anchor: 'middle', size: 10, color: C.text });
    });
    return s;
  };
  parts.push(grid(20, parent.brain, `parent ${parent.id}`));
  parts.push(grid(450, child.brain, `child ${child.id}`));
  const n = changed.filter(Boolean).length;
  parts.push(text(430, 300, `${n} of 70 numbers changed (yellow outline); the other ${70 - n} are exact copies.`, { anchor: 'middle', size: 12, color: C.yellow }));
  const ex = changed.findIndex(Boolean);
  parts.push(text(430, 318, `for example number ${ex + 1}: ${fx(parent.brain[ex])} → ${fx(child.brain[ex])} · all 99 children of gen 5: ${Math.min(...counts)} to ${Math.max(...counts)} changes, ${mean.toFixed(2)} on average`, { anchor: 'middle', size: 11, color: C.dim }));
  save('04-mutation.svg', svg(840, 334, 'Mutation', parts.join('\n')), 'Mutation for real: a gen 5 child next to its gen 4 parent, the changed numbers outlined.');
  data.mutation = { child: child.id, parent: parent.id, changed: n, example: { index: ex + 1, from: parent.brain[ex], to: child.brain[ex] }, allChildren: { min: Math.min(...counts), max: Math.max(...counts), mean } };
}
// A line chart: series = [{values: [...per generation or null], color, label}]
function chart(x0, y0, w, h, series, yMax, yMin = 0, o = {}) {
  const { yLabel = '', refs = [], marks = [], gens = 100, yTicks = [] } = o;
  let s = rect(x0, y0, w, h, { fill: C.road, rx: 6 });
  const X = (g) => x0 + ((g - 1) / (gens - 1)) * w, Y = (v) => y0 + h - ((v - yMin) / (yMax - yMin)) * h;
  for (const t of yTicks) s += line(x0, Y(t), x0 + w, Y(t), C.dim, 1, { opacity: 0.12 }) + text(x0 - 6, Y(t) + 4, String(t), { anchor: 'end', size: 10, color: C.dim });
  for (const g of [1, 20, 40, 60, 80, 100]) s += text(X(g), y0 + h + 15, `gen ${g}`, { anchor: 'middle', size: 10, color: C.dim });
  for (const [v, label, color, lx = 1] of refs) s += line(x0, Y(v), x0 + w, Y(v), color, 1, { opacity: 0.8, dash: '5 4' }) + text(x0 + w * lx - 4, Y(v) - 4, label, { anchor: 'end', size: 10, color });
  const ends = [];
  for (const { values, color, label, width = 2 } of series) {
    let seg = [];
    const flush = () => { if (seg.length) s += poly(seg, { stroke: color, width, glow: true }); seg = []; };
    values.forEach((v, i) => { if (v == null) flush(); else seg.push({ x: X(i + 1), y: Y(v) }); });
    flush();
    if (label) { const last = values.length - 1 - [...values].reverse().findIndex((v) => v != null); ends.push({ x: X(last + 1) + 6, y: Y(values[last]) + 4, label, color }); }
  }
  // end labels, nudged apart so they don't sit on top of each other
  ends.sort((a, b) => a.y - b.y).forEach((e, i, all) => { if (i && e.y - all[i - 1].y < 12) e.y = all[i - 1].y + 12; s += text(e.x, e.y, e.label, { size: 10, color: e.color }); });
  for (const [g, v, label, color] of marks) s += circle(X(g), Y(v), 5, { fill: color, glow: true }) + text(X(g) + 10, Y(v) + 14, label, { size: 11, color });
  if (yLabel) s += text(x0, y0 - 8, yLabel, { size: 12, weight: 'bold', color: C.cyan });
  return s;
}
{
  const h = runs[3].history, parts = [];
  parts.push(chart(70, 40, 690, 150, [
    { values: h.map((r) => r.averageFitness), color: C.yellow, label: 'average' },
    { values: h.map((r) => r.bestFitness), color: C.cyan, label: 'best' },
  ], 900, 0, { yLabel: 'seed 3: fitness per generation', yTicks: [0, 300, 600, 900] }));
  const laps = h.map((r) => (r.bestLapSteps == null ? null : r.bestLapSteps / STEPS_PER_SECOND));
  parts.push(chart(70, 250, 690, 170, [{ values: laps, color: C.cyan, label: '' }], 40, 10, {
    yLabel: 'seed 3: best lap per generation (seconds, lower is better)', yTicks: [10, 20, 30, 40],
    refs: [[26.4, 'my best lap 26.40', C.pink], [17.25, 'careful script 17.25', C.dim], [12.68, 'fastest script 12.68', C.dim, 0.62], [11.93, 'floor 11.93', C.dim, 0.3]],
    marks: [[4, h[3].bestLapSteps / STEPS_PER_SECOND, `first lap: gen 4, ${sec(h[3].bestLapSteps)} s`, C.yellow]],
  }));
  save('04-seed3-progress.svg', svg(860, 450, 'Seed 3 learning', parts.join('\n')), 'Seed 3 over 100 generations: best and average fitness, and the best lap time against mine and the reference laps.');
}
{
  const parts = [], colors = { 1: C.pink, 2: C.yellow, 3: C.cyan, 4: C.green, 5: C.magenta };
  parts.push(chart(70, 40, 660, 230, [1, 2, 4, 5, 3].map((s) => ({ values: runs[s].history.map((r) => r.bestFitness), color: colors[s], label: `seed ${s}`, width: s === 3 ? 3 : 2 })),
    900, 0, { yLabel: 'best fitness per generation, all 5 seeds', yTicks: [0, 300, 600, 900] }));
  parts.push(text(400, 315, 'seed 1 (pink, bottom): 43.0 from generation 6 to 100, never a lap', { anchor: 'middle', size: 12, color: C.pink }));
  save('04-five-seeds.svg', svg(860, 330, 'Five seeds', parts.join('\n')), 'Best fitness per generation for all five seeds; seed 1 is the flat line.');
}
{
  // seed 1, generation 31: everyone flat out, everyone crashing at the hairpin exit
  const evo = runEvolution(createEvolution(track, 1), 30);
  const gen = evo.gen, paths = gen.cars.map(() => []), braked = gen.cars.map(() => 0), speeds = gen.cars.map(() => []);
  while (!gen.over) {
    const before = gen.cars.map((c) => c.world.car.speed);
    stepGeneration(gen);
    gen.cars.forEach((c, i) => {
      if (c.outStep === 0 || c.outStep === gen.step) {
        paths[i].push({ x: c.world.car.x, y: c.world.car.y });
        speeds[i].push(before[i]); // the speed it had going into this step (a crash sets it to 0)
        if (c.keys & 2) braked[i]++;
      }
    });
  }
  const ranked = [...gen.cars].sort((a, b) => fitness(b) - fitness(a));
  const best = ranked[0], bi = gen.cars.indexOf(best);
  const v = hairpinView, parts = [drawTrack(v, HAIRPIN_CLIP)];
  parts.push(poly(paths[bi].filter((p) => p.x < 560 && p.y < 330).map((p) => at(v, p)), { stroke: C.yellow, width: 2, glow: true }));
  for (const c of gen.cars) {
    if (c.out !== 'crash' || c.world.car.x > 560 || c.world.car.y > 330) continue;
    const p = at(v, c.world.car);
    parts.push(line(p.x - 5, p.y - 5, p.x + 5, p.y + 5, C.pink, 2), line(p.x - 5, p.y + 5, p.x + 5, p.y - 5, C.pink, 2));
  }
  parts.push(drawBug(v, best.world.car, { color: C.yellow }));
  const sameSpot = gen.cars.filter((c) => c.out === 'crash' && Math.hypot(c.world.car.x - best.world.car.x, c.world.car.y - best.world.car.y) < 6).length;
  { const p = at(v, best.world.car); parts.push(text(p.x + 40, p.y + 8, `${sameSpot} cars crashed right here`, { size: 12, color: C.yellow, weight: 'bold' })); }
  const top10 = ranked.slice(0, 10);
  const nearestWall = (pt) => {
    const d = (pts) => Math.min(...pts.map((q) => Math.hypot(q.x - pt.x, q.y - pt.y)));
    return d(track.inner) < d(track.outer) ? 'inner' : 'outer';
  };
  const crashedCars = gen.cars.filter((c) => c.out === 'crash');
  const hitInner = crashedCars.filter((c) => nearestWall(c.world.car.crash) === 'inner').length;
  const nearBest = top10.filter((c) => fitness(c) === fitness(best)).length;
  const everBraked = braked.filter((b) => b > 0).length;
  const bestSpeed = Math.max(...speeds[bi]);
  [[`seed 1, generation ${gen.number} · × = where a car crashed · yellow = the best car's path`, C.text, 'normal'],
    [`the best car never brakes: it hits the outer wall at ${speeds[bi].at(-1).toFixed(0)} px/s (top speed ${bestSpeed.toFixed(0)})`, C.yellow, 'normal'],
    [`${nearBest} of the top 10 end with exactly the same fitness, ${fitness(best).toFixed(1)} (51.8% of a lap)`, C.text, 'normal'],
    [`of the ${crashedCars.length} crashes, ${hitInner} hit the inner wall (turning in too early), ${crashedCars.length - hitInner} the outer wall`, C.text, 'normal'],
    [`cars that pressed BRAKE even once in this generation: ${everBraked} of 100`, C.pink, 'bold']].forEach(([l, color, weight], i) =>
    parts.push(text(30, 580 + i * 20, l, { size: 12, color, weight })));
  save('04-seed1-stuck.svg', svg(800, 690, 'Seed 1 stuck at the hairpin', parts.join('\n')), 'Seed 1, generation 31: every car drives flat out and crashes at the hairpin exit; nobody brakes.');
  data.seed1 = { sameSpot, hitInner, hitOuter: crashedCars.length - hitInner, generation: gen.number, bestFitness: fitness(best), topTenAtBest: nearBest, everBraked, bestId: best.id, bestCrashSpeed: speeds[bi].at(-1), bestTopSpeed: Math.max(...speeds[bi]), crashPoint: best.world.car.crash, crashed: gen.cars.filter((c) => c.out === 'crash').length,
    stuckFrom: runs[1].history.findIndex((r) => r.bestFitness === runs[1].history[99].bestFitness) + 1, childrenTried: (100 - (runs[1].history.findIndex((r) => r.bestFitness === runs[1].history[99].bestFitness) + 1)) * 99 };
}

// ===================================================================
// Chapter 5: reading a brain
// ===================================================================
{
  const ex = frame.ex, hn = ex.hidden[hBig], out = ex.output[LEFT], parts = [];
  const t0 = hn.terms.reduce((b, t, i, all) => (Math.abs(t.product) > Math.abs(all[b].product) ? i : b), 0);
  const cols = [
    ['1. THE EYE', [`${SENSOR_LABELS[t0]} sees`, `the inner wall at`, `${frame.view[t0].toFixed(0)} px`], C.cyan],
    ['2. THE INPUT', [`close wall →`, `a big number:`, `${fx(frame.inputs[t0])}`], C.cyan],
    [`3. NEURON h${hBig + 1}`, [`${fx(frame.inputs[t0])} × ${fx(hn.terms[t0].weight)} = ${fx(hn.terms[t0].product)}`, `(its biggest term)`, `total ${fx(hn.total)} → ${fx(hn.value)}`], C.pink],
    ['4. KEY LEFT', [`h${hBig + 1}: ${fx(hn.value)} × ${fx(out.terms[hBig].weight)} = ${fx(out.terms[hBig].product)}`, `(its biggest push)`, `total ${fx(out.total)} → ${fx(out.value)}`], C.yellow],
  ];
  cols.forEach(([title, lines, color], i) => {
    const x = 20 + i * 215;
    parts.push(box(x, 40, 195, 120, title, lines, color));
    if (i < 3) parts.push(line(x + 195, 100, x + 213, 100, C.dim, 2, { arrow: true }));
  });
  parts.push(text(440, 200, `${fx(out.value)} is more than 0.5 → LEFT PRESSED`, { anchor: 'middle', size: 16, color: C.yellow, weight: 'bold', glow: true }));
  parts.push(text(440, 226, `(BRAKE is pressed too: ${fx(ex.output[1].value)}. GAS ${fx(ex.output[0].value)} and RIGHT ${fx(ex.output[3].value)} are not.)`, { anchor: 'middle', size: 12, color: C.text }));
  parts.push(text(440, 254, `Seed 3, generation 40 champion, alone on the track, step ${FRAME.step}. Every number is what think() computed.`, { anchor: 'middle', size: 11, color: C.dim }));
  save('05-decision-path.svg', svg(880, 274, 'From a wall at 23 px to pressing LEFT', parts.join('\n')), 'One decision, start to end: the eye, the input, one hidden neuron, and the LEFT key.');
  data.decisionPath = { eye: SENSOR_LABELS[t0], distance: frame.view[t0], strongestTermInHidden: t0 + 1 };
}
{
  // the inside line through the hairpin: how the champions of seed 3 drive it, generation by generation
  const apex = track.center.reduce((b, p, i) => ((p.x - 260) ** 2 + (p.y - 182) ** 2 < (track.center[b].x - 260) ** 2 + (track.center[b].y - 182) ** 2 ? i : b), 0);
  const lineOf = (brain) => {
    const pts = [];
    solo(brain, (c) => { const car = c.world.car; pts.push({ x: car.x, y: car.y, speed: car.speed }); }, 2400);
    return pts;
  };
  // where the car passed this centerline sample (its closest point), and how far toward the inner wall
  const offsetAt = (pts, sample) => {
    const c = track.center[sample], inn = track.inner[sample];
    const ux = (inn.x - c.x) / (TRACKS[0].width / 2), uy = (inn.y - c.y) / (TRACKS[0].width / 2);
    let best = null, bd = Infinity;
    for (const p of pts) { const d = (p.x - c.x) ** 2 + (p.y - c.y) ** 2; if (d < bd) { bd = d; best = p; } }
    return { offset: (best.x - c.x) * ux + (best.y - c.y) * uy, speed: best.speed, x: best.x, y: best.y };
  };
  const gens = ['1', '5', '10', '20', '40', '80'];
  const lines = Object.fromEntries(gens.map((g) => [g, lineOf(champs[3][g].brain)]));
  const spots = [[-12, '96 px before the apex'], [0, 'at the apex'], [6, '48 px after the apex']];
  const table = Object.fromEntries(gens.map((g) => [g, spots.map(([k]) => offsetAt(lines[g], apex + k))]));
  const v = hairpinView, parts = [drawTrack(v, { centerline: true, ...HAIRPIN_CLIP })];
  // only the first pass through the hairpin
  const firstPass = (pts) => { const out = []; for (const p of pts) { if (p.x < 560 && p.y < 330 && p.y > 40) out.push(p); else if (out.length > 40) break; } return out; };
  parts.push(poly(firstPass(lines['1']).map((p) => at(v, p)), { stroke: C.pink, width: 2, opacity: 0.9 }));
  parts.push(poly(firstPass(lines['80']).map((p) => at(v, p)), { stroke: C.yellow, width: 2, opacity: 0.9 }));
  parts.push(poly(firstPass(lines['40']).map((p) => at(v, p)), { stroke: C.cyan, width: 3, glow: true }));
  table['40'].forEach((o) => { const p = at(v, o); parts.push(circle(p.x, p.y, 5, { fill: C.cyan, glow: true })); });
  parts.push(text(30, 578, 'pink = gen 1 champion · cyan = gen 40 · yellow = gen 80 · dashed = middle of the road', { size: 12, color: C.text }));
  parts.push(text(30, 600, 'px toward the inner wall (0 = middle, 32 = shell touching the wall) and speed, at:', { size: 11, color: C.dim }));
  spots.forEach(([, name], i) => parts.push(text(250 + i * 180, 620, name, { size: 11, color: C.dim })));
  gens.forEach((g, j) => {
    const y = 640 + j * 17;
    parts.push(text(30, y, `gen ${g}`, { size: 11, color: g === '40' ? C.cyan : g === '80' ? C.yellow : g === '1' ? C.pink : C.text }));
    table[g].forEach((o, i) => parts.push(text(250 + i * 180, y, `${o.offset.toFixed(1)} px · ${o.speed.toFixed(0)} px/s`, { size: 11, color: C.text })));
  });
  save('05-inside-line.svg', svg(800, 750, 'The inside line', parts.join('\n')), 'Nobody taught it: how the seed 3 champions drive the hairpin, gen 1 vs gen 40 vs gen 80, with the offsets.');
  data.insideLine = { apexSample: apex, maxOffset: TRACKS[0].width / 2 - CAR.width / 2,
    table: Object.fromEntries(gens.map((g) => [g, table[g].map((o, i) => ({ where: spots[i][1], offset: +o.offset.toFixed(1), speed: +o.speed.toFixed(0) }))])) };
}
{
  const a = champs[3]['1'], b = champs[3]['80'];
  const same = a.brain.map((w, i) => w === b.brain[i]);
  const parts = [];
  const grid = (x0, brain, title) => {
    let s = text(x0, 36, title, { size: 12, weight: 'bold', color: C.cyan });
    brain.forEach((w, i) => {
      const col = i % 7, row = Math.floor(i / 7), x = x0 + col * 52, y = 50 + row * 22 + (row >= 6 ? 8 : 0);
      const size = Math.min(1, Math.abs(w) / 2);
      s += rect(x, y, 48, 18, { fill: w >= 0 ? C.cyan : C.pink, opacity: 0.12 + 0.6 * size, rx: 3, stroke: same[i] ? C.green : 'none', width: 2 });
      s += text(x + 24, y + 13, w.toFixed(2), { anchor: 'middle', size: 10, color: C.text });
    });
    return s;
  };
  parts.push(grid(20, a.brain, `generation 1 champion, car ${a.id}`));
  parts.push(grid(450, b.brain, `generation 80 champion, car ${b.id}`));
  const changed = same.filter((s) => !s).length;
  parts.push(text(430, 300, `Same shape, different numbers: ${changed} of 70 changed. The ${70 - changed} green-outlined ones are still exactly the same.`, { anchor: 'middle', size: 12, color: C.text }));
  parts.push(text(430, 318, 'rows: hidden neurons h1–h6, then gas, brake, left, right · columns: their 6 weights and the bias', { anchor: 'middle', size: 11, color: C.dim }));
  save('05-seventy-numbers.svg', svg(840, 334, 'Gen 1 vs gen 80: the 70 numbers', parts.join('\n')), 'The 70 numbers of the gen 1 and gen 80 champions (seed 3) side by side; the unchanged ones outlined.');
  data.seventy = { gen1: a.id, gen80: b.id, changed };
}
{
  // the family line from car 1-85 to the gen 80 champion
  const champ = champs[3]['80'], h = runs[3].history;
  const lineIds = [champ.id, ...champ.ancestors].reverse();
  const parts = [];
  parts.push(text(20, 30, `the gen 80 champion's family line: ${lineIds.length} cars, one per generation, each the parent of the next`, { size: 13, weight: 'bold', color: C.cyan }));
  const pos = (g) => ({ x: 40 + ((g - 1) % 40) * 20.5, y: 90 + Math.floor((g - 1) / 40) * 90 });
  lineIds.forEach((id, i) => {
    const g = i + 1, p = pos(g), elite = id.endsWith('-0') && g > 1;
    if (g < lineIds.length && g % 40 !== 0) { const q = pos(g + 1); parts.push(line(p.x, p.y, q.x, q.y, C.dim, 1, { opacity: 0.5 })); }
    parts.push(circle(p.x, p.y, 6, elite ? { stroke: C.cyan, width: 1.5 } : { fill: g === 1 ? C.text : C.yellow, glow: g !== 1 }));
  });
  for (const g of [1, 5, 10, 20, 40, 80]) {
    const p = pos(g), id = lineIds[g - 1], c = champs[3][String(g)];
    const lap = c && c.id === id && c.lapSteps ? `${sec(c.lapSteps)} s` : '';
    parts.push(text(p.x, p.y + 24, `${g}: ${id}`, { anchor: 'middle', size: 10, color: C.text }));
    if (lap) parts.push(text(p.x, p.y + 38, lap, { anchor: 'middle', size: 10, color: C.cyan }));
  }
  const elites = lineIds.filter((id, i) => i > 0 && id.endsWith('-0')).length;
  const lastChange = lineIds.reduce((last, id, i) => (i > 0 && !id.endsWith('-0') ? i + 1 : last), 0);
  parts.push(circle(40, 300, 6, { fill: C.yellow }), text(52, 304, `mutated child (${lineIds.length - 1 - elites})`, { size: 11, color: C.text }));
  parts.push(circle(260, 300, 6, { stroke: C.cyan, width: 1.5 }), text(272, 304, `unchanged elite copy (${elites})`, { size: 11, color: C.text }));
  parts.push(text(520, 304, `last change: generation ${lastChange}`, { size: 11, color: C.text }));
  parts.push(text(20, 330, `Car 4-78, which drove the very first lap, is not in this line: the line went through 4-0, an unchanged copy of 3-28.`, { size: 11, color: C.dim }));
  save('05-family-line.svg', svg(880, 350, 'The family line', parts.join('\n')), 'The unbroken family line of the gen 80 champion, back to car 1-85: mutated children and unchanged elite copies.');
  data.family = { from: lineIds[0], to: lineIds.at(-1), cars: lineIds.length, elites, mutated: lineIds.length - 1 - elites, lastChange, gen4: lineIds[3], firstLapCarInLine: lineIds.includes('4-78'),
    championsInLine: lineIds.filter((id, i) => h[i].championId === id).length };
}

// ===================================================================
// The simple guide (HOW-IT-WORKS.md): one big picture per chapter, big text for phones,
// still drawn from the same real data. Files start with "simple-".
// ===================================================================
const BIG = 30, MID = 24;
{
  // chapter 0: the whole idea in one loop
  const parts = [];
  const pill = (x, y, w, label, color) => rect(x, y, w, 90, { fill: C.road, stroke: color, width: 3, rx: 22 }) + text(x + w / 2, y + 57, label, { anchor: 'middle', size: BIG, weight: 'bold', color, glow: true });
  parts.push(pill(30, 40, 190, 'EYES', C.cyan), pill(265, 40, 190, 'BRAIN', C.yellow), pill(500, 40, 190, 'KEYS', C.pink));
  parts.push(line(222, 85, 262, 85, C.dim, 4, { arrow: true }), line(457, 85, 497, 85, C.dim, 4, { arrow: true }));
  parts.push(text(125, 168, 'walls: how far?', { anchor: 'middle', size: 20, color: C.text }));
  parts.push(text(330, 168, '70 numbers', { anchor: 'middle', size: 20, color: C.text }));
  parts.push(text(595, 168, 'gas brake left right', { anchor: 'middle', size: 18, color: C.text }));
  parts.push(rect(70, 220, 580, 120, { fill: C.road, stroke: C.green, width: 3, rx: 22 }));
  parts.push(text(360, 265, '100 cars try', { anchor: 'middle', size: MID, color: C.green, weight: 'bold' }));
  parts.push(text(360, 305, 'the best ones get children', { anchor: 'middle', size: MID, color: C.green, weight: 'bold' }));
  parts.push(poly([{ x: 430, y: 220 }, { x: 430, y: 135 }], { stroke: C.green, width: 4 }).replace('/>', ' marker-end="url(#arrow)"/>'));
  save('simple-0-big-idea.svg', svg(720, 370, 'Eyes, brain, keys, and the best get children', parts.join('\n')), 'Simple guide, ch 0: eyes → brain → keys, and the best cars get children.');
}
{
  // chapter 1: the track, big and clean
  const v = { x0: 80, y0: 40, scale: 0.6, ox: 0, oy: 10 };
  const parts = [drawTrack(v)];
  parts.push(drawBug({ ...v }, track.spawn, { scale: 1.8 }));
  const spot = (x, y) => at(v, { x, y });
  const s1 = spot(560, 712), h = spot(350, 192), w = spot(1020, 360);
  parts.push(text(s1.x, s1.y + 8, 'start', { anchor: 'middle', size: MID, color: C.text, weight: 'bold' }));
  parts.push(text(h.x, h.y, '← hairpin', { size: MID, color: C.yellow, weight: 'bold' }));
  parts.push(text(w.x, w.y, 'walls', { anchor: 'middle', size: MID, color: C.magenta, weight: 'bold' }), text(w.x, w.y + 32, '= crash', { anchor: 'middle', size: MID, color: C.magenta, weight: 'bold' }));
  save('simple-1-track.svg', svg(720, 470, 'The track', parts.join('\n')), 'Simple guide, ch 1: the track, the start and the hairpin.');
}
{
  // chapter 2: the eyes at the hairpin, bigger and fewer words
  const v = { x0: 215, y0: 70, scale: 2.2, ox: 10, oy: 10 };
  const parts = [drawTrack(v, { clip: { w: 720, h: 470 } })];
  frame.view.forEach((d, i) => {
    const e = eyePosition(frame.pose, i), ang = frame.pose.angle + SENSOR_ANGLES[i];
    const a = at(v, e), b = at(v, { x: e.x + Math.cos(ang) * d, y: e.y + Math.sin(ang) * d });
    parts.push(line(a.x, a.y, b.x, b.y, rayColor(d), 4, { glow: true }), circle(b.x, b.y, 7, { fill: rayColor(d) }));
    if (i === 0) parts.push(text(b.x + 14, b.y + 34, `${Math.round(d)} px`, { size: BIG, color: rayColor(d), weight: 'bold', glow: true }));
  });
  parts.push(drawBug(v, frame.pose));
  parts.push(text(395, 240, 'the closer the wall,', { size: 22, color: C.text }), text(395, 272, 'the bigger the number', { size: 22, color: C.text }));
  save('simple-2-eyes.svg', svg(720, 470, 'Five eyes', parts.join('\n')), 'Simple guide, ch 2: the 5 eyes at the hairpin; the left one sees the wall about 23 px away.');
}
{
  // chapter 3: the real network of the gen 40 champion, without the numbers
  const ex = frame.ex, parts = [];
  const inX = 120, hidX = 360, outX = 560;
  const inY = (i) => 90 + i * 52, hidY = (h) => 90 + h * 52, outY = (k) => 130 + k * 62;
  const conn = (x1, y1, x2, y2, w) => { const size = Math.min(1, Math.abs(w) / 2); return line(x1, y1, x2, y2, w >= 0 ? C.cyan : C.pink, 1 + 5 * size, { opacity: 0.15 + 0.6 * size }); };
  ex.hidden.forEach((n, h) => n.terms.forEach((t, i) => parts.push(conn(inX, inY(i), hidX, hidY(h), t.weight))));
  ex.output.forEach((n, k) => n.terms.forEach((t, h) => parts.push(conn(hidX, hidY(h), outX, outY(k), t.weight))));
  ex.inputs.forEach((v, i) => parts.push(circle(inX, inY(i), 16, { fill: C.cyan, opacity: 0.15 + 0.85 * v, stroke: C.text, width: 1.5 })));
  ex.hidden.forEach((n) => { const i = ex.hidden.indexOf(n); parts.push(circle(hidX, hidY(i), 16, { fill: n.value >= 0 ? C.cyan : C.pink, opacity: 0.15 + 0.85 * Math.abs(n.value), stroke: C.text, width: 1.5 })); });
  ex.output.forEach((n, k) => {
    const on = n.value > 0.5;
    parts.push(circle(outX, outY(k), 18, { fill: C.yellow, opacity: on ? 1 : 0.12, stroke: C.text, width: 1.5, glow: on }));
    parts.push(text(outX + 30, outY(k) + 9, OUTPUT_LABELS[k].toUpperCase(), { size: MID, color: on ? C.yellow : C.dim, weight: on ? 'bold' : 'normal' }));
  });
  parts.push(text(inX, 50, 'feels', { anchor: 'middle', size: MID, color: C.cyan, weight: 'bold' }), text(hidX, 50, 'thinks', { anchor: 'middle', size: MID, color: C.cyan, weight: 'bold' }), text(outX + 40, 50, 'presses', { anchor: 'middle', size: MID, color: C.yellow, weight: 'bold' }));
  parts.push(text(360, 440, 'every line is one number', { anchor: 'middle', size: MID, color: C.text }));
  save('simple-3-brain.svg', svg(720, 470, 'The brain', parts.join('\n')), 'Simple guide, ch 3: the real brain at the hairpin; BRAKE and LEFT are pressed.');
}
{
  // chapter 4: a real generation (seed 3, gen 4): 100 cars ranked, the best 10 get children
  const ranked = [...gen4.cars].sort((a, b) => fitness(b) - fitness(a));
  const parts = [];
  parts.push(text(360, 50, '100 cars, best to worst', { anchor: 'middle', size: MID, color: C.text, weight: 'bold' }));
  ranked.forEach((c, i) => {
    const col = i % 20, row = Math.floor(i / 20);
    parts.push(drawBug({ x0: 0, y0: 0, scale: 0.8, ox: 60 + col * 31.5, oy: 92 + row * 36 }, { x: 0, y: 0, angle: 0 }, { opacity: i < 10 ? 1 : 0.3, color: i < 10 ? C.yellow : C.cyan }));
  });
  parts.push(text(60, 300, 'the best 10', { size: MID, color: C.yellow, weight: 'bold' }));
  parts.push(line(360, 320, 360, 360, C.dim, 4, { arrow: true }));
  parts.push(rect(60, 372, 600, 74, { fill: C.road, stroke: C.green, width: 3, rx: 18 }));
  parts.push(text(360, 405, 'their copies, with tiny changes,', { anchor: 'middle', size: 22, color: C.green }), text(360, 433, 'are the next 100 cars', { anchor: 'middle', size: 22, color: C.green }));
  save('simple-4-evolution.svg', svg(720, 470, 'Evolution', parts.join('\n')), 'Simple guide, ch 4: a real generation ranked; the best 10 become the parents of the next 100.');
}
{
  // chapter 5: generation 1 vs generation 80 through the hairpin
  const v = { x0: 190, y0: 52, scale: 1.75, ox: 20, oy: 14 };
  const parts = [drawTrack(v, { clip: { w: 720, h: 500 } })];
  const pass = (brain) => { const pts = []; solo(brain, (c) => pts.push({ x: c.world.car.x, y: c.world.car.y }), 1200); const out = []; for (const p of pts) { if (p.x < 520 && p.y < 330 && p.y > 40) out.push(p); else if (out.length > 40) break; } return out; };
  parts.push(poly(pass(champs[3]['1'].brain).map((p) => at(v, p)), { stroke: C.pink, width: 5, glow: true }));
  parts.push(poly(pass(champs[3]['80'].brain).map((p) => at(v, p)), { stroke: C.yellow, width: 5, glow: true }));
  parts.push(text(290, 232, 'gen 1: down the middle', { size: 22, color: C.pink, weight: 'bold' }));
  parts.push(text(290, 270, 'gen 80: hugs the inside', { size: 22, color: C.yellow, weight: 'bold' }));
  save('simple-5-inside-line.svg', svg(720, 500, 'Nobody taught it the inside line', parts.join('\n')), 'Simple guide, ch 5: generation 1 drives the hairpin down the middle; generation 80 hugs the inside.');
}

// ===================================================================
// Chapter 6: me vs the AI
// ===================================================================
const ghost = json('ghosts/me-v3.json');
const board = buildScoreboard(ghost, champs[3]);
// a race, step by step: both positions and how far through the lap each car is
function raceTrace(generation) {
  const race = createRace(track, ghost, { generation, brain: champs[3][String(generation)].brain });
  const me = [], ai = [];
  while (!race.over) { stepRace(race); me.push({ ...pick(race.me.world.car) }); ai.push({ ...pick(race.ai.world.car) }); }
  return { race, me, ai };
}
const pick = (car) => ({ x: car.x, y: car.y, angle: car.angle });
function scoreboardFigure(name, big) {
  const W = 760, parts = [];
  const f = big ? 26 : 16, rowH = big ? 56 : 34, top = big ? 120 : 92;
  parts.push(text(W / 2, big ? 56 : 44, 'ME vs THE AI', { anchor: 'middle', size: big ? 38 : 26, weight: 'bold', color: C.text, glow: true }));
  if (!big) parts.push(text(W / 2, 68, 'my best lap against the best car of each generation (seed 3)', { anchor: 'middle', size: 12, color: C.dim }));
  const cols = big ? [110, 290, 470, 640] : [90, 230, 370, 510, 650];
  const heads = big ? ['GEN', 'ME', 'AI', 'WINS'] : ['GEN', 'ME', 'AI', 'WINNER', 'SCORE'];
  heads.forEach((h, i) => parts.push(text(cols[i], top, h, { anchor: 'middle', size: big ? 20 : 13, color: C.dim, weight: 'bold' })));
  board.rows.forEach((row, i) => {
    const y = top + 40 + i * rowH;
    const cells = [String(row.generation), sec(row.meSteps), row.aiSteps == null ? 'no lap' : sec(row.aiSteps), row.winner === 'ai' ? 'AI' : 'ME'];
    if (!big) cells.push(`${row.score.me} : ${row.score.ai}`);
    const colors = [C.text, C.cyan, C.yellow, row.winner === 'ai' ? C.yellow : C.cyan, C.text];
    cells.forEach((c, j) => parts.push(text(cols[j], y, c, { anchor: 'middle', size: f, color: colors[j], weight: j === 3 ? 'bold' : 'normal', glow: j === 3 })));
  });
  const yEnd = top + 40 + board.rows.length * rowH + (big ? 30 : 16);
  parts.push(text(W / 2, yEnd, `ME ${board.total.me} : ${board.total.ai} AI`, { anchor: 'middle', size: big ? 44 : 30, weight: 'bold', color: C.yellow, glow: true }));
  if (!big) parts.push(text(W / 2, yEnd + 28, 'best lap vs best lap · built from ghosts/me-v3.json and champions/seed-3.json', { anchor: 'middle', size: 11, color: C.dim }));
  save(name, svg(W, yEnd + (big ? 34 : 46), 'Me vs the AI: the scoreboard', parts.join('\n')),
    big ? 'Simple guide, ch 6: the scoreboard, me 2 : 4 AI.' : 'The scoreboard: my 26.40 s lap against seed 3\'s champions of gens 1, 5, 10, 20, 40, 80 → 2:4.');
}
scoreboardFigure('06-scoreboard.svg', false);
scoreboardFigure('simple-6-scoreboard.svg', true);
{
  // one race as a picture: gen 5 vs me, the moment I cross the line
  const { race, me, ai } = raceTrace(5);
  const res = raceResult(race);
  const tMe = race.me.finishSteps; // the step I finish
  const v = { x0: 80, y0: 40, scale: 0.62, ox: 20, oy: 40 }, parts = [drawTrack(v)];
  parts.push(poly(ai.slice(0, tMe).map((p) => at(v, p)), { stroke: C.yellow, width: 2, opacity: 0.55 }));
  parts.push(poly(me.slice(0, tMe).map((p) => at(v, p)), { stroke: C.cyan, width: 2, opacity: 0.55 }));
  const aiAt = ai[tMe - 1], meAt = me[tMe - 1];
  parts.push(`<g>${drawBug(v, aiAt, { color: C.yellow })}</g>`, drawBug(v, meAt));
  const pa = at(v, aiAt), pm = at(v, meAt);
  parts.push(text(pm.x, pm.y - 22, 'ME: finished', { anchor: 'middle', size: 13, color: C.cyan, weight: 'bold' }));
  parts.push(text(pa.x, pa.y - 22, 'GEN 5: not yet', { anchor: 'middle', size: 13, color: C.yellow, weight: 'bold' }));
  parts.push(text(430, 470, `at ${sec(tMe)} s I cross the line. Generation 5 needs ${res.by.toFixed(2)} s more: ME WINS by ${res.by.toFixed(2)} s.`, { anchor: 'middle', size: 13, color: C.text }));
  save('06-race-gen5.svg', svg(860, 490, 'Gen 5 vs me', parts.join('\n')), 'One race: the moment I finish (26.40 s), the gen 5 champion still has 3.62 s to go.');
  data.raceGen5 = { meSteps: res.meSteps, aiSteps: res.aiSteps, by: res.by, aiAtMyFinish: aiAt };
}
{
  // progress through the lap over time: me vs generation 5 vs generation 10
  const lines = [[5, C.yellow], [10, C.green]].map(([g, color]) => ({ g, color, ...raceTrace(g) }));
  const parts = [];
  const x0 = 80, y0 = 50, w = 680, h = 250, tMax = 32;
  const X = (t) => x0 + (t / tMax) * w, Y = (p) => y0 + h - p * h;
  parts.push(rect(x0, y0, w, h, { fill: C.road, rx: 6 }));
  for (const t of [0, 5, 10, 15, 20, 25, 30]) parts.push(text(X(t), y0 + h + 16, `${t} s`, { anchor: 'middle', size: 10, color: C.dim }));
  for (const p of [0, 0.5, 1]) parts.push(text(x0 - 6, Y(p) + 4, `${p * 100}%`, { anchor: 'end', size: 10, color: C.dim }), line(x0, Y(p), x0 + w, Y(p), C.dim, 1, { opacity: 0.12 }));
  const share = (lane) => lane.progress.map((p) => p / (track.checkpoints.length + 1));
  const ends = [];
  const plot = (vals, color, label) => {
    const pts = vals.map((p, i) => ({ x: X((i + 1) / STEPS_PER_SECOND), y: Y(Math.min(1, Math.max(0, p - 1 / (track.checkpoints.length + 1)) / (track.checkpoints.length / (track.checkpoints.length + 1)))) }));
    parts.push(poly(pts, { stroke: color, width: 2.5, glow: true }));
    const end = pts[pts.length - 1];
    ends.push({ x: end.x + 6, y: end.y + 4, label, color });
  };
  const me = lines[0].race.me;
  plot(share(me).slice(0, me.finishSteps), C.cyan, `ME ${sec(me.finishSteps)} s`);
  for (const l of lines) plot(share(l.race.ai).slice(0, l.race.ai.finishSteps), l.color, `GEN ${l.g} ${sec(l.race.ai.finishSteps)} s`);
  // labels that would sit on top of each other go one under the other
  ends.sort((a, b) => a.x - b.x).forEach((e, i, all) => {
    const clash = all.slice(0, i).some((o) => Math.abs(o.y - e.y) < 12 && e.x - o.x < 110);
    parts.push(text(e.x, clash ? e.y + 16 : e.y, e.label, { size: 11, color: e.color }));
  });
  parts.push(text(x0, y0 - 14, 'how far through the lap, over time (100% = across the finish line)', { size: 12, weight: 'bold', color: C.cyan }));
  save('06-progress-race.svg', svg(860, 330, 'Lap progress over time', parts.join('\n')), 'The same races as lines: me (26.40 s), gen 5 (30.02 s, slower) and gen 10 (13.17 s, twice as fast).');
}

// ===================================================================
// Chapter 7: did it learn, or memorize?  (Exam is held out: its shape is shown, no car ever drives it here)
// ===================================================================
{
  const step7 = json('runs/step7a.json').results;
  const tracks7 = ['neon-loop-mirrored', 'zigzag', 'wide-sweepers'];
  // the four new tracks, small
  const parts = [];
  ['neon-loop-mirrored', 'zigzag', 'wide-sweepers', 'exam'].forEach((id, k) => {
    const def = TRACKS.find((t) => t.id === id), t = buildTrack(def);
    const v = { x0: 80, y0: 40, scale: 0.3, ox: 20 + (k % 2) * 420, oy: 50 + Math.floor(k / 2) * 230 };
    const d = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${r1(at(v, p).x)},${r1(at(v, p).y)}`).join('') + 'Z';
    parts.push(`<path d="${d(t.outer)}${d(t.inner)}" fill="${C.road}" fill-rule="evenodd"/>`);
    parts.push(poly(t.outer.map((p) => at(v, p)), { stroke: C.magenta, width: 1.5, closed: true }), poly(t.inner.map((p) => at(v, p)), { stroke: C.magenta, width: 1.5, closed: true }));
    const cp = t.checkpoints[0], a = at(v, { x: cp.ax, y: cp.ay }), b = at(v, { x: cp.bx, y: cp.by });
    parts.push(line(a.x, a.y, b.x, b.y, C.text, 3));
    const p0 = at(v, t.center[10]), tg = t.tangents[10];
    parts.push(line(p0.x - tg.x * 10, p0.y - tg.y * 10, p0.x + tg.x * 10, p0.y + tg.y * 10, C.cyan, 3, { arrow: true }));
    parts.push(text(v.ox + 10, v.oy - 14, def.name + (id === 'exam' ? ' (held out: nobody trains on it)' : ''), { size: 13, weight: 'bold', color: id === 'exam' ? C.yellow : C.cyan }));
  });
  save('07-new-tracks.svg', svg(860, 520, 'The four new tracks', parts.join('\n')), 'The four new tracks (same road, same physics); Exam is held out.');

  // the results matrix
  const cars = [[3, 1], [3, 5], [3, 10], [3, 20], [3, 40], [3, 80], [2, 80], [4, 80], [5, 80]];
  const names = { 'neon-loop-mirrored': 'Mirrored', zigzag: 'Zigzag', 'wide-sweepers': 'Wide Sweepers' };
  const m = [];
  m.push(text(20, 34, 'every champion, alone on tracks it has never seen', { size: 14, weight: 'bold', color: C.cyan }));
  m.push(text(150, 66, 'Neon Loop', { anchor: 'middle', size: 12, color: C.dim, weight: 'bold' }));
  tracks7.forEach((id, j) => m.push(text(290 + j * 190, 66, names[id], { anchor: 'middle', size: 12, color: C.dim, weight: 'bold' })));
  cars.forEach(([seed, gen], i) => {
    const y = 96 + i * 34;
    m.push(text(20, y, `seed ${seed} gen ${gen}`, { size: 12, color: seed === 3 ? C.text : C.dim }));
    const home = champs[seed][String(gen)].lapSteps;
    m.push(text(150, y, home ? `${sec(home)} s` : 'no lap', { anchor: 'middle', size: 12, color: C.dim }));
    tracks7.forEach((id, j) => {
      const r = step7.find((x) => x.track === id && x.seed === seed && x.generation === gen);
      const ok = r.lapSeconds !== null;
      const label = ok ? `${r.lapSeconds.toFixed(2)} s` : `${r.out} at ${Math.round(r.progress)}%`;
      m.push(rect(290 + j * 190 - 80, y - 16, 160, 24, { fill: ok ? C.cyan : C.pink, opacity: 0.16, rx: 5 }));
      m.push(text(290 + j * 190, y, label, { anchor: 'middle', size: 12, color: ok ? C.cyan : C.pink, weight: 'bold' }));
    });
  });
  m.push(text(20, 96 + cars.length * 34 + 6, 'cyan = best lap · pink = never finished a lap: how it got out, and how far it got · Neon Loop = its home track', { size: 11, color: C.dim }));
  save('07-results.svg', svg(860, 96 + cars.length * 34 + 26, 'Did it learn, or memorize?', m.join('\n')), 'Every tested champion on the three new test tracks: best lap, or how far it got and how it got out.');
}
{
  // the most telling failure: the gen 80 champion in Neon Loop Mirrored's hairpin
  const t = buildTrack(TRACKS.find((x) => x.id === 'neon-loop-mirrored'));
  const gen = createGeneration(t, [champs[3]['80'].brain]);
  const trace = [];
  while (!gen.over) { stepGeneration(gen); const c = gen.cars[0].world.car; trace.push({ x: c.x, y: c.y, angle: c.angle, speed: c.speed, step: gen.step }); }
  const stopAt = trace.find((p) => p.step > 380 && p.speed <= 0);
  const last = trace[trace.length - 1];
  const draw = (big) => {
    // zoomed in on the spot where it stops, so the short reverse is visible
    const v = big ? { x0: 196, y0: 150, scale: 3.2, ox: 0, oy: 0 } : { x0: 186, y0: 140, scale: 3.1, ox: 10, oy: 10 };
    const W = big ? 720 : 800, H = big ? 560 : 640, clip = { w: W, h: big ? 470 : 480 };
    const parts = [drawTrack(v, { clip })];
    const forward = trace.filter((p) => p.step >= 360 && p.step <= stopAt.step);
    const backward = trace.filter((p) => p.step >= stopAt.step);
    parts.push(`<g clip-path="url(#map)">${poly(forward.map((p) => at(v, p)), { stroke: C.yellow, width: big ? 6 : 4, glow: true })}</g>`);
    parts.push(poly(backward.map((p) => at(v, p)), { stroke: C.pink, width: big ? 7 : 5, glow: true }));
    const ps = at(v, stopAt), pl = at(v, last);
    parts.push(drawBug(v, last, { color: C.pink }));
    parts.push(circle(ps.x, ps.y, 7, { fill: C.text, glow: true }));
    const label = (x, y, s, color) => parts.push(text(x, y, s, { size: big ? 24 : 15, color, weight: 'bold', glow: true }));
    label(ps.x - (big ? 150 : 110), ps.y - 26, 'stops dead', C.text);
    label(pl.x + 30, pl.y + 48, big ? 'backs into the wall' : 'reverses into the wall', C.pink);
    label(big ? 470 : 520, big ? 420 : 430, '← full speed', C.yellow);
    if (big) {
      parts.push(text(30, 520, 'its home track, driven the other way round', { size: 20, color: C.text }));
    } else {
      [[`seed 3, gen 80 champion (it beat me by 13.93 s on Neon Loop), alone on Neon Loop Mirrored`, C.text],
        [`yellow: it reaches the hairpin, which now turns right, at 330 px/s and brakes to a stop by ${(stopAt.step / 60).toFixed(2)} s`, C.yellow],
        [`pink: it keeps holding BRAKE, which from a standstill means reverse,`, C.pink],
        [`and backs into the inner wall at ${(last.step / 60).toFixed(2)} s`, C.pink]].forEach(([l, color], i) => parts.push(text(30, 516 + i * 22, l, { size: 13, color })));
    }
    return { svg: svg(W, H, 'The champion reverses into the wall', parts.join('\n')) };
  };
  save('07-mirror-crash.svg', draw(false).svg, 'The gen 80 champion in the mirrored hairpin: full speed, a dead stop, then reverse into the wall.');
  save('simple-7-mirror-crash.svg', draw(true).svg, 'Simple guide, ch 7: the champion that beat me stops dead in the mirrored hairpin and reverses into the wall.');
  data.mirrorCrash = { stopSeconds: stopAt.step / 60, crashSeconds: last.step / 60, crashAt: { x: last.x, y: last.y }, minSpeed: Math.min(...trace.map((p) => p.speed)) };
}

// ---------- chapter 7, the exam (Step 7b part 3): only after my Exam lap was saved ----------
{
  const ghost = json('ghosts/me-exam.json');
  unlockExam(ghost); // throws unless ghosts/me-exam.json is my real Exam lap
  const report = json('runs/exam.json');
  const multi = json('champions/seed-3-multi.json').champions;
  const brainOf = (r) => (r.multi ? multi : champs[3])[String(r.generation)].brain;
  const exam = buildTrack(trackDef('exam'));

  // the results matrix: 7 champions x (Neon Loop home lap, Exam, Mirrored)
  const names = report.results.filter((r) => r.track === 'exam');
  const m = [text(20, 34, 'the exam: saved champions, alone, on Exam and on Neon Loop Mirrored', { size: 14, weight: 'bold', color: C.cyan })];
  m.push(text(330, 66, 'Exam', { anchor: 'middle', size: 12, color: C.dim, weight: 'bold' }));
  m.push(text(560, 66, 'Neon Loop Mirrored', { anchor: 'middle', size: 12, color: C.dim, weight: 'bold' }));
  names.forEach((r, i) => {
    const y = 96 + i * 32 + (r.multi ? 14 : 0);
    m.push(text(20, y, r.multi ? `gen ${r.generation} · 3 tracks` : `gen ${r.generation} · 1 track`, { size: 12, color: C.text }));
    ['exam', 'neon-loop-mirrored'].forEach((id, j) => {
      const x = report.results.find((q) => q.track === id && q.name === r.name);
      const ok = x.lapSeconds !== null;
      const label = ok ? `${x.lapSeconds.toFixed(2)} s` : `${x.out} at ${Math.round(x.progress)}% (${x.outSeconds.toFixed(2)} s)`;
      m.push(rect(330 + j * 230 - 100, y - 16, 200, 24, { fill: ok ? C.cyan : C.pink, opacity: 0.16, rx: 5 }));
      m.push(text(330 + j * 230, y, label, { anchor: 'middle', size: 12, color: ok ? C.cyan : C.pink, weight: 'bold' }));
    });
  });
  const yEnd = 96 + names.length * 32 + 14;
  m.push(text(20, yEnd, 'seed 3 · 1 track = trained on Neon Loop · 3 tracks = Neon Loop + Zigzag + Wide Sweepers (Step 7b)', { size: 11, color: C.dim }));
  m.push(text(20, yEnd + 18, `cyan = best lap · pink = no lap: how it got out, how far, when · my Exam lap: ${report.me.seconds.toFixed(2)} s`, { size: 11, color: C.dim }));
  save('07-exam-results.svg', svg(700, yEnd + 36, 'The exam', m.join('\n')), 'The exam: every tested champion on Exam and on Neon Loop Mirrored.');

  // the map: gen 20 finishes a lap, gen 80 stops and reverses in the right-hand hairpin, the 3-track champions crash
  const trace = (r) => {
    const gen = createGeneration(exam, [brainOf(r)]);
    const pts = [], laps = [];
    while (!gen.over) {
      for (const e of stepGeneration(gen)) if (e.type === 'lap') laps.push(gen.step);
      const c = gen.cars[0].world.car;
      pts.push({ x: c.x, y: c.y, angle: c.angle, speed: c.speed, step: gen.step });
    }
    return { pts, laps, crash: gen.cars[0].world.car.crash };
  };
  const g20 = trace(names.find((r) => r.name === '3-20'));
  const g80 = trace(names.find((r) => r.name === '3-80'));
  const multis = names.filter((r) => r.multi).map((r) => ({ r, t: trace(r) }));
  const draw = (big) => {
    const v = { x0: 100, y0: 40, scale: big ? 0.68 : 0.62, ox: 20, oy: big ? 20 : 54 };
    const parts = [drawAnyTrack(exam, v)];
    parts.push(poly(g20.pts.filter((p) => p.step <= g20.laps[0]).map((p) => at(v, p)), { stroke: C.cyan, width: big ? 4 : 3, opacity: 0.85, glow: true }));
    const stop = g80.pts.find((p) => p.step > 120 && p.speed <= 0);
    parts.push(poly(g80.pts.filter((p) => p.step <= stop.step).map((p) => at(v, p)), { stroke: C.yellow, width: big ? 5 : 4, glow: true }));
    parts.push(poly(g80.pts.filter((p) => p.step >= stop.step).map((p) => at(v, p)), { stroke: C.pink, width: big ? 7 : 5, glow: true }));
    parts.push(drawBug(v, g80.pts[g80.pts.length - 1], { color: C.pink, scale: big ? 1.4 : 1.2 }));
    for (const { t } of multis) {
      const c = at(v, t.crash);
      const k = big ? 9 : 7;
      parts.push(line(c.x - k, c.y - k, c.x + k, c.y + k, C.magenta, 3, { glow: true }), line(c.x - k, c.y + k, c.x + k, c.y - k, C.magenta, 3, { glow: true }));
    }
    if (big) {
      // the hairpin that turns right, named where it is
      const pin = at(v, { x: 640, y: 300 });
      parts.push(text(pin.x, pin.y, 'the hairpin turns right', { size: 17, color: C.text, weight: 'bold', anchor: 'middle' }));
      [['gen 20: a clean lap, 18 s faster than me', C.cyan],
        ['gen 80: stops dead in the hairpin, reverses into the wall', C.pink],
        ['✕ the cars trained on 3 tracks: every one crashed', C.magenta]].forEach(([l, color], i) => parts.push(text(30, 500 + i * 30, l, { size: 18, color, weight: 'bold', glow: true })));
    } else {
      parts.push(text(20, 30, 'Exam: three of the champions, from the start', { size: 14, weight: 'bold', color: C.cyan }));
      const crashes = multis.map(({ r }) => `gen ${r.generation} at ${r.outSeconds.toFixed(2)} s`).join(', ');
      [[`cyan: seed 3 gen 20 (one track), its first lap. Best lap ${names.find((r) => r.name === '3-20').lapSeconds.toFixed(2)} s; my Exam lap is ${report.me.seconds.toFixed(2)} s`, C.cyan],
        [`yellow: seed 3 gen 80 (one track) brakes to a dead stop in the hairpin, which turns right, at ${sec(stop.step)} s.`, C.yellow],
        [`pink: it keeps BRAKE down (reverse, from a standstill) and backs into the wall at ${names.find((r) => r.name === '3-80').outSeconds.toFixed(2)} s.`, C.pink],
        [`✕: where the four three-track champions crashed (${crashes})`, C.magenta]].forEach(([l, color], i) => parts.push(text(20, 548 + i * 20, l, { size: 11.5, color })));
    }
    return svg(big ? 920 : 900, big ? 600 : 638, 'The exam', parts.join('\n'));
  };
  save('simple-7-exam.svg', draw(true), 'Simple guide, ch 7: on Exam, gen 20 drives a clean lap, gen 80 stops dead in the right-hand hairpin and reverses, the three-track champions crash.');
  save('07-exam-map.svg', draw(false), 'Exam: gen 20 lap, gen 80 stops and reverses in the right-hand hairpin, where the three-track champions crashed.');
  data.exam = { me: report.me, race: report.race, gen80StopSeconds: stop80(g80) };
  function stop80(t) { return t.pts.find((p) => p.step > 120 && p.speed <= 0).step / 60; }
}

// ===================================================================
// Chapter 8: make your own track  (no AI car ever drives Exam here)
// ===================================================================
// A whole track, scaled: road, glowing walls, the start line and a direction arrow
function drawAnyTrack(t, v) {
  const d = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${r1(at(v, p).x)},${r1(at(v, p).y)}`).join('') + 'Z';
  const parts = [`<path d="${d(t.outer)}${d(t.inner)}" fill="${C.road}" fill-rule="evenodd"/>`];
  parts.push(poly(t.outer.map((p) => at(v, p)), { stroke: C.magenta, width: 2, closed: true, glow: true }));
  parts.push(poly(t.inner.map((p) => at(v, p)), { stroke: C.magenta, width: 2, closed: true, glow: true }));
  const cp = t.checkpoints[0], a = at(v, { x: cp.ax, y: cp.ay }), b = at(v, { x: cp.bx, y: cp.by });
  parts.push(line(a.x, a.y, b.x, b.y, C.text, 4));
  return parts.join('\n');
}
{
  const paperDef = decodeTrack(PAPERCLIP_LINK).track;
  const t = buildTrack(paperDef);
  const run = (brain) => {
    const gen = createGeneration(t, [brain]);
    const trace = [], laps = [];
    while (!gen.over) {
      for (const e of stepGeneration(gen)) if (e.type === 'lap') laps.push({ at: gen.step, steps: e.steps });
      const c = gen.cars[0].world.car;
      trace.push({ x: c.x, y: c.y, angle: c.angle, speed: c.speed, step: gen.step });
    }
    const car = gen.cars[0];
    return { trace, laps, out: car.out, outStep: car.outStep, best: car.bestLapSteps, percent: progressPercent(car.world) };
  };
  const g80 = run(champs[3]['80'].brain);
  const lapEnd = g80.laps[0].at;
  const lapStart = lapEnd - g80.laps[0].steps;
  // the hairpin is the part of the road left of x = 470 between the notch's two straights
  const inHairpin = (p) => p.x < 470 && p.y > 250 && p.y < 470 && p.x > 250;
  const pin1 = g80.trace.filter((p) => p.step < lapEnd && inHairpin(p));
  const pin2 = g80.trace.filter((p) => p.step > lapEnd && inHairpin(p));
  const slowest1 = pin1.reduce((a, p) => (p.speed < a.speed ? p : a));
  const stop2 = pin2.find((p) => p.speed <= 0);
  const last = g80.trace[g80.trace.length - 1];

  const draw = (big) => {
    const v = { x0: 90, y0: 30, scale: big ? 0.68 : 0.62, ox: 20, oy: big ? 20 : 54 };
    const parts = [drawAnyTrack(t, v)];
    const lap1 = g80.trace.filter((p) => p.step >= lapStart && p.step <= lapEnd);
    const lap2 = g80.trace.filter((p) => p.step >= lapEnd);
    parts.push(poly(lap1.map((p) => at(v, p)), { stroke: C.cyan, width: big ? 4 : 3, opacity: 0.8, glow: true }));
    parts.push(poly(lap2.map((p) => at(v, p)), { stroke: C.pink, width: big ? 5 : 4, glow: true }));
    parts.push(drawBug(v, last, { color: C.pink, scale: big ? 1.4 : 1.2 }));
    const s1 = at(v, slowest1), pl = at(v, last);
    parts.push(circle(s1.x, s1.y, big ? 7 : 5, { fill: C.cyan, glow: true }));
    const size = big ? 19 : 13;
    if (big) {
      // in the empty strips of ground above and below the hairpin's two straights
      const above = at(v, { x: 290, y: 200 }), below = at(v, { x: 290, y: 545 });
      parts.push(text(above.x, above.y, 'lap 1: crawls round the hairpin', { size, color: C.cyan, weight: 'bold', glow: true }));
      parts.push(text(below.x, below.y, 'lap 2: stops, then reverses into the wall', { size, color: C.pink, weight: 'bold', glow: true }));
      parts.push(text(30, 535, 'a track I drew, opened from a link:', { size: 18, color: C.text }));
      parts.push(text(30, 562, 'the best car of generation 80 fails its right-hand hairpin', { size: 18, color: C.text }));
    } else {
      parts.push(text(20, 30, 'Paperclip, opened from its share link · the seed 3, generation 80 champion', { size: 14, weight: 'bold', color: C.cyan }));
      [[`cyan: lap 1, ${sec(g80.laps[0].steps)} s. In the hairpin (it turns right) it slows to ${slowest1.speed.toFixed(0)} px/s, almost a stop, and creeps round`, C.cyan],
        [`pink: lap 2. Same hairpin: it stops dead at ${sec(stop2.step)} s, keeps holding BRAKE (from a standstill that means reverse),`, C.pink],
        [`and backs into the wall at ${sec(last.step)} s. It never finishes lap 2.`, C.pink]].forEach(([l, color], i) => parts.push(text(20, 548 + i * 20, l, { size: 12, color })));
    }
    return svg(big ? 920 : 900, big ? 590 : 618, 'My track breaks the champion', parts.join('\n'));
  };
  save('simple-8-paperclip.svg', draw(true), 'Simple guide, ch 8: on a track drawn in the editor, the gen 80 champion crawls round the right-hand hairpin once, then reverses into the wall.');
  save('08-paperclip.svg', draw(false), 'Paperclip: lap 1 through the right-hand hairpin at a crawl, lap 2 stops and reverses into the wall.');

  // every saved champion of seed 3 on Paperclip
  const tried = [['seed 3 · gen 1', champs[3]['1']], ['seed 3 · gen 5', champs[3]['5']], ['seed 3 · gen 10', champs[3]['10']], ['seed 3 · gen 20', champs[3]['20']],
    ['seed 3 · gen 40', champs[3]['40']], ['seed 3 · gen 80', champs[3]['80']]];
  const multi = json('champions/seed-3-multi.json').champions;
  for (const g of ['10', '20', '80', '100']) tried.push([`seed 3 · 3 tracks · gen ${g}`, multi[g]]);
  const rows = tried.map(([name, c]) => {
    const r = run(c.brain);
    return { name, laps: r.laps.map((l) => +sec(l.steps)), out: r.out, outSeconds: +sec(r.outStep), percent: +r.percent.toFixed(1) };
  });
  const m = [text(20, 34, 'every saved champion of seed 3, alone on Paperclip for 60 s', { size: 14, weight: 'bold', color: C.cyan })];
  rows.forEach((r, i) => {
    const y = 66 + i * 28, ok = r.laps.length > 0;
    m.push(text(20, y, r.name, { size: 12, color: C.text }));
    const what = r.out === 'time' ? `${r.laps.length} laps, best ${Math.min(...r.laps).toFixed(2)} s` : ok ? `${r.laps.length} lap (${r.laps[0].toFixed(2)} s), then ${r.out} at ${r.outSeconds.toFixed(2)} s` : `no lap: ${r.out} at ${r.outSeconds.toFixed(2)} s`;
    m.push(rect(250, y - 16, 360, 23, { fill: r.out === 'time' ? C.cyan : C.pink, opacity: 0.16, rx: 5 }));
    m.push(text(430, y, what, { anchor: 'middle', size: 12, color: r.out === 'time' ? C.cyan : C.pink, weight: 'bold' }));
  });
  m.push(text(20, 66 + rows.length * 28 + 4, 'cyan = still driving at 60 s · pink = out (crash or stall) · a track drawn for fun, not a pre-registered test', { size: 11, color: C.dim }));
  save('08-paperclip-champions.svg', svg(720, 66 + rows.length * 28 + 24, 'Every seed 3 champion on Paperclip', m.join('\n')), 'Every saved seed 3 champion (one-track and multi-track) on Paperclip.');

  // the track check: one real example of each problem, with the editor's own message
  const examples = [
    ['crosses', 'a figure eight', [[340, 200], [640, 360], [940, 520], [1100, 360], [940, 200], [660, 360], [340, 520], [180, 360]]],
    ['too-tight', 'a sharp corner', [[300, 200], [900, 200], [320, 230], [300, 500]]],
    ['off-screen', 'too close to the edge', Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * 2 * Math.PI; return [Math.round(640 + 420 * Math.cos(a)), Math.round(480 + 220 * Math.sin(a))]; })],
    ['ok', 'Paperclip', paperDef.points],
  ];
  const k = [];
  examples.forEach(([kind, title, pts], i) => {
    const def = { id: 'custom', name: title, width: 90, points: pts };
    const check = checkTrack(def);
    const v = { x0: 0, y0: 0, scale: 0.3, ox: 30 + (i % 2) * 420, oy: 80 + Math.floor(i / 2) * 290 };
    k.push(rect(v.ox, v.oy, 1280 * 0.3, 720 * 0.3, { stroke: C.cyan, strokeOpacity: 0.25, rx: 4 }));
    const built = check.track ?? buildTrack(def);
    k.push(drawAnyTrack(built, v));
    for (const p of pts) { const q = at(v, { x: p[0], y: p[1] }); k.push(circle(q.x, q.y, 2.5, { fill: C.cyan })); }
    const first = check.problems[0];
    if (first) { const q = at(v, first); k.push(circle(q.x, q.y, 14, { stroke: C.pink, width: 2.5, glow: true })); }
    const msg = first ? first.message : `Ready: ${check.track.checkpoints.length} checkpoints, ${Math.round(check.track.length)} px of road.`;
    // the message in at most two lines that fit over the panel
    const words = msg.split(' '), lines = [''];
    for (const w of words) { if ((lines[lines.length - 1] + ' ' + w).trim().length > 58) lines.push(''); lines[lines.length - 1] = (lines[lines.length - 1] + ' ' + w).trim(); }
    k.push(text(v.ox, v.oy - 40, title, { size: 13, weight: 'bold', color: first ? C.pink : C.green }));
    lines.forEach((l, j) => k.push(text(v.ox, v.oy - 23 + j * 14, l, { size: 10.5, color: first ? C.pink : C.green })));
    if (kind !== 'ok' && first?.kind !== kind) throw new Error(`track check example "${title}" gave ${first?.kind}, expected ${kind}`);
  });
  save('08-track-check.svg', svg(860, 600 + 20, 'The track check', k.join('\n')), 'The editor\'s live check: one real example of each problem, with the exact message it shows.');

  // how a point becomes four letters
  const [px, py] = paperDef.points[0];
  const link = encodeTrack(paperDef.points);
  const L = [text(20, 34, 'how one point becomes 4 letters of the link', { size: 14, weight: 'bold', color: C.cyan })];
  const part = (n, x, label) => {
    const hi = Math.floor(n / 64), lo = n % 64;
    L.push(text(x, 76, `${label} = ${n}`, { size: 16, weight: 'bold', color: C.text }));
    L.push(text(x, 104, `${n} = ${hi} × 64 + ${lo}`, { size: 13, color: C.dim }));
    L.push(text(x, 132, `letter no. ${hi} = ${LETTERS[hi]}   letter no. ${lo} = ${LETTERS[lo]}`, { size: 13, color: C.dim }));
    L.push(text(x, 168, `${LETTERS[hi]}${LETTERS[lo]}`, { size: 30, weight: 'bold', color: C.yellow, glow: true }));
  };
  part(px, 30, 'x');
  part(py, 330, 'y');
  L.push(text(30, 196, `the 64 letters, numbered from 0: ${LETTERS}`, { size: 10, color: C.dim }));
  L.push(text(30, 220, `the first point (${px}, ${py}) → ${link.slice(1, 5)} · the link starts with "1", the version`, { size: 12, color: C.text }));
  L.push(text(30, 244, `?t=${link}`, { size: 11, color: C.cyan }));
  L.push(text(30, 266, `${paperDef.points.length} points × 4 letters + 1 = ${link.length} letters for the whole track`, { size: 12, color: C.dim }));
  save('08-link.svg', svg(680, 294, 'A track in a link', L.join('\n')), 'How one clicked point becomes 4 letters of the share link.');

  data.paperclip = {
    link, points: paperDef.points.length, letters: link.length, checkpoints: t.checkpoints.length, length: t.length,
    gen80: { lap1Seconds: g80.laps[0].steps / 60, slowestInHairpinLap1: slowest1.speed, stopSecondsLap2: stop2.step / 60, crashSeconds: last.step / 60, minSpeed: Math.min(...g80.trace.map((p) => p.speed)) },
    champions: rows,
  };
}

// ---------- tables the guide quotes ----------
data.seeds = Object.fromEntries([1, 2, 3, 4, 5].map((s) => [s, {
  firstLap: runs[s].firstLap, bestLapAt: runs[s].bestLapAt, finishedAt100: runs[s].finishedLapAt['100'], nodeSeconds: runs[s].nodeSeconds,
}]));
data.champions3 = Object.fromEntries(Object.entries(champs[3]).map(([g, c]) => [g, { id: c.id, lap: c.lapSteps && +sec(c.lapSteps), progress: +(c.progress * 100).toFixed(1) }]));
data.figures = figures;
writeFileSync(new URL('figure-data.json', OUT), JSON.stringify(data, null, 1) + '\n');
for (const f of figures) console.log(`${f.name.padEnd(26)} ${f.about}`);
console.log(`\n${figures.length} figures and figure-data.json written to docs/img/`);
