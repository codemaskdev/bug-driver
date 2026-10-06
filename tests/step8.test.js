// Step 8 checks: the track check (editor and share links), share links in both directions,
// and the Exam rule: Exam can't be edited, shared, or driven by any AI car.
// No test here runs a brain on Exam.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, buildTrack, trackDef } from '../src/sim/track.js';
import { checkTrack, TIGHTEST_TURN } from '../src/sim/track-check.js';
import { encodeTrack, decodeTrack, LETTERS } from '../src/sim/share-link.js';
import { isHeldOut } from '../src/sim/held-out.js';
import { createGeneration } from '../src/sim/generation.js';
import { makeRng } from '../src/sim/rng.js';

const custom = (points) => ({ id: 'custom', name: 'test', width: 90, points });
const kinds = (def) => checkTrack(def).problems.map((p) => p.kind);
// a plain oval, well inside the screen
const oval = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * 2 * Math.PI;
  return [Math.round(640 + 420 * Math.cos(a)), Math.round(360 + 220 * Math.sin(a))];
});

test('every built-in track passes the track check, except Exam, which is held out', () => {
  for (const def of TRACKS) {
    const check = checkTrack(def);
    if (def.id === 'exam') {
      assert.deepEqual(check.problems.map((p) => p.kind), ['held-out']);
    } else {
      assert.equal(check.ok, true, `${def.id}: ${check.problems.map((p) => p.message).join(' ')}`);
    }
  }
  assert.equal(checkTrack(custom(oval)).ok, true);
});

test('the track check catches each problem with a plain message', () => {
  assert.deepEqual(kinds(custom(oval.slice(0, 3))), ['few-points']);
  // a figure eight: the road crosses itself in the middle
  const eight = [[340, 200], [640, 360], [940, 520], [1100, 360], [940, 200], [640, 360], [340, 520], [180, 360]]
    .map(([x, y], i) => (i === 5 ? [x + 20, y] : [x, y]));
  assert.ok(kinds(custom(eight)).includes('crosses'));
  // a sharp corner made of three clicks
  assert.ok(kinds(custom([[300, 200], [900, 200], [320, 230], [300, 500]])).includes('too-tight'));
  // too close to the edge of the screen
  assert.ok(kinds(custom(oval.map(([x, y]) => [x, y + 120]))).includes('off-screen'));
  assert.deepEqual(kinds(custom([[100, 100], [105, 100], [600, 600], [100, 600]])), ['same-spot']);
  assert.deepEqual(kinds(custom([[100, 100], [900, -5], [600, 600], [100, 600]])), ['off-screen']);
  for (const p of checkTrack(custom(eight)).problems) assert.ok(p.message.length > 10 && Number.isFinite(p.x) && Number.isFinite(p.y));
  assert.equal(TIGHTEST_TURN, 45);
});

test('a share link opens exactly the same track', () => {
  for (const def of TRACKS.filter((t) => t.id !== 'exam')) {
    const link = encodeTrack(def.points);
    assert.match(link, /^[A-Za-z0-9_-]+$/); // URL-safe as it is
    assert.equal(link.length, 1 + 4 * def.points.length);
    const back = decodeTrack(link);
    assert.ok(back.track, back.error);
    assert.deepEqual(back.track.points, def.points);
    const a = buildTrack(def), b = buildTrack(back.track);
    assert.deepEqual(b.walls, a.walls);
    assert.deepEqual(b.checkpoints, a.checkpoints);
    assert.deepEqual(b.spawn, a.spawn);
  }
});

test('a broken link gets a friendly message, never a crash', () => {
  const good = encodeTrack(oval);
  for (const bad of [undefined, null, 42, '', 'x', '2' + good.slice(1), good.slice(0, -1), good + 'A', good.slice(0, 9),
    good.replace(/.$/, '*'), '1' + 'A'.repeat(4 * 61), '1____'.repeat(1)]) {
    const r = decodeTrack(bad);
    assert.equal(r.track, undefined);
    assert.equal(typeof r.error, 'string');
  }
  // 2000 random strings of letters: each one is either a track that passes the check, or an error
  const rand = makeRng(8);
  for (let k = 0; k < 2000; k++) {
    const len = 1 + Math.floor(rand() * 60);
    let s = rand() < 0.9 ? '1' : '';
    for (let i = 0; i < len; i++) s += LETTERS[Math.floor(rand() * 64)];
    const r = decodeTrack(s);
    if (r.track) assert.equal(checkTrack(r.track).ok, true);
    else assert.equal(typeof r.error, 'string');
  }
});

test('Exam never goes in a link, never opens from one, and no AI car can be put on it', () => {
  const exam = trackDef('exam');
  assert.throws(() => encodeTrack(exam.points), /held out/);
  assert.throws(() => encodeTrack([...exam.points].reverse()), /held out/);
  // a link written by hand from Exam's points (not through encodeTrack) is refused when it's opened
  const twoLetters = (n) => LETTERS[Math.floor(n / 64)] + LETTERS[n % 64];
  const handMade = '1' + exam.points.map(([x, y]) => twoLetters(x) + twoLetters(y)).join('');
  assert.match(decodeTrack(handMade).error, /Exam/);
  assert.equal(isHeldOut(custom([...exam.points.slice(5), ...exam.points.slice(0, 5)])), true);
  // no brains at all: it's refused before any car exists
  assert.throws(() => createGeneration(buildTrack(exam), []), /held out/);
});
