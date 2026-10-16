import { createActionButton } from "../../shared/action-button.js";
import { translate } from "../../localization/translate.js";
import {
  createDialogCloseController
} from "../../shared/dialog-close-controller.js";
import { createElement } from "../../shared/dom.js";
import { createIcon } from "../../shared/icons.js";
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
    textContent: translate("Delete item?")
  });
  const closeButton = createElement("button", {
    attributes: {
      "aria-label": translate("Close deletion confirmation"),
      title: translate("Close"),
      type: "button"
    },
    className: "item-entry-close"
  });
  const body = createElement("div", { className: "item-delete-body" });
  let activeItem = null;
  let destroyed = false;
  let isDeleting = false;
  let thumbnail = null;
  const closeController = createDialogCloseController(dialog, {
    canClose: ({ force }) => force || !isDeleting,
    onClosed: resetDialogState
  });

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
      textContent: translate(
        "This item will leave the active collection. Its data and image are retained for future restoration."
      )
    });
    const feedback = createElement("p", {
      attributes: { "aria-live": "polite" },
      className: errorMessage ? "form-error" : "form-feedback",
      textContent: errorMessage
    });
    const actions = createElement("div", { className: "form-actions" });
    const summary = createElement("div", { className: "item-delete-summary" });
    const cancelButton = createActionButton(translate("Cancel"));
    const deleteButton = createActionButton(
      errorMessage ? translate("Try again") : translate("Delete item"), {
      className: "danger-action"
      }
    );

    cancelButton.addEventListener("click", () => closeController.requestClose());
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
      createElement("strong", { textContent: translate("Deleting item...") }),
      createElement("p", { textContent: translate("Updating local browser storage.") })
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
        closeController.requestClose({
          afterClose: () => onDeleted(deletedItem),
          force: true
        });
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

  function resetDialogState() {
    thumbnail?.destroy();
    thumbnail = null;
    activeItem = null;
    isDeleting = false;
    closeButton.disabled = false;
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
      closeController.destroy();
      thumbnail?.destroy();
      thumbnail = null;
      activeItem = null;
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
