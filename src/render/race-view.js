// Me vs the AI: the race screen and the scoreboard. Every time shown comes
// straight from the race simulation or from the saved files.

import { ctx, VIEW_W, VIEW_H } from './canvas.js';
import { formatSteps } from './hud.js';

const CYAN = '#00f0ff', YELLOW = '#ffd23f', PINK = '#ff2e63', TEXT = '#e6ebf2', DIM = 'rgba(0, 240, 255, 0.55)';

function glow(text, x, y, color, font, blur = 10) {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// A name tag above a car (below = true puts it under the car, when two cars are side by side)
export function drawTag(pose, label, color, below = false) {
  ctx.save();
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const w = ctx.measureText(label).width + 10;
  ctx.fillStyle = 'rgba(5, 6, 10, 0.75)';
  const y = below ? pose.y + 46 : pose.y - 30;
  ctx.fillRect(pose.x - w / 2, y - 16, w, 18);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.fillText(label, pose.x, y);
  ctx.restore();
}

// Where a car that never finished got out
export function drawOutMark(x, y, label) {
  ctx.save();
  ctx.strokeStyle = PINK;
  ctx.lineWidth = 3;
  ctx.shadowColor = PINK;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(x - 9, y - 9); ctx.lineTo(x + 9, y + 9);
  ctx.moveTo(x - 9, y + 9); ctx.lineTo(x + 9, y - 9);
  ctx.stroke();
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = PINK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(label, x, y + 24);
  ctx.restore();
}

// r = {aiName, seconds, started, gap: {ahead, seconds}, meTime, aiTime, aiOut, aiProgress, result, speed}
export function drawRaceHud(r) {
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  glow('BUG DRIVER', 16, 14, DIM, '14px monospace', 0);
  glow('ME vs THE AI', 16, 32, 'rgba(0, 240, 255, 0.35)', '11px monospace', 0);

  ctx.textAlign = 'center';
  ctx.save();
  ctx.font = 'bold 24px monospace';
  const left = 'ME', mid = '  vs  ', right = r.aiName;
  const wl = ctx.measureText(left).width, wm = ctx.measureText(mid).width, wr = ctx.measureText(right).width;
  const x0 = VIEW_W / 2 - (wl + wm + wr) / 2;
  ctx.restore();
  ctx.textAlign = 'left';
  glow(left, x0, 8, CYAN, 'bold 24px monospace');
  glow(mid, x0 + wl, 8, TEXT, 'bold 24px monospace', 0);
  glow(right, x0 + wl + wm, 8, YELLOW, 'bold 24px monospace');

  ctx.textAlign = 'center';
  if (r.started && !r.result) {
    // the time, then the live gap, on one line under the title
    const g = r.gap;
    const gap = !g.ahead ? 'level' : `${g.ahead === 'ai' ? 'AI' : 'ME'} +${g.seconds.toFixed(1)} s ahead`;
    glow(`${r.seconds.toFixed(2)} s   ·   `, VIEW_W / 2, 40, TEXT, '14px monospace', 0);
    ctx.textAlign = 'left';
    glow(gap, VIEW_W / 2 + 62, 39, g.ahead === 'ai' ? YELLOW : g.ahead === 'me' ? CYAN : TEXT, 'bold 15px monospace', 8);
    ctx.textAlign = 'center';
  } else {
    glow(`${r.seconds.toFixed(2)} s`, VIEW_W / 2, 40, TEXT, '14px monospace', 0);
  }

  ctx.textAlign = 'right';
  glow(r.speed === 1 ? 'x1' : `x${r.speed}`, VIEW_W - 16, 12, YELLOW, 'bold 18px monospace', 8);
  ctx.textAlign = 'left';
  glow(`ME  ${r.meTime == null ? '--' : formatSteps(r.meTime)}`, VIEW_W - 170, 40, CYAN, '13px monospace', 0);
  glow(`${r.aiName}  ${r.aiTime == null ? (r.aiOut ? 'out' : '--') : formatSteps(r.aiTime)}`, VIEW_W - 170, 58, YELLOW, '13px monospace', 0);

  ctx.textAlign = 'left';
  glow('SPACE start / again     1 2 speed     S scoreboard     ESC back', 16, VIEW_H - 24, 'rgba(0, 240, 255, 0.4)', '12px monospace', 0);
  ctx.textAlign = 'right';
  glow('best lap vs best lap: each car starts its best lap exactly where that lap really began',
    VIEW_W - 16, VIEW_H - 24, 'rgba(230, 235, 242, 0.35)', '10px monospace', 0);

  if (!r.started) {
    ctx.textAlign = 'center';
    glow('SPACE to start', 500, 330, TEXT, 'bold 22px monospace', 8);
  }
  if (r.result) {
    ctx.textAlign = 'center';
    const res = r.result;
    let big, color, small;
    if (res.aiSteps === null) {
      big = 'ME WINS'; color = CYAN;
      small = `${r.aiName} never finished a lap: out by ${res.aiOut} at ${(res.aiProgress * 100).toFixed(0)}% of a lap`;
    } else if (res.winner === 'tie') {
      big = 'A DEAD HEAT'; color = TEXT; small = `both ${formatSteps(res.meSteps)} s`;
    } else {
      big = `${res.winner === 'ai' ? 'AI' : 'ME'} WINS by ${res.by.toFixed(2)} s`; color = res.winner === 'ai' ? YELLOW : CYAN;
      small = `ME ${formatSteps(res.meSteps)} s   ·   ${r.aiName} ${formatSteps(res.aiSteps)} s`;
    }
    glow(big, 500, 318, color, 'bold 40px monospace', 18);
    glow(small, 500, 366, TEXT, '14px monospace', 4);
  }
}

// b = {seed, rows, total, reveal, selected}
export function drawScoreboard(b) {
  ctx.fillStyle = 'rgba(5, 6, 10, 0.86)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  glow('ME vs THE AI', VIEW_W / 2, 50, TEXT, 'bold 34px monospace', 14);
  glow(`my best lap against the best car of each generation · seed ${b.seed}`, VIEW_W / 2, 96, DIM, '14px monospace', 0);

  const cols = [380, 520, 660, 800, 930];
  const heads = ['GEN', 'ME', 'AI', 'WINNER', 'SCORE'];
  heads.forEach((h, i) => glow(h, cols[i], 150, DIM, 'bold 14px monospace', 0));
  b.rows.forEach((row, i) => {
    const y = 186 + i * 52;
    const shown = i < b.reveal;
    if (i === b.selected) {
      ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.fillRect(300, y - 12, 700, 44);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.strokeRect(300.5, y - 11.5, 699, 43);
    }
    glow(String(row.generation), cols[0], y, TEXT, 'bold 20px monospace', 0);
    if (!shown) { glow('·  ·  ·', cols[2], y, 'rgba(230, 235, 242, 0.3)', '20px monospace', 0); return; }
    glow(formatSteps(row.meSteps), cols[1], y, CYAN, '20px monospace', 0);
    glow(row.aiSteps == null ? 'no lap' : formatSteps(row.aiSteps), cols[2], y, YELLOW, '20px monospace', 0);
    glow(row.winner === 'ai' ? 'AI' : row.winner === 'me' ? 'ME' : 'TIE', cols[3], y, row.winner === 'ai' ? YELLOW : CYAN, 'bold 20px monospace', 10);
    glow(`${row.score.me} : ${row.score.ai}`, cols[4], y, TEXT, '20px monospace', 0);
  });
  if (b.reveal >= b.rows.length) {
    const t = b.total;
    const lead = t.ai > t.me ? 'AI' : t.me > t.ai ? 'ME' : 'DRAW';
    glow(`ME ${t.me} : ${t.ai} AI`, VIEW_W / 2, 508, lead === 'AI' ? YELLOW : CYAN, 'bold 40px monospace', 18);
  }
  glow(`times are best laps: mine (ghosts/me-v3.json) vs each champion's best lap during evolution (champions/seed-${b.seed}.json)`,
    VIEW_W / 2, 580, 'rgba(230, 235, 242, 0.4)', '11px monospace', 0);
  ctx.textAlign = 'left';
  glow('↑ ↓ pick     ENTER race it     S / ESC back', 16, VIEW_H - 24, 'rgba(0, 240, 255, 0.4)', '12px monospace', 0);
}
