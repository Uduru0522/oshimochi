import { parseDataCatalog } from "../models/data-catalog.js";

export function createDebugLocalDataRepository(catalog) {
  async function readCatalog() {
    return structuredClone(parseDataCatalog(catalog));
  }

  async function replaceCatalog(value) {
    const replacement = parseDataCatalog(value);

    catalog.goodsTypes.splice(0, catalog.goodsTypes.length, ...replacement.goodsTypes);
    catalog.fieldDefinitions.splice(
      0,
      catalog.fieldDefinitions.length,
      ...replacement.fieldDefinitions
    );
    catalog.items.splice(0, catalog.items.length, ...replacement.items);
    catalog.assets.splice(0, catalog.assets.length, ...replacement.assets);
    catalog.dashboardCards.splice(0, catalog.dashboardCards.length, ...replacement.dashboardCards);

    return structuredClone(replacement);
  }

  async function reset() {
    catalog.goodsTypes.splice(0, catalog.goodsTypes.length);
    catalog.fieldDefinitions.splice(0, catalog.fieldDefinitions.length);
    catalog.items.splice(0, catalog.items.length);
    catalog.assets.splice(0, catalog.assets.length);
    catalog.dashboardCards.splice(0, catalog.dashboardCards.length);
  }

  return { readCatalog, replaceCatalog, reset };
}
