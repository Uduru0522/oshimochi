import assert from 'node:assert/strict';
import test from 'node:test';
import { createRingInteractionState, transitionRingInteraction, ringSegmentAtPoint } from '../../src/views/dashboard/ring-interaction.js';

test('a hovered or focused slice is temporary and the total returns after leaving', () => {
  const empty = createRingInteractionState();
  const hover = transitionRingInteraction(empty, { type: 'hover', id: 'figures' });
  assert.equal(hover.activeId, 'figures'); assert.equal(hover.pinnedId, null);
  assert.equal(transitionRingInteraction(hover, { type: 'hover' }).activeId, null);
  const focus = transitionRingInteraction(empty, { type: 'focus', id: 'tapestries' });
  assert.equal(focus.activeId, 'tapestries');
  assert.equal(transitionRingInteraction(focus, { type: 'blur', id: 'tapestries' }).activeId, null);
  assert.equal(empty.activeId, null, 'a transition never mutates an earlier state');
});

test('a pin retains its emphasis while pointer and keyboard previews stay available separately', () => {
  let state = createRingInteractionState();
  state = transitionRingInteraction(state, { type: 'pin', id: 'figures' });
  state = transitionRingInteraction(state, { type: 'hover', id: 'tapestries' });
  assert.equal(state.activeId, 'figures'); assert.equal(state.hoveredId, 'tapestries'); assert.equal(state.pinnedId, 'figures');
  state = transitionRingInteraction(state, { type: 'hover' });
  assert.equal(state.activeId, 'figures');
  state = transitionRingInteraction(state, { type: 'focus', id: 'badges' });
  assert.equal(state.activeId, 'figures'); assert.equal(state.focusedId, 'badges'); assert.equal(state.pinnedId, 'figures');
  state = transitionRingInteraction(state, { type: 'blur', id: 'badges' });
  assert.equal(state.activeId, 'figures');
  state = transitionRingInteraction(state, { type: 'pin', id: 'tapestries' });
  assert.equal(state.activeId, 'tapestries'); assert.equal(state.pinnedId, 'tapestries');
  state = transitionRingInteraction(state, { type: 'pin', id: 'tapestries' });
  assert.equal(state.pinnedId, 'tapestries', 'clicking the same segment keeps its pin');
});

test('the largest default stays selected through previews and returns after clearing explicit pins', () => {
  const initial = createRingInteractionState({ defaultId: 'tapestries', ids: ['figures', 'tapestries'] });
  assert.equal(initial.activeId, 'tapestries'); assert.equal(initial.pinnedId, null);
  const preview = transitionRingInteraction(initial, { type: 'hover', id: 'figures' });
  assert.equal(preview.activeId, 'tapestries'); assert.equal(preview.hoveredId, 'figures');
  const focused = transitionRingInteraction(preview, { type: 'focus', id: 'figures' });
  assert.equal(focused.activeId, 'tapestries'); assert.equal(focused.focusedId, 'figures');
  assert.deepEqual(transitionRingInteraction(preview, { type: 'hover' }), initial);
  const pinned = transitionRingInteraction(preview, { type: 'pin', id: 'figures' });
  assert.equal(pinned.activeId, 'figures');
  assert.deepEqual(transitionRingInteraction(pinned, { type: 'clear' }), initial);
  assert.equal(transitionRingInteraction(pinned, { type: 'pin', id: 'figures' }).pinnedId, 'figures');
  assert.equal(createRingInteractionState({ defaultId: 'removed', ids: ['figures'] }).activeId, null);
});

test('Escape clears pin and previews, allowing a later focus change to preview afresh', () => {
  let state = createRingInteractionState({ pinnedId: 'figures', ids: ['figures', 'tapestries'] });
  state = transitionRingInteraction(state, { type: 'focus', id: 'tapestries' });
  state = transitionRingInteraction(state, { type: 'clear' });
  assert.deepEqual(state, createRingInteractionState());
  assert.equal(transitionRingInteraction(state, { type: 'focus', id: 'tapestries' }).activeId, 'tapestries');
});

test('only a still-existing nonzero slice can restore a pin during a same-view render', () => {
  assert.equal(createRingInteractionState({ pinnedId: 'figures', defaultId: 'tapestries', ids: ['figures', 'tapestries'] }).activeId, 'figures');
  for (const pinnedId of ['removed', 'zero-valued', null]) {
    const state = createRingInteractionState({ pinnedId, defaultId: 'figures', ids: ['figures'] });
    assert.equal(state.pinnedId, null); assert.equal(state.activeId, 'figures');
  }
  assert.equal(createRingInteractionState().activeId, null, 'an empty ring has no default');
});

test('blurring an old focus never clears the newer focused slice', () => {
  let state = transitionRingInteraction(createRingInteractionState(), { type: 'focus', id: 'figures' });
  state = transitionRingInteraction(state, { type: 'focus', id: 'tapestries' });
  assert.equal(transitionRingInteraction(state, { type: 'blur', id: 'figures' }).activeId, 'tapestries');
});

test('keyboard focus takes over a stationary pointer preview, and later pointer movement can take over again', () => {
  let state = transitionRingInteraction(createRingInteractionState(), { type: 'hover', id: 'figures' });
  state = transitionRingInteraction(state, { type: 'focus', id: 'tapestries' });
  assert.equal(state.activeId, 'tapestries');
  state = transitionRingInteraction(state, { type: 'hover', id: 'badges' });
  assert.equal(state.activeId, 'badges');
  state = transitionRingInteraction(state, { type: 'hover' });
  assert.equal(state.activeId, 'tapestries');
});

test('pointer hit-testing follows the untransformed arc while a highlighted slice separates', () => {
  const items = Array.from({ length: 5 }, (_, index) => ({ id: `slice-${index}`, start: index / 5, share: .2 }));
  for (let index = 0; index < items.length; index++) {
    const angle = (index + .5) / 5 * 2 * Math.PI;
    for (const radius of [55, 65, 82, 105, 113]) {
      assert.equal(ringSegmentAtPoint(items, { x: 100 + radius * Math.cos(angle), y: 100 + radius * Math.sin(angle) }), `slice-${index}`);
    }
  }
  assert.equal(ringSegmentAtPoint(items, { x: 100, y: 100 }), null);
  assert.equal(ringSegmentAtPoint(items, { x: 100, y: -15 }), null);
});

test('neighboring segments have exact angular boundaries while radial forgiveness remains available', () => {
  const items = [{ id: 'first', start: 0, share: .5 }, { id: 'second', start: .5, share: .5 }];
  const point = turn => ({ x: 100 + 82 * Math.cos(turn * 2 * Math.PI), y: 100 + 82 * Math.sin(turn * 2 * Math.PI) });
  assert.equal(ringSegmentAtPoint(items, point(.502)), 'second');
  assert.equal(ringSegmentAtPoint(items, point(.498)), 'first');
  assert.equal(ringSegmentAtPoint(items, point(.5001)), 'second');
  assert.equal(ringSegmentAtPoint(items, point(.998)), 'second');
});
