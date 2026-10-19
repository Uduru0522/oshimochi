import assert from "node:assert/strict";
import test from "node:test";
import { createDashboardCardRepository } from "../../../src/data/indexeddb/dashboard-card-repository.js";
import { createCatalogDatabase, createReadDatabase } from "../../../test-support/indexeddb-fakes.js";
import { createDataCatalogFixture } from "../../../test-support/data-catalog-fixtures.js";
import { createDashboardCardFixture } from "../../../test-support/dashboard-card-fixtures.js";

test("IndexedDB dashboard saves atomically preserve labels and isolate returned records", async () => {
  const database = createCatalogDatabase(createDataCatalogFixture());
  const repository = createDashboardCardRepository(database); const card = createDashboardCardFixture();
  await repository.replace({ cards: [card], expectedCards: [] });
  const saved = await repository.list(); saved[0].sources[0].fieldName = "Outside edit";
  assert.equal((await repository.list())[0].sources[0].fieldName, "Purchase price");
  await repository.replace({ cards: [], expectedCards: [card] });
  assert.deepEqual(await repository.list(), []);
  assert.equal(database.readCatalog().items.length, 1);
});

test("IndexedDB dashboard save failures leave existing cards intact", async () => {
  const catalog = createDataCatalogFixture(); catalog.dashboardCards = [createDashboardCardFixture()];
  const database = createCatalogDatabase(catalog, { failAt: 2 });
  const repository = createDashboardCardRepository(database);
  await assert.rejects(repository.replace({ cards: [{ ...catalog.dashboardCards[0], title: "Changed" }], expectedCards: catalog.dashboardCards }), { code: "operation-failed" });
  assert.deepEqual(database.readCatalog().dashboardCards, catalog.dashboardCards);
});

test("IndexedDB dashboard stale and invalid replacements cannot erase current cards", async () => {
  const catalog = createDataCatalogFixture(); catalog.dashboardCards = [createDashboardCardFixture()];
  const database = createCatalogDatabase(catalog); const repository = createDashboardCardRepository(database);
  await assert.rejects(repository.replace({ cards: [], expectedCards: [] }), { code: "conflict" });
  await assert.rejects(repository.replace({ cards: [catalog.dashboardCards[0], catalog.dashboardCards[0]], expectedCards: catalog.dashboardCards }), { code: "invalid-data" });
  assert.deepEqual(database.readCatalog().dashboardCards, catalog.dashboardCards);
});

test("IndexedDB dashboard reads distinguish unavailable storage from invalid records", async () => {
  await assert.rejects(createDashboardCardRepository(createReadDatabase([], { transactionError: new Error("failed") })).list(), { code: "operation-failed" });
  await assert.rejects(createDashboardCardRepository(createReadDatabase([{}])).list(), { code: "invalid-data" });
});
