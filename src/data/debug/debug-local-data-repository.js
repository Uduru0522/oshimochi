export function createDebugLocalDataRepository(catalog) {
  async function reset() {
    catalog.goodsTypes.splice(0, catalog.goodsTypes.length);
    catalog.fieldDefinitions.splice(0, catalog.fieldDefinitions.length);
    catalog.items.splice(0, catalog.items.length);
    catalog.assets.splice(0, catalog.assets.length);
  }

  return { reset };
}
