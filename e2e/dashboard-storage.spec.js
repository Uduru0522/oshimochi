const { test, expect } = require("./fixtures.js");

async function openStorageHarness(page) {
  await page.route("**/__dashboard-storage-test", (route) => route.fulfill({
    contentType: "text/html",
    body: '<!doctype html><title>Dashboard storage checks</title><link rel="icon" href="data:,">'
  }));
  await page.goto("./__dashboard-storage-test");
}

test("saved dashboard definitions retain ordering and remembered labels after reopening storage", async ({ page }) => {
  await openStorageHarness(page);
  await page.evaluate(async () => {
    const { createIndexedDbStorage } = await import("./src/data/indexeddb/indexeddb-storage.js");
    const { createDashboardCardFixture } = await import("./test-support/dashboard-card-fixtures.js");
    const storage = createIndexedDbStorage(); await storage.initialize();
    try {
      const first = createDashboardCardFixture({ displayMode: "number", format: { type: "currency", currency: "JPY" } });
      const second = createDashboardCardFixture({ id: "owned", position: 1, calculation: "count", displayMode: "ring",
        groupBy: { type: "field", fields: [{ goodsTypeId: "figures", fieldId: "status", fieldName: "Ownership", dataType: "select", choiceLabels: [{ id: "owned", label: "Owned" }] }] },
        format: { type: "number", currency: null, unit: { symbol: "pieces", position: "suffix" } }
      });
      await storage.replaceDashboardCards({ cards: [first, second], expectedCards: [] });
      await storage.replaceDashboardCards({
        cards: [{ ...first, position: 1 }, { ...second, position: 0 }], expectedCards: [first, second]
      });
    } finally { storage.close(); }
  });
  await page.reload();
  const cards = await page.evaluate(async () => {
    const { createIndexedDbStorage } = await import("./src/data/indexeddb/indexeddb-storage.js");
    const storage = createIndexedDbStorage(); await storage.initialize();
    try { return await storage.listDashboardCards(); } finally { storage.close(); }
  });
  expect(cards.map(({ id }) => id)).toEqual(["owned", "spending"]);
  expect(cards[1].format.currency).toBe("JPY");
  expect(cards[0].groupBy.fields[0]).toMatchObject({ fieldId: "status", fieldName: "Ownership", choiceLabels: [{ id: "owned", label: "Owned" }] });
  expect(cards[0].format.unit.symbol).toBe("pieces");
  expect(cards.map(({ displayMode }) => displayMode)).toEqual(["ring", "number"]);
  expect(cards[1].sources[0]).toMatchObject({ goodsTypeName: "Figures", fieldName: "Purchase price" });
});

test("dashboard backups replace card configuration and released backups restore an empty card list", async ({ page }) => {
  await openStorageHarness(page);
  const result = await page.evaluate(async () => {
    const { createIndexedDbStorage } = await import("./src/data/indexeddb/indexeddb-storage.js");
    const { createBackupOperations } = await import("./src/application/backups/manage-backups.js");
    const { createPortableSnapshot } = await import("./src/application/backups/snapshot-format.js");
    const { createDataCatalogFixture } = await import("./test-support/data-catalog-fixtures.js");
    const { createDashboardCardFixture } = await import("./test-support/dashboard-card-fixtures.js");
    const { createRecentItemsCardRecord } = await import("./src/data/models/dashboard-card.js");
    const storage = createIndexedDbStorage(); await storage.initialize();
    try {
      const catalog = createDataCatalogFixture(); catalog.dashboardCards = [createDashboardCardFixture(), createRecentItemsCardRecord({ visible: false, position: 1 })];
      await storage.replaceDataCatalog(catalog);
      const snapshot = await createPortableSnapshot(await storage.readDataCatalog());
      const backups = createBackupOperations({ storage });
      const candidate = await backups.inspect(JSON.stringify(snapshot));
      await storage.replaceDashboardCards({ cards: [], expectedCards: catalog.dashboardCards });
      await backups.restore(candidate);
      const restored = await storage.readDataCatalog();
      snapshot.exportFormatVersion = 1; snapshot.domainModelVersion = 1; delete snapshot.data.dashboardCards;
      const legacy = await backups.inspect(JSON.stringify(snapshot)); await backups.restore(legacy);
      const afterLegacy = await storage.readDataCatalog();
      await storage.resetData();
      return {
        restoredCards: restored.dashboardCards,
        restoredImage: await restored.assets[0].data.text(),
        legacyCards: afterLegacy.dashboardCards,
        legacyItem: afterLegacy.items[0].name,
        resetCards: await storage.listDashboardCards()
      };
    } finally { storage.close(); }
  });
  expect(result.restoredCards).toHaveLength(2);
  expect(result.restoredCards[1]).toMatchObject({ type: "recent-items", visible: false, position: 1 });
  expect(result.restoredImage).toBe("image");
  expect(result.legacyCards).toEqual([]);
  expect(result.legacyItem).toBe("Example");
  expect(result.resetCards).toEqual([]);
});

