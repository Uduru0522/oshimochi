import { createElement } from "../../shared/dom.js";
import { translate } from "../../localization/translate.js";
import { createRequiredMark } from "../../shared/ui-components.js";

function createLabel(field, control) {
  const element = createElement("label", { className: "editor-field item-form-field" });
  const label = createElement("span", { className: "editor-label" });

  label.append(
    createElement("strong", {
      attributes: { title: field.displayName },
      textContent: field.displayName
    })
  );
  if (field.isRequired) {
    label.append(createRequiredMark(translate("Required")));
  }
  element.append(label, control);
  return element;
}

function createSelect(field) {
  const select = createElement("select", {
    attributes: field.isRequired ? { required: "" } : {}
  });

  select.append(createElement("option", {
    attributes: { value: "" },
    textContent: translate("Not set")
  }));
  field.options.choices.forEach((choice) => {
    select.append(createElement("option", {
      attributes: { value: choice.id },
      textContent: choice.label
    }));
  });
  return select;
}

function createBoolean(field) {
  const control = createElement("span", { className: "item-binary-control" });
  const input = createElement("input", {
    attributes: { role: "switch", type: "checkbox" },
    className: "switch-input item-boolean-input"
  });

  control.append(
    input,
    createElement("span", {
      attributes: { "aria-hidden": "true" },
      className: "item-binary-indicator"
    }),
    createElement("span", {
      attributes: { title: field.options.falseLabel },
      className: "item-binary-label is-first",
      textContent: field.options.falseLabel
    }),
    createElement("span", {
      attributes: { title: field.options.trueLabel },
      className: "item-binary-label is-second",
      textContent: field.options.trueLabel
    })
  );
  return control;
}

function createControl(field) {
  if (field.dataType === "long_text") {
    return createElement("textarea", {
      attributes: {
        rows: "4",
        ...(field.isRequired ? { required: "" } : {})
      }
    });
  }

  if (field.dataType === "select") {
    return createSelect(field);
  }

  if (field.dataType === "boolean") {
    return createBoolean(field);
  }

  const inputTypes = {
    date: "date",
    number: "number",
    text: "text",
    url: "text"
  };

  return createElement("input", {
    attributes: {
      type: inputTypes[field.dataType] ?? "text",
      ...(field.dataType === "url" ? { inputmode: "url" } : {}),
      ...(field.dataType === "number" ? { step: "any" } : {}),
      ...(field.dataType === "date"
        ? { max: "9999-12-31", min: "0001-01-01" }
        : {}),
      ...(field.isRequired ? { required: "" } : {})
    }
  });
}

function readValue(field, control) {
  if (field.dataType === "boolean") {
    return control.querySelector("input").checked;
  }

  if (control.value === "") {
    return undefined;
  }

  return field.dataType === "number" ? control.valueAsNumber : control.value;
}

function writeValue(field, control, value) {
  if (field.dataType === "boolean") {
    control.querySelector("input").checked = value === true;
    return;
  }

  control.value = value ?? "";
}

export function createItemFormField(field, initialValue) {
  const control = createControl(field);

  writeValue(field, control, initialValue);
  return {
    element: createLabel(field, control),
    readValue: () => readValue(field, control)
  };
}
