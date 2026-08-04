import { createElement } from "../../shared/dom.js";
import { createIcon } from "../../shared/icons.js";
import {
  getCustomPropertyDurationMs,
  prefersReducedMotion
} from "../../shared/motion.js";
import { createItemCardContent } from "./item-card-content.js";
import { createItemEmptyState } from "./item-empty-state.js";
import { createItemThumbnail } from "./item-thumbnail.js";
import { createKeyedLayoutMotion } from "./keyed-layout-motion.js";

const CARD_MEMBERSHIP_FALLBACK_MS = 120;

function getCardAnimationOptions(element, direction) {
  return {
    duration: getCustomPropertyDurationMs(
      element,
      direction === "enter"
        ? "--item-card-enter-duration"
        : "--item-card-exit-duration",
      CARD_MEMBERSHIP_FALLBACK_MS
    ),
    easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    fill: "both"
  };
}

function animateCard(element, direction) {
  if (prefersReducedMotion() || typeof element.animate !== "function") {
    return null;
  }
  const visible = { opacity: 1, scale: 1 };
  const hidden = { opacity: 0, scale: 0.96 };
  return element.animate(
    direction === "enter" ? [hidden, visible] : [visible, hidden],
    getCardAnimationOptions(element, direction)
  );
}

function createItemCard(
  item,
  fields,
  getAsset,
  onDeleteItem,
  onEditItem,
  presentationContext
) {
  const element = createElement("article", {
    attributes: { role: "listitem" },
    className: "item-card",
    dataset: { itemId: item.id }
  });
  const body = createElement("div", { className: "item-card-body" });
  const controls = createElement("div", { className: "item-card-controls" });
  const editButton = createElement("button", {
    attributes: { title: "Edit item", type: "button" },
    className: "item-card-edit"
  });
  const deleteButton = createElement("button", {
    attributes: { title: "Delete item", type: "button" },
    className: "item-card-delete"
  });
  let currentItem = item;
  let thumbnail = createItemThumbnail(item, getAsset, {
    className: "item-card-thumbnail"
  });

  editButton.append(createIcon("edit"));
  deleteButton.append(createIcon("delete"));
  editButton.addEventListener("click", () => onEditItem(currentItem));
  deleteButton.addEventListener("click", () => onDeleteItem(currentItem));
  controls.append(editButton, deleteButton);
  element.append(thumbnail.element, body, controls);

  function updateThumbnail(nextItem) {
    if (nextItem.imageAssetId === currentItem.imageAssetId) {
      return;
    }

    const nextThumbnail = createItemThumbnail(nextItem, getAsset, {
      className: "item-card-thumbnail"
    });
    thumbnail.element.replaceWith(nextThumbnail.element);
    thumbnail.destroy();
    thumbnail = nextThumbnail;
  }

  function render(nextItem, nextPresentationContext) {
    updateThumbnail(nextItem);
    currentItem = nextItem;
    editButton.setAttribute("aria-label", `Edit ${nextItem.name}`);
    deleteButton.setAttribute("aria-label", `Delete ${nextItem.name}`);
    body.replaceChildren(...createItemCardContent(
      nextItem,
      fields,
      nextPresentationContext
    ));
  }

  render(item, presentationContext);
  return {
    element,
    get item() {
      return currentItem;
    },
    destroy() {
      thumbnail?.destroy();
    },
    update(nextItem, nextPresentationContext) {
      const itemChanged = currentItem !== nextItem;
      render(nextItem, nextPresentationContext);
      if (itemChanged && !prefersReducedMotion() && typeof element.animate === "function") {
        element.animate(
          [{ opacity: 0.55 }, { opacity: 1 }],
          getCardAnimationOptions(element, "enter")
        );
      }
    }
  };
}

