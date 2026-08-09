import { ITEM_FILTER_OPERATORS as OP } from "../../application/items/filter-items.js";
import { translate } from "../../localization/translate.js";
import { createElement } from "../../shared/dom.js";
import { createIcon } from "../../shared/icons.js";

const TEXT_OPTIONS = [
  { label: "Contains", value: OP.CONTAINS },
  { label: "Does not contain", value: OP.NOT_CONTAINS },
  { label: "Equals", value: OP.EQUALS },
  { label: "Starts with", value: OP.STARTS_WITH },
  { label: "Ends with", value: OP.ENDS_WITH }
];

function createSelect(options, value) {
  const select = createElement("select");
  options.forEach((option) => {
    const element = createElement("option", {
      attributes: { value: option.value },
      textContent: translate(option.label)
    });
    element.selected = option.value === value;
    select.append(element);
  });
  return select;
}

function createValueInput(rule, { placeholder = translate("Value"), type = "text" } = {}) {
  const input = createElement("input", {
    attributes: { placeholder, type, value: rule.value ?? "" }
  });
  input.addEventListener("input", () => {
    rule.value = input.value;
  });
  return input;
}

function createMissingValueControl(rule) {
  const element = createElement("label", {
    attributes: { title: translate("Include items without a value") },
    className: "item-filter-include-missing"
  });
  const input = createElement("input", { attributes: { type: "checkbox" } });
  const track = createElement("span", {
    attributes: { "aria-hidden": "true" },
    className: "item-filter-mini-switch"
  });

  input.checked = rule.includeMissing === true;
  input.addEventListener("change", () => {
    rule.includeMissing = input.checked;
  });
  element.append(
    input,
    track,
    createElement("span", { textContent: translate("Include missing") })
  );

  return {
    element,
    setImplicit(implicit) {
      input.disabled = implicit;
      input.checked = implicit || rule.includeMissing === true;
      element.dataset.implicit = String(implicit);
    }
  };
}

function renderTextControls(container, rule, field) {
  container.replaceChildren();
  const options = field.dataType === "url"
    ? [...TEXT_OPTIONS.slice(0, 3), { label: "Domain equals", value: OP.DOMAIN_EQUALS }]
    : TEXT_OPTIONS;
  const operator = createSelect(options, rule.operator);

  operator.addEventListener("change", () => {
    rule.operator = operator.value;
    renderTextControls(container, rule, field);
  });
  container.append(
    operator,
    createValueInput(rule, {
      placeholder: rule.operator === OP.DOMAIN_EQUALS ? "example.com" : translate("Value"),
      type: field.dataType === "url" ? "text" : "search"
    })
  );
}

function formatRangeNumber(value) {
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= 1e9 || (absoluteValue > 0 && absoluteValue < 1e-6)) {
    return value.toExponential(4);
  }

  return new Intl.NumberFormat(undefined, { maximumSignificantDigits: 7 }).format(value);
}

function findLowerValueIndex(values, minimum) {
  if (minimum === undefined) {
    return 0;
  }

  const index = values.findIndex((value) => value >= minimum);
  return index === -1 ? values.length - 1 : index;
}

function findUpperValueIndex(values, maximum) {
  if (maximum === undefined) {
    return values.length - 1;
  }

  const index = values.findLastIndex((value) => value <= maximum);
  return index === -1 ? 0 : index;
}

function renderNumberControls(container, rule, domain, missingControl) {
  const range = createElement("div", { className: "item-filter-number-range" });

  if (!domain) {
    rule.includeMissing = true;
    missingControl.setImplicit(true);
    range.append(createElement("p", {
      textContent: translate("No numeric values in this collection.")
    }));
    container.append(range);
    return;
  }

  if (domain.min === domain.max) {
    rule.min = domain.min;
    rule.max = domain.max;
    range.classList.add("is-fixed");
    range.style.setProperty("--range-start", "50%");
    range.style.setProperty("--range-end", "50%");
    range.append(
      createElement("div", { className: "item-filter-range-track" }),
      createElement("span", {
        attributes: { "aria-hidden": "true" },
        className: "item-filter-range-marker"
      }),
      createElement("output", { textContent: String(domain.min) })
    );
    container.append(range);
    return;
  }

  const lower = createElement("input", {
    attributes: {
      "aria-label": translate("Minimum value"),
      max: domain.values.length - 1,
      min: 0,
      step: 1,
      type: "range"
    },
    className: "is-lower"
  });
  const upper = createElement("input", {
    attributes: {
      "aria-label": translate("Maximum value"),
      max: domain.values.length - 1,
      min: 0,
      step: 1,
      type: "range"
    },
    className: "is-upper"
  });
  const output = createElement("output");
  lower.value = findLowerValueIndex(domain.values, rule.min);
  upper.value = findUpperValueIndex(domain.values, rule.max);

  function updateRange(changedInput) {
    if (Number(lower.value) > Number(upper.value)) {
      if (changedInput === lower) {
        upper.value = lower.value;
      } else {
        lower.value = upper.value;
      }
    }

    const lowerIndex = Number(lower.value);
    const upperIndex = Number(upper.value);
    const lastIndex = domain.values.length - 1;
    rule.min = lowerIndex === 0 ? undefined : domain.values[lowerIndex];
    rule.max = upperIndex === lastIndex ? undefined : domain.values[upperIndex];
    range.style.setProperty("--range-start", `${(lowerIndex / lastIndex) * 100}%`);
    range.style.setProperty("--range-end", `${(upperIndex / lastIndex) * 100}%`);
    output.textContent = [
      rule.min === undefined ? translate("Any") : formatRangeNumber(rule.min),
      rule.max === undefined ? translate("Any") : formatRangeNumber(rule.max)
    ].join(" ~ ");
  }

  lower.addEventListener("input", () => updateRange(lower));
  upper.addEventListener("input", () => updateRange(upper));
  range.append(createElement("div", { className: "item-filter-range-track" }), lower, upper, output);
  container.append(range);
  updateRange();
}

