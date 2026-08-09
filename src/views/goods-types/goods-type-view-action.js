import { createElement } from "../../shared/dom.js";
import { createIcon } from "../../shared/icons.js";

export function createGoodsTypeViewAction({ icon, label, onSelect }) {
  const button = createElement("button", {
    attributes: {
      "aria-label": label,
      title: label,
      type: "button"
    },
    className: "goods-type-view-action"
  });

  button.append(createIcon(icon));
  button.addEventListener("click", onSelect);

  return button;
}
