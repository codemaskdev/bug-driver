// The simulation's own sin, cos, tanh, exp, log and atan2: the same on every JavaScript engine, bit for bit.
//
// Math.sin, Math.log and the rest are allowed to differ in the last bit from one engine to the next, and they do:
// Node 18 (V8 10.2) and Node 20+ (V8 11.3+) give different last bits for some inputs. That's too small to change
// a lap time, but the simulation is meant to be exactly repeatable, so it doesn't use them. These are ports of the
// fdlibm algorithms (Sun Microsystems, 1993, freely distributable), which V8 itself used up to V8 10.x: they give
// the very results the official runs were made with, now on any Node version and in any browser.
// Plain + - * / on doubles is exact IEEE 754 everywhere; Math.sqrt, Math.hypot, Math.abs, Math.floor are exact too.
//
// Copyright (C) 1993 by Sun Microsystems, Inc. All rights reserved.
// Developed at SunPro, a Sun Microsystems, Inc. business.
// Permission to use, copy, modify, and distribute this software is freely granted, provided that this notice
// is preserved.

const view = new DataView(new ArrayBuffer(8));
const high = (x) => { view.setFloat64(0, x); return view.getInt32(0); };
const low = (x) => { view.setFloat64(0, x); return view.getUint32(4); };
const words = (hi, lo) => { view.setInt32(0, hi); view.setUint32(4, lo >>> 0); return view.getFloat64(0); };
const withHigh = (x, hi) => { view.setFloat64(0, x); view.setInt32(0, hi); return view.getFloat64(0); };

// ---------- log ----------
const ln2_hi = 6.93147180369123816490e-01, ln2_lo = 1.90821492927058770002e-10, two54 = 1.80143985094819840000e+16;
const Lg1 = 6.666666666666735130e-01, Lg2 = 3.999999999940941908e-01, Lg3 = 2.857142874366239149e-01, Lg4 = 2.222219843214978396e-01,
  Lg5 = 1.818357216161805012e-01, Lg6 = 1.531383769920937332e-01, Lg7 = 1.479819860511658591e-01;

export function log(x) {
  let hx = high(x);
  const lx = low(x);
  let k = 0;
  if (hx < 0x00100000) {
    if (((hx & 0x7fffffff) | lx) === 0) return -Infinity;
    if (hx < 0) return NaN;
    k -= 54; x *= two54; hx = high(x);
  }
  if (hx >= 0x7ff00000) return x + x;
  k += (hx >> 20) - 1023;
  hx &= 0x000fffff;
  let i = (hx + 0x95f64) & 0x100000;
  x = withHigh(x, hx | (i ^ 0x3ff00000));
  k += i >> 20;
  const f = x - 1.0;
  if ((0x000fffff & (2 + hx)) < 3) {
    if (f === 0) { if (k === 0) return 0; const dk = k; return dk * ln2_hi + dk * ln2_lo; }
    const R = f * f * (0.5 - 0.33333333333333333 * f);
    if (k === 0) return f - R;
    const dk = k;
    return dk * ln2_hi - ((R - dk * ln2_lo) - f);
  }
  const s = f / (2.0 + f), dk = k, z = s * s;
  i = hx - 0x6147a;
  const w = z * z, j = 0x6b851 - hx;
  const t1 = w * (Lg2 + w * (Lg4 + w * Lg6)), t2 = z * (Lg1 + w * (Lg3 + w * (Lg5 + w * Lg7)));
  i |= j;
  const R = t2 + t1;
  if (i > 0) {
    const hfsq = 0.5 * f * f;
    if (k === 0) return f - (hfsq - s * (hfsq + R));
    return dk * ln2_hi - ((hfsq - (s * (hfsq + R) + dk * ln2_lo)) - f);
  }
  if (k === 0) return f - s * (f - R);
  return dk * ln2_hi - ((s * (f - R) - dk * ln2_lo) - f);
}

// ---------- exp ----------
const halF = [0.5, -0.5], o_threshold = 7.09782712893383973096e+02, u_threshold = -7.45133219101941108420e+02,
  ln2HI = [6.93147180369123816490e-01, -6.93147180369123816490e-01], ln2LO = [1.90821492927058770002e-10, -1.90821492927058770002e-10],
  invln2 = 1.44269504088896338700e+00, twom1000 = 9.33263618503218878990e-302,
  P1 = 1.66666666666666019037e-01, P2 = -2.77777777770155933842e-03, P3 = 6.61375632143793436117e-05,
  P4 = -1.65339022054652515390e-06, P5 = 4.13813679705723846039e-08;

