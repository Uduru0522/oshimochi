import assert from "node:assert/strict";
import test from "node:test";

import {
  animateItemCardMembership,
  getItemCardMembershipKeyframes
} from "../../src/views/items/item-card-motion.js";

test("item cards exit with a visible ease-in fade", () => {
  const originalGetComputedStyle = globalThis.getComputedStyle;
  const originalMatchMedia = globalThis.matchMedia;
  let animationCall;
  const element = {
    animate(keyframes, options) {
      animationCall = { keyframes, options };
      return { finished: Promise.resolve() };
    }
  };

  globalThis.getComputedStyle = () => ({
    getPropertyValue: (propertyName) =>
      propertyName === "--item-card-exit-duration" ? "120ms" : ""
  });
  globalThis.matchMedia = () => ({ matches: false });

  try {
    animateItemCardMembership(element, "exit");

    assert.deepEqual(animationCall.keyframes, [
      { opacity: 1, transform: "scale(1)" },
      { opacity: 0, transform: "scale(0.96)" }
    ]);
    assert.equal(animationCall.options.duration, 120);
    assert.equal(animationCall.options.easing, "cubic-bezier(0.4, 0, 1, 1)");
  } finally {
    globalThis.getComputedStyle = originalGetComputedStyle;
    globalThis.matchMedia = originalMatchMedia;
  }
});

test("item cards enter with an ease-out reveal", () => {
  assert.deepEqual(getItemCardMembershipKeyframes("enter"), [
    { opacity: 0, transform: "scale(0.96)" },
    { opacity: 1, transform: "scale(1)" }
  ]);
});

test("item card membership motion honors reduced-motion preferences", () => {
  const originalMatchMedia = globalThis.matchMedia;
  let animateCalled = false;

  globalThis.matchMedia = () => ({ matches: true });

  try {
    const animation = animateItemCardMembership({
      animate() {
        animateCalled = true;
      }
    }, "exit");

    assert.equal(animation, null);
    assert.equal(animateCalled, false);
  } finally {
    globalThis.matchMedia = originalMatchMedia;
  }
});
