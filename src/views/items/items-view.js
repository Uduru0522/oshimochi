import { createElement } from "../../shared/dom.js";
import { createIcon } from "../../shared/icons.js";
import { createItemBrowser } from "./item-browser.js";
import { createItemEntryDialog } from "./item-entry-dialog.js";
import { createItemEditDialog } from "./item-edit-dialog.js";

export function renderItemsView({ goodsType }, { itemManagement, mutationController }) {
  const article = createElement("article", { className: "items-view" });
  const addButton = createElement("button", {
    attributes: { type: "button" },
    className: "primary-action items-add-action"
  });
  const viewActions = createElement("div", { className: "item-view-actions" });
  let itemEditor = null;
  const browser = createItemBrowser({
    goodsTypeId: goodsType.id,
    itemManagement,
    onEditItem: (item) => itemEditor?.open(item)
  });
  const itemEntry = createItemEntryDialog({
    goodsType,
    itemManagement,
    mutationController,
    onCreated: browser.addItems
  });
  itemEditor = createItemEditDialog({
    goodsType,
    itemManagement,
    mutationController,
    onUpdated: browser.updateItem
  });

  addButton.append(
    createIcon("add"),
    createElement("span", { textContent: "Add item" })
  );
  addButton.addEventListener("click", itemEntry.open);
  viewActions.append(browser.filterButton, browser.sortButton, addButton);
  article.append(
    browser.element,
    browser.filterDialog,
    browser.sortDialog,
    itemEntry.dialog,
    itemEditor.dialog
  );
  browser.refresh();
  return {
    content: article,
    destroy() {
      browser.destroy();
      itemEntry.destroy();
      itemEditor.destroy();
    },
    topbarAction: viewActions
  };
}
