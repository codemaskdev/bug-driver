// The track editor: click points to draw a closed loop, drag them to adjust.
// The road is always 90 px wide (the physics stay frozen); the start line goes at the
// first point, pointing to the second, and the checkpoints are made like on every track.
// Every change is checked right away (sim/track-check.js); an invalid track can't be driven or trained on.

import './ui-style.js';
import { canvas, VIEW_W, VIEW_H } from '../render/canvas.js';
import { checkTrack, ROAD_WIDTH, MAX_POINTS } from '../sim/track-check.js';
import { isHeldOut } from '../sim/held-out.js';

const GRAB = 12; // px: how close a click must be to grab a point
const STORAGE = 'bug-driver:my-track';

const ed = { open: false, points: [], hover: -1, dragging: -1, check: null, handlers: null };

const bar = document.createElement('div');
bar.id = 'editor-bar';
bar.className = 'tool-panel';
const button = (label, onClick) => {
  const b = document.createElement('button');
  b.textContent = label;
  b.addEventListener('click', () => { onClick(); b.blur(); });
  return b;
};
const driveButton = button('Drive it', () => finish('drive'));
const trainButton = button('Let the AI train on it', () => finish('train'));
bar.append(
  button('Undo point', () => { ed.points.pop(); changed(); }),
  button('Clear', () => { ed.points = []; changed(); }),
  driveButton, trainButton,
  button('Back', () => finish(null)),
);
document.body.appendChild(bar);

export const editorOpen = () => ed.open;
export const editorState = () => ed;

// A track definition from the editor's points
export function customTrack(points, name = 'My track') {
  return { id: 'custom', name, width: ROAD_WIDTH, points: points.map(([x, y]) => [x, y]) };
}

// Opens the editor on these points (a copy: the built-in tracks stay frozen).
// handlers = {onDrive(def), onTrain(def), onBack()}
export function openEditor(points, handlers) {
  ed.open = true;
  ed.points = isHeldOut(customTrack(points)) ? [] : points.map(([x, y]) => [x, y]);
  ed.handlers = handlers;
  ed.hover = ed.dragging = -1;
  changed();
  bar.style.display = 'flex';
}

function close() {
  ed.open = false;
  ed.dragging = -1;
  bar.style.display = 'none';
}

function changed() {
  ed.check = ed.points.length ? checkTrack(customTrack(ed.points)) : null;
  const ok = Boolean(ed.check?.ok);
  driveButton.disabled = !ok;
  trainButton.disabled = !ok;
  if (ok) saveMyTrack(customTrack(ed.points));
}

// what = 'drive' | 'train' | null (back without using it)
export function finish(what) {
  if (what && !ed.check?.ok) return; // invalid: can't drive or train
  const def = customTrack(ed.points);
  const h = ed.handlers;
  close();
  if (what === 'drive') h.onDrive(def);
  else if (what === 'train') h.onTrain(def);
  else h.onBack();
}

export function undoPoint() { ed.points.pop(); changed(); }

// ---------- the mouse ----------
function toGame(e) {
  const rect = canvas.getBoundingClientRect();
  const x = Math.round(((e.clientX - rect.left) / rect.width) * VIEW_W);
  const y = Math.round(((e.clientY - rect.top) / rect.height) * VIEW_H);
  return [Math.max(0, Math.min(VIEW_W, x)), Math.max(0, Math.min(VIEW_H, y))];
}
function pointAt([x, y]) {
  let best = -1, bestD = GRAB;
  ed.points.forEach(([px, py], i) => {
    const d = Math.hypot(px - x, py - y);
    if (d <= bestD) { best = i; bestD = d; }
  });
  return best;
}

canvas.addEventListener('mousedown', (e) => {
  if (!ed.open) return;
  const at = toGame(e);
  const hit = pointAt(at);
  if (e.button === 2) {
    if (hit >= 0) { ed.points.splice(hit, 1); changed(); }
    return;
  }
  if (hit >= 0) { ed.dragging = hit; return; }
  if (ed.points.length >= MAX_POINTS) return;
  ed.points.push(at);
  changed();
});
window.addEventListener('mousemove', (e) => {
  if (!ed.open) return;
  const at = toGame(e);
  if (ed.dragging >= 0) {
    ed.points[ed.dragging] = at;
    changed();
  } else {
    ed.hover = pointAt(at);
  }
});
window.addEventListener('mouseup', () => { ed.dragging = -1; });
canvas.addEventListener('contextmenu', (e) => { if (ed.open) e.preventDefault(); });

// ---------- my track, kept in this browser ----------
export function loadMyTrack() {
  try {
    const def = JSON.parse(localStorage.getItem(STORAGE) ?? 'null');
    if (def && Array.isArray(def.points) && checkTrack(customTrack(def.points)).ok) return customTrack(def.points);
  } catch {
    // no storage, or something unreadable in it
  }
  return null;
}
function saveMyTrack(def) {
  try { localStorage.setItem(STORAGE, JSON.stringify({ points: def.points })); } catch { /* no storage */ }
}
