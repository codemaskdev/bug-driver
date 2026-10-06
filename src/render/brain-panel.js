// The live brain panel (B): the real network from brain.js, drawn from the real
// numbers of one decision (explainThink). Inputs on the left, 6 hidden neurons in
// the middle, the 4 keys on the right. Line thickness = size of the weight,
// cyan = positive, pink = negative. Nodes glow by their value.

import { ctx } from './canvas.js';
import { SENSOR_LABELS } from '../sim/sensors.js';
import { OUTPUT_LABELS } from '../sim/brain.js';

export const BRAIN_PANEL_W = 450, BRAIN_PANEL_H = 232;
const INPUT_LABELS = [...SENSOR_LABELS, 'speed'];
const CYAN = [0, 240, 255], PINK = [255, 46, 99], YELLOW = '#ffd23f';

const rgba = (c, a) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

// ex = explainThink(brain, inputs); highlight = {hidden, output} to pick out one path (for "explain one decision")
export function drawBrainPanel(x, y, ex, title, highlight = null) {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 6, 10, 0.9)';
  ctx.fillRect(x, y, BRAIN_PANEL_W, BRAIN_PANEL_H);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
  ctx.strokeRect(x + 0.5, y + 0.5, BRAIN_PANEL_W - 1, BRAIN_PANEL_H - 1);
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#00f0ff';
  ctx.fillText('BRAIN', x + 10, y + 14);
  ctx.font = '10px monospace';
  ctx.fillStyle = 'rgba(230, 235, 242, 0.55)';
  ctx.fillText(title, x + 62, y + 14);

  const inX = x + 128, hidX = x + 236, outX = x + 340;
  const inY = (i) => y + 44 + i * 30;
  const hidY = (h) => y + 44 + h * 30;
  const outY = (k) => y + 64 + k * 36;

  // connections first, so the nodes sit on top
  const line = (x1, y1, x2, y2, w, onPath) => {
    const size = Math.min(1, Math.abs(w) / 2);
    const dim = highlight && !onPath ? 0.25 : 1;
    ctx.strokeStyle = rgba(w >= 0 ? CYAN : PINK, (0.12 + 0.68 * size) * dim);
    ctx.lineWidth = 0.6 + 2.6 * size + (onPath ? 1 : 0);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };
  ex.hidden.forEach((n, h) => n.terms.forEach((t, i) =>
    line(inX, inY(i), hidX, hidY(h), t.weight, highlight && highlight.hidden === h)));
  ex.output.forEach((n, k) => n.terms.forEach((t, h) =>
    line(hidX, hidY(h), outX, outY(k), t.weight, highlight && highlight.output === k && highlight.hidden === h)));

  // input nodes: 0..1, brighter = closer wall (or faster)
  ex.inputs.forEach((v, i) => {
    node(inX, inY(i), rgba(CYAN, 0.08 + 0.92 * v), v > 0.5);
    ctx.textAlign = 'right';
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(230, 235, 242, 0.75)';
    ctx.fillText(`${INPUT_LABELS[i]} ${v.toFixed(3)}`, inX - 14, inY(i));
  });
  // hidden nodes: -1..1 (tanh), cyan when positive, pink when negative
  ex.hidden.forEach((n, h) => {
    const on = highlight && highlight.hidden === h;
    node(hidX, hidY(h), rgba(n.value >= 0 ? CYAN : PINK, 0.08 + 0.92 * Math.abs(n.value)), on);
    ctx.textAlign = 'left';
    ctx.font = '9px monospace';
    ctx.fillStyle = on ? YELLOW : 'rgba(230, 235, 242, 0.6)';
    ctx.fillText(`h${h + 1} ${n.value >= 0 ? ' ' : ''}${n.value.toFixed(2)}`, hidX + 13, hidY(h) - 9);
  });
  // output nodes: 0..1 (sigmoid), fully lit when the key is pressed
  ex.output.forEach((n, k) => {
    const pressed = n.value > 0.5;
    node(outX, outY(k), pressed ? YELLOW : `rgba(255, 210, 63, ${0.06 + 0.5 * n.value})`, pressed);
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = pressed ? YELLOW : 'rgba(230, 235, 242, 0.55)';
    ctx.fillText(OUTPUT_LABELS[k].toUpperCase(), outX + 15, outY(k) - 6);
    ctx.font = '10px monospace';
    ctx.fillText(n.value.toFixed(Math.abs(n.value - 0.5) < 0.0005 ? 5 : 3), outX + 15, outY(k) + 7);
  });
  ctx.restore();
}

function node(cx, cy, fill, glow) {
  ctx.save();
  ctx.fillStyle = fill;
  if (glow) { ctx.shadowColor = fill; ctx.shadowBlur = 12; }
  ctx.beginPath();
  ctx.arc(cx, cy, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(230, 235, 242, 0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}
