// Lap time, best lap, lap counter, and the CRASHED screen. Every number is
// read straight from the simulation (lap times are step counts / 60).

import { ctx, VIEW_W, VIEW_H } from './canvas.js';
import { STEPS_PER_SECOND } from '../sim/constants.js';

const CYAN = '#00f0ff';
const PINK = '#ff2e63';
const YELLOW = '#ffd23f';
const TEXT = '#e6ebf2';
const DIM = 'rgba(0, 240, 255, 0.55)';

// 12.83 or 1:04.50, from a number of simulation steps.
export function formatSteps(steps) {
  const total = steps / STEPS_PER_SECOND;
  const min = Math.floor(total / 60);
  const sec = total - min * 60;
  return min > 0 ? `${min}:${sec.toFixed(2).padStart(5, '0')}` : sec.toFixed(2);
}

function glowText(text, x, y, color, font, blur = 10) {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// hud = {trackName, laps, lapSteps, started, lastSteps, bestSteps, newBestFor, crashed}
export function drawHud(hud) {
  ctx.textBaseline = 'top';

  ctx.textAlign = 'left';
  glowText('BUG DRIVER', 16, 14, DIM, '14px monospace', 0);
  glowText(hud.trackName.toUpperCase(), 16, 32, 'rgba(0, 240, 255, 0.35)', '11px monospace', 0);

  // Current lap time, top center
  ctx.textAlign = 'center';
  const time = hud.started ? formatSteps(hud.lapSteps) : '0.00';
  glowText(time, VIEW_W / 2, 8, hud.started ? TEXT : 'rgba(230, 235, 242, 0.35)', 'bold 26px monospace');
  const best = hud.bestSteps == null ? '--' : formatSteps(hud.bestSteps);
  const last = hud.lastSteps == null ? '--' : formatSteps(hud.lastSteps);
  glowText(`BEST ${best}    LAST ${last}`, VIEW_W / 2, 40, DIM, '12px monospace', 0);

  ctx.textAlign = 'right';
  glowText(`LAP ${hud.laps}`, VIEW_W - 16, 12, CYAN, 'bold 18px monospace', 8);
  glowText('laps done', VIEW_W - 16, 34, 'rgba(0, 240, 255, 0.35)', '11px monospace', 0);

  ctx.textAlign = 'left';
  glowText('ARROWS / WASD  drive     R  restart     E  explain     TAB  let the AI drive', 16, VIEW_H - 24, 'rgba(0, 240, 255, 0.4)', '12px monospace', 0);

  if (!hud.started && !hud.crashed) {
    ctx.textAlign = 'center';
    glowText('the timer starts at the line', VIEW_W / 2, 330, 'rgba(230, 235, 242, 0.45)', '14px monospace', 0);
  }

  if (hud.newBestFor > 0) {
    ctx.textAlign = 'center';
    glowText('NEW BEST LAP', VIEW_W / 2, 300, YELLOW, 'bold 28px monospace', 14);
  }

  if (hud.crashed) {
    ctx.textAlign = 'center';
    glowText('CRASHED', VIEW_W / 2, 300, PINK, 'bold 48px monospace', 18);
    glowText('press R to restart', VIEW_W / 2, 358, TEXT, '16px monospace', 6);
  }
}

const AI_KEYS = '1 2 3 speed   R restart   E eyes   B brain   F explain one decision   N 70 numbers   click a car   TAB drive';

function drawFrozen() {
  ctx.textAlign = 'right';
  glowText('FROZEN · F to go on', VIEW_W - 16, 48, YELLOW, 'bold 12px monospace', 8);
}

// ch = {trackName, name, id, laps, bestLapSteps, recordedLapSteps, over, out, percent, seconds, speed, frozen}
export function drawChampionHud(ch) {
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  glowText('BUG DRIVER', 16, 14, DIM, '14px monospace', 0);
  glowText(`${ch.trackName.toUpperCase()}  ·  CHAMPION, ALONE`, 16, 32, 'rgba(0, 240, 255, 0.35)', '11px monospace', 0);

  ctx.textAlign = 'center';
  const lapList = ch.laps.length ? ch.laps.map(formatSteps).join('  ') : 'no lap yet';
  glowText(`CHAMPION ${ch.name.toUpperCase()}`, VIEW_W / 2, 8, TEXT, 'bold 20px monospace');
  glowText(`car ${ch.id}  ·  laps: ${lapList}  ·  ${ch.percent.toFixed(1)}% · ${ch.seconds.toFixed(1)} s`, VIEW_W / 2, 36, DIM, '12px monospace', 0);

  ctx.textAlign = 'right';
  glowText(ch.speed === 'max' ? 'MAX' : `x${ch.speed}`, VIEW_W - 16, 12, YELLOW, 'bold 18px monospace', 8);

  ctx.textAlign = 'left';
  glowText(AI_KEYS, 16, VIEW_H - 24, 'rgba(0, 240, 255, 0.4)', '12px monospace', 0);
  if (ch.frozen) drawFrozen();

  if (ch.over) {
    ctx.textAlign = 'center';
    const recorded = ch.recordedLapSteps == null ? 'no lap' : formatSteps(ch.recordedLapSteps);
    const now = ch.bestLapSteps == null ? 'no lap' : formatSteps(ch.bestLapSteps);
    const match = ch.bestLapSteps === ch.recordedLapSteps;
    // in the empty infield, clear of the brain panels
    glowText(`best lap ${now} · recorded ${recorded} · ${match ? 'EXACT MATCH' : 'MISMATCH'}`,
      500, 330, match ? YELLOW : PINK, 'bold 15px monospace', 10);
    glowText(`out by ${ch.out}  ·  R to run it again`, 500, 354, TEXT, '12px monospace', 0);
  }
}

// ai = {trackName, generation, alive, total, leaderPercent, bestLapSteps, seconds, speed, seed, flash, frozen}
export function drawAiHud(ai) {
  ctx.textBaseline = 'top';

  ctx.textAlign = 'left';
  glowText('BUG DRIVER', 16, 14, DIM, '14px monospace', 0);
  glowText(`${ai.trackName.toUpperCase()}  ·  AI DRIVES`, 16, 32, 'rgba(0, 240, 255, 0.35)', '11px monospace', 0);

  ctx.textAlign = 'center';
  const bestLap = ai.bestLapSteps == null ? '--' : formatSteps(ai.bestLapSteps);
  glowText(`GEN ${ai.generation}  ·  ALIVE ${ai.alive}/${ai.total}  ·  BEST LAP ${bestLap}`, VIEW_W / 2, 8, TEXT, 'bold 22px monospace');
  glowText(`LEADER ${ai.leaderPercent.toFixed(1)}% of a lap    ${ai.seconds.toFixed(1)} s`, VIEW_W / 2, 38, DIM, '12px monospace', 0);

  ctx.textAlign = 'right';
  glowText(ai.speed === 'max' ? 'MAX' : `x${ai.speed}`, VIEW_W - 16, 12, YELLOW, 'bold 18px monospace', 8);
  glowText(`seed ${ai.seed}`, VIEW_W - 16, 34, 'rgba(0, 240, 255, 0.35)', '11px monospace', 0);

  ctx.textAlign = 'left';
  glowText(AI_KEYS, 16, VIEW_H - 24, 'rgba(0, 240, 255, 0.4)', '12px monospace', 0);
  if (ai.frozen) drawFrozen();

  if (ai.flash) {
    ctx.textAlign = 'center';
    glowText(ai.flash, VIEW_W / 2, 196, YELLOW, 'bold 34px monospace', 18);
  }
}

// Max speed: the track and cars aren't drawn while the simulation races ahead, just these numbers.
export function drawMaxSpeedScreen(ai) {
  ctx.fillStyle = '#05060a';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  glowText('MAX SPEED', VIEW_W / 2, 200, YELLOW, 'bold 26px monospace', 12);
  const bestLap = ai.bestLapSteps == null ? 'no lap yet' : `best lap ${formatSteps(ai.bestLapSteps)}`;
  glowText(`generation ${ai.generation}  ·  ${ai.seconds.toFixed(1)} s simulated  ·  ${bestLap}`,
    VIEW_W / 2, 236, DIM, '13px monospace', 0);
  glowText('the track is not drawn at this speed: press 1 or 2 to watch', VIEW_W / 2, 262, 'rgba(230, 235, 242, 0.4)', '12px monospace', 0);
  if (ai.flash) glowText(ai.flash, VIEW_W / 2, 150, YELLOW, 'bold 30px monospace', 16);
}
