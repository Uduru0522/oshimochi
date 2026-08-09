import { createElement } from "../../shared/dom.js";
import { createIcon } from "../../shared/icons.js";
import { translate } from "../../localization/translate.js";
import { createItemBrowser } from "./item-browser.js";
import { createItemEntryDialog } from "./item-entry-dialog.js";
import { createItemEditDialog } from "./item-edit-dialog.js";
import { createItemDeleteDialog } from "./item-delete-dialog.js";
import { createGoodsTypeViewAction } from "../goods-types/goods-type-view-action.js";

export function renderItemsView(
  { goodsType },
  { itemManagement, mutationController, onOpenOverview }
) {
  const article = createElement("article", { className: "items-view" });
  const addButton = createElement("button", {
    attributes: { type: "button" },
    className: "primary-action items-add-action"
  });
  const viewActions = createElement("div", { className: "item-view-actions" });
  let itemEditor = null;
  let itemDelete = null;
  const browser = createItemBrowser({
    goodsTypeId: goodsType.id,
    itemManagement,
    onDeleteItem: (item) => itemDelete?.open(item),
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
  itemDelete = createItemDeleteDialog({
    itemManagement,
    mutationController,
    onDeleted: browser.removeItem
  });

  addButton.append(
    createIcon("add"),
    createElement("span", { textContent: translate("Add item") })
  );
  addButton.addEventListener("click", itemEntry.open);
  viewActions.append(
    browser.presentationControl,
    browser.filterButton,
    browser.sortButton,
    addButton,
    createGoodsTypeViewAction({
      icon: "information",
      label: translate("Collection overview"),
      onSelect: onOpenOverview
    })
  );
  article.append(
    browser.element,
    browser.filterDialog,
    browser.sortDialog,
    itemEntry.dialog,
    itemEditor.dialog,
    itemDelete.dialog
  );
  browser.refresh();
  return {
    content: article,
    destroy() {
      browser.destroy();
      itemEntry.destroy();
      itemEditor.destroy();
      itemDelete.destroy();
    },
    topbarAction: viewActions
  };
}
