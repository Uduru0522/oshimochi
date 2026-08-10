import {
  getCustomPropertyDurationMs,
  prefersReducedMotion
} from "../../shared/motion.js";

const CARD_MEMBERSHIP_FALLBACK_MS = 120;
const ENTER_EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";
const EXIT_EASING = "cubic-bezier(0.4, 0, 1, 1)";

export function getItemCardMembershipKeyframes(direction) {
  const visible = { opacity: 1, transform: "scale(1)" };
  const hidden = { opacity: 0, transform: "scale(0.96)" };

  return direction === "enter" ? [hidden, visible] : [visible, hidden];
}

export function animateItemCardMembership(element, direction) {
  if (prefersReducedMotion() || typeof element.animate !== "function") {
    return null;
  }

  return element.animate(
    getItemCardMembershipKeyframes(direction),
    {
      duration: getCustomPropertyDurationMs(
        element,
        direction === "enter"
          ? "--item-card-enter-duration"
          : "--item-card-exit-duration",
        CARD_MEMBERSHIP_FALLBACK_MS
      ),
      easing: direction === "enter" ? ENTER_EASING : EXIT_EASING,
      fill: "both"
    }
  );
}
