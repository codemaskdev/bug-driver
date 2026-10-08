// Tracks are stored as data: an ordered loop of centerline points plus a width.
// buildTrack() turns that data into everything the game needs: the two walls,
// the checkpoints and the start line. A track can later be encoded into a
// share link just by encoding its points and width.

import { signedArea } from './geometry.js';
import * as fm from './fmath.js'; // sin, cos, … the same on every engine (Math.* differs in the last bit)

export const TRACKS = [
  {
    id: 'neon-loop',
    name: 'Neon Loop',
    width: 90,
    // Driving order. Point 0 is the start/finish line.
    points: [
      [560, 640], [800, 640], [980, 636], [1100, 610], [1170, 540], [1190, 430],
      [1185, 300], [1160, 200], [1090, 128], [980, 110], [800, 110], [600, 110],
      [440, 111],
      // the hairpin
      [330, 112], [295, 121], [269, 147], [260, 182], [269, 217], [295, 243], [330, 252],
      [450, 254], [640, 256],
      // the long U-turn
      [760, 258], [829, 286], [857, 355], [829, 424], [760, 452],
      [560, 457], [380, 452], [240, 452], [170, 482], [148, 546], [175, 612],
      [260, 640], [400, 640],
    ],
  },
  // Step 7: four new tracks, pre-registered and frozen (tests/tracks.test.js checks their SHA-256).
  // Same format, same 90 px road, same physics. Nobody trains on Exam, ever.
  {
    id: 'neon-loop-mirrored',
    name: 'Neon Loop Mirrored',
    width: 90,
    // Neon Loop driven the other way round (clockwise): the same points in reverse order, same start line
    points: [
      [560, 640], [400, 640], [260, 640], [175, 612], [148, 546], [170, 482], [240, 452], [380, 452],
      [560, 457], [760, 452], [829, 424], [857, 355], [829, 286], [760, 258], [640, 256], [450, 254],
      [330, 252], [295, 243], [269, 217], [260, 182], [269, 147], [295, 121], [330, 112],
      [440, 111], [600, 110], [800, 110], [980, 110], [1090, 128], [1160, 200], [1185, 300],
      [1190, 430], [1170, 540], [1100, 610], [980, 636], [800, 640],
    ],
  },
  {
    id: 'zigzag',
    name: 'Zigzag',
    width: 90,
    // many quick left-right turns, no hairpin
    points: [
      [520, 642], [650, 597], [780, 642], [910, 597], [1040, 632], [1140, 592], [1185, 500], [1180, 380],
      [1150, 250], [1080, 150], [950, 125], [820, 180], [690, 125], [560, 180], [430, 125], [310, 165],
      [205, 225], [160, 330], [165, 450], [190, 552], [260, 622], [390, 597],
    ],
  },
  {
    id: 'wide-sweepers',
    name: 'Wide Sweepers',
    width: 90,
    // long fast curves, one tight corner at the end
    points: [
      [560, 640], [800, 638], [1000, 615], [1140, 545], [1195, 420], [1170, 280], [1080, 170], [930, 115],
      [760, 140], [600, 175], [440, 145], [310, 120], [210, 165], [165, 270], [180, 390], [215, 480],
      [222, 552], [245, 610], [300, 638], [420, 640],
    ],
  },
  {
    id: 'exam',
    name: 'Exam',
    width: 90,
    // held out: a mix of everything, including a hairpin that turns right (Neon Loop's turns left)
    points: [
      [700, 640], [500, 640], [300, 640], [200, 615], [160, 540], [150, 420], [170, 300], [215, 190],
      [300, 125], [440, 112], [600, 112], [720, 113], [769, 133], [790, 183], [769, 233], [720, 253],
      [560, 255], [450, 262], [385, 300], [372, 365], [405, 425], [500, 450], [700, 452], [880, 445],
      [970, 405], [1000, 320], [1005, 230], [1040, 150], [1110, 118], [1170, 160], [1188, 280], [1185, 420],
      [1170, 540], [1110, 615], [950, 640], [820, 640],
    ],
  },
];

// The track with this id (TRACKS[0], Neon Loop, if there is none).
export function trackDef(id) {
  return TRACKS.find((t) => t.id === id) ?? TRACKS[0];
}

const SAMPLE_SPACING = 8;      // px between centerline samples
const CHECKPOINT_EVERY = 6;    // one checkpoint every 6 samples = every 48 px
const SPAWN_BEHIND_LINE = 30;  // px: the car's center starts this far behind the start line (its nose stays behind it)

