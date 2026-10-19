import assert from "node:assert/strict";
import test from "node:test";
import { createDebugStorage } from "../../../src/data/debug/debug-storage.js";
import { createDashboardCardFixture } from "../../../test-support/dashboard-card-fixtures.js";
import { createDataCatalogFixture } from "../../../test-support/data-catalog-fixtures.js";

test("debug dashboard cards save, reorder, and remove independently of collection data", async () => {
  const catalog = createDataCatalogFixture(); const storage = createDebugStorage(catalog);
  await storage.initialize();
  const first = createDashboardCardFixture(), second = createDashboardCardFixture({ id: "owned", position: 1, calculation: "count" });
  await storage.replaceDashboardCards({ cards: [first, second], expectedCards: [] });
  const saved = await storage.listDashboardCards(); saved[0].title = "Outside edit";
  assert.equal((await storage.listDashboardCards())[0].title, "Total spent");
  await storage.replaceDashboardCards({ cards: [{ ...second, position: 0 }], expectedCards: [first, second] });
  assert.deepEqual((await storage.listDashboardCards()).map(({ id }) => id), ["owned"]);
  assert.deepEqual((await storage.readDataCatalog()).items, catalog.items);
  await storage.resetData(); assert.deepEqual(await storage.listDashboardCards(), []);
});

test("debug dashboard saves reject stale and invalid changes without altering current cards", async () => {
  const storage = createDebugStorage(); await storage.initialize();
  const card = createDashboardCardFixture();
  await storage.replaceDashboardCards({ cards: [card], expectedCards: [] });
  await assert.rejects(storage.replaceDashboardCards({ cards: [], expectedCards: [] }), { code: "conflict" });
  await assert.rejects(storage.replaceDashboardCards({ cards: [card, card], expectedCards: [card] }), { code: "invalid-data" });
  assert.deepEqual(await storage.listDashboardCards(), [card]);
});

test("concurrent debug dashboard saves cannot overwrite each other", async () => {
  const storage = createDebugStorage(); await storage.initialize();
  const outcomes = await Promise.allSettled([
    storage.replaceDashboardCards({ cards: [createDashboardCardFixture()], expectedCards: [] }),
    storage.replaceDashboardCards({ cards: [], expectedCards: [] })
  ]);
  assert.equal(outcomes[0].status, "fulfilled");
  assert.equal(outcomes[1].reason.code, "conflict");
  assert.equal((await storage.listDashboardCards()).length, 1);
});

test("debug dashboard cards remain isolated across instances and require initialization", async () => {
  const first = createDebugStorage(); const second = createDebugStorage();
  await assert.rejects(first.listDashboardCards(), { code: "not-initialized" });
  await first.initialize(); await second.initialize();
  await first.replaceDashboardCards({ cards: [createDashboardCardFixture()], expectedCards: [] });
  assert.deepEqual(await second.listDashboardCards(), []);
  first.close(); await assert.rejects(first.listDashboardCards(), { code: "not-initialized" });
});
