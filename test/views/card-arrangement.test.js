import assert from 'node:assert/strict';
import test from 'node:test';
import { moveCard, reorderVisibleCards } from '../../src/views/dashboard/card-arrangement.js';

test('rearranging visible cards preserves hidden records and leaves the original definitions unchanged', () => {
  const cards = [{ id: 'first', position: 0 }, { id: 'recent', type: 'recent-items', visible: false, position: 1 }, { id: 'second', position: 2 }];
  const ordered = reorderVisibleCards(cards, ['second', 'first']);
  assert.deepEqual(ordered.map(card => card.id), ['second', 'recent', 'first']);
  assert.equal(ordered[1], cards[1]); assert.equal(ordered[0], cards[2]);
  assert.deepEqual(cards.map(card => card.id), ['first', 'recent', 'second']);
  for (const invalid of [['first'], ['first', 'first'], ['first', 'unknown'], ['first', 'recent', 'second']]) {
    assert.throws(() => reorderVisibleCards(cards, invalid), /every visible card exactly once/);
  }
});

test('drag and keyboard placement moves one card into a requested slot without duplicating others', () => {
  const original = ['recent', 'first', 'second'];
  assert.deepEqual(moveCard(original, 'second', 0), ['second', 'recent', 'first']);
  assert.deepEqual(moveCard(original, 'recent', 2), ['first', 'second', 'recent']);
  assert.deepEqual(moveCard(original, 'first', 1), original);
  assert.deepEqual(moveCard(original, 'second', -5), ['second', 'recent', 'first']);
  assert.deepEqual(moveCard(original, 'recent', 99), ['first', 'second', 'recent']);
  assert.deepEqual(original, ['recent', 'first', 'second']);
});
