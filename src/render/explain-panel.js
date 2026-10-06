// The explain overlay's panel: the 6 numbers getInputs() hands to the brain,
// exactly as computed, with a label and a bar each.

import { ctx } from './canvas.js';
import { SENSOR_LABELS, SENSOR_RANGE } from '../sim/sensors.js';
import { rayColor } from './rays.js';

const LABELS = [...SENSOR_LABELS, 'speed'];
const X = 918, Y = 252, W = 212, ROW = 22;

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
    ctx.fillRect(X + 142, y + 3, 58, 10);
    ctx.fillStyle = i < 5 ? rayColor((1 - v) * SENSOR_RANGE) : '#ffd23f';
    ctx.fillRect(X + 142, y + 3, Math.round(58 * v), 10);
  });
  ctx.restore();
}