// Turns track data into walls, checkpoints and a start position.
export function buildTrack(def) {
  const dense = smoothLoop(def.points.map(([x, y]) => ({ x, y })), 24);
  const center = resampleLoop(dense, SAMPLE_SPACING);
  const n = center.length;
  const half = def.width / 2;

  const tangents = [], left = [], right = [];
  for (let i = 0; i < n; i++) {
    const prev = center[(i - 1 + n) % n], next = center[(i + 1) % n];
    let tx = next.x - prev.x, ty = next.y - prev.y;
    const len = Math.hypot(tx, ty);
    tx /= len; ty /= len;
    tangents.push({ x: tx, y: ty });
    // With y pointing down, (-ty, tx) points to the driver's right
    right.push({ x: center[i].x - ty * half, y: center[i].y + tx * half });
    left.push({ x: center[i].x + ty * half, y: center[i].y - tx * half });
  }

  // A loop driven clockwise on screen turns right all the time, so its right wall is the inner one
  const clockwise = signedArea(center) > 0;
  const inner = clockwise ? right : left;
  const outer = clockwise ? left : right;

  const walls = [...loopSegments(inner), ...loopSegments(outer)];

  // Checkpoints: invisible lines across the track, in driving order.
  // Checkpoint 0 is the start/finish line.
  const checkpoints = [];
  let dist = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0) dist += Math.hypot(center[i].x - center[i - 1].x, center[i].y - center[i - 1].y);
    if (i % CHECKPOINT_EVERY !== 0) continue;
    checkpoints.push({
      ax: left[i].x, ay: left[i].y, bx: right[i].x, by: right[i].y,
      tx: tangents[i].x, ty: tangents[i].y,
      dist,
    });
  }
  const length = dist + Math.hypot(center[0].x - center[n - 1].x, center[0].y - center[n - 1].y);

  const t0 = tangents[0];
  const spawn = {
    x: center[0].x - t0.x * SPAWN_BEHIND_LINE,
    y: center[0].y - t0.y * SPAWN_BEHIND_LINE,
    angle: fm.atan2(t0.y, t0.x),
  };

  return {
    id: def.id, name: def.name, width: def.width,
    key: trackKey(def),
    center, tangents, inner, outer, walls, checkpoints, length, spawn,
  };
}

// A short fingerprint of the track data, so saved laps from a different layout aren't mixed up.
export function trackKey(def) {
  const text = def.width + ':' + def.points.map((p) => p.join(',')).join(';');
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return def.id + '-' + (h >>> 0).toString(36);
}

// Smooth closed curve through the points (centripetal Catmull-Rom, which never loops or overshoots).
function smoothLoop(pts, perSegment) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const t1 = Math.sqrt(Math.hypot(p1.x - p0.x, p1.y - p0.y));
    const t2 = t1 + Math.sqrt(Math.hypot(p2.x - p1.x, p2.y - p1.y));
    const t3 = t2 + Math.sqrt(Math.hypot(p3.x - p2.x, p3.y - p2.y));
    for (let k = 0; k < perSegment; k++) {
      const t = t1 + (t2 - t1) * (k / perSegment);
      const a1 = lerpAt(p0, p1, 0, t1, t), a2 = lerpAt(p1, p2, t1, t2, t), a3 = lerpAt(p2, p3, t2, t3, t);
      const b1 = lerpAt(a1, a2, 0, t2, t), b2 = lerpAt(a2, a3, t1, t3, t);
      out.push(lerpAt(b1, b2, t1, t2, t));
    }
  }
  return out;
}

function lerpAt(a, b, ta, tb, t) {
  const f = (t - ta) / (tb - ta);
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

// Walks along the closed curve and drops a point every `spacing` px.
function resampleLoop(pts, spacing) {
  const out = [{ x: pts[0].x, y: pts[0].y }];
  let carry = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    let d = spacing - carry;
    while (d <= seg) {
      const f = d / seg;
      out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
      d += spacing;
    }
    carry = seg - (d - spacing);
  }
  // Drop a last point that landed on top of the first one
  const last = out[out.length - 1];
  if (Math.hypot(last.x - out[0].x, last.y - out[0].y) < spacing / 2) out.pop();
  return out;
}

function loopSegments(pts) {
  return pts.map((a, i) => {
    const b = pts[(i + 1) % pts.length];
    return { ax: a.x, ay: a.y, bx: b.x, by: b.y };
  });
}
