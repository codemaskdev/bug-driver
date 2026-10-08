// The simulation's own math (src/sim/fmath.js): the exact results Node 18's Math.* gave (V8 10.2, the engine the
// official runs were made with), bit for bit, on whatever engine runs this test. And the simulation uses only it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import * as fm from '../src/sim/fmath.js';

// value -> its 64 bits as hex: recorded with Math.sin, Math.cos, … under Node 18.18
const GOLDEN = {"sin":[[0.5,"3fdeaee8744b05f0"],[2,"3fed18f6ead1b446"],[-3.7,"3fe0f46aec2e1b41"],[100.25,"bfd1bf00980dc35c"],[1e-9,"3e112e0be826d695"],[7853.981,"bf44c629beb837b3"]],"cos":[[0.3,"3fee921dd42f09ba"],[0.8831520080566406,"3fe44f9d65eca8ed"],[-2.5,"bfe9a2f7ef858b7d"],[50,"3feee1006fc3fcfa"],[1e-9,"3ff0000000000000"]],"exp":[[-0.31768470420502126,"3fe74a66d39e289a"],[1,"4005bf0a8b145769"],[0.25,"3ff48b5e3c3e8186"],[-20,"3e21b48655f37267"],[3.5,"40408ec721396bdb"]],"log":[[7.794991922564804e-21,"c0472680cb4fb301"],[0.5,"bfe62e42fefa39ef"],[1.0000001,"3e7ad7f2847b6492"],[123.456,"401343774f3e2362"],[2,"3fe62e42fefa39ef"]],"tanh":[[4.601717554032803e-10,"3dff9f6d589dfbd5"],[0.3,"3fd2a4dda7d914fa"],[-1.7,"bfedeedf00d3e7f5"],[5,"3fefff419668df11"],[25,"3ff0000000000000"]],"atan2":[[[-231.0640588402748,648.1691258959472],"bfd5ea93993ffda6"],[[1,-1],"4002d97c7f3321d2"],[[-0.5,0.25],"bff1b6e192ebbe44"],[[3,4],"3fe4978fa3269ee1"]]};
const bits = (x) => { const f = new Float64Array([x]), u = new Uint32Array(f.buffer); return u[1].toString(16).padStart(8, '0') + u[0].toString(16).padStart(8, '0'); };

test('sin, cos, exp, log, tanh, atan2: the exact bits of the engine the official runs used', () => {
  for (const [name, cases] of Object.entries(GOLDEN))
    for (const [x, want] of cases) assert.equal(bits(Array.isArray(x) ? fm[name](...x) : fm[name](x)), want, `${name}(${x})`);
});

test('the simulation calls none of the Math functions that differ between engines', () => {
  const dir = new URL('../src/sim/', import.meta.url);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.js') && x !== 'fmath.js')) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    const m = src.match(/\bMath\.(sin|cos|tan|exp|expm1|log|log1p|log2|log10|tanh|sinh|cosh|atan|atan2|asin|acos|pow|cbrt)\(/);
    assert.equal(m, null, `src/sim/${f} uses ${m?.[0]}`);
  }
});
