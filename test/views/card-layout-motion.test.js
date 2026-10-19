import assert from 'node:assert/strict';
import test from 'node:test';
import { createCardLayoutMotion } from '../../src/views/dashboard/card-layout-motion.js';

function harness(run) {
  const names = ['document', 'matchMedia', 'getComputedStyle'];
  const originals = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const listeners = new Set(), animations = [];
  const query = { matches: false, addEventListener: (_, callback) => listeners.add(callback), removeEventListener: (_, callback) => listeners.delete(callback) };
  let box = { left: 20, top: 30, width: 440, height: 220 }, settled = 0, scrollport = null;
  const element = {
    dataset: { cardId: 'retained' },
    style: {},
    setAttribute() {},
    remove() {},
    getBoundingClientRect: () => box,
    animate(keyframes, options) {
      const animation = { keyframes, options, progress: 0, cancelled: false, finished: new Promise(() => {}),
        effect: { getComputedTiming: () => ({ progress: animation.progress }) },
        cancel() { animation.cancelled = true; } };
      animations.push(animation); return animation;
    }
  };
  const container = { children: [element], isConnected: true, closest: () => scrollport,
    getBoundingClientRect: () => ({ left: 10, top: 10 }) };
  Object.assign(globalThis, { document: { hidden: false }, matchMedia: () => query,
    getComputedStyle: () => ({ getPropertyValue: () => '180ms' }) });
  const motion = createCardLayoutMotion(container, { onSettled() { settled++; } });
  query.matches = true; motion.play(new Map()); query.matches = false;
  try {
    run({ motion, element, animations, query, listeners, settled: () => settled,
      attachScrollport(port) { scrollport = port; },
      move(next) { const previous = motion.capture(); box = next; motion.play(previous); },
      reduce() { query.matches = true; for (const listener of listeners) listener({ matches: true }); } });
  } finally {
    motion.destroy();
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
}

test('card reflow animates actual dimensions and retargets an interrupted resize from its visible bounds', () => {
  harness(({ motion, element, animations, move, listeners }) => {
    move({ left: 320, top: 70, width: 290, height: 260 });
    assert.equal(animations.length, 2);
    assert.deepEqual(animations[0].keyframes, [
      { translate: '-300px -40px', width: '440px', height: '220px' },
      { translate: '0px 0px', width: '290px', height: '260px' }
    ]);
    assert.equal(animations[0].options.duration, 180);
    assert.ok(parseFloat(animations[1].keyframes[1].rotate) > 0);
    assert.equal(animations[1].keyframes.at(-1).rotate, '0deg');
    animations[0].progress = .4;
    move({ left: 20, top: 330, width: 360, height: 240 });
    assert.equal(animations[0].cancelled, true);
    assert.deepEqual(animations[2].keyframes[0], { translate: '120px -284px', width: '380px', height: '236px' });
    assert.equal(motion.isAnimating(element), true);
    motion.destroy();
    assert.ok(animations.every(animation => animation.cancelled));
    assert.equal(listeners.size, 0);
  });
});

test('reduced motion cancels running card reflow and subsequent layouts apply immediately', () => {
  harness(({ motion, element, animations, move, reduce, settled }) => {
    move({ left: 320, top: 70, width: 290, height: 260 });
    reduce();
    assert.equal(animations[0].cancelled, true);
    assert.equal(motion.isAnimating(element), false);
    assert.equal(settled(), 1);
    move({ left: 20, top: 330, width: 360, height: 240 });
    assert.equal(animations.length, 2);
  });
});

test('the first dashboard layout records its positions without adding a tilt or slide', () => {
  harness(({ motion, animations, move }) => {
    motion.play(new Map(), undefined, { animate: false });
    assert.equal(animations.length, 0);
    move({ left: 320, top: 70, width: 290, height: 260 });
    assert.equal(animations.length, 2, 'later changes still animate from the recorded initial layout');
  });
});

test('card motion resolves a scrollport attached after construction and keeps scrolling out of layout movement', () => {
  harness(({ motion, element, animations, attachScrollport, move }) => {
    const scrollport = { scrollLeft: 0, scrollTop: 0 };
    attachScrollport(scrollport);
    motion.play(motion.capture(), undefined, { animate: false });
    scrollport.scrollTop = 160;
    move({ left: 20, top: -130, width: 440, height: 220 });
    assert.equal(animations.length, 0, 'scrolling an unchanged card must not animate it from its previous screen position');
    const saved = motion.capture().get('retained');
    scrollport.scrollTop = 190;
    motion.exit(element, saved);
    assert.equal(element.style.top, '-160px', 'an exiting card uses the current scroll offset');
  });
});
