import assert from 'node:assert/strict';
import test from 'node:test';
import { cardColumns, packCards } from '../../src/views/dashboard/card-packing.js';

test('card packing preserves saved-order ties and fills the shortest column', () => {
  assert.deepEqual(packCards([200, 100, 150, 60].map(height => ({ height })), { width: 640, columns: 2, gap: 20 }), {
    positions: [{ left: 0, top: 0 }, { left: 330, top: 0 }, { left: 330, top: 120 }, { left: 0, top: 220 }], height: 280
  });
});

test('full-width messages clear all columns, including in an empty board', () => {
  const { positions, height } = packCards([{ height: 90 }, { height: 120 }, { height: 40, fullWidth: true }, { height: 30 }],
    { width: 640, columns: 2, gap: 20 });
  assert.deepEqual(positions, [{ left: 0, top: 0 }, { left: 330, top: 0 }, { left: 0, top: 140 }, { left: 0, top: 200 }]);
  assert.equal(height, 230);
  assert.equal(packCards([], { width: 640, columns: 2, gap: 20 }).height, 0);
});

test('responsive packing respects available width and fractional card heights', () => {
  assert.equal(cardColumns(299, 18, 3), 1);
  assert.equal(cardColumns(617, 18, 3), 1);
  assert.equal(cardColumns(618, 18, 3), 2);
  assert.equal(cardColumns(2000, 18, 3), 3);
  assert.equal(cardColumns(2000, 18, 1), 1);
  assert.deepEqual(packCards([{ height: 10.5 }, { height: 20.25 }], { width: 299, columns: 1, gap: 18 }), {
    positions: [{ left: 0, top: 0 }, { left: 0, top: 28.5 }], height: 48.75
  });
});
