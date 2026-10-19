import assert from 'node:assert/strict';
import test from 'node:test';
import { createRingShape } from '../../src/views/dashboard/ring-shape.js';

function close(actual, expected) { assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} differs from ${expected}`); }
function edgeDistance(point, angle, direction) {
  return direction * (-(point[0] - 100) * Math.sin(angle) + (point[1] - 100) * Math.cos(angle));
}

test('lifted ring sectors leave equal parallel clearances to both neighbors', () => {
  for (const start of [0, .13, .5, .91]) {
    for (const share of [.06, .125, .25, .5, .8]) {
      const shape = createRingShape(start, share, 1);
      close(shape.lift, 7.36);
      close(shape.outerRadius - 96, shape.gap);
      close(shape.innerRadius - 68, shape.gap);
      close(shape.outerRadius - shape.innerRadius, 28);
      for (const point of [shape.outerStart, shape.innerStart]) close(edgeDistance(point, start * 2 * Math.PI, 1), shape.lift);
      for (const point of [shape.outerEnd, shape.innerEnd]) close(edgeDistance(point, (start + share) * 2 * Math.PI, -1), shape.lift);
    }
  }
});

test('ring shape animation keeps the band thickness and clearance consistent throughout the lift', () => {
  for (const progress of [0, .1, .25, .5, .9, 1]) {
    const shape = createRingShape(.2, .125, progress);
    close(shape.lift, 7.36 * progress);
    close(shape.gap, shape.lift);
    close(shape.outerRadius - shape.innerRadius, 28);
    close(edgeDistance(shape.outerStart, .2 * 2 * Math.PI, 1), shape.gap);
    close(edgeDistance(shape.innerEnd, .325 * 2 * Math.PI, -1), shape.gap);
    assert.ok(!shape.path.includes('NaN'));
  }
});

test('pinned ring sectors thicken modestly without increasing the hover gap or outer radius', () => {
  for (const start of [0, .13, .5, .91]) {
    for (const share of [.08, .125, .25, .5, .8]) {
      const preview = createRingShape(start, share, 1);
      const pinned = createRingShape(start, share, 1, 1);
      close(pinned.outerRadius, preview.outerRadius);
      close(pinned.gap, preview.gap);
      close(pinned.outerRadius - pinned.innerRadius, 34);
      close(pinned.outerRadius - 96, pinned.gap);
      for (const point of [pinned.outerStart, pinned.innerStart]) close(edgeDistance(point, start * 2 * Math.PI, 1), pinned.gap);
      for (const point of [pinned.outerEnd, pinned.innerEnd]) close(edgeDistance(point, (start + share) * 2 * Math.PI, -1), pinned.gap);
    }
  }
});

test('pin transitions enlarge the band continuously from both a preview and an idle ring', () => {
  for (const progress of [0, .1, .25, .5, .9, 1]) {
    for (const active of [progress, 1]) {
      const shape = createRingShape(.2, .125, active, progress);
      close(shape.outerRadius - shape.innerRadius, 28 + 6 * progress);
      close(shape.lift, 7.36 * active);
      close(shape.gap, shape.lift);
      close(edgeDistance(shape.innerEnd, .325 * 2 * Math.PI, -1), shape.gap);
    }
  }
});

test('tiny ring sectors retain a visible shape with matched lift and side clearances', () => {
  for (const share of [.000001, .0001, .005, .01, .025]) {
    for (const pinned of [0, .5, 1]) {
      const shape = createRingShape(.3, share, 1, pinned);
      assert.ok(shape.lift > 0 && shape.lift <= 7.36);
      close(shape.gap, shape.lift);
      close(shape.gap, createRingShape(.3, share, 1).gap);
      close(shape.outerRadius - shape.innerRadius, 28 + 6 * pinned);
      assert.ok(2 * Math.asin(shape.gap / shape.innerRadius) < share * 2 * Math.PI);
      assert.ok(Math.hypot(shape.outerEnd[0] - shape.outerStart[0], shape.outerEnd[1] - shape.outerStart[1]) > 0);
      assert.ok(Math.hypot(shape.innerEnd[0] - shape.innerStart[0], shape.innerEnd[1] - shape.innerStart[1]) > 0);
      assert.ok(shape.innerRadius > 0);
      assert.ok(!shape.path.includes('NaN'));
    }
  }
});

test('a single full-ring sector stays closed while lifting without a seam', () => {
  for (const pinned of [0, 1]) {
    const shape = createRingShape(0, 1, 1, pinned);
    close(shape.lift, 7.36); close(shape.gap, 0);
    close(shape.outerRadius - shape.innerRadius, 28 + 6 * pinned);
    close(shape.outerStart[0], shape.outerEnd[0]); close(shape.outerStart[1], shape.outerEnd[1]);
    assert.equal((shape.path.match(/A /g) ?? []).length, 4);
    assert.ok(shape.path.endsWith(' Z'));
  }
});
