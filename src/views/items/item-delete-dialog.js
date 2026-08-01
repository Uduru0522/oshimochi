import { createActionButton } from "../../shared/action-button.js";
import { createElement } from "../../shared/dom.js";
import { createIcon } from "../../shared/icons.js";
import {
  MAX_UI_MOTION_MS,
  getAnimationDurationMs,
  prefersReducedMotion
} from "../../shared/motion.js";
import { createItemThumbnail } from "./item-thumbnail.js";
import { describeItemSaveError } from "./item-save-error.js";

export function createItemDeleteDialog({ itemManagement, mutationController, onDeleted }) {
  const dialog = createElement("dialog", {
    attributes: { "aria-labelledby": "itemDeleteTitle" },
    className: "item-delete-dialog"
  });
  const header = createElement("header", { className: "item-delete-header" });
  const heading = createElement("h3", {
    attributes: { id: "itemDeleteTitle" },
    textContent: "Delete item?"
  });
  const closeButton = createElement("button", {
    attributes: { "aria-label": "Close deletion confirmation", title: "Close", type: "button" },
    className: "item-entry-close"
  });
  const body = createElement("div", { className: "item-delete-body" });
  let activeItem = null;
  let closeTimer = 0;
  let destroyed = false;
  let isClosing = false;
  let isDeleting = false;
  let pendingCloseAction = null;
  let thumbnail = null;

  closeButton.append(createIcon("close"));
  header.append(heading, closeButton);
  dialog.append(header, body);

  function renderConfirmation(errorMessage = "") {
    thumbnail?.destroy();
    thumbnail = createItemThumbnail(activeItem, itemManagement.getAsset);
    const copy = createElement("div", { className: "item-delete-copy" });
    const name = createElement("strong", {
      attributes: { title: activeItem.name },
      textContent: activeItem.name
    });
    const explanation = createElement("p", {
      textContent: "This item will leave the active collection. Its data and image are retained for future restoration."
    });
    const feedback = createElement("p", {
      attributes: { "aria-live": "polite" },
      className: errorMessage ? "form-error" : "form-feedback",
      textContent: errorMessage
    });
    const actions = createElement("div", { className: "form-actions" });
    const summary = createElement("div", { className: "item-delete-summary" });
    const cancelButton = createActionButton("Cancel");
    const deleteButton = createActionButton(errorMessage ? "Try again" : "Delete item", {
      className: "danger-action"
    });

    cancelButton.addEventListener("click", requestClose);
    deleteButton.addEventListener("click", deleteItem);
    copy.append(name, explanation);
    summary.append(thumbnail.element, copy);
    actions.append(cancelButton, deleteButton);
    body.replaceChildren(summary, feedback, actions);
    globalThis.requestAnimationFrame(() => deleteButton.focus());
  }

  function renderDeleting() {
    thumbnail?.destroy();
    thumbnail = null;
    const status = createElement("div", { className: "item-delete-status" });
    status.append(
      createElement("progress", { className: "creation-progress" }),
      createElement("strong", { textContent: "Deleting item..." }),
      createElement("p", { textContent: "Updating local browser storage." })
    );
    body.replaceChildren(status);
  }

  async function deleteItem() {
    if (isDeleting) {
      return;
    }
    isDeleting = true;
    closeButton.disabled = true;
    renderDeleting();

    try {
      const deletedItem = await mutationController.run(() =>
        itemManagement.softDeleteItem(activeItem)
      );
      if (!destroyed) {
        requestClose(() => onDeleted(deletedItem));
      }
    } catch (error) {
      console.error("Item deletion failed:", error);
      if (!destroyed) {
        isDeleting = false;
        closeButton.disabled = false;
        renderConfirmation(describeItemSaveError(error));
      }
    }
  }

  function finishClose() {
    if (!isClosing) {
      return;
    }
    const action = pendingCloseAction;
    pendingCloseAction = null;
    globalThis.clearTimeout(closeTimer);
    dialog.removeEventListener("animationend", handleCloseAnimationEnd);
    isClosing = false;
    delete dialog.dataset.closing;
    dialog.close();
    thumbnail?.destroy();
    thumbnail = null;
    activeItem = null;
    isDeleting = false;
    closeButton.disabled = false;
    action?.();
  }

  function handleCloseAnimationEnd(event) {
    if (event.target === dialog) {
      finishClose();
    }
  }

  function requestClose(afterClose = null) {
    if (isClosing || (!afterClose && isDeleting) || !dialog.open) {
      return;
    }
    pendingCloseAction = afterClose;
    if (prefersReducedMotion()) {
      isClosing = true;
      finishClose();
      return;
    }
    isClosing = true;
    dialog.dataset.closing = "true";
    dialog.addEventListener("animationend", handleCloseAnimationEnd);
    closeTimer = globalThis.setTimeout(
      finishClose,
      getAnimationDurationMs(dialog, MAX_UI_MOTION_MS)
    );
  }

  closeButton.addEventListener("click", () => requestClose());
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    requestClose();
  });

  return {
    dialog,
    destroy() {
      destroyed = true;
      globalThis.clearTimeout(closeTimer);
      dialog.removeEventListener("animationend", handleCloseAnimationEnd);
      thumbnail?.destroy();
      thumbnail = null;
      pendingCloseAction = null;
      if (dialog.open) {
        dialog.close();
      }
    },
    open(item) {
      if (destroyed || dialog.open) {
        return;
      }
      activeItem = item;
      renderConfirmation();
      dialog.showModal();
    }
  };
}
