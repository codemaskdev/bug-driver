// Draws the car's 5 eyes: thin glowing rays that turn from cyan (far) to
// pink-red (close), a dot where each one hits a wall, and, with the explain
// overlay on, the distance in px next to each hit.

import { ctx } from './canvas.js';
import { SENSOR_ANGLES, SENSOR_RANGE, eyePosition } from '../sim/sensors.js';

const FAR = [0, 240, 255];   // cyan
const NEAR = [255, 46, 99];  // pink-red

export function rayColor(distance, alpha = 1) {
  const k = 1 - distance / SENSOR_RANGE; // 0 far .. 1 touching
  const c = FAR.map((f, i) => Math.round(f + (NEAR[i] - f) * k));
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
}

// `pose` is {x, y, angle}; `distances` are what readSensors() returned for that same pose.
export function drawRays(pose, distances, showNumbers) {
  ctx.save();
  ctx.lineWidth = 2;
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  distances.forEach((d, i) => {
    const angle = pose.angle + SENSOR_ANGLES[i];
    const eye = eyePosition(pose, i);
    const hx = eye.x + Math.cos(angle) * d, hy = eye.y + Math.sin(angle) * d;
    const hit = d < SENSOR_RANGE;

    ctx.strokeStyle = rayColor(d, hit ? 0.9 : 0.45);
    ctx.shadowColor = rayColor(d);
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(eye.x, eye.y);
    ctx.lineTo(hx, hy);
    ctx.stroke();

    if (hit) {
      ctx.fillStyle = rayColor(d);
      ctx.beginPath();
      ctx.arc(hx, hy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (showNumbers) {
      // the label sits a little past the hit point, along the ray
      const lx = hx + Math.cos(angle) * 14, ly = hy + Math.sin(angle) * 10;
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(5, 6, 10, 0.75)';
      const text = d.toFixed(0);
      const w = ctx.measureText(text).width + 6;
      ctx.fillRect(lx - w / 2, ly - 7, w, 14);
      ctx.fillStyle = rayColor(d);
      ctx.fillText(text, lx, ly);
    }
  });
  ctx.restore();
}
