// Small 2D helpers. Points are plain {x, y} objects.

// Where segment AB crosses segment CD: returns t along AB (0..1), or -1 if they don't cross.
export function segmentHit(ax, ay, bx, by, cx, cy, dx, dy) {
  const rx = bx - ax, ry = by - ay;
  const sx = dx - cx, sy = dy - cy;
  const denom = rx * sy - ry * sx;
  if (denom === 0) return -1; // parallel
  const qx = cx - ax, qy = cy - ay;
  const t = (qx * sy - qy * sx) / denom;
  const u = (qx * ry - qy * rx) / denom;
  if (t < 0 || t > 1 || u < 0 || u > 1) return -1;
  return t;
}

// Keeps an angle in -PI..PI.
export function wrapAngle(a) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

// Signed area of a closed polygon (positive = clockwise on screen, where y points down).
export function signedArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i], q = points[(i + 1) % points.length];
    sum += p.x * q.y - q.x * p.y;
  }
  return sum / 2;
}
