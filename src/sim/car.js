// The bug car: arcade physics and wall crashes.
// Pure simulation code: no DOM, no canvas, no randomness.

import { STEP } from './constants.js';
import { segmentHit } from './geometry.js';

// Tuning numbers (px and seconds)
export const CAR = {
  length: 24,          // hitbox, nose to tail (the antennae don't count)
  width: 16,           // hitbox, wheel to wheel
  accel: 380,          // px/s² when holding throttle
  brake: 900,          // px/s² when braking while moving forward
  reverseAccel: 260,   // px/s² when holding brake from a standstill
  maxSpeed: 330,       // px/s
  maxReverse: 90,      // px/s
  drag: 0.5,           // per second: air drag, grows with speed
  rolling: 90,         // px/s² of friction when you let go of the pedals
  turnRate: 3.6,       // rad/s at the best steering speed
  fullSteerSpeed: 70,  // px/s: below this, steering fades out (no spinning on the spot)
  highSpeedSteer: 0.48,// at top speed you only get this share of the turn rate
  steerResponse: 9,    // how fast the wheels turn toward the key you hold (per second)
};

// Input is one small number per step: a bit for each key held.
export const UP = 1, DOWN = 2, LEFT = 4, RIGHT = 8;

export function createCar(pose) {
  return {
    x: pose.x, y: pose.y, angle: pose.angle,
    speed: pose.speed ?? 0,
    steer: pose.steer ?? 0,   // -1 full left .. 1 full right
    prevX: pose.x, prevY: pose.y, prevAngle: pose.angle, // last step's pose, for smooth drawing
    crashed: false,
    crash: null,              // {x, y} where the car hit the wall
  };
}

// Everything needed to put a car back into exactly this state (used to replay a lap from its start).
export function carState(car) {
  return { x: car.x, y: car.y, angle: car.angle, speed: car.speed, steer: car.steer };
}

// How much of the full turn rate you get at this speed: none when parked, all at medium speed, less when flat out.
export function steeringGrip(speed) {
  const v = Math.abs(speed);
  const lowSpeed = Math.min(1, v / CAR.fullSteerSpeed);
  const highSpeed = 1 - (1 - CAR.highSpeedSteer) * Math.min(1, v / CAR.maxSpeed);
  return lowSpeed * highSpeed;
}

// Moves the car forward one simulation step (1/60 s) for the keys held.
export function stepCar(car, input, walls) {
  car.prevX = car.x; car.prevY = car.y; car.prevAngle = car.angle;
  if (car.crashed) return;

  const dt = STEP;
  const gas = (input & UP) !== 0;
  const brake = (input & DOWN) !== 0;
  const steerTarget = ((input & RIGHT) ? 1 : 0) - ((input & LEFT) ? 1 : 0);

  // Wheels turn toward the key you hold, not instantly: that's what keeps it from feeling twitchy
  const maxTurn = CAR.steerResponse * dt;
  car.steer += Math.max(-maxTurn, Math.min(maxTurn, steerTarget - car.steer));

  // Pedals
  let v = car.speed;
  if (gas && !brake) {
    v += (v < 0 ? CAR.brake : CAR.accel) * dt;
  } else if (brake && !gas) {
    if (v > 0) v = Math.max(0, v - CAR.brake * dt);       // brake down to a stop first...
    else v -= CAR.reverseAccel * dt;                      // ...then reverse
  } else {
    // Let go: rolling friction slows you to a stop
    const f = CAR.rolling * dt;
    v = Math.abs(v) <= f ? 0 : v - Math.sign(v) * f;
  }
  v -= v * CAR.drag * dt;
  v = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, v));
  car.speed = v;

  // Steering: how fast the car turns depends on its speed (reversing turns the other way, like a real car)
  car.angle += car.steer * CAR.turnRate * steeringGrip(v) * Math.sign(v) * dt;
  car.x += Math.cos(car.angle) * v * dt;
  car.y += Math.sin(car.angle) * v * dt;

  // Hitting a wall is a crash: the car stops right there, no sliding along the wall
  const hit = hitWall(car, walls);
  if (hit) {
    car.x = car.prevX; car.y = car.prevY; car.angle = car.prevAngle;
    car.speed = 0;
    car.crashed = true;
    car.crash = hit;
  }
}

// The four corners of the car's hitbox, front-left first, going clockwise.
export function carCorners(car) {
  const c = Math.cos(car.angle), s = Math.sin(car.angle);
  const hl = CAR.length / 2, hw = CAR.width / 2;
  const corner = (fx, fy) => ({ x: car.x + c * fx - s * fy, y: car.y + s * fx + c * fy });
  return [corner(hl, -hw), corner(hl, hw), corner(-hl, hw), corner(-hl, -hw)];
}

// Does the car's hitbox touch any wall? Returns the touching point, or null.
export function hitWall(car, walls) {
  const k = carCorners(car);
  const reach = CAR.length; // anything farther than this from the car's center can't touch it
  for (const w of walls) {
    if (Math.min(w.ax, w.bx) > car.x + reach || Math.max(w.ax, w.bx) < car.x - reach) continue;
    if (Math.min(w.ay, w.by) > car.y + reach || Math.max(w.ay, w.by) < car.y - reach) continue;
    for (let i = 0; i < 4; i++) {
      const a = k[i], b = k[(i + 1) % 4];
      const t = segmentHit(a.x, a.y, b.x, b.y, w.ax, w.ay, w.bx, w.by);
      if (t >= 0) return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
  }
  return null;
}
