// "Explain one decision" (F): the whole path from what the car saw to one key,
// in plain numbers, for one hidden neuron and the output it feeds.
// Every number comes from explainThink(), the same arithmetic think() did this step.

import { ctx } from './canvas.js';
import { SENSOR_LABELS } from '../sim/sensors.js';
import { OUTPUT_LABELS } from '../sim/brain.js';

export const DECISION_PANEL_W = 450, DECISION_PANEL_H = 302;
const ROW = 14;
const f3 = (v) => (v < 0 ? '' : ' ') + v.toFixed(3);

// The hidden neuron with the biggest say in output k: the largest |hidden value x weight|.
export function strongestHidden(ex, k) {
  let best = 0;
  ex.output[k].terms.forEach((t, h) => { if (Math.abs(t.product) > Math.abs(ex.output[k].terms[best].product)) best = h; });
  return best;
}

// ex = explainThink(...); view = the 5 distances in px; k = the output to explain; h = the hidden neuron to show
export function drawDecisionPanel(x, y, ex, view, k, h, caption) {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 6, 10, 0.92)';
  ctx.fillRect(x, y, DECISION_PANEL_W, DECISION_PANEL_H);
  ctx.strokeStyle = 'rgba(255, 210, 63, 0.6)';
  ctx.strokeRect(x + 0.5, y + 0.5, DECISION_PANEL_W - 1, DECISION_PANEL_H - 1);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  let ly = y + 8;
  const text = (s, color = 'rgba(230, 235, 242, 0.85)', font = '11px monospace', dx = 10) => {
    ctx.font = font; ctx.fillStyle = color; ctx.fillText(s, x + dx, ly); ly += ROW;
  };
  const key = OUTPUT_LABELS[k].toUpperCase();
  const out = ex.output[k], hid = ex.hidden[h];
  const pressed = out.value > 0.5;

  text(`EXPLAIN ONE DECISION: ${key}`, '#ffd23f', 'bold 12px monospace');
  text(`${caption}   ← → other key · F unfreeze`, 'rgba(230, 235, 242, 0.5)', '10px monospace');
  ly += 4;

  // 1. one hidden neuron: 6 inputs x weights
  text(`hidden neuron h${h + 1}  (biggest say in ${key}: ${f3(out.terms[h].product)})`, '#00f0ff', 'bold 11px monospace');
  hid.terms.forEach((t, i) => {
    const what = i < 5 ? `${SENSOR_LABELS[i].padEnd(9)} wall ${view[i].toFixed(0).padStart(3)} px` : 'speed'.padEnd(21);
    text(`${what}  ${f3(t.input)} × ${f3(t.weight)} = ${f3(t.product)}`);
  });
  text(`sum ${f3(hid.sum)}  + bias ${f3(hid.bias)}  = ${f3(hid.total)}   tanh → ${f3(hid.value)}`, '#00f0ff');
  ly += 6;

  // 2. the output: 6 hidden values x weights
  text(`output ${key}`, '#ffd23f', 'bold 11px monospace');
  out.terms.forEach((t, i) => {
    const mark = i === h ? '  ◀' : '';
    text(`h${i + 1}  ${f3(t.input)} × ${f3(t.weight)} = ${f3(t.product)}${mark}`, i === h ? '#00f0ff' : 'rgba(230, 235, 242, 0.85)');
  });
  text(`sum ${f3(out.sum)}  + bias ${f3(out.bias)}  = ${f3(out.total)}   sigmoid → ${out.value.toFixed(Math.abs(out.value - 0.5) < 0.0005 ? 5 : 3)}`, '#ffd23f');
  ly += 4;
  text(pressed ? `${out.value.toFixed(3)} > 0.5  →  ${key} PRESSED` : `${out.value.toFixed(3)} ≤ 0.5  →  ${key} not pressed`,
    pressed ? '#ffd23f' : 'rgba(230, 235, 242, 0.6)', 'bold 13px monospace');
  text('numbers rounded to 3 decimals for display', 'rgba(230, 235, 242, 0.35)', '9px monospace');
  ctx.restore();
}
