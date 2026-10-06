// The track editor's screen: the road as it will be (drawn exactly like a real track),
// the clicked points on top, and the track check's message at the bottom.

import { ctx, VIEW_W, VIEW_H } from './canvas.js';
import { renderTrack } from './track-view.js';

const CYAN = '#00f0ff';
const YELLOW = '#ffd23f';
const PINK = '#ff2e63';
const GREEN = '#39ff88';
const BG = '#0b0d13';

let cache = { track: null, image: null };

// ed = {points, hover, dragging, check}: check is the result of checkTrack() (null before 1 point)
export function drawEditor(ed) {
  ctx.save();
  if (ed.check?.track) {
    if (cache.track !== ed.check.track) cache = { track: ed.check.track, image: renderTrack(ed.check.track) };
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cache.image, 0, 0, VIEW_W, VIEW_H);
  } else {
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = 'rgba(0, 240, 255, 0.05)';
    for (let x = 0; x < VIEW_W; x += 40) ctx.fillRect(x, 0, 2, VIEW_H);
    for (let y = 0; y < VIEW_H; y += 40) ctx.fillRect(0, y, VIEW_W, 2);
  }

  // the loop through the points, in driving order
  const pts = ed.points;
  if (pts.length > 1) {
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    if (pts.length > 2) ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // where the problems are
  for (const p of ed.check?.problems ?? []) {
    if (p.kind === 'few-points' || p.kind === 'many-points' || p.kind === 'width' || p.kind === 'held-out') continue;
    ctx.strokeStyle = PINK;
    ctx.shadowColor = PINK;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // the points: the first one is the start line, the arrow shows the driving direction
  pts.forEach(([x, y], i) => {
    const first = i === 0;
    const color = first ? YELLOW : CYAN;
    ctx.fillStyle = i === ed.hover || i === ed.dragging ? '#ffffff' : color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x, y, first ? 8 : 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });
  if (pts.length > 1) {
    const [x0, y0] = pts[0], [x1, y1] = pts[1];
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    const ux = (x1 - x0) / len, uy = (y1 - y0) / len;
    const tipX = x0 + ux * 30, tipY = y0 + uy * 30;
    ctx.strokeStyle = YELLOW;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0 + ux * 12, y0 + uy * 12);
    ctx.lineTo(tipX, tipY);
    ctx.moveTo(tipX - ux * 8 - uy * 6, tipY - uy * 8 + ux * 6);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(tipX - ux * 8 + uy * 6, tipY - uy * 8 - ux * 6);
    ctx.stroke();
  }
  if (pts.length) {
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = YELLOW;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('START', pts[0][0], pts[0][1] - 12);
  }

  // top: the title; bottom: how to use it, and what the track check says
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.font = '14px monospace';
  ctx.fillStyle = 'rgba(0, 240, 255, 0.75)';
  ctx.fillText('TRACK EDITOR', 16, 14);
  ctx.font = '12px monospace';
  ctx.fillStyle = 'rgba(0, 240, 255, 0.5)';
  ctx.fillText('click: add a point   drag: move it   right-click: delete it   BACKSPACE: undo   ENTER: drive   ESC: back', 16, VIEW_H - 18);

  const problem = ed.check?.problems?.[0];
  const line = !ed.check ? 'Click to place the first point: that is where the start line goes.'
    : problem ? problem.message + (ed.check.problems.length > 1 ? `  (+${ed.check.problems.length - 1} more)` : '')
      : `Ready: ${ed.check.track.checkpoints.length} checkpoints, ${Math.round(ed.check.track.length)} px of road. Drive it, or let the AI train on it.`;
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  const w = ctx.measureText(line).width + 32;
  ctx.fillStyle = 'rgba(5, 6, 10, 0.85)';
  ctx.fillRect(VIEW_W / 2 - w / 2, VIEW_H - 64, w, 30);
  ctx.fillStyle = problem ? PINK : ed.check ? GREEN : CYAN;
  ctx.fillText(line, VIEW_W / 2, VIEW_H - 57);
  ctx.restore();
}
