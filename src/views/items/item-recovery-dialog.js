import { createActionButton } from "../../shared/action-button.js";
import {
  createDialogCloseController
} from "../../shared/dialog-close-controller.js";
import { createElement } from "../../shared/dom.js";
import { createIcon } from "../../shared/icons.js";
import { translate } from "../../localization/translate.js";
import {
  MAX_UI_MOTION_MS,
  getTransitionDurationMs,
  prefersReducedMotion
} from "../../shared/motion.js";
import { createItemThumbnail } from "./item-thumbnail.js";
import { createKeyedLayoutMotion } from "./keyed-layout-motion.js";

export function createItemRecoveryDialog({
  goodsTypeName,
  goodsTypeId,
  itemManagement,
  mutationController,
  onRestored
}) {
  const dialog = createElement("dialog", {
    attributes: { "aria-labelledby": "itemRecoveryTitle" },
    className: "item-recovery-dialog"
  });
  const header = createElement("header", { className: "item-recovery-header" });
  const heading = createElement("h3", {
    attributes: { id: "itemRecoveryTitle" },
    textContent: translate("Deleted items in {name}", { name: goodsTypeName })
  });
  const closeButton = createElement("button", {
    attributes: {
      "aria-label": translate("Close deleted items"),
      title: translate("Close"),
      type: "button"
    },
    className: "item-entry-close"
  });
  const body = createElement("div", { className: "item-recovery-body" });
  let deletedItems = [];
  let destroyed = false;
  let isBusy = false;
  let itemThumbnails = new Map();
  let itemTiles = new Map();
  let listFeedback = null;
  let loadVersion = 0;
  let thumbnails = [];
  const layoutMotion = createKeyedLayoutMotion(
    (itemId) => itemTiles.get(itemId),
    {
      durationFallbackMs: 140,
      durationProperty: "--item-card-move-duration"
    }
  );
  const closeController = createDialogCloseController(dialog, {
    canClose: () => !isBusy,
    onClosed() {
      loadVersion += 1;
      destroyThumbnails();
    }
  });

  closeButton.append(createIcon("close"));
  header.append(heading, closeButton);
  dialog.append(header, body);

  function destroyThumbnails() {
    thumbnails.forEach((thumbnail) => thumbnail.destroy());
    thumbnails = [];
    itemThumbnails = new Map();
    itemTiles = new Map();
    listFeedback = null;
  }

  function renderStatus(title, detail, { retry = false } = {}) {
    destroyThumbnails();
    const status = createElement("div", { className: "item-recovery-status" });
    status.append(
      createIcon(retry ? "information" : "archiveRestore"),
      createElement("strong", { textContent: title }),
      createElement("p", { textContent: detail })
    );

    if (retry) {
      const retryButton = createActionButton(translate("Retry"));
      retryButton.addEventListener("click", loadDeletedItems);
      status.append(retryButton);
    }

    body.replaceChildren(status);
  }

  function renderLoading() {
    destroyThumbnails();
    const status = createElement("div", { className: "item-recovery-status" });
    status.append(
      createElement("progress", { className: "creation-progress" }),
      createElement("strong", { textContent: translate("Loading deleted items...") }),
      createElement("p", { textContent: translate("Reading retained local data.") })
    );
    body.replaceChildren(status);
  }

  function renderList(feedbackMessage = "") {
    destroyThumbnails();

    if (deletedItems.length === 0) {
      renderStatus(
        translate("No deleted items"),
        translate("Items removed from this collection will be available here.")
      );
      return;
    }

    const introduction = createElement("p", {
      className: "item-recovery-introduction",
      textContent: translate(
        "Restore an item to {name}, or permanently delete its retained data and image.",
        { name: goodsTypeName }
      )
    });
    const feedback = createElement("p", {
      attributes: { "aria-live": "polite" },
      className: feedbackMessage ? "form-error" : "form-feedback",
      textContent: feedbackMessage
    });
    listFeedback = feedback;
    const list = createElement("div", {
      attributes: { role: "list" },
      className: "item-recovery-list"
    });

    deletedItems.forEach((item) => {
      const thumbnail = createItemThumbnail(item, itemManagement.getAsset, {
        className: "item-recovery-thumbnail"
      });
      const actions = createElement("div", { className: "item-recovery-actions" });
      const restoreButton = createElement("button", {
        attributes: {
          "aria-label": translate("Restore {name}", { name: item.name }),
          title: translate("Restore item"),
          type: "button"
        },
        className: "item-recovery-icon-action"
      });
      const purgeButton = createElement("button", {
        attributes: {
          "aria-label": translate("Permanently delete {name}", { name: item.name }),
          title: translate("Delete permanently"),
          type: "button"
        },
        className: "item-recovery-icon-action danger-icon-action"
      });
      const tile = createElement("div", {
        attributes: { role: "listitem" },
        className: "item-recovery-row"
      });

      restoreButton.append(createIcon("archiveRestore"));
      purgeButton.append(createIcon("delete"));
      restoreButton.addEventListener("click", () => restoreItem(item));
      purgeButton.addEventListener("click", () => renderPurgeConfirmation(item));
      actions.append(restoreButton, purgeButton);
      tile.append(
        thumbnail.element,
        createElement("strong", {
          attributes: { title: item.name },
          className: "item-recovery-name",
          textContent: item.name
        }),
        actions
      );
      list.append(tile);
      thumbnails.push(thumbnail);
      itemThumbnails.set(item.id, thumbnail);
      itemTiles.set(item.id, tile);
    });

    body.replaceChildren(introduction, feedback, list);
  }

  function renderPurgeConfirmation(item, errorMessage = "") {
    destroyThumbnails();
    const thumbnail = createItemThumbnail(item, itemManagement.getAsset, {
      className: "item-recovery-confirm-thumbnail"
    });
    const summary = createElement("div", { className: "item-recovery-confirm-summary" });
    const copy = createElement("div", { className: "item-recovery-confirm-copy" });
    const feedback = createElement("p", {
      attributes: { "aria-live": "polite" },
      className: errorMessage ? "form-error" : "form-feedback",
      textContent: errorMessage
    });
    const actions = createElement("div", { className: "form-actions" });
    const cancelButton = createActionButton(translate("Cancel"));
    const purgeButton = createActionButton(translate("Delete permanently"), {
      className: "danger-action"
    });

    copy.append(
      createElement("strong", { textContent: item.name }),
      createElement("p", {
        textContent: translate(
          "This permanently deletes the retained item and image. This action cannot be undone."
        )
      })
    );
    summary.append(thumbnail.element, copy);
    cancelButton.addEventListener("click", () => renderList());
    purgeButton.addEventListener("click", () => purgeItem(item));
    actions.append(cancelButton, purgeButton);
    body.replaceChildren(summary, feedback, actions);
    thumbnails.push(thumbnail);
    requestAnimationFrame(() => purgeButton.focus());
  }

  function renderMutationStatus(title) {
    isBusy = true;
    closeButton.disabled = true;
    destroyThumbnails();
    const status = createElement("div", { className: "item-recovery-status" });
    status.append(
      createElement("progress", { className: "creation-progress" }),
      createElement("strong", { textContent: title }),
      createElement("p", { textContent: translate("Updating local browser storage.") })
    );
    body.replaceChildren(status);
  }

  function setListBusy(itemId, busy) {
    isBusy = busy;
    closeButton.disabled = busy;
    body.querySelectorAll("button").forEach((button) => {
      button.disabled = busy;
    });

    const tile = itemTiles.get(itemId);
    if (tile) {
      tile.toggleAttribute("aria-busy", busy);
      tile.toggleAttribute("data-busy", busy);
    }
  }

  function showListError(message) {
    if (!listFeedback) {
      renderList(message);
      return;
    }
    listFeedback.className = "form-error";
    listFeedback.textContent = message;
  }

  async function removeRestoredTile(itemId) {
    const tile = itemTiles.get(itemId);
    if (!tile) {
      return;
    }

    if (!prefersReducedMotion()) {
      tile.dataset.removing = "true";
      await new Promise((resolve) => {
        setTimeout(
          resolve,
          getTransitionDurationMs(tile, MAX_UI_MOTION_MS)
        );
      });
    }

    const retainedIds = deletedItems
      .map(({ id }) => id)
      .filter((id) => id !== itemId);
    const previousPositions = layoutMotion.capture(retainedIds);
    itemThumbnails.get(itemId)?.destroy();
    itemThumbnails.delete(itemId);
    itemTiles.delete(itemId);
    tile.remove();
    await layoutMotion.animate(previousPositions, retainedIds);
  }

  async function restoreItem(item) {
    if (isBusy) {
      return;
    }
    setListBusy(item.id, true);

    let restoredItem;

    try {
      restoredItem = await mutationController.run(() =>
        itemManagement.restoreItem(item)
      );
    } catch (error) {
      console.error("Item restoration failed:", error);
      if (!destroyed) {
        setListBusy(item.id, false);
        showListError(translate(
          "The item could not be restored. Its retained data and image were not changed."
        ));
      }
      return;
    }

    if (!destroyed) {
      await removeRestoredTile(item.id);
    }

    if (!destroyed) {
      deletedItems = deletedItems.filter(({ id }) => id !== item.id);
      setListBusy(item.id, false);

      try {
        onRestored(restoredItem);
      } catch (error) {
        console.error("Restored item could not be added to the current view:", error);
      }
      if (deletedItems.length === 0) {
        renderList();
      }
    }
  }

  async function purgeItem(item) {
    if (isBusy) {
      return;
    }
    renderMutationStatus(translate("Deleting item permanently..."));

    try {
      await mutationController.run(() => itemManagement.purgeItem(item));
      if (!destroyed) {
        deletedItems = deletedItems.filter(({ id }) => id !== item.id);
        isBusy = false;
        closeButton.disabled = false;
        renderList();
      }
    } catch (error) {
      console.error("Permanent item deletion failed:", error);
      if (!destroyed) {
        isBusy = false;
        closeButton.disabled = false;
        renderPurgeConfirmation(
          item,
          translate(
            "Permanent deletion could not be completed. The retained item and image were not changed."
          )
        );
      }
    }
  }

  async function loadDeletedItems() {
    const version = ++loadVersion;
    renderLoading();

    try {
      const items = await itemManagement.listDeletedItems(goodsTypeId);
      if (!destroyed && version === loadVersion) {
        deletedItems = items;
        renderList();
      }
    } catch (error) {
      console.error("Deleted items could not be loaded:", error);
      if (!destroyed && version === loadVersion) {
        renderStatus(
          translate("Deleted items could not be loaded"),
          translate("Check browser storage access and try again."),
          { retry: true }
        );
      }
    }
  }

  closeButton.addEventListener("click", () => closeController.requestClose());
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeController.requestClose();
  });

  return {
    dialog,
    destroy() {
      destroyed = true;
      loadVersion += 1;
      closeController.destroy();
      layoutMotion.destroy();
      destroyThumbnails();
    },
    open() {
      if (destroyed || dialog.open) {
        return;
      }
      deletedItems = [];
      dialog.showModal();
      loadDeletedItems();
    }
  };
}
