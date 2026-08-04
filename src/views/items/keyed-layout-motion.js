import { getCustomPropertyDurationMs, prefersReducedMotion } from "../../shared/motion.js";

const LAYOUT_MIN_FALLBACK_MS = 180;
const LAYOUT_MAX_FALLBACK_MS = 360;
const DISTANCE_FACTOR_FALLBACK = 0.18;

function getLayoutDurationMs(
  element,
  offsetX,
  offsetY,
  durationProperty,
  durationFallbackMs
) {
  if (durationProperty) {
    return getCustomPropertyDurationMs(
      element,
      durationProperty,
      durationFallbackMs
    );
  }

  const style = getComputedStyle(element);
  const minDuration = getCustomPropertyDurationMs(
    element,
    "--item-layout-min-duration",
    LAYOUT_MIN_FALLBACK_MS
  );
  const maxDuration = Math.max(
    minDuration,
    getCustomPropertyDurationMs(
      element,
      "--item-layout-max-duration",
      LAYOUT_MAX_FALLBACK_MS
    )
  );
  const configuredFactor = Number.parseFloat(
    style.getPropertyValue("--item-layout-distance-factor")
  );
  const distanceFactor = Number.isFinite(configuredFactor)
    ? configuredFactor
    : DISTANCE_FACTOR_FALLBACK;
  const distance = Math.hypot(offsetX, offsetY);

  return Math.min(maxDuration, minDuration + distance * distanceFactor);
}

export function createKeyedLayoutMotion(
  getElement,
  { durationFallbackMs = LAYOUT_MIN_FALLBACK_MS, durationProperty = "" } = {}
) {
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
      return Promise.resolve();
    }

    const completions = [];
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
          duration: getLayoutDurationMs(
            element,
            offsetX,
            offsetY,
            durationProperty,
            durationFallbackMs
          ),
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          fill: "both"
        }
      );
      animations.set(itemId, animation);
      completions.push(animation.finished.then(() => {
        if (animations.get(itemId) === animation) {
          animations.delete(itemId);
          animation.cancel();
        }
      }, () => {}));
    });
    return Promise.all(completions);
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
