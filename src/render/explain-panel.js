// The explain overlay's panels: the 6 numbers getInputs() hands to the brain,
// and (in AI mode) the 4 numbers the brain answers with. Exactly as computed.

import { ctx } from './canvas.js';
import { SENSOR_LABELS, SENSOR_RANGE } from '../sim/sensors.js';
import { rayColor } from './rays.js';
import { OUTPUT_LABELS } from '../sim/brain.js';

const LABELS = [...SENSOR_LABELS, 'speed'];
const X = 916, Y = 204, W = 206, ROW = 22;

export function drawExplainPanel(inputs) {
  const h = 58 + LABELS.length * ROW;
  ctx.save();
  ctx.fillStyle = 'rgba(5, 6, 10, 0.85)';
  ctx.fillRect(X, Y, W, h);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 8;
  ctx.strokeRect(X + 0.5, Y + 0.5, W - 1, h - 1);
  ctx.shadowBlur = 0;

  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#00f0ff';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('BRAIN INPUTS', X + 12, Y + 10);
  ctx.fillStyle = 'rgba(230, 235, 242, 0.5)';
  ctx.font = '10px monospace';
  ctx.fillText('all the car will ever know', X + 12, Y + 28);

  LABELS.forEach((label, i) => {
    const y = Y + 50 + i * ROW;
    const v = inputs[i];
    ctx.fillStyle = 'rgba(230, 235, 242, 0.75)';
    ctx.font = '11px monospace';
    ctx.fillText(label, X + 12, y + 3);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e6ebf2';
    ctx.fillText(v.toFixed(3), X + 132, y + 3);
    ctx.textAlign = 'left';
    // bar: eyes use the same cyan-to-pink-red as their ray, speed is yellow
    ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
    ctx.fillRect(X + 138, y + 3, 58, 10);
    ctx.fillStyle = i < 5 ? rayColor((1 - v) * SENSOR_RANGE) : '#ffd23f';
    ctx.fillRect(X + 138, y + 3, Math.round(58 * v), 10);
  });
  ctx.restore();
}

// The brain's 4 outputs (0..1) as numbers, with each key lit when its output is above 0.5 (pressed).
export function drawOutputsPanel(outs) {
  const y0 = Y + 58 + LABELS.length * ROW + 10;
  const h = 58 + OUTPUT_LABELS.length * ROW;
  ctx.save();
  ctx.fillStyle = 'rgba(5, 6, 10, 0.85)';
  ctx.fillRect(X, y0, W, h);
  ctx.strokeStyle = 'rgba(255, 210, 63, 0.5)';
  ctx.shadowColor = '#ffd23f';
  ctx.shadowBlur = 8;
  ctx.strokeRect(X + 0.5, y0 + 0.5, W - 1, h - 1);
  ctx.shadowBlur = 0;

  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('BRAIN OUTPUTS', X + 12, y0 + 10);
  ctx.fillStyle = 'rgba(230, 235, 242, 0.5)';
  ctx.font = '10px monospace';
  ctx.fillText('above 0.5 = key pressed', X + 12, y0 + 28);

  OUTPUT_LABELS.forEach((label, i) => {
    const y = y0 + 50 + i * ROW;
    const v = outs[i];
    const on = v > 0.5;
    // the key: lit when pressed
    ctx.fillStyle = on ? '#ffd23f' : 'rgba(255, 210, 63, 0.1)';
    if (on) { ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = 8; }
    ctx.fillRect(X + 12, y, 52, 16);
    ctx.shadowBlur = 0;
    ctx.fillStyle = on ? '#05060a' : 'rgba(230, 235, 242, 0.6)';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label.toUpperCase(), X + 38, y + 3);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e6ebf2';
    ctx.font = '11px monospace';
    // right at the 0.5 line, 3 decimals would show "0.500" for a key that is pressed: show more
    ctx.fillText(v.toFixed(Math.abs(v - 0.5) < 0.0005 ? 5 : 3), X + 132, y + 3);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255, 210, 63, 0.12)';
    ctx.fillRect(X + 138, y + 3, 58, 10);
    ctx.fillStyle = on ? '#ffd23f' : 'rgba(255, 210, 63, 0.45)';
    ctx.fillRect(X + 138, y + 3, Math.round(58 * v), 10);
    ctx.fillStyle = 'rgba(230, 235, 242, 0.7)'; // the 0.5 line
    ctx.fillRect(X + 138 + 29, y + 1, 1, 14);
  });
  ctx.restore();
}
