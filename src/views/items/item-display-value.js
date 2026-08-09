import { createElement } from "../../shared/dom.js";
import { formatItemFieldValue } from "./item-value-format.js";

function formatDate(value) {
  const language = globalThis.document?.documentElement?.lang || undefined;

  return new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeZone: "UTC"
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function createBinaryDisplay(field, value) {
  const display = createElement("span", {
    attributes: { "aria-label": formatItemFieldValue(field, value) },
    className: "item-binary-display",
    dataset: { selected: value ? "second" : "first" }
  });

  display.style.setProperty(
    "--binary-label-length",
    String(Math.max(field.options.falseLabel.length, field.options.trueLabel.length))
  );
  display.append(
    createElement("span", { className: "item-binary-display-indicator" }),
    createElement("span", {
      attributes: { title: field.options.falseLabel },
      className: "item-binary-display-label is-first",
      textContent: field.options.falseLabel
    }),
    createElement("span", {
      attributes: { title: field.options.trueLabel },
      className: "item-binary-display-label is-second",
      textContent: field.options.trueLabel
    })
  );
  return display;
}

export function createItemDisplayValue(field, value) {
  const formattedValue = formatItemFieldValue(field, value);

  if (value === undefined) {
    return createElement("span", {
      className: "item-unset-value",
      textContent: formattedValue
    });
  }

  switch (field.dataType) {
    case "boolean":
      return createBinaryDisplay(field, value);
    case "date":
      return createElement("time", {
        attributes: { datetime: value },
        className: "item-date-value",
        textContent: formatDate(value)
      });
    case "url":
      return createElement("a", {
        attributes: {
          href: value,
          rel: "noopener noreferrer",
          target: "_blank",
          title: formattedValue
        },
        textContent: formattedValue
      });
    default:
      return createElement("span", {
        attributes: { title: formattedValue },
        textContent: formattedValue
      });
  }
}