export function createItemCards(
  items,
  fields,
  {
    filter = {},
    getAsset,
    onClearFilters = () => {},
    onDeleteItem = () => {},
    onEditItem = () => {},
    sort = null,
    sourceItems = items
  }
) {
  const element = createElement("div", {
    attributes: { "aria-label": "Collection item cards", role: "list" },
    className: "item-card-grid"
  });
  const cards = new Map();
  const membershipAnimations = new Set();
  const layoutMotion = createKeyedLayoutMotion(
    (itemId) => cards.get(itemId)?.element,
    {
      durationFallbackMs: 140,
      durationProperty: "--item-card-move-duration"
    }
  );
  let desiredIds = new Set(items.map(({ id }) => id));
  let destroyed = false;
  let emptyState = null;
  let pendingUpdate = null;
  let presentationContext = { filter, sort };
  let sourceItemCount = sourceItems.length;
  let transitionRunning = false;

  function removeEmptyState() {
    emptyState?.remove();
    emptyState = null;
  }

  function showEmptyState() {
    if (destroyed || desiredIds.size > 0 || emptyState) {
      return;
    }
    emptyState = createItemEmptyState({
      hasSourceItems: sourceItemCount > 0,
      onClearFilters
    });
    element.append(emptyState);
    animateCard(emptyState, "enter");
  }

  function reorderCards(nextItems) {
    const nextIds = nextItems.map(({ id }) => id);
    const currentIds = [...element.children]
      .map((child) => child.dataset?.itemId)
      .filter((itemId) => desiredIds.has(itemId));
    if (
      nextIds.length === currentIds.length &&
      nextIds.every((itemId, index) => itemId === currentIds[index])
    ) {
      return;
    }

    nextItems.forEach((item) => {
      const card = cards.get(item.id);
      if (card) {
        element.append(card.element);
      }
    });
  }

  function createCard(item) {
    const card = createItemCard(
      item,
      fields,
      getAsset,
      onDeleteItem,
      onEditItem,
      presentationContext
    );
    cards.set(item.id, card);
    return card;
  }

  async function runMembershipPhase(cardEntries, direction) {
    const animations = cardEntries
      .map(({ card }) => animateCard(card.element, direction))
      .filter(Boolean);
    animations.forEach((animation) => membershipAnimations.add(animation));
    await Promise.all(animations.map((animation) => animation.finished.catch(() => {})));
    animations.forEach((animation) => membershipAnimations.delete(animation));
    return animations;
  }

  function finishMembershipPhase(animations) {
    animations.forEach((animation) => animation.cancel());
  }

  function hideIncomingCard(card) {
    card.element.style.opacity = "0";
    card.element.style.scale = "0.96";
  }

  function revealIncomingCard(card) {
    card.element.style.removeProperty("opacity");
    card.element.style.removeProperty("scale");
  }

  async function applyUpdate({
    nextItems,
    nextPresentationContext,
    nextSourceItems
  }) {
    desiredIds = new Set(nextItems.map(({ id }) => id));
    sourceItemCount = nextSourceItems.length;
    const nextItemsById = new Map(nextItems.map((item) => [item.id, item]));
    const exitingCards = [...cards.entries()]
      .filter(([itemId]) => !desiredIds.has(itemId))
      .map(([itemId, card]) => ({ itemId, card }));
    const exitAnimations = await runMembershipPhase(exitingCards, "exit");

    if (destroyed) {
      finishMembershipPhase(exitAnimations);
      return;
    }

    const retainedIds = nextItems
      .map(({ id }) => id)
      .filter((itemId) => cards.has(itemId));
    const previousPositions = layoutMotion.capture(retainedIds);
    exitingCards.forEach(({ itemId, card }) => {
      card.destroy();
      card.element.remove();
      cards.delete(itemId);
    });
    finishMembershipPhase(exitAnimations);

    presentationContext = nextPresentationContext;
    if (desiredIds.size > 0) {
      removeEmptyState();
    }
    retainedIds.forEach((itemId) => {
      cards.get(itemId)?.update(nextItemsById.get(itemId), presentationContext);
    });
    const enteringCards = nextItems
      .filter(({ id }) => !cards.has(id))
      .map((item) => ({ itemId: item.id, card: createCard(item) }));
    enteringCards.forEach(({ card }) => {
      hideIncomingCard(card);
      element.append(card.element);
    });
    reorderCards(nextItems);
    await layoutMotion.animate(previousPositions, retainedIds);

    if (destroyed) {
      return;
    }

    enteringCards.forEach(({ card }) => revealIncomingCard(card));
    const enterAnimations = await runMembershipPhase(enteringCards, "enter");
    finishMembershipPhase(enterAnimations);
    showEmptyState();
  }

  async function processPendingUpdates() {
    if (transitionRunning) {
      return;
    }
    transitionRunning = true;
    try {
      while (pendingUpdate && !destroyed) {
        const nextUpdate = pendingUpdate;
        pendingUpdate = null;
        await applyUpdate(nextUpdate);
      }
    } finally {
      transitionRunning = false;
    }
  }

  function update(
    nextItems,
    nextSourceItems = nextItems,
    nextPresentationContext = presentationContext
  ) {
    if (destroyed) {
      return Promise.resolve();
    }
    pendingUpdate = { nextItems, nextPresentationContext, nextSourceItems };
    return processPendingUpdates();
  }

  items.forEach((item) => {
    const card = createCard(item);
    element.append(card.element);
  });
  showEmptyState();

  return {
    element,
    update,
    destroy() {
      destroyed = true;
      pendingUpdate = null;
      membershipAnimations.forEach((animation) => animation.cancel());
      membershipAnimations.clear();
      layoutMotion.destroy();
      cards.forEach((card) => card.destroy());
      cards.clear();
      removeEmptyState();
    }
  };
}
