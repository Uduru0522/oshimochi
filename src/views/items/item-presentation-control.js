import { createElement } from "../../shared/dom.js";
import { createIcon } from "../../shared/icons.js";
import { translate } from "../../localization/translate.js";

export const ITEM_PRESENTATIONS = Object.freeze({
  cards: "cards",
  list: "list"
});

export const DEFAULT_ITEM_PRESENTATION = ITEM_PRESENTATIONS.cards;

const PRESENTATION_OPTIONS = Object.freeze([
  { icon: "list", label: "List view", value: ITEM_PRESENTATIONS.list },
  { icon: "grid", label: "Card view", value: ITEM_PRESENTATIONS.cards }
]);

export function createItemPresentationControl({
  initialValue = DEFAULT_ITEM_PRESENTATION,
  onChange
}) {
  const element = createElement("div", {
    attributes: { "aria-label": translate("Item presentation"), role: "group" },
    className: "item-presentation-control"
  });
  const buttons = new Map();
  let value = initialValue;

  function updateSelection() {
    buttons.forEach((button, optionValue) => {
      button.setAttribute("aria-pressed", String(optionValue === value));
    });
  }

  PRESENTATION_OPTIONS.forEach((option) => {
    const label = translate(option.label);
    const button = createElement("button", {
      attributes: {
        "aria-label": label,
        title: label,
        type: "button"
      },
      className: "item-presentation-option"
    });
    button.append(createIcon(option.icon));
    button.addEventListener("click", () => {
      if (value === option.value) {
        return;
      }
      value = option.value;
      updateSelection();
      onChange(value);
    });
    buttons.set(option.value, button);
    element.append(button);
  });
  updateSelection();

  return {
    element,
    setDisabled(disabled) {
      buttons.forEach((button) => {
        button.disabled = disabled;
      });
    }
  };
}
