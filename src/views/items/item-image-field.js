import { createActionButton } from "../../shared/action-button.js";
import { translate } from "../../localization/translate.js";
import { createElement } from "../../shared/dom.js";
import { createRequiredMark } from "../../shared/ui-components.js";
import { createItemCropEditor } from "./item-crop-editor.js";
import { processImageSource } from "./image-processor.js";

function releaseProcessedImage(draft) {
  if (draft.processedImageUrl) {
    URL.revokeObjectURL(draft.processedImageUrl);
  }

  draft.image = null;
  draft.processedImageUrl = "";
}

function clearReplacementImage(draft) {
  releaseProcessedImage(draft);

  if (draft.imageSource?.previewUrl) {
    URL.revokeObjectURL(draft.imageSource.previewUrl);
  }

  draft.imageSource = null;
}

export function clearItemImageDraft(draft) {
  clearReplacementImage(draft);
  if (draft.existingImageUrl) {
    URL.revokeObjectURL(draft.existingImageUrl);
  }
  draft.existingImageAssetId = null;
  draft.existingImageUrl = "";
}

export async function prepareItemImage(draft) {
  if (!draft.imageSource) {
    return null;
  }

  if (!draft.image) {
    draft.image = await processImageSource(draft.imageSource);
    draft.processedImageUrl = URL.createObjectURL(draft.image.data);
  }

  return draft.image;
}

async function readImageOrientation(file) {
  const bitmap = await createImageBitmap(file);
  const orientation = bitmap.width >= bitmap.height ? "landscape" : "portrait";
  bitmap.close();
  return orientation;
}

export function createItemImageField({ draft, field }) {
  const element = createElement("section", { className: "item-image-field" });
  const heading = createElement("div", { className: "editor-label" });
  const content = createElement("div", { className: "item-image-content" });
  const input = createElement("input", {
    attributes: { accept: "image/*", type: "file" },
    className: "item-image-input"
  });
  const feedback = createElement("p", {
    attributes: { "aria-live": "polite" },
    className: "form-feedback"
  });
  let cropEditor = null;
  let selectionVersion = 0;

  heading.append(
    createElement("strong", { textContent: field?.displayName ?? translate("Image") }),
    createRequiredMark(translate("Required"))
  );

  function render() {
    cropEditor?.destroy();
    cropEditor = null;
    content.replaceChildren();

    if (!draft.imageSource && !draft.existingImageUrl) {
      const chooseButton = createActionButton(translate("Choose image"), {
        className: "item-image-choose secondary-action"
      });
      chooseButton.addEventListener("click", () => input.click());
      content.append(chooseButton);
      return;
    }

    if (!draft.imageSource) {
      const existing = createElement("div", { className: "item-image-existing" });
      const replaceButton = createActionButton(translate("Replace image"), {
        className: "secondary-action"
      });
      replaceButton.addEventListener("click", () => input.click());
      existing.append(
        createElement("img", {
          attributes: {
            alt: translate("Current item image"),
            src: draft.existingImageUrl
          }
        }),
        replaceButton
      );
      content.append(existing);
      return;
    }

    cropEditor = createItemCropEditor({
      source: draft.imageSource,
      onChange: () => releaseProcessedImage(draft),
      onRemove: () => {
        selectionVersion += 1;
        clearReplacementImage(draft);
        input.value = "";
        render();
      }
    });
    content.append(cropEditor.stage, cropEditor.controls);
  }

  input.addEventListener("change", async () => {
    const [file] = input.files;
    const requestedVersion = ++selectionVersion;

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      input.value = "";
      feedback.textContent = translate("Choose a supported image file.");
      return;
    }

    let orientation;

    try {
      orientation = await readImageOrientation(file);
    } catch {
      input.value = "";
      feedback.textContent = translate("This image format could not be opened.");
      return;
    }

    if (requestedVersion !== selectionVersion) {
      return;
    }

    clearReplacementImage(draft);
    draft.imageSource = {
      cropScale: 1,
      file,
      orientation,
      positionX: 0.5,
      positionY: 0.5,
      previewUrl: URL.createObjectURL(file)
    };
    feedback.textContent = "";
    render();
  });

  element.append(heading, input, content, feedback);
  render();
  return {
    element,
    destroy() {
      selectionVersion += 1;
      cropEditor?.destroy();
      cropEditor = null;
    },
    validate() {
      if (draft.imageSource || draft.existingImageAssetId) {
        feedback.textContent = "";
        return true;
      }

      feedback.textContent = translate("Choose an image before reviewing this item.");
      content.querySelector("button")?.focus();
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
  };
}
