import { createActionButton } from "../../shared/action-button.js";
import { createElement } from "../../shared/dom.js";

export function createItemEmptyState({ hasSourceItems, onClearFilters = () => {} }) {
  const element = createElement("section", {
    className: `items-empty-state${hasSourceItems ? " item-filter-empty" : ""}`
  });

  if (!hasSourceItems) {
    element.append(
      createElement("h4", { textContent: "No items to display" }),
      createElement("p", { textContent: "Items saved to this collection will appear here." })
    );
    return element;
  }

  const clearButton = createActionButton("Clear filters", { className: "secondary-action" });
  clearButton.addEventListener("click", onClearFilters);
  element.append(
    createElement("h4", { textContent: "No matching items" }),
    createElement("p", { textContent: "Adjust or clear the active filters." }),
    clearButton
  );
  return element;
}
