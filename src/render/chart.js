// A small live chart: best and average fitness of every finished generation.
// On Neon Loop it sits in the empty infield between the hairpin and the U-turn; on other tracks, see chartSpot().

import { ctx } from './canvas.js';

const W = 296, H = 90;
const NEON_INFIELD = { x: 352, y: 308 };

// Where the chart goes on a track: Neon Loop's infield, or else the spot (scanning the screen,
// clear of the HUD at the top and bottom) that covers the least road, ideally none.
export function chartSpot(track) {
  const roadUnder = (x, y) => track.center.filter((p) => {
    const dx = Math.max(x - p.x, 0, p.x - (x + W)), dy = Math.max(y - p.y, 0, p.y - (y + H));
    return Math.hypot(dx, dy) < track.width / 2;
  }).length;
  if (roadUnder(NEON_INFIELD.x, NEON_INFIELD.y) === 0) return NEON_INFIELD;
  let best = { x: 16, y: 70 }, least = Infinity;
  for (let y = 70; y + H <= 670; y += 20) {
    for (let x = 16; x + W <= 1264; x += 20) {
      const n = roadUnder(x, y);
      if (n < least) { least = n; best = { x, y }; }
      if (n === 0) return best;
    }
  }
  return best;
}

const BEST = '#00f0ff';
const AVERAGE = '#ffd23f';

// history = rows from generationStats(): {generation, bestFitness, averageFitness}
export function drawChart(history, at = NEON_INFIELD) {
  const X = at.x, Y = at.y;
  ctx.save();
  ctx.fillStyle = 'rgba(5, 6, 10, 0.8)';
  ctx.fillRect(X, Y, W, H);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
  ctx.strokeRect(X + 0.5, Y + 0.5, W - 1, H - 1);

  ctx.font = '10px monospace';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(230, 235, 242, 0.6)';
  ctx.fillText('FITNESS PER GENERATION', X + 8, Y + 6);
  const last = history[history.length - 1];
  ctx.textAlign = 'right';
  ctx.fillStyle = BEST;
  ctx.fillText(`best ${last ? last.bestFitness.toFixed(1) : '--'}`, X + W - 84, Y + 6);
  ctx.fillStyle = AVERAGE;
  ctx.fillText(`avg ${last ? last.averageFitness.toFixed(1) : '--'}`, X + W - 8, Y + 6);

  if (history.length > 0) {
    const px = X + 8, py = Y + 22, pw = W - 16, ph = H - 30;
    const top = Math.max(...history.map((r) => r.bestFitness)) * 1.08 || 1;
    const xAt = (i) => px + (history.length === 1 ? pw : (i / (history.length - 1)) * pw);
    const yAt = (v) => py + ph - (v / top) * ph;
    for (const [key, color] of [['averageFitness', AVERAGE], ['bestFitness', BEST]]) {
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 4;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      history.forEach((r, i) => (i ? ctx.lineTo(xAt(i), yAt(r[key])) : ctx.moveTo(xAt(i), yAt(r[key]))));
      if (history.length === 1) ctx.lineTo(px, yAt(history[0][key]));
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(230, 235, 242, 0.4)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`gen 1`, px, Y + H - 1);
    ctx.textAlign = 'right';
    ctx.fillText(`gen ${last.generation}`, px + pw, Y + H - 1);
  }
  ctx.restore();
}
