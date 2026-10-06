// The bug car: a pixel sprite, drawn rotated at the car's (smoothed) position.

import { ctx } from './canvas.js';

const PIXEL = 2;
// A ladybug seen from above, facing right. O = glowing cyan outline,
// B = shell, S = shine, K = dots, L = the center line between the two
// wing cases, H = head, E = eyes, A = antennae, W = wheels peeking out.
// The antennae and wheels stick out past the hitbox (see CAR.hitbox).
const SPRITE = [
  '...WW....WW.........',
  '....OOOOOOO.........',
  '..OOSSSBBBBOO.......',
  '.OBSBBBBBKKBBO.....A',
  '.OSBKKBBBKKBBBOO..A.',
  'OBBBKKBBBBBBBBOHOO..',
  'OBBBBBBBBBBKKBOHEO..',
  'OLLLLLLLLLLLLLOHHO..',
  'OBBBBBBBBBBKKBOHEO..',
  'OBBBKKBBBBBBBBOHOO..',
  '.OBBKKBBBKKBBBOO..A.',
  '.OBBBBBBBKKBBO.....A',
  '..OOBBBBBBBOO.......',
  '....OOOOOOO.........',
  '...WW....WW.........',
];
const COLORS = {
  W: '#3a4256',
  O: '#00f0ff',
  S: '#b8fbff',
  B: '#0aa3b5',
  K: '#03262c',
  L: '#03262c',
  H: '#0d0e12',
  E: '#e8feff',
  A: '#00f0ff',
};
// Cell (7, 7), the middle of the shell, is the car's position
const ORIGIN_COL = 7, ORIGIN_ROW = 7;

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

// The car's pose between its last two simulation steps (alpha 0..1), so it moves smoothly on any monitor.
// alpha = 1 is exactly the simulation's current pose.
export function smoothPose(car, alpha) {
  return {
    x: car.prevX + (car.x - car.prevX) * alpha,
    y: car.prevY + (car.y - car.prevY) * alpha,
    angle: car.prevAngle + (car.angle - car.prevAngle) * alpha,
  };
}

// Draws the car at `pose` (from smoothPose); `crashed` tints its glow.
export function drawCar(pose, crashed) {
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.rotate(pose.angle);
  ctx.imageSmoothingEnabled = false;
  ctx.shadowColor = crashed ? '#ff2e63' : '#00f0ff';
  ctx.shadowBlur = 8;
  ctx.drawImage(sprite, -(ORIGIN_COL + 0.5) * PIXEL, -(ORIGIN_ROW + 0.5) * PIXEL);
  ctx.restore();
}
