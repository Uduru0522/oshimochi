import assert from "node:assert/strict";
import test from "node:test";
import { createPortableSnapshot, parsePortableSnapshot } from "../../../src/application/backups/snapshot-format.js";
import { createBackupOperations } from "../../../src/application/backups/manage-backups.js";
import { createDebugStorage } from "../../../src/data/debug/debug-storage.js";
import { createDataCatalogFixture } from "../../../test-support/data-catalog-fixtures.js";
import { createDashboardCardFixture } from "../../../test-support/dashboard-card-fixtures.js";
import { createRecentItemsCardRecord } from "../../../src/data/models/dashboard-card.js";

test("recent-card visibility and position survive backup restore alongside summary cards", async () => {
  const catalog = createDataCatalogFixture();
  catalog.dashboardCards = [createDashboardCardFixture({ position: 0 }), createRecentItemsCardRecord({ visible: false, position: 1 })];
  const storage = createDebugStorage(createDataCatalogFixture()); await storage.initialize();
  const operations = createBackupOperations({ storage });
  const snapshot = await createPortableSnapshot(catalog);
  const candidate = await operations.inspect(JSON.stringify(snapshot));
  await operations.restore(candidate);
  assert.deepEqual(await storage.listDashboardCards(), catalog.dashboardCards);
  const exported = JSON.parse((await operations.createExport()).text);
  assert.deepEqual(exported.data.dashboardCards.find(({ type }) => type === "recent-items"), catalog.dashboardCards[1]);
  const duplicate = structuredClone(snapshot);
  duplicate.data.dashboardCards.push({ ...catalog.dashboardCards[1], id: "duplicate", position: 2 });
  await assert.rejects(operations.inspect(JSON.stringify(duplicate)), /Only one/);
  assert.deepEqual(await storage.listDashboardCards(), catalog.dashboardCards);
});

test("version 2 backup round trips dashboard ordering, labels, filters, and currency", async () => {
  const catalog = createDataCatalogFixture();
  const source = createDashboardCardFixture().sources[0];
  catalog.dashboardCards = [createDashboardCardFixture({
    position: 1, displayMode: "ring", format: { type: "currency", currency: "JPY" },
    groupBy: { type: "field", fields: [{ goodsTypeId: "figures", fieldId: "status", fieldName: "Ownership", dataType: "select", choiceLabels: [{ id: "owned", label: "Owned" }] }] },
    sources: [{ ...source, filter: { query: "", rules: [{
      fieldId: "purchased", fieldName: "Purchase date", dataType: "date", datePreset: "this-year"
    }] } }]
  }), createDashboardCardFixture({ id: "owned", position: 0, calculation: "count", displayMode: "number",
    format: { type: "number", currency: null, unit: { symbol: "pieces", position: "suffix" } }
  })];
  const snapshot = await createPortableSnapshot(catalog);
  const result = await parsePortableSnapshot(JSON.parse(JSON.stringify(snapshot)));
  assert.deepEqual(result.catalog.dashboardCards.map(({ id }) => id), ["owned", "spending"]);
  assert.equal(result.catalog.dashboardCards[1].format.currency, "JPY");
  assert.equal(result.catalog.dashboardCards[0].displayMode, "number");
  assert.equal(result.catalog.dashboardCards[1].displayMode, "ring");
  assert.deepEqual(result.catalog.dashboardCards[0].format.unit, { symbol: "pieces", position: "suffix" });
  assert.equal(result.catalog.dashboardCards[1].groupBy.fields[0].fieldName, "Ownership");
  assert.equal(result.catalog.dashboardCards[1].groupBy.fields[0].choiceLabels[0].label, "Owned");
  assert.equal(result.catalog.dashboardCards[1].sources[0].filter.rules[0].fieldName, "Purchase date");
  assert.equal(result.catalog.dashboardCards[1].sources[0].filter.rules[0].datePreset, "this-year");
});

test("released version 1 backups restore with no cards and keep original version metadata", async () => {
  const snapshot = await createPortableSnapshot(createDataCatalogFixture());
  snapshot.exportFormatVersion = 1; snapshot.domainModelVersion = 1; delete snapshot.data.dashboardCards;
  const parsed = await parsePortableSnapshot(snapshot);
  assert.deepEqual(parsed.catalog.dashboardCards, []);
  assert.equal(parsed.snapshot.exportFormatVersion, 1);
  assert.equal(parsed.snapshot.domainModelVersion, 1);
  assert.deepEqual((await parsePortableSnapshot(parsed.snapshot)).catalog.dashboardCards, []);
  const storage = createDebugStorage(createDataCatalogFixture()); await storage.initialize();
  await storage.replaceDashboardCards({ cards: [createDashboardCardFixture()], expectedCards: [] });
  const operations = createBackupOperations({ storage });
  const candidate = await operations.inspect(JSON.stringify(snapshot));
  assert.equal(candidate.summary.counts.dashboardCards.total, 0);
  await operations.restore(candidate); assert.deepEqual(await storage.listDashboardCards(), []);
});

test("dashboard backups reject missing or malformed definitions before replacing local data", async () => {
  const storage = createDebugStorage(createDataCatalogFixture()); await storage.initialize();
  const original = await storage.readDataCatalog(); const operations = createBackupOperations({ storage });
  const snapshot = await createPortableSnapshot(original); delete snapshot.data.dashboardCards;
  await assert.rejects(operations.inspect(JSON.stringify(snapshot)), /dashboardCards/);
  snapshot.data.dashboardCards = [{}]; await assert.rejects(operations.inspect(JSON.stringify(snapshot)));
  assert.deepEqual(await storage.readDataCatalog(), original);
  snapshot.exportFormatVersion = 1; snapshot.domainModelVersion = 1;
  await assert.rejects(parsePortableSnapshot(snapshot), /Version-1/);
});

test("dashboard configuration is replaced and reset atomically with the catalog", async () => {
  const storage = createDebugStorage(createDataCatalogFixture()); await storage.initialize();
  const original = await storage.readDataCatalog();
  const replacement = { ...original, dashboardCards: [createDashboardCardFixture()] };
  await storage.replaceDataCatalog(replacement);
  assert.equal((await storage.readDataCatalog()).dashboardCards.length, 1);
  await storage.resetData(); assert.deepEqual(await storage.readDataCatalog(), {
    assets: [], dashboardCards: [], fieldDefinitions: [], goodsTypes: [], items: []
  });
});
