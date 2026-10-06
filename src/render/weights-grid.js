// The 70 numbers (N): every weight and bias of a brain as a small grid.
// Cyan = positive, pink = negative, brighter = bigger. Two brains side by side
// show "same shape, different numbers".

import { ctx } from './canvas.js';
import { INPUTS, HIDDEN, OUTPUTS, OUTPUT_LABELS } from '../sim/brain.js';

export const GRID_BLOCK_W = 225;
export const GRID_H = 222;
const CELL_W = 25, CELL_H = 15, LABEL_W = 36;
const IN_COLS = ['L60', 'L30', 'AH', 'R30', 'R60', 'SPD', 'bias'];
const HID_COLS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'bias'];

// brains = [{brain, title}], one or two
export function drawWeightsGrid(x, y, brains) {
  ctx.save();
  const w = GRID_BLOCK_W * brains.length;
  ctx.fillStyle = 'rgba(5, 6, 10, 0.9)';
  ctx.fillRect(x, y, w, GRID_H);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, GRID_H - 1);
  brains.forEach((b, n) => block(x + n * GRID_BLOCK_W, y, b));
  ctx.restore();
}

function block(x, y, { brain, title }) {
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = '#00f0ff';
  ctx.fillText(`THE 70 NUMBERS`, x + 8, y + 10);
  ctx.font = '9px monospace';
  ctx.fillStyle = 'rgba(230, 235, 242, 0.55)';
  ctx.fillText(title, x + 8, y + 23);

  let at = 0, ry = y + 36;
  const rows = (count, labels, cols) => {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(230, 235, 242, 0.4)';
    cols.forEach((c, i) => ctx.fillText(c, x + LABEL_W + i * CELL_W + CELL_W / 2, ry));
    ry += 10;
    for (let r = 0; r < count; r++) {
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(230, 235, 242, 0.6)';
      ctx.fillText(labels[r], x + 6, ry + CELL_H / 2);
      for (let c = 0; c < cols.length; c++) cell(x + LABEL_W + c * CELL_W, ry, brain[at++]);
      ry += CELL_H;
    }
    ry += 8;
  };
  rows(HIDDEN, Array.from({ length: HIDDEN }, (_, i) => `h${i + 1}`), IN_COLS.slice(0, INPUTS + 1));
  rows(OUTPUTS, OUTPUT_LABELS, HID_COLS.slice(0, HIDDEN + 1));
}

function cell(x, y, w) {
  const size = Math.min(1, Math.abs(w) / 2);
  ctx.fillStyle = w >= 0 ? `rgba(0, 240, 255, ${0.08 + 0.8 * size})` : `rgba(255, 46, 99, ${0.08 + 0.8 * size})`;
  ctx.fillRect(x + 1, y + 1, CELL_W - 2, CELL_H - 2);
  ctx.textAlign = 'center';
  ctx.font = '8px monospace';
  ctx.fillStyle = size > 0.55 ? '#05060a' : 'rgba(230, 235, 242, 0.85)';
  ctx.fillText(w.toFixed(2), x + CELL_W / 2, y + CELL_H / 2 + 0.5);
}
