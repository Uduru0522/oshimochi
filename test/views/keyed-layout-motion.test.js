import assert from "node:assert/strict";
import test from "node:test";

import { createKeyedLayoutMotion } from "../../src/views/items/keyed-layout-motion.js";

test("keyed layout motion translates existing items from measured old to new positions", () => {
  const originalGetComputedStyle = globalThis.getComputedStyle;
  const originalMatchMedia = globalThis.matchMedia;
  const animations = [];
  const positions = new Map([
    ["first", { left: 20, top: 40 }],
    ["second", { left: 20, top: 120 }]
  ]);
  const elements = new Map(["first", "second"].map((itemId) => [itemId, {
    animate(keyframes, options) {
      const animation = {
        cancel() {
          animation.cancelled = true;
        },
        cancelled: false,
        finished: new Promise(() => {}),
        itemId,
        keyframes,
        options
      };
      animations.push(animation);
      return animation;
    },
    getBoundingClientRect() {
      return positions.get(itemId);
    }
  }]));

  globalThis.getComputedStyle = () => ({
    getPropertyValue: () => "180ms"
  });
  globalThis.matchMedia = () => ({ matches: false });

  try {
    const motion = createKeyedLayoutMotion((itemId) => elements.get(itemId));
    const previousPositions = motion.capture(["first", "second"]);
    positions.set("first", { left: 280, top: 40 });
    positions.set("second", { left: 20, top: 40 });

    motion.animate(previousPositions, ["first", "second"]);

    assert.deepEqual(animations[0].keyframes, [
      { transform: "translate(-260px, 0px)" },
      { transform: "translate(0, 0)" }
    ]);
    assert.deepEqual(animations[1].keyframes, [
      { transform: "translate(0px, 80px)" },
      { transform: "translate(0, 0)" }
    ]);
    assert.equal(animations[0].options.duration, 180);

    motion.destroy();
    assert.equal(animations.every(({ cancelled }) => cancelled), true);
  } finally {
    globalThis.getComputedStyle = originalGetComputedStyle;
    globalThis.matchMedia = originalMatchMedia;
  }
});
