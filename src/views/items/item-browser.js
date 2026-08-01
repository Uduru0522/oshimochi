import { filterItems } from "../../application/items/filter-items.js";
import { createContentTransition } from "../../shared/content-transition.js";
import { createElement } from "../../shared/dom.js";
import { createItemFilterPanel } from "./item-filter-panel.js";
import { createItemList } from "./item-list.js";

function createMessage(className, textContent) {
  return {
    destroy() {},
    element: createElement("p", { className, textContent })
  };
}

export function createItemBrowser({ goodsTypeId, itemManagement }) {
  const element = createElement("div", { className: "item-browser" });
  const transition = createContentTransition(element, { animateInitial: true });
  let activeFilter = { query: "", rules: [] };
  let activePresentation = null;
  let destroyed = false;
  let fields = [];
  let items = [];
  let loadVersion = 0;
  const filterPanel = createItemFilterPanel({
    onApply(filter) {
      activeFilter = filter;
      renderItems({ incremental: true });
    }
  });

  function replacePresentation(createPresentation) {
    transition.replace(() => {
      if (destroyed) {
        return;
      }

      activePresentation?.destroy();
      activePresentation = createPresentation();
      element.replaceChildren(activePresentation.element);
    });
  }

  function clearFilters() {
    activeFilter = { query: "", rules: [] };
    filterPanel.setFilter(activeFilter);
    renderItems({ incremental: true });
  }

  function renderItems({ incremental = false } = {}) {
    const visibleItems = filterItems(items, fields, activeFilter);

    if (incremental && typeof activePresentation?.update === "function") {
      activePresentation.update(visibleItems, items);
      return;
    }

    replacePresentation(() =>
      createItemList(visibleItems, fields, {
        getAsset: itemManagement.getAsset,
        onClearFilters: clearFilters,
        sourceItems: items
      })
    );
  }

  async function refresh() {
    if (destroyed) {
      return;
    }

    const requestedVersion = ++loadVersion;
    replacePresentation(() => createMessage("items-loading", "Loading items..."));

    try {
      const [loadedItems, loadedFields] = await Promise.all([
        itemManagement.listItems(goodsTypeId),
        itemManagement.getEntryFields(goodsTypeId)
      ]);

      if (requestedVersion !== loadVersion) {
        return;
      }

      items = loadedItems;
      fields = loadedFields;
      activeFilter = {
        ...activeFilter,
        rules: activeFilter.rules.filter(({ fieldId }) =>
          fields.some(({ id, isBuiltIn, key }) =>
            id === fieldId && (!isBuiltIn || !["id", "image"].includes(key))
          )
        )
      };
      filterPanel.setFilter(activeFilter);
      filterPanel.setData(fields, items);
      renderItems();
    } catch (error) {
      if (requestedVersion !== loadVersion) {
        return;
      }

      console.error("Items could not be loaded:", error);
      replacePresentation(() => createMessage(
        "items-load-error",
        "Items could not be loaded. Check browser storage access and reopen this view."
      ));
    }
  }

  function addItems(createdItems) {
    if (destroyed || createdItems.length === 0) {
      return;
    }

    const createdIds = new Set(createdItems.map(({ id }) => id));
    items = [
      ...[...createdItems].reverse(),
      ...items.filter(({ id }) => !createdIds.has(id))
    ];
    filterPanel.setData(fields, items);
    renderItems({ incremental: true });
  }

  return {
    addItems,
    element,
    filterButton: filterPanel.button,
    filterDialog: filterPanel.dialog,
    refresh,
    destroy() {
      destroyed = true;
      loadVersion += 1;
      transition.cancel();
      activePresentation?.destroy();
      activePresentation = null;
      filterPanel.destroy();
    }
  };
}
