// The neon spark burst when the car hits a wall. Purely visual: it runs on
// screen time, not simulation steps, and never affects the simulation.

import { ctx } from './canvas.js';
import { makeRng } from '../sim/rng.js';

const COLORS = ['#ffd23f', '#00f0ff', '#ffffff', '#ff4dd8'];
let sparks = [];

// `seed` makes every crash's burst look the same on every replay.
export function burstSparks(x, y, seed) {
  const rand = makeRng(seed);
  for (let i = 0; i < 26; i++) {
    const dir = rand() * Math.PI * 2;
    const speed = 60 + rand() * 240;
    sparks.push({
      x, y,
      vx: Math.cos(dir) * speed, vy: Math.sin(dir) * speed,
      life: 0.3 + rand() * 0.4, age: 0,
      color: COLORS[Math.floor(rand() * COLORS.length)],
    });
  }
}

export function clearSparks() {
  sparks = [];
}

export function drawSparks(dt) {
  ctx.save();
  for (const s of sparks) {
    s.age += dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.vx *= 1 - 4 * dt;
    s.vy *= 1 - 4 * dt;
    const k = 1 - s.age / s.life;
    if (k <= 0) continue;
    ctx.globalAlpha = k;
    ctx.fillStyle = s.color;
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 8;
    const size = k > 0.5 ? 3 : 2;
    ctx.fillRect(Math.round(s.x), Math.round(s.y), size, size);
  }
  ctx.restore();
  sparks = sparks.filter((s) => s.age < s.life);
}
