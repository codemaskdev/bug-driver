// The bug car: a pixel sprite, drawn rotated at the car's (smoothed) position.

import { ctx } from './canvas.js';

const PIXEL = 2;
// A ladybug, facing right. W = wheels, O = cyan neon outline, S = shell shine,
// B = shell, K = spots, L = the line between the two wing cases, H = head,
// E = eyes, A = antennae (they stick out past the hitbox).
const SPRITE = [
  '...WWW...WWW...',
  '..OOOOOOOOO....',
  '.OSSBBKBBBOHO.A',
  'OSBBBBBBKBOHEA.',
  'OLLLLLLLLLOHHO.',
  'OSBBKBBBBBOHEA.',
  '.OSBBBBKBBOHO.A',
  '..OOOOOOOOO....',
  '...WWW...WWW...',
];
const COLORS = {
  W: '#3a4256',
  O: '#00f0ff',
  S: '#a6faff',
  B: '#0a8c9c',
  K: '#04343b',
  L: '#04343b',
  H: '#0d0e12',
  E: '#e8feff',
  A: '#00f0ff',
};
// The body (13 columns, nose to tail) is centered on the car's position;
// the hitbox (CAR.length x CAR.width) is a little smaller than the rounded shell's corners.
const BODY_COLS = 13;

const sprite = document.createElement('canvas');
sprite.width = SPRITE[0].length * PIXEL;
sprite.height = SPRITE.length * PIXEL;
{
  const g = sprite.getContext('2d');
  SPRITE.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      g.fillStyle = COLORS[ch];
      g.fillRect(x * PIXEL, y * PIXEL, PIXEL, PIXEL);
    });
  });
}

// Draws the car between its last two simulation poses (alpha 0..1), so it moves smoothly on any monitor.
export function drawCar(car, alpha) {
  const x = car.prevX + (car.x - car.prevX) * alpha;
  const y = car.prevY + (car.y - car.prevY) * alpha;
  const angle = car.prevAngle + (car.angle - car.prevAngle) * alpha;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.imageSmoothingEnabled = false;
  ctx.shadowColor = car.crashed ? '#ff2e63' : '#00f0ff';
  ctx.shadowBlur = 8;
  ctx.drawImage(sprite, -BODY_COLS * PIXEL / 2, -sprite.height / 2);
  ctx.restore();
}
