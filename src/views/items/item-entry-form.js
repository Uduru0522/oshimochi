import { createActionButton } from "../../shared/action-button.js";
import { translate } from "../../localization/translate.js";
import { createElement } from "../../shared/dom.js";
import { createRequiredMark } from "../../shared/ui-components.js";
import { normalizeItemValues } from "../../application/items/item-values.js";
import { createItemFormField } from "./item-form-field.js";
import {
  createItemImageField,
  prepareItemImage
} from "./item-image-field.js";

function createFieldLabel(field, input) {
  const wrapper = createElement("label", { className: "editor-field item-form-field" });
  const labelRow = createElement("span", { className: "editor-label" });

  labelRow.append(
    createElement("strong", {
      attributes: { title: field.displayName },
      textContent: field.displayName
    })
  );
  if (field.isRequired) {
    labelRow.append(createRequiredMark(translate("Required")));
  }
  wrapper.append(labelRow, input);
  return wrapper;
}

export function createItemEntryForm({ draft, fields, onReview }) {
  const form = createElement("form", { className: "item-entry-form" });
  const heading = createElement("div", { className: "form-heading" });
  const fieldGrid = createElement("div", { className: "item-form-fields" });
  const nameField = fields.find((field) => field.isBuiltIn && field.key === "name") ?? {
    displayName: translate("Name"),
    isRequired: true
  };
  const nameInput = createElement("input", {
    attributes: { autocomplete: "off", required: "", type: "text" }
  });
  const customFields = fields.filter((field) => !field.isBuiltIn);
  const imageField = fields.find((field) => field.isBuiltIn && field.key === "image");
  const fieldEditors = new Map();
  const feedback = createElement("p", {
    attributes: { "aria-live": "polite" },
    className: "form-feedback"
  });
  const reviewButton = createActionButton(translate("Review item"), {
    className: "primary-action",
    type: "submit"
  });
  const actions = createElement("div", { className: "form-actions" });
  const imageEditor = createItemImageField({ draft, field: imageField });

  nameInput.value = draft.name;
  fieldGrid.append(
    createFieldLabel(nameField, nameInput),
    imageEditor.element
  );

  customFields.forEach((field) => {
    const editor = createItemFormField(
      field,
      draft.customValues[field.id] ?? field.defaultValue
    );

    fieldEditors.set(field.id, editor);
    fieldGrid.append(editor.element);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.reportValidity() || !imageEditor.validate()) {
      return;
    }

    const submittedValues = Object.fromEntries(
      customFields.flatMap((field) => {
        const value = fieldEditors.get(field.id).readValue();
        return value === undefined ? [] : [[field.id, value]];
      })
    );
    let customValues;

    try {
      customValues = normalizeItemValues(customFields, submittedValues);
    } catch (error) {
      feedback.textContent = error instanceof Error
        ? error.message
        : translate("One or more item values are invalid.");
      return;
    }

    draft.name = nameInput.value.trim();
    draft.customValues = customValues;
    feedback.textContent = "";
    reviewButton.disabled = true;
    reviewButton.textContent = draft.imageSource
      ? translate("Processing image...")
      : translate("Preparing review...");

    try {
      await prepareItemImage(draft);
      onReview();
    } catch (error) {
      feedback.textContent = translate(
        "The selected image could not be processed. Choose another image and try again."
      );
      reviewButton.disabled = false;
      reviewButton.textContent = translate("Review item");
    }
  });

  actions.append(reviewButton);
  heading.append(
    createElement("h4", { textContent: translate("Item information") }),
    createElement("p", {
      textContent: translate("Required fields are marked with an asterisk.")
    })
  );
  form.append(
    heading,
    fieldGrid,
    feedback,
    actions
  );
  requestAnimationFrame(() => nameInput.focus());

  return {
    element: form,
    destroy() {
      imageEditor.destroy();
    }
  };
}
