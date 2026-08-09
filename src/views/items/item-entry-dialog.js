import { createActionButton } from "../../shared/action-button.js";
import { translate } from "../../localization/translate.js";
import { createContentTransition } from "../../shared/content-transition.js";
import { createElement } from "../../shared/dom.js";
import { createIcon } from "../../shared/icons.js";
import {
  MAX_UI_MOTION_MS,
  getAnimationDurationMs,
  prefersReducedMotion
} from "../../shared/motion.js";
import { createItemEntryForm } from "./item-entry-form.js";
import { createItemEntryReview } from "./item-entry-review.js";
import { clearItemImageDraft } from "./item-image-field.js";
import { describeItemSaveError } from "./item-save-error.js";

function createDraft() {
  return {
    customValues: {},
    existingImageAssetId: null,
    existingImageUrl: "",
    image: null,
    imageSource: null,
    name: "",
    processedImageUrl: ""
  };
}

export function createItemEntryDialog({
  goodsType,
  itemManagement,
  mutationController,
  onCreated
}) {
  const dialog = createElement("dialog", {
    attributes: {
      "aria-labelledby": "itemEntryTitle"
    },
    className: "item-entry-dialog"
  });
  const header = createElement("header", { className: "item-entry-header" });
  const heading = createElement("h3", {
    attributes: { id: "itemEntryTitle" },
    textContent: translate("Add item to {name}", { name: goodsType.displayName })
  });
  const closeButton = createElement("button", {
    attributes: {
      "aria-label": translate("Close item entry"),
      title: translate("Close"),
      type: "button"
    },
    className: "item-entry-close"
  });
  const clearButton = createActionButton(translate("Clear all"), {
    className: "item-entry-clear secondary-action"
  });
  const headerActions = createElement("div", { className: "item-entry-header-actions" });
  const body = createElement("div", { className: "item-entry-body" });
  const contentTransition = createContentTransition(body, { animateInitial: true });
  let closeTimer = 0;
  let draft = createDraft();
  let fields = null;
  let isClosing = false;
  let isLoading = false;
  let isSaving = false;
  let clearConfirmationTimer = 0;
  let currentScreen = "loading";
  let pendingCreatedItems = [];
  let destroyed = false;
  let destroyCurrentScreen = null;
  let loadVersion = 0;

  closeButton.append(createIcon("close"));
  headerActions.append(clearButton, closeButton);
  header.append(heading, headerActions);
  dialog.append(header, body);

  function resetClearConfirmation() {
    globalThis.clearTimeout(clearConfirmationTimer);
    clearConfirmationTimer = 0;
    delete clearButton.dataset.confirming;
    clearButton.textContent = translate("Clear all");
  }

  function resetDraft() {
    clearItemImageDraft(draft);
    draft = createDraft();
    resetClearConfirmation();
  }

  function setScreen(screen) {
    currentScreen = screen;
    clearButton.hidden = screen === "loading" || screen === "saving" || screen === "success";
    clearButton.disabled = screen === "loading" || screen === "saving";
  }

  function replaceScreen(createScreen) {
    contentTransition.replace(() => {
      if (destroyed) {
        return;
      }

      destroyCurrentScreen?.();
      const screen = createScreen();
      const element = screen?.element ?? screen;

      destroyCurrentScreen = screen?.destroy ?? null;
      body.replaceChildren(element);
    });
  }

  function renderMessage(
    title,
    description,
    { className = "item-entry-status", showProgress = false } = {}
  ) {
    setScreen(showProgress ? "saving" : "loading");
    const status = createElement("div", { className });

    if (showProgress) {
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
    replaceScreen(() => createItemEntryForm({
      draft,
      fields,
      onReview: renderReview
    }));
  }

  function renderReview(errorMessage = "") {
    setScreen("review");
    replaceScreen(() => createItemEntryReview({
      draft,
      errorMessage,
      fields,
      onBack: renderEditor,
      onSave: saveItem
    }));
  }

  async function saveItem() {
    if (isSaving) {
      return;
    }

    isSaving = true;
    closeButton.disabled = true;
    renderMessage(
      translate("Saving item..."),
      translate("Writing this item to local browser storage."),
      { showProgress: true }
    );

    try {
      const result = await mutationController.run(() =>
        itemManagement.createItem({
          goodsTypeId: goodsType.id,
          name: draft.name,
          customValues: draft.customValues,
          image: draft.image
        })
      );
      pendingCreatedItems.push(result.item);

      if (!destroyed) {
        renderSuccess();
      }
    } catch (error) {
      console.error("Item creation failed:", error);
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
    const actions = createElement("div", { className: "form-actions" });
    const doneButton = createActionButton(translate("Done"), { className: "primary-action" });
    const anotherButton = createActionButton(translate("Add another"));

    doneButton.addEventListener("click", () => {
      requestClose();
      resetDraft();
    });
    anotherButton.addEventListener("click", () => {
      resetDraft();
      renderEditor();
    });
    actions.append(anotherButton, doneButton);
    success.append(
      createElement("h4", { textContent: translate("Item saved") }),
      createElement("p", {
        textContent: translate("{name} is now stored in this collection.", {
          name: draft.name
        })
      }),
      actions
    );
    replaceScreen(() => success);
  }

  async function loadFields() {
    if (fields || isLoading) {
      return;
    }

    isLoading = true;
    const requestedVersion = ++loadVersion;
    renderMessage(
      translate("Loading item fields..."),
      translate("Reading the collection configuration.")
    );

    try {
      fields = await itemManagement.getEntryFields(goodsType.id);

      if (destroyed || requestedVersion !== loadVersion) {
        return;
      }

      renderEditor();
    } catch (error) {
      if (destroyed || requestedVersion !== loadVersion) {
        return;
      }

      console.error("Item fields could not be loaded:", error);
      renderMessage(
        translate("Item fields could not be loaded"),
        translate("Close this window and try again after checking browser storage access."),
        { className: "item-entry-status item-entry-error" }
      );
    } finally {
      isLoading = false;
    }
  }

  function finishClose() {
    if (!isClosing) {
      return;
    }

    globalThis.clearTimeout(closeTimer);
    dialog.removeEventListener("animationend", handleCloseAnimationEnd);
    isClosing = false;
    delete dialog.dataset.closing;
    dialog.close();
    flushCreatedItems();
  }

  function handleCloseAnimationEnd(event) {
    if (event.target === dialog) {
      finishClose();
    }
  }

  function requestClose() {
    if (isClosing || isSaving || !dialog.open) {
      return;
    }

    resetClearConfirmation();

    if (prefersReducedMotion()) {
      dialog.close();
      flushCreatedItems();
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

  function flushCreatedItems() {
    if (pendingCreatedItems.length === 0) {
      return;
    }

    const createdItems = pendingCreatedItems;
    pendingCreatedItems = [];
    onCreated(createdItems);
  }

  closeButton.addEventListener("click", requestClose);
  clearButton.addEventListener("click", () => {
    if (clearButton.dataset.confirming === "true") {
      resetDraft();
      renderEditor();
      return;
    }

    clearButton.dataset.confirming = "true";
    clearButton.textContent = translate("Confirm clear");
    clearConfirmationTimer = globalThis.setTimeout(resetClearConfirmation, 4000);
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    requestClose();
  });

  return {
    dialog,
    destroy() {
      destroyed = true;
      loadVersion += 1;
      globalThis.clearTimeout(closeTimer);
      globalThis.clearTimeout(clearConfirmationTimer);
      contentTransition.cancel();
      destroyCurrentScreen?.();
      destroyCurrentScreen = null;
      pendingCreatedItems = [];
      isClosing = false;
      delete dialog.dataset.closing;
      if (dialog.open) {
        dialog.close();
      }
      resetDraft();
    },
    open() {
      if (!destroyed && !dialog.open) {
        if (currentScreen === "success") {
          resetDraft();
          renderEditor();
        }
        dialog.showModal();
        loadFields();
      }
    }
  };
}
