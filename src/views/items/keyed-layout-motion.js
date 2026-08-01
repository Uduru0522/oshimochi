import {
  MAX_UI_MOTION_MS,
  getCustomPropertyDurationMs,
  prefersReducedMotion
} from "../../shared/motion.js";

const LAYOUT_MOTION_FALLBACK_MS = 180;

export function createKeyedLayoutMotion(getElement) {
  const animations = new Map();

  function capture(itemIds) {
    const positions = new Map(itemIds.flatMap((itemId) => {
      const element = getElement(itemId);
      return element ? [[itemId, element.getBoundingClientRect()]] : [];
    }));

    animations.forEach((animation) => animation.cancel());
    animations.clear();
    return positions;
  }

  function animate(previousPositions, itemIds) {
    if (prefersReducedMotion()) {
      return;
    }

    itemIds.forEach((itemId) => {
      const element = getElement(itemId);
      const previous = previousPositions.get(itemId);
      if (!element || !previous || typeof element.animate !== "function") {
        return;
      }

      const next = element.getBoundingClientRect();
      const offsetX = previous.left - next.left;
      const offsetY = previous.top - next.top;
      if (Math.abs(offsetX) < 1 && Math.abs(offsetY) < 1) {
        return;
      }

      const animation = element.animate(
        [
          { transform: `translate(${offsetX}px, ${offsetY}px)` },
          { transform: "translate(0, 0)" }
        ],
        {
          duration: Math.min(
            getCustomPropertyDurationMs(
              element,
              "--motion-layout",
              LAYOUT_MOTION_FALLBACK_MS
            ),
            MAX_UI_MOTION_MS
          ),
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
          fill: "both"
        }
      );
      animations.set(itemId, animation);
      animation.finished.then(() => {
        if (animations.get(itemId) === animation) {
          animations.delete(itemId);
          animation.cancel();
        }
      }, () => {});
    });
  }

  return {
    animate,
    capture,
    destroy() {
      animations.forEach((animation) => animation.cancel());
      animations.clear();
    }
  };
}
