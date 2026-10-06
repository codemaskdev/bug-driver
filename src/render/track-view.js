// Draws the track once into an image: dark ground, neon grid, the track
// surface, two glowing walls and a checkered start/finish line.
// It is drawn at half resolution and scaled up without smoothing,
// which gives the walls their chunky glowing-pixel look.

import { VIEW_W, VIEW_H } from './canvas.js';

const SCALE = 0.5;
const BG = '#0b0d13';
const GRID = 'rgba(0, 240, 255, 0.05)';
const ROAD = '#141826';
const WALL = '#ff4dd8';
const WALL_CORE = '#ffd6f6';

export function renderTrack(track) {
  const img = document.createElement('canvas');
  img.width = VIEW_W * SCALE;
  img.height = VIEW_H * SCALE;
  const g = img.getContext('2d');
  g.scale(SCALE, SCALE);

  g.fillStyle = BG;
  g.fillRect(0, 0, VIEW_W, VIEW_H);
  g.fillStyle = GRID;
  for (let x = 0; x < VIEW_W; x += 40) g.fillRect(x, 0, 2, VIEW_H);
  for (let y = 0; y < VIEW_H; y += 40) g.fillRect(0, y, VIEW_W, 2);

  // Road surface: everything between the outer and the inner wall
  g.beginPath();
  loopPath(g, track.outer);
  loopPath(g, track.inner);
  g.fillStyle = ROAD;
  g.fill('evenodd');

  // Faint dashed centerline
  g.strokeStyle = 'rgba(230, 235, 242, 0.07)';
  g.lineWidth = 2;
  g.setLineDash([12, 18]);
  g.beginPath();
  loopPath(g, track.center);
  g.stroke();
  g.setLineDash([]);

  // Glowing walls: a wide blurred pass, then a thin bright core
  for (const wall of [track.outer, track.inner]) {
    g.save();
    g.strokeStyle = WALL;
    g.shadowColor = WALL;
    g.shadowBlur = 10;
    g.lineWidth = 4;
    g.beginPath();
    loopPath(g, wall);
    g.stroke();
    g.restore();
    g.strokeStyle = WALL_CORE;
    g.lineWidth = 2;
    g.beginPath();
    loopPath(g, wall);
    g.stroke();
  }

  drawStartLine(g, track.checkpoints[0]);
  drawDirectionChevrons(g, track);
  return img;
}

// Three faint chevrons just past the start line, pointing the way to drive.
function drawDirectionChevrons(g, track) {
  const spacing = track.length / track.center.length; // px between centerline samples
  g.save();
  g.strokeStyle = 'rgba(0, 240, 255, 0.28)';
  g.shadowColor = '#00f0ff';
  g.shadowBlur = 4;
  g.lineWidth = 4;
  g.lineCap = 'square';
  for (const dist of [60, 92, 124]) {
    const i = Math.round(dist / spacing);
    const p = track.center[i], t = track.tangents[i];
    const nx = -t.y, ny = t.x; // across the track
    const tip = 7, back = 7, half = 13;
    g.beginPath();
    g.moveTo(p.x - t.x * back + nx * half, p.y - t.y * back + ny * half);
    g.lineTo(p.x + t.x * tip, p.y + t.y * tip);
    g.lineTo(p.x - t.x * back - nx * half, p.y - t.y * back - ny * half);
    g.stroke();
  }
  g.restore();
}

// Checkered start/finish line: two rows of squares across the track.
function drawStartLine(g, cp) {
  const len = Math.hypot(cp.bx - cp.ax, cp.by - cp.ay);
  const ux = (cp.bx - cp.ax) / len, uy = (cp.by - cp.ay) / len; // across the track
  const size = 8;
  const count = Math.floor(len / size);
  g.save();
  g.shadowColor = '#ffffff';
  g.shadowBlur = 6;
  for (let i = 0; i < count; i++) {
    for (let row = 0; row < 2; row++) {
      if ((i + row) % 2) continue;
      const along = (i + 0.5) * size + (len - count * size) / 2;
      const x = cp.ax + ux * along + cp.tx * (row - 0.5) * size;
      const y = cp.ay + uy * along + cp.ty * (row - 0.5) * size;
      g.fillStyle = '#e6ebf2';
      g.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
    }
  }
  g.restore();
}

function loopPath(g, pts) {
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
}