function renderDateControls(container, rule) {
  const range = createElement("div", { className: "item-filter-date-range" });
  const from = createElement("input", {
    attributes: { "aria-label": translate("From date"), type: "date" }
  });
  const to = createElement("input", {
    attributes: { "aria-label": translate("To date"), type: "date" }
  });
  from.value = rule.from ?? "";
  to.value = rule.to ?? "";

  function syncDateBounds(changedInput) {
    if (from.value && to.value && from.value > to.value) {
      if (changedInput === from) {
        to.value = from.value;
      } else {
        from.value = to.value;
      }
    }
    rule.from = from.value;
    rule.to = to.value;
    from.max = to.value || "9999-12-31";
    to.min = from.value || "0001-01-01";
  }

  from.addEventListener("input", () => syncDateBounds(from));
  to.addEventListener("input", () => syncDateBounds(to));
  range.append(from, createElement("span", { textContent: "~" }), to);
  container.append(range);
  syncDateBounds();
}

function renderChoices(container, rule, choices) {
  const element = createElement("div", { className: "item-filter-choice-grid" });

  choices.forEach((choice) => {
    const label = createElement("label", {
      attributes: { title: choice.label }
    });
    const checkbox = createElement("input", { attributes: { type: "checkbox" } });
    const selected = rule.values.some((value) => Object.is(value, choice.value));
    checkbox.checked = selected;
    checkbox.addEventListener("change", () => {
      rule.values = checkbox.checked
        ? [...rule.values, choice.value]
        : rule.values.filter((value) => !Object.is(value, choice.value));
    });
    label.append(checkbox, createElement("span", { textContent: choice.label }));
    element.append(label);
  });

  container.append(element);
}

function renderRuleControls(container, rule, field, numberDomain, missingControl) {
  container.replaceChildren();
  const typedControls = createElement("div", { className: "item-filter-typed-controls" });

  switch (field.dataType) {
    case "text":
    case "long_text":
    case "url":
      renderTextControls(typedControls, rule, field);
      break;
    case "number":
      renderNumberControls(typedControls, rule, numberDomain, missingControl);
      break;
    case "date":
      renderDateControls(typedControls, rule);
      break;
    case "boolean":
      renderChoices(typedControls, rule, [
        { label: field.options.falseLabel, value: false },
        { label: field.options.trueLabel, value: true }
      ]);
      break;
    case "select":
      renderChoices(
        typedControls,
        rule,
        field.options.choices.map(({ id, label }) => ({ label, value: id }))
      );
      break;
  }

  container.append(typedControls);
}

export function createDefaultItemFilterRule(field) {
  const base = { fieldId: field.id, includeMissing: false };
  switch (field.dataType) {
    case "number":
      return { ...base, operator: OP.RANGE };
    case "date":
      return { ...base, from: "", to: "" };
    case "boolean":
    case "select":
      return { ...base, values: [] };
    default:
      return { ...base, operator: OP.CONTAINS, value: "" };
  }
}

export function validateItemFilterRule(rule, field, numberDomain = null) {
  if (["text", "long_text", "url"].includes(field.dataType)) {
    return String(rule.value ?? "").trim()
      ? ""
      : translate("Enter a value for {field}.", { field: field.displayName });
  }

  if (field.dataType === "number") {
    return numberDomain || rule.includeMissing
      ? ""
      : translate("{field} has no numeric values to filter.", {
        field: field.displayName
      });
  }

  if (field.dataType === "date") {
    if (!rule.from && !rule.to) {
      return translate("Choose at least one date for {field}.", {
        field: field.displayName
      });
    }
    return rule.from && rule.to && rule.from > rule.to
      ? translate("The first {field} date must come first.", {
        field: field.displayName
      })
      : "";
  }

  return "";
}

export function createItemFilterRuleEditor({ field, numberDomain, onRemove, rule }) {
  const element = createElement("section", {
    className: `item-filter-rule item-filter-rule-${field.dataType}`
  });
  const header = createElement("header");
  const headerActions = createElement("div", { className: "item-filter-rule-actions" });
  const heading = createElement("h5", {
    attributes: { title: field.displayName },
    textContent: field.displayName
  });
  const removeButton = createElement("button", {
    attributes: {
      "aria-label": translate("Remove {field} filter", { field: field.displayName }),
      title: translate("Remove filter"),
      type: "button"
    },
    className: "item-filter-remove"
  });
  const controls = createElement("div", { className: "item-filter-rule-controls" });
  const supportsMissingValues = ["text", "long_text", "url", "number", "date"]
    .includes(field.dataType);
  const missingControl = supportsMissingValues ? createMissingValueControl(rule) : null;

  removeButton.append(createIcon("close"));
  removeButton.addEventListener("click", onRemove);
  if (missingControl) {
    headerActions.append(missingControl.element);
  }
  headerActions.append(removeButton);
  header.append(heading, headerActions);
  element.append(header, controls);
  renderRuleControls(controls, rule, field, numberDomain, missingControl);
  return element;
}