export function exp(x) {
  if (x === 1) return Math.E;   // as V8 does: exp(1) is exactly e
  let hx = high(x);
  const xsb = (hx >>> 31) & 1;
  hx &= 0x7fffffff;
  let hi = 0, lo = 0, k = 0;
  if (hx >= 0x40862e42) {
    if (hx >= 0x7ff00000) {
      if (((hx & 0xfffff) | low(x)) !== 0) return x + x;
      return xsb === 0 ? x : 0.0;
    }
    if (x > o_threshold) return Infinity;
    if (x < u_threshold) return 0;
  }
  if (hx > 0x3fd62e42) {
    if (hx < 0x3ff0a2b2) { hi = x - ln2HI[xsb]; lo = ln2LO[xsb]; k = 1 - xsb - xsb; }
    else { k = (invln2 * x + halF[xsb]) | 0; const t = k; hi = x - t * ln2HI[0]; lo = t * ln2LO[0]; }
    x = hi - lo;
  } else if (hx < 0x3e300000) {
    return 1 + x;
  } else k = 0;
  const t = x * x;
  const c = x - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))));
  if (k === 0) return 1 - ((x * c) / (c - 2.0) - x);
  const y = 1 - ((lo - (x * c) / (2.0 - c)) - hi);
  if (k >= -1021) return withHigh(y, high(y) + (k << 20));
  return withHigh(y, high(y) + ((k + 1000) << 20)) * twom1000;
}

// ---------- expm1, tanh ----------
const Q1 = -3.33333333333331316428e-02, Q2 = 1.58730158725481460165e-03, Q3 = -7.93650757867487942473e-05,
  Q4 = 4.00821782732936239552e-06, Q5 = -2.01099218183624371326e-07;

export function expm1(x) {
  let hx = high(x);
  const xsb = hx & 0x80000000;
  hx &= 0x7fffffff;
  let hi, lo, k, c = 0;
  if (hx >= 0x4043687a) {
    if (hx >= 0x40862e42) {
      if (hx >= 0x7ff00000) {
        if (((hx & 0xfffff) | low(x)) !== 0) return x + x;
        return xsb === 0 ? x : -1.0;
      }
      if (x > o_threshold) return Infinity;
    }
    if (xsb !== 0) return -1.0;
  }
  if (hx > 0x3fd62e42) {
    if (hx < 0x3ff0a2b2) {
      if (xsb === 0) { hi = x - ln2_hi; lo = ln2_lo; k = 1; }
      else { hi = x + ln2_hi; lo = -ln2_lo; k = -1; }
    } else {
      k = (invln2 * x + (xsb === 0 ? 0.5 : -0.5)) | 0;
      const t = k;
      hi = x - t * ln2_hi;
      lo = t * ln2_lo;
    }
    x = hi - lo;
    c = (hi - x) - lo;
  } else if (hx < 0x3c900000) {
    return x;
  } else k = 0;
  const hfx = 0.5 * x, hxs = x * hfx;
  const r1 = 1 + hxs * (Q1 + hxs * (Q2 + hxs * (Q3 + hxs * (Q4 + hxs * Q5))));
  let t = 3.0 - r1 * hfx;
  let e = hxs * ((r1 - t) / (6.0 - x * t));
  if (k === 0) return x - (x * e - hxs);
  e = x * (e - c) - c;
  e -= hxs;
  if (k === -1) return 0.5 * (x - e) - 0.5;
  if (k === 1) {
    if (x < -0.25) return -2.0 * (e - (x + 0.5));
    return 1 + 2.0 * (x - e);
  }
  let y;
  if (k <= -2 || k > 56) {
    y = 1 - (e - x);
    y = withHigh(y, high(y) + (k << 20));
    return y - 1;
  }
  if (k < 20) {
    t = words(0x3ff00000 - (0x200000 >> k), 0);
    y = t - (e - x);
    y = withHigh(y, high(y) + (k << 20));
  } else {
    t = words((0x3ff - k) << 20, 0);
    y = x - (e + t);
    y += 1;
    y = withHigh(y, high(y) + (k << 20));
  }
  return y;
}

export function tanh(x) {
  const jx = high(x), ix = jx & 0x7fffffff;
  if (ix >= 0x7ff00000) return jx >= 0 ? 1 / x + 1 : 1 / x - 1;
  let z;
  if (ix < 0x40360000) {
    if (ix < 0x3e300000) return x;   // |x| < 2^-28: tanh(x) is x (V8's threshold)
    if (ix >= 0x3ff00000) {
      const t = expm1(2 * Math.abs(x));
      z = 1 - 2 / (t + 2);
    } else {
      const t = expm1(-2 * Math.abs(x));
      z = -t / (t + 2);
    }
  } else z = 1;
  return jx >= 0 ? z : -z;
}