test("upgrading a released database preserves collections items and images while adding card storage", async ({ page }) => {
  await openStorageHarness(page);
  const result = await page.evaluate(async () => {
    const { createDataCatalogFixture } = await import("./test-support/data-catalog-fixtures.js");
    const catalog = createDataCatalogFixture();
    await new Promise((resolve, reject) => {
      const request = indexedDB.open("oshimochi", 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        const types = db.createObjectStore("goods_types", { keyPath: "id" });
        types.createIndex("by_updated_at", "updatedAt");
        const fields = db.createObjectStore("field_definitions", { keyPath: "id" });
        fields.createIndex("by_goods_type", "goodsTypeId");
        fields.createIndex("by_goods_type_and_key", ["goodsTypeId", "key"], { unique: true });
        const items = db.createObjectStore("items", { keyPath: "id" });
        items.createIndex("by_goods_type", "goodsTypeId");
        items.createIndex("by_goods_type_and_updated_at", ["goodsTypeId", "updatedAt"]);
        const assets = db.createObjectStore("assets", { keyPath: "id" });
        db.createObjectStore("app_metadata", { keyPath: "key" }).put({ key: "domainModelVersion", value: 1 });
        for (const record of catalog.goodsTypes) types.add(record);
        for (const record of catalog.fieldDefinitions) fields.add(record);
        for (const record of catalog.items) items.add(record);
        for (const record of catalog.assets) assets.add(record);
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { request.result.close(); resolve(); };
    });
    const { createIndexedDbStorage } = await import("./src/data/indexeddb/indexeddb-storage.js");
    const storage = createIndexedDbStorage(); await storage.initialize();
    try {
      const upgraded = await storage.readDataCatalog();
      return { cards: upgraded.dashboardCards, name: upgraded.items[0].name,
        fieldCount: upgraded.fieldDefinitions.length, image: await upgraded.assets[0].data.text() };
    } finally { storage.close(); }
  });
  expect(result).toEqual({ cards: [], name: "Example", fieldCount: 4, image: "image" });
});

test("concurrent dashboard saves through separate connections reject the stale writer", async ({ page }) => {
  await openStorageHarness(page);
  const result = await page.evaluate(async () => {
    const { createIndexedDbStorage } = await import("./src/data/indexeddb/indexeddb-storage.js");
    const { createDashboardCardFixture } = await import("./test-support/dashboard-card-fixtures.js");
    const first = createIndexedDbStorage(), second = createIndexedDbStorage();
    await first.initialize(); await second.initialize();
    try {
      const outcomes = await Promise.allSettled([
        first.replaceDashboardCards({ cards: [createDashboardCardFixture()], expectedCards: [] }),
        second.replaceDashboardCards({ cards: [], expectedCards: [] })
      ]);
      return { statuses: outcomes.map(({ status }) => status),
        rejection: outcomes.find(({ status }) => status === "rejected")?.reason.code,
        cards: await first.listDashboardCards() };
    } finally { first.close(); second.close(); }
  });
  expect(result.statuses).toEqual(["fulfilled", "rejected"]);
  expect(result.rejection).toBe("conflict");
  expect(result.cards).toHaveLength(1);
});
