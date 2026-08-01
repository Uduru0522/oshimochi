import { CUSTOM_FIELD_TYPES } from "../../application/fields/field-configuration.js";
import { createActionButton } from "../../shared/action-button.js";
import { createElement } from "../../shared/dom.js";

function createLabel(text, input, description) {
  const label = createElement("label", { className: "editor-field" });
  const labelText = createElement("span", { className: "editor-label" });

  labelText.append(createElement("strong", { textContent: text }));
  label.append(labelText, input);

  if (description) {
    label.append(createElement("small", { textContent: description }));
  }

  return label;
}

function parseOptionLabels(value) {
  return value
    .split(/\r?\n/)
    .map((label) => label.trim())
    .filter(Boolean);
}

function normalizeOptionLabel(label) {
  return label.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function createFieldEditor({ autoFocus = true, field, onCancel, onSave }) {
  const isNew = !field || field.stagedKind === "add";
  const form = createElement("form", { className: "field-editor" });
  const heading = createElement("div", { className: "form-heading" });
  const nameInput = createElement("input", {
    attributes: {
      "aria-invalid": "false",
      required: "",
      type: "text"
    }
  });
  const typeSelect = createElement("select");
  const requiredInput = createElement("input", {
    attributes: { type: "checkbox" },
    className: "field-required-input"
  });
  const requiredRow = createElement("label", { className: "field-required-row" });
  const optionsArea = createElement("div", { className: "field-options-editor" });
  const feedback = createElement("p", {
    attributes: { "aria-live": "polite" },
    className: "form-feedback"
  });
  const cancelButton = createActionButton("Cancel");
  const stageButton = createActionButton(isNew ? "Stage field" : "Stage changes", {
    className: "primary-action",
    type: "submit"
  });

  CUSTOM_FIELD_TYPES.forEach(({ label, value }) => {
    typeSelect.append(
      createElement("option", { attributes: { value }, textContent: label })
    );
  });

  nameInput.value = field?.displayName ?? "";
  typeSelect.value = field?.dataType ?? CUSTOM_FIELD_TYPES[0].value;
  typeSelect.disabled = Boolean(field && !isNew);
  requiredInput.checked = field?.isRequired ?? false;

  function updateRequiredState() {
    if (typeSelect.value === "boolean") {
      requiredInput.checked = true;
      requiredInput.disabled = true;
      requiredRow.hidden = true;
      return;
    }

    requiredRow.hidden = false;
    requiredInput.disabled = Boolean(field && !isNew && !field.originalIsRequired);
  }

  requiredRow.append(
    requiredInput,
    createElement("span", {
      textContent: "Require a value when registering an item"
    })
  );
  heading.append(
    createElement("h4", { textContent: field?.stagedKind === "add" ? "Edit staged field" : field ? "Edit field" : "Add field" }),
    createElement("p", {
      textContent: "Changes remain local until the complete staged set is applied."
    })
  );

  function renderOptions() {
    optionsArea.replaceChildren();

    if (typeSelect.value === "boolean") {
      const labels = field?.options ?? { falseLabel: "No", trueLabel: "Yes" };
      const labelGrid = createElement("div", { className: "binary-option-editor" });
      const falseLabelInput = createElement("input", {
        attributes: { required: "", type: "text" }
      });
      const trueLabelInput = createElement("input", {
        attributes: { required: "", type: "text" }
      });

      falseLabelInput.dataset.role = "false-label";
      trueLabelInput.dataset.role = "true-label";
      falseLabelInput.value = labels.falseLabel;
      trueLabelInput.value = labels.trueLabel;
      labelGrid.append(
        createLabel("Left option", falseLabelInput, "Shown when the toggle is off."),
        createLabel("Right option", trueLabelInput, "Shown when the toggle is on.")
      );
      optionsArea.append(labelGrid);
      return;
    }

    if (typeSelect.value !== "select") {
      return;
    }

    const existingChoices = isNew ? [] : (field?.options?.choices ?? []);
    const optionInput = createElement("textarea", {
      attributes: { rows: "4" }
    });

    optionInput.dataset.role = "option-labels";
    optionInput.value = isNew
      ? (field?.options?.choices ?? []).map(({ label }) => label).join("\n")
      : (field?.addOptionLabels ?? []).join("\n");
    optionsArea.append(
      createLabel(
        isNew ? "Options" : "Additional options",
        optionInput,
        "Enter one option per line."
      )
    );

    if (existingChoices.length > 0) {
      const existingEditor = createElement("div", {
        className: "existing-option-editor"
      });

      existingEditor.append(
        createElement("strong", { textContent: "Existing options" }),
        createElement("small", {
          textContent: "Option names can be changed. Existing options cannot be removed."
        })
      );
      existingChoices.forEach(({ id, label }, index) => {
        const input = createElement("input", {
          attributes: { required: "", type: "text" }
        });
        input.dataset.optionId = id;
        input.value = label;
        existingEditor.append(createLabel(`Option ${index + 1}`, input));
      });
      optionsArea.prepend(existingEditor);
    }
  }

  typeSelect.addEventListener("change", () => {
    updateRequiredState();
    renderOptions();
  });
  nameInput.addEventListener("input", () => {
    const isInvalid = !nameInput.value.trim();
    nameInput.toggleAttribute("data-invalid", isInvalid);
    nameInput.setAttribute("aria-invalid", String(isInvalid));
    feedback.textContent = "";
  });
  cancelButton.addEventListener("click", onCancel);
  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const displayName = nameInput.value.trim();
    const optionLabels = parseOptionLabels(
      optionsArea.querySelector('[data-role="option-labels"]')?.value ?? ""
    );
    const selectOptions = [...optionsArea.querySelectorAll("[data-option-id]")].map(
      (input) => ({ id: input.dataset.optionId, label: input.value.trim() })
    );
    const allOptionLabels = [
      ...selectOptions.map(({ label }) => label),
      ...optionLabels
    ];
    const normalizedOptionLabels = allOptionLabels.map(normalizeOptionLabel);
    const falseLabel = optionsArea.querySelector('[data-role="false-label"]')?.value.trim();
    const trueLabel = optionsArea.querySelector('[data-role="true-label"]')?.value.trim();

    if (!displayName) {
      nameInput.toggleAttribute("data-invalid", true);
      nameInput.setAttribute("aria-invalid", "true");
      feedback.textContent = "Enter a field name before staging this change.";
      nameInput.focus();
      return;
    }

    if (typeSelect.value === "select" && isNew && optionLabels.length === 0) {
      feedback.textContent = "Enter at least one option for a selection list.";
      return;
    }

    if (selectOptions.some(({ label }) => !label)) {
      feedback.textContent = "Existing selection options need a name.";
      return;
    }

    if (new Set(normalizedOptionLabels).size !== allOptionLabels.length) {
      feedback.textContent = "Selection option names must be unique.";
      return;
    }

    if (
      typeSelect.value === "boolean" &&
      (!falseLabel || !trueLabel || falseLabel.toLocaleLowerCase() === trueLabel.toLocaleLowerCase())
    ) {
      feedback.textContent = "Enter two different labels for the toggle.";
      return;
    }

    try {
      onSave({
        displayName,
        dataType: typeSelect.value,
        isRequired: requiredInput.checked,
        ...(typeSelect.value === "select"
          ? isNew
            ? { optionLabels }
            : { addOptionLabels: optionLabels, selectOptions }
          : {}),
        ...(typeSelect.value === "boolean"
          ? isNew
            ? { falseLabel, trueLabel }
            : { booleanOptions: { falseLabel, trueLabel } }
          : {})
      });
    } catch (error) {
      feedback.textContent = error.message;
    }
  });

  const actions = createElement("div", { className: "form-actions" });
  actions.append(cancelButton, stageButton);
  form.append(
    heading,
    createLabel("Field name", nameInput, "Shown in item forms and detail views."),
    createLabel("Data type", typeSelect, field && !isNew ? "Data type cannot be changed after creation." : "Controls input and validation."),
    requiredRow,
    optionsArea,
    feedback,
    actions
  );
  renderOptions();
  updateRequiredState();
  if (autoFocus) {
    requestAnimationFrame(() => nameInput.focus());
  }

  return form;
}