// ---------- sin, cos ----------
const S1 = -1.66666666666666324348e-01, S2 = 8.33333333332248946124e-03, S3 = -1.98412698298579493134e-04,
  S4 = 2.75573137070700676789e-06, S5 = -2.50507602534068634195e-08, S6 = 1.58969099521155010221e-10;
const C1 = 4.16666666666666019037e-02, C2 = -1.38888888888741095749e-03, C3 = 2.48015872894767294178e-05,
  C4 = -2.75573143513906633035e-07, C5 = 2.08757232129817482790e-09, C6 = -1.13596475577881948265e-11;

function kernelSin(x, y, iy) {
  const ix = high(x) & 0x7fffffff;
  if (ix < 0x3e400000) { if ((x | 0) === 0) return x; }
  const z = x * x, v = z * x, r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)));
  if (iy === 0) return x + v * (S1 + z * r);
  return x - ((z * (0.5 * y - v * r) - y) - v * S1);
}

function kernelCos(x, y) {
  const ix = high(x) & 0x7fffffff;
  if (ix < 0x3e400000) { if ((x | 0) === 0) return 1; }
  const z = x * x, r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
  if (ix < 0x3fd33333) return 1 - (0.5 * z - (z * r - x * y));
  const qx = ix > 0x3fe90000 ? 0.28125 : words(ix - 0x00200000, 0);
  const hz = 0.5 * z - qx, a = 1 - qx;
  return a - (hz - (z * r - x * y));
}

const npio2_hw = [0x3ff921fb, 0x400921fb, 0x4012d97c, 0x401921fb, 0x401f6a7a, 0x4022d97c, 0x4025fdbb, 0x402921fb, 0x402c463a,
  0x402f6a7a, 0x4031475c, 0x4032d97c, 0x40346b9c, 0x4035fdbb, 0x40378fdb, 0x403921fb, 0x403ab41b, 0x403c463a, 0x403dd85a,
  0x403f6a7a, 0x40407e4c, 0x4041475c, 0x4042106c, 0x4042d97c, 0x4043a28c, 0x40446b9c, 0x404534ac, 0x4045fdbb, 0x4046c6cb,
  0x40478fdb, 0x404858eb, 0x404921fb];
const invpio2 = 6.36619772367581382433e-01, pio2_1 = 1.57079632673412561417e+00, pio2_1t = 6.07710050650619224932e-11,
  pio2_2 = 6.07710050630396597660e-11, pio2_2t = 2.02226624879595063154e-21, pio2_3 = 2.02226624871116645580e-21,
  pio2_3t = 8.47842766036889956997e-32;

// x = n·π/2 + (y0 + y1), |y0 + y1| ≤ π/4; returns [n, y0, y1]. Arguments up to 2^19·π/2 (an angle of 823 550 rad):
// the simulation's angles stay far below that, so the very large case (fdlibm's __kernel_rem_pio2) isn't ported.
function remPio2(x) {
  const hx = high(x), ix = hx & 0x7fffffff;
  if (ix <= 0x3fe921fb) return [0, x, 0];
  if (ix < 0x4002d97c) {
    if (hx > 0) {
      let z = x - pio2_1;
      if (ix !== 0x3ff921fb) { const y0 = z - pio2_1t; return [1, y0, (z - y0) - pio2_1t]; }
      z -= pio2_2;
      const y0 = z - pio2_2t;
      return [1, y0, (z - y0) - pio2_2t];
    }
    let z = x + pio2_1;
    if (ix !== 0x3ff921fb) { const y0 = z + pio2_1t; return [-1, y0, (z - y0) + pio2_1t]; }
    z += pio2_2;
    const y0 = z + pio2_2t;
    return [-1, y0, (z - y0) + pio2_2t];
  }
  if (ix <= 0x413921fb) {
    let t = Math.abs(x);
    const n = (t * invpio2 + 0.5) | 0, fn = n;
    let r = t - fn * pio2_1, w = fn * pio2_1t, y0;
    if (n < 32 && ix !== npio2_hw[n - 1]) {
      y0 = r - w;
    } else {
      const j = ix >> 20;
      y0 = r - w;
      let i = j - ((high(y0) >> 20) & 0x7ff);
      if (i > 16) {
        t = r; w = fn * pio2_2; r = t - w; w = fn * pio2_2t - ((t - r) - w); y0 = r - w;
        i = j - ((high(y0) >> 20) & 0x7ff);
        if (i > 49) { t = r; w = fn * pio2_3; r = t - w; w = fn * pio2_3t - ((t - r) - w); y0 = r - w; }
      }
    }
    const y1 = (r - y0) - w;
    return hx < 0 ? [-n, -y0, -y1] : [n, y0, y1];
  }
  throw new Error(`fmath: angle ${x} is too large for the simulation's sin/cos`);
}

