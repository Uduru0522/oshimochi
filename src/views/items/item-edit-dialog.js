import { createActionButton } from "../../shared/action-button.js";
import { translate } from "../../localization/translate.js";
import { createContentTransition } from "../../shared/content-transition.js";
import {
  createDialogCloseController
} from "../../shared/dialog-close-controller.js";
import { createElement } from "../../shared/dom.js";
import { createIcon } from "../../shared/icons.js";
import { createItemEntryForm } from "./item-entry-form.js";
import { createItemEntryReview } from "./item-entry-review.js";
import { clearItemImageDraft } from "./item-image-field.js";
import { describeItemSaveError } from "./item-save-error.js";

function createDraft(item, asset) {
  return {
    customValues: structuredClone(item.customValues),
    existingImageAssetId: item.imageAssetId,
    existingImageUrl: asset ? URL.createObjectURL(asset.data) : "",
    image: null,
    imageSource: null,
    name: item.name,
    processedImageUrl: ""
  };
}

export function createItemEditDialog({
  goodsType,
  itemManagement,
  mutationController,
  onUpdated
}) {
  const dialog = createElement("dialog", {
    attributes: { "aria-labelledby": "itemEditTitle" },
    className: "item-entry-dialog item-edit-dialog"
  });
  const header = createElement("header", { className: "item-entry-header" });
  const heading = createElement("h3", {
    attributes: { id: "itemEditTitle" },
    textContent: translate("Edit {name} item", { name: goodsType.displayName })
  });
  const closeButton = createElement("button", {
    attributes: {
      "aria-label": translate("Close item editor"),
      title: translate("Close"),
      type: "button"
    },
    className: "item-entry-close"
  });
  const clearButton = createActionButton(translate("Clear changes"), {
    className: "item-entry-clear secondary-action"
  });
  const headerActions = createElement("div", { className: "item-entry-header-actions" });
  const body = createElement("div", { className: "item-entry-body" });
  const contentTransition = createContentTransition(body, { animateInitial: true });
  let activeItem = null;
  let clearConfirmationTimer = 0;
  let currentScreen = "loading";
  let destroyed = false;
  let destroyCurrentScreen = null;
  let draft = null;
  let fields = null;
  let isSaving = false;
  let loadVersion = 0;
  let pendingUpdatedItem = null;
  let sourceAsset = null;
  const closeController = createDialogCloseController(dialog, {
    canClose: () => !isSaving,
    onClosed: handleClosed,
    onCloseRequested: resetClearConfirmation
  });

  closeButton.append(createIcon("close"));
  headerActions.append(clearButton, closeButton);
  header.append(heading, headerActions);
  dialog.append(header, body);

  function resetClearConfirmation() {
    globalThis.clearTimeout(clearConfirmationTimer);
    clearConfirmationTimer = 0;
    delete clearButton.dataset.confirming;
    clearButton.textContent = translate("Clear changes");
  }

  function disposeDraft() {
    if (draft) {
      clearItemImageDraft(draft);
      draft = null;
    }
  }

  function resetDraft() {
    disposeDraft();
    draft = createDraft(activeItem, sourceAsset);
    resetClearConfirmation();
  }

  function setScreen(screen) {
    currentScreen = screen;
    clearButton.hidden = ["loading", "saving", "success"].includes(screen);
    clearButton.disabled = screen === "loading" || screen === "saving";
  }

  function replaceScreen(createScreen) {
    contentTransition.replace(() => {
      if (destroyed) {
        return;
      }
      destroyCurrentScreen?.();
      const screen = createScreen();
      destroyCurrentScreen = screen?.destroy ?? null;
      body.replaceChildren(screen?.element ?? screen);
    });
  }

  function renderMessage(title, description, { error = false, progress = false } = {}) {
    setScreen(progress ? "saving" : "loading");
    const status = createElement("div", {
      className: `item-entry-status${error ? " item-entry-error" : ""}`
    });
    if (progress) {
      status.append(createElement("progress", { className: "creation-progress" }));
    }
    status.append(
      createElement("h4", { textContent: title }),
      createElement("p", { textContent: description })
    );
    replaceScreen(() => status);
  }

  function renderEditor() {
    setScreen("editor");
    replaceScreen(() => createItemEntryForm({ draft, fields, onReview: renderReview }));
  }

  function renderReview(errorMessage = "") {
    setScreen("review");
    replaceScreen(() => createItemEntryReview({
      draft,
      errorMessage,
      fields,
      onBack: renderEditor,
      onSave: saveChanges,
      saveLabel: translate("Save changes")
    }));
  }

  async function saveChanges() {
    if (isSaving) {
      return;
    }
    isSaving = true;
    closeButton.disabled = true;
    renderMessage(
      translate("Saving changes..."),
      translate("Updating this item in local browser storage."),
      { progress: true }
    );

    try {
      const result = await mutationController.run(() => itemManagement.updateItem({
        item: activeItem,
        name: draft.name,
        customValues: draft.customValues,
        image: draft.image
      }));
      pendingUpdatedItem = result.item;
      if (!destroyed) {
        renderSuccess();
      }
    } catch (error) {
      console.error("Item update failed:", error);
      if (!destroyed) {
        renderReview(describeItemSaveError(error));
      }
    } finally {
      isSaving = false;
      closeButton.disabled = false;
    }
  }

  function renderSuccess() {
    setScreen("success");
    const success = createElement("div", { className: "item-entry-success" });
    const doneButton = createActionButton(translate("Done"), {
      className: "primary-action"
    });
    const actions = createElement("div", { className: "form-actions" });
    doneButton.addEventListener("click", () => closeController.requestClose());
    actions.append(doneButton);
    success.append(
      createElement("h4", { textContent: translate("Changes saved") }),
      createElement("p", {
        textContent: translate("{name} has been updated.", { name: draft.name })
      }),
      actions
    );
    replaceScreen(() => success);
  }

  async function loadEditor(item) {
    const requestedVersion = ++loadVersion;
    renderMessage(
      translate("Loading item..."),
      translate("Reading its fields and current image.")
    );

    try {
      const [loadedFields, asset] = await Promise.all([
        fields ?? itemManagement.getEntryFields(goodsType.id),
        item.imageAssetId ? itemManagement.getAsset(item.imageAssetId) : Promise.resolve(null)
      ]);
      if (destroyed || requestedVersion !== loadVersion) {
        return;
      }
      if (item.imageAssetId && !asset) {
        throw new Error("The current item image is unavailable.");
      }
      fields = loadedFields;
      sourceAsset = asset;
      resetDraft();
      renderEditor();
    } catch (error) {
      if (destroyed || requestedVersion !== loadVersion) {
        return;
      }
      console.error("Item editor could not be loaded:", error);
      renderMessage(
        translate("Item could not be edited"),
        translate("Its fields or image could not be read. Close this window and try again."),
        { error: true }
      );
    }
  }

  function flushUpdatedItem() {
    if (pendingUpdatedItem) {
      onUpdated(pendingUpdatedItem);
      pendingUpdatedItem = null;
    }
  }

  function handleClosed() {
    flushUpdatedItem();
    if (currentScreen === "success") {
      disposeDraft();
      activeItem = null;
      sourceAsset = null;
    }
  }

  closeButton.addEventListener("click", () => closeController.requestClose());
  clearButton.addEventListener("click", () => {
    if (clearButton.dataset.confirming === "true") {
      resetDraft();
      renderEditor();
      return;
    }
    clearButton.dataset.confirming = "true";
    clearButton.textContent = translate("Confirm reset");
    clearConfirmationTimer = globalThis.setTimeout(resetClearConfirmation, 4000);
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeController.requestClose();
  });

  return {
    dialog,
    destroy() {
      destroyed = true;
      loadVersion += 1;
      globalThis.clearTimeout(clearConfirmationTimer);
      contentTransition.cancel();
      destroyCurrentScreen?.();
      closeController.destroy();
      pendingUpdatedItem = null;
      disposeDraft();
    },
    open(item) {
      if (destroyed || dialog.open) {
        return;
      }
      dialog.showModal();
      if (activeItem?.id === item.id && draft) {
        return;
      }
      disposeDraft();
      activeItem = item;
      sourceAsset = null;
      loadEditor(item);
    }
  };
}
