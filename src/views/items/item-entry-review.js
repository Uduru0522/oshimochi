import { createActionButton } from "../../shared/action-button.js";
import { translate } from "../../localization/translate.js";
import { createElement } from "../../shared/dom.js";
import { createMetaList } from "../../shared/ui-components.js";
import { formatItemFieldValue } from "./item-value-format.js";

function createReviewValues(draft, fields) {
  const customFields = fields.filter((field) => !field.isBuiltIn);
  const nameField = fields.find((field) => field.isBuiltIn && field.key === "name");

  return [
    { label: nameField?.displayName ?? translate("Name"), value: draft.name },
    ...customFields.map((field) => ({
      label: field.displayName,
      value: formatItemFieldValue(field, draft.customValues[field.id])
    }))
  ];
}

export function createItemEntryReview({
  draft,
  errorMessage = "",
  fields,
  onBack,
  onSave,
  saveLabel = translate("Save item")
}) {
  const element = createElement("div", { className: "item-entry-review" });
  const heading = createElement("div", { className: "form-heading" });
  const feedback = createElement("p", {
    attributes: { "aria-live": "polite" },
    className: errorMessage ? "form-error" : "form-feedback",
    textContent: errorMessage
  });
  const actions = createElement("div", { className: "form-actions" });
  const backButton = createActionButton(translate("Back"));
  const saveButton = createActionButton(errorMessage ? translate("Try again") : saveLabel, {
    className: "primary-action"
  });

  heading.append(
    createElement("h4", { textContent: translate("Review item") }),
    createElement("p", {
      textContent: translate("Confirm the values before saving them locally.")
    })
  );
  const imageUrl = draft.processedImageUrl || draft.existingImageUrl;
  if (imageUrl) {
    element.append(
      createElement("img", {
        attributes: { alt: translate("Item image"), src: imageUrl },
        className: "item-review-image"
      })
    );
  }
  backButton.addEventListener("click", onBack);
  saveButton.addEventListener("click", onSave);
  actions.append(backButton, saveButton);
  element.prepend(heading);
  element.append(createMetaList(createReviewValues(draft, fields)), feedback, actions);
  return element;
}