export function sin(x) {
  const ix = high(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) return kernelSin(x, 0, 0);
  if (ix >= 0x7ff00000) return x - x;
  const [n, y0, y1] = remPio2(x);
  switch (n & 3) {
    case 0: return kernelSin(y0, y1, 1);
    case 1: return kernelCos(y0, y1);
    case 2: return -kernelSin(y0, y1, 1);
    default: return -kernelCos(y0, y1);
  }
}

export function cos(x) {
  const ix = high(x) & 0x7fffffff;
  if (ix <= 0x3fe921fb) return kernelCos(x, 0);
  if (ix >= 0x7ff00000) return x - x;
  const [n, y0, y1] = remPio2(x);
  switch (n & 3) {
    case 0: return kernelCos(y0, y1);
    case 1: return -kernelSin(y0, y1, 1);
    case 2: return -kernelCos(y0, y1);
    default: return kernelSin(y0, y1, 1);
  }
}

// ---------- atan, atan2 ----------
const atanhi = [4.63647609000806093515e-01, 7.85398163397448278999e-01, 9.82793723247329054082e-01, 1.57079632679489655800e+00];
const atanlo = [2.26987774529616870924e-17, 3.06161699786838301793e-17, 1.39033110312309984516e-17, 6.12323399573676603587e-17];
const aT = [3.33333333333329318027e-01, -1.99999999998764832476e-01, 1.42857142725034663711e-01, -1.11111104054623557880e-01,
  9.09088713343650656196e-02, -7.69187620504482999495e-02, 6.66107313738753120669e-02, -5.83357013379057348645e-02,
  4.97687799461593236017e-02, -3.65315727442169155270e-02, 1.62858201153657823623e-02];

export function atan(x) {
  const hx = high(x), ix = hx & 0x7fffffff;
  let id;
  if (ix >= 0x44100000) {
    if (ix > 0x7ff00000 || (ix === 0x7ff00000 && low(x) !== 0)) return x + x;
    return hx > 0 ? atanhi[3] + atanlo[3] : -atanhi[3] - atanlo[3];
  }
  if (ix < 0x3fdc0000) {
    if (ix < 0x3e200000) return x;
    id = -1;
  } else {
    x = Math.abs(x);
    if (ix < 0x3ff30000) {
      if (ix < 0x3fe60000) { id = 0; x = (2.0 * x - 1) / (2.0 + x); }
      else { id = 1; x = (x - 1) / (x + 1); }
    } else if (ix < 0x40038000) { id = 2; x = (x - 1.5) / (1 + 1.5 * x); }
    else { id = 3; x = -1.0 / x; }
  }
  const z = x * x, w = z * z;
  const s1 = z * (aT[0] + w * (aT[2] + w * (aT[4] + w * (aT[6] + w * (aT[8] + w * aT[10])))));
  const s2 = w * (aT[1] + w * (aT[3] + w * (aT[5] + w * (aT[7] + w * aT[9]))));
  if (id < 0) return x - x * (s1 + s2);
  const r = atanhi[id] - ((x * (s1 + s2) - atanlo[id]) - x);
  return hx < 0 ? -r : r;
}

const pi_o_4 = 7.8539816339744827900e-01, pi_o_2 = 1.5707963267948965580e+00, pi = 3.1415926535897931160e+00, pi_lo = 1.2246467991473531772e-16;

export function atan2(y, x) {
  if (Number.isNaN(x) || Number.isNaN(y)) return x + y;
  const hx = high(x), lx = low(x), ix = hx & 0x7fffffff, hy = high(y), ly = low(y), iy = hy & 0x7fffffff;
  if (hx === 0x3ff00000 && lx === 0) return atan(y);
  let m = ((hy >>> 31) & 1) | ((hx >>> 30) & 2);
  if ((iy | ly) === 0) {
    if (m === 0 || m === 1) return y;
    return m === 2 ? pi : -pi;
  }
  if ((ix | lx) === 0) return hy < 0 ? -pi_o_2 : pi_o_2;
  if (ix === 0x7ff00000) {
    if (iy === 0x7ff00000) return [pi_o_4, -pi_o_4, 3.0 * pi_o_4, -3.0 * pi_o_4][m];
    return [0, -0, pi, -pi][m];
  }
  if (iy === 0x7ff00000) return hy < 0 ? -pi_o_2 : pi_o_2;
  const k = (iy - ix) >> 20;
  let z;
  if (k > 60) { z = pi_o_2 + 0.5 * pi_lo; m &= 1; }
  else if (hx < 0 && k < -60) z = 0.0;
  else z = atan(Math.abs(y / x));
  switch (m) {
    case 0: return z;
    case 1: return -z;
    case 2: return pi - (z - pi_lo);
    default: return (z - pi_lo) - pi;
  }
}
