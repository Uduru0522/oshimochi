import assert from 'node:assert/strict';
import test from 'node:test';
import { DASHBOARD_REVEAL_MS, playReadoutMotion } from '../../src/views/dashboard/readout-motion.js';

function motionHarness(run) {
  const names = ['document', 'matchMedia', 'requestAnimationFrame', 'cancelAnimationFrame', 'IntersectionObserver'];
  const originals = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const frames = new Map(), listeners = new Set();
  let next = 0, intersection;
  const query = { matches: false, addEventListener: (_, callback) => listeners.add(callback), removeEventListener: (_, callback) => listeners.delete(callback) };
  Object.assign(globalThis, {
    document: { hidden: false }, matchMedia: () => query,
    requestAnimationFrame: callback => { frames.set(++next, callback); return next; },
    cancelAnimationFrame: id => frames.delete(id),
    IntersectionObserver: class {
      constructor(callback) { intersection = callback; }
      observe() {}
      disconnect() {}
    }
  });
  const element = { isConnected: true, dataset: {} };
  const numberElement = { style: { minWidth: '' }, textContent: '100', getBoundingClientRect: () => ({ width: 60 }) };
  const reveals = [];
  const options = { element, numberElement, value: 100, formatNumber: String, reveal: value => reveals.push(value), duration: DASHBOARD_REVEAL_MS };
  try {
    run({ element, numberElement, reveals, options, query, frames, listeners,
      visible() { intersection([{ isIntersecting: true }]); },
      frame(time) { const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(time)); },
      reduce() { query.matches = true; for (const callback of [...listeners]) callback({ matches: true }); }
    });
  } finally {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
}

test('dashboard reveals wait for visibility and paint at zero before a legible sweep', () => {
  motionHarness(({ element, numberElement, reveals, options, visible, frame, frames }) => {
    playReadoutMotion(options);
    assert.equal(element.dataset.motion, 'waiting'); assert.equal(frames.size, 0);
    assert.deepEqual(reveals, [0], 'the sweep is already empty before the visibility observer can fire');
    assert.equal(numberElement.textContent, '100');
    visible(); frame(10000); frame(10016);
    assert.equal(numberElement.textContent, '0'); assert.equal(reveals.at(-1), 0);
    frame(10166);
    assert.ok(reveals.at(-1) > .1 && reveals.at(-1) < .2);
    frame(10316); assert.equal(reveals.at(-1), .5);
    frame(10616);
    assert.equal(element.dataset.motion, 'done'); assert.equal(numberElement.textContent, '100');
    assert.equal(reveals.at(-1), 1); assert.equal(numberElement.style.minWidth, '');
  });
});

test('reducing motion or destroying an offscreen readout finishes it and releases pending work', () => {
  motionHarness(({ element, options, reveals, frames, listeners, reduce }) => {
    const stop = playReadoutMotion(options); reduce();
    assert.equal(element.dataset.motion, 'done'); assert.equal(reveals.at(-1), 1);
    assert.equal(frames.size, 0); assert.equal(listeners.size, 0);
    stop();
  });
  motionHarness(({ element, options, reveals, frames, listeners, visible }) => {
    const stop = playReadoutMotion(options); stop();
    visible();
    assert.equal(element.dataset.motion, 'done'); assert.equal(reveals.at(-1), 1);
    assert.equal(frames.size, 0); assert.equal(listeners.size, 0);
  });
});

test('the counter starts quickly and slows its final steps while retaining formatted precision', () => {
  motionHarness(({ options, numberElement, visible, frame, element }) => {
    playReadoutMotion({ ...options, formatNumber: value => value.toFixed(1) });
    visible(); frame(0); frame(16);
    assert.equal(numberElement.textContent, '0.0');
    const values = [0];
    for (const time of [166, 316, 466, 616]) { frame(time); values.push(Number(numberElement.textContent)); }
    const steps = values.slice(1).map((value, index) => value - values[index]);
    assert.ok(steps.every((step, index) => !index || step < steps[index - 1]), 'each equal time interval advances less than the previous one');
    assert.equal(numberElement.textContent, '100.0');
    assert.equal(element.dataset.motion, 'done');
  });
});

test('cleanup from a replaced reveal cannot finish or overwrite its successor', () => {
  motionHarness(({ options, numberElement, element, visible, frame, frames, listeners }) => {
    const stopOld = playReadoutMotion(options);
    const stopCurrent = playReadoutMotion({ ...options, value: 200 });
    visible(); frame(0); frame(16); frame(166);
    const currentText = numberElement.textContent;
    stopOld();
    assert.equal(numberElement.textContent, currentText);
    assert.equal(element.dataset.motion, 'running');
    assert.equal(frames.size, 1); assert.equal(listeners.size, 1);
    stopCurrent(); stopCurrent();
    assert.equal(numberElement.textContent, '200');
    assert.equal(frames.size, 0); assert.equal(listeners.size, 0);
  });
});

test('counting leaves externally owned number sizing intact', () => {
  motionHarness(({ options, numberElement, visible, frame }) => {
    numberElement.style.minWidth = '24px';
    const stop = playReadoutMotion({ ...options, reserveWidth: false });
    visible(); frame(0); frame(16);
    assert.equal(numberElement.style.minWidth, '24px');
    numberElement.style.minWidth = '80px';
    stop();
    assert.equal(numberElement.style.minWidth, '80px');
  });
});
