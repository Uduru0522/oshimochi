import assert from "node:assert/strict";
import test from "node:test";

import { createDashboardOperations } from "../../../src/application/dashboard/read-card.js";

function fixture() {
  const reads = [];
  const card = { calculation: "sum", sources: [{ goodsTypeId: "figures", fieldId: "cost" }] };
  const storage = {
    async listDashboardCards() { return []; },
    async replaceDashboardCards() { throw new Error("Writes are not expected during a card read."); },
    async listGoodsTypes(options) {
      reads.push({ method: "collections", ...options });
      return [{ id: "figures", isDeleted: false }, { id: "other", isDeleted: false }];
    },
    async listFieldDefinitions(id, options) {
      reads.push({ method: "fields", id, ...options });
      return [{ id: "cost", goodsTypeId: "figures", dataType: "number", isDeleted: false }];
    },
    async listItems(id, options) {
      reads.push({ method: "items", id, ...options });
      return [{ id: "one", goodsTypeId: "figures", isDeleted: false, customValues: { cost: 1200 } }];
    }
  };
  return { reads, card, storage };
}

test("recent items are the five newest creations across active collections, with stable ties and no asset reads", async () => {
  const { storage, reads } = fixture();
  const items = [
    { id: "newest", goodsTypeId: "other", createdAt: "2026-10-19T00:00:00.000Z" },
    { id: "tie-b", goodsTypeId: "figures", createdAt: "2026-10-18T00:00:00.000Z" },
    { id: "tie-a", goodsTypeId: "other", createdAt: "2026-10-18T00:00:00.000Z" },
    { id: "fourth", goodsTypeId: "figures", createdAt: "2026-10-17T00:00:00.000Z" },
    { id: "fifth", goodsTypeId: "other", createdAt: "2026-10-16T00:00:00.000Z" },
    { id: "edited-old", goodsTypeId: "figures", createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-20T00:00:00.000Z" },
    { id: "deleted", goodsTypeId: "figures", createdAt: "2026-10-21T00:00:00.000Z", isDeleted: true }
  ];
  storage.listItems = async (id, options) => {
    reads.push({ method: "items", id, ...options });
    return items.filter(item => item.goodsTypeId === id && !item.isDeleted);
  };
  storage.getAsset = () => { throw new Error("Recent metadata must not read images."); };
  const original = structuredClone(items);
  const operations = createDashboardOperations({ storage });
  const result = await operations.readRecentItems();
  assert.deepEqual(result.map(({ item }) => item.id), ["newest", "tie-a", "tie-b", "fourth", "fifth"]);
  assert.equal(result[0].goodsType.id, "other");
  assert.deepEqual(items, original);
  assert.deepEqual(reads, [
    { method: "collections", scope: "active" },
    { method: "items", id: "figures", scope: "active" },
    { method: "items", id: "other", scope: "active" }
  ]);
  assert.deepEqual((await operations.readRecentItems({ limit: 2 })).map(({ item }) => item.id), ["newest", "tie-a"]);
  items.push({ id: "fresh", goodsTypeId: "figures", createdAt: "2026-10-22T00:00:00.000Z" });
  assert.equal((await operations.readRecentItems())[0].item.id, "fresh");
});

test("recent items distinguish empty catalogs from failed reads and reject unbounded limits", async () => {
  const { storage, reads } = fixture();
  const operations = createDashboardOperations({ storage });
  storage.listGoodsTypes = async () => [];
  assert.deepEqual(await operations.readRecentItems(), []);
  assert.deepEqual(reads, []);
  for (const limit of [0, -1, 51, Infinity, 1.5, "5", null]) {
    await assert.rejects(operations.readRecentItems({ limit }), RangeError);
  }
  storage.listGoodsTypes = async () => [{ id: "figures" }];
  storage.listItems = async () => [];
  assert.deepEqual(await operations.readRecentItems(), []);
  const failure = new Error("Read failed");
  storage.listItems = async () => { throw failure; };
  await assert.rejects(operations.readRecentItems(), error => error === failure);
});

test("dashboard reads selected collection records through read-only storage capabilities", async () => {
  const { reads, card, storage } = fixture();
  const operations = createDashboardOperations({ storage });
  assert.equal((await operations.readCard(card)).value, 1200);
  assert.deepEqual([...reads].sort((first, second) => first.method.localeCompare(second.method)), [
    { method: "collections", scope: "active" },
    { method: "fields", id: "figures", scope: "active" },
    { method: "items", id: "figures", scope: "active" }
  ]);
  reads.length = 0;
  await operations.readCard({ ...card, includeDeleted: true });
  assert.equal(reads.find(({ method }) => method === "items").scope, "all");
  assert.equal(reads.find(({ method }) => method === "fields").scope, "active");
});

test("dashboard overview counts active and deleted items and supplies live editor fields without image reads", async () => {
  const { storage, reads } = fixture();
  storage.listItems = async (id, options) => {
    reads.push({ method: 'items', id, ...options });
    return [{ goodsTypeId: id, isDeleted: false }, { goodsTypeId: id, isDeleted: true }];
  };
  const operations = createDashboardOperations({ storage });
  const result = await operations.readOverview();
  assert.deepEqual(result.counts, { collections: 2, activeItems: 2, deletedItems: 2 });
  assert.equal(result.collections[0].fields[0].id, 'cost');
  assert.deepEqual(reads.filter(({ method }) => method === 'items').map(({ scope }) => scope), ['all', 'all']);
  storage.listItems = async () => { throw new Error('Unavailable'); };
  await assert.rejects(operations.readOverview(), /Unavailable/);
  storage.listGoodsTypes = async () => [];
  assert.deepEqual(await operations.readOverview(), { collections: [], counts: { collections: 0, activeItems: 0, deletedItems: 0 } });
  assert.equal(operations.createRecentCard().visible, true);
});

test("dashboard unavailable collections return repair information without item reads", async () => {
  const { reads, card, storage } = fixture(); card.sources[0].goodsTypeId = "removed";
  const result = await createDashboardOperations({ storage }).readCard(card);
  assert.equal(result.status, "needs-repair");
  assert.equal(result.issues[0].goodsTypeId, "removed");
  assert.deepEqual(reads, [{ method: "collections", scope: "active" }]);
});

test("dashboard read failures propagate instead of becoming empty totals", async () => {
  const { card, storage } = fixture(); const failure = new Error("Item read failed");
  storage.listItems = async () => { throw failure; };
  await assert.rejects(createDashboardOperations({ storage }).readCard(card), (error) => error === failure);
});

test("dashboard snapshots pending definitions and reads fresh data on subsequent calls", async () => {
  const { card, storage } = fixture(); let resume;
  const firstRead = new Promise((resolve) => { resume = resolve; });
  storage.listGoodsTypes = () => firstRead;
  const operations = createDashboardOperations({ storage });
  const pending = operations.readCard(card);
  card.calculation = "count"; card.sources[0].fieldId = "removed";
  resume([{ id: "figures", isDeleted: false }]);
  assert.equal((await pending).value, 1200);
  storage.listItems = async () => [
    { id: "one", goodsTypeId: "figures", isDeleted: false, customValues: {} },
    { id: "two", goodsTypeId: "figures", isDeleted: false, customValues: {} }
  ];
  assert.equal((await operations.readCard(card)).value, 2);
});

test("dashboard breakdowns combine selected fields and retain zero, missing values, and signed totals", async () => {
  const { card, reads, storage } = fixture();
  card.sources.push({ goodsTypeId: "other", fieldId: "shipping" });
  storage.listGoodsTypes = async () => [{ id: "figures", displayName: "Figures" }, { id: "other", displayName: "Tapestries" }];
  storage.listFieldDefinitions = async id => [{ id: id === "figures" ? "cost" : "shipping", goodsTypeId: id, dataType: "number" }];
  storage.listItems = async id => {
    reads.push(id);
    return (id === "figures" ? [1200, 0, undefined] : [-200]).map((value, index) => ({
      id: `${id}-${index}`, goodsTypeId: id, isDeleted: false,
      customValues: value === undefined ? {} : { [id === "figures" ? "cost" : "shipping"]: value }
    }));
  };
  const operations = createDashboardOperations({ storage });
  const result = await operations.readCardBreakdown(card);
  assert.equal(result.value, 1000);
  assert.deepEqual(result.breakdown, [
    { id: '["figures"]', label: "Figures", goodsTypeId: "figures", goodsTypeName: "Figures", value: 1200, matchedItemCount: 3, valueCount: 2 },
    { id: '["other"]', label: "Tapestries", goodsTypeId: "other", goodsTypeName: "Tapestries", value: -200, matchedItemCount: 1, valueCount: 1 }
  ]);
  assert.deepEqual(reads.sort(), ["figures", "other"]);
  const count = await operations.readCardBreakdown({ ...card, calculation: "count" });
  assert.equal(count.value, 4);
  assert.deepEqual(count.breakdown.map(({ value }) => value), [3, 1]);
  assert.deepEqual((await operations.readCardBreakdown({ ...card, calculation: "average" })).breakdown, []);
});

test("dashboard breakdowns keep unavailable references and empty values distinct from measured zero", async () => {
  const { card, storage } = fixture();
  const operations = createDashboardOperations({ storage });
  const missing = await operations.readCardBreakdown({ ...card, sources: [...card.sources, { goodsTypeId: "gone", fieldId: "cost" }] });
  assert.equal(missing.status, "needs-repair");
  assert.equal(missing.value, null);
  assert.deepEqual(missing.breakdown, []);
  storage.listItems = async () => [{ goodsTypeId: "figures", customValues: {} }];
  const empty = await operations.readCardBreakdown(card);
  assert.equal(empty.status, "empty");
  assert.equal(empty.breakdown[0].value, null);
  storage.listItems = async () => [{ goodsTypeId: "figures", customValues: { cost: 0 } }];
  assert.equal((await operations.readCardBreakdown(card)).breakdown[0].value, 0);
});

test("dashboard breakdowns use one calendar instant for the total and every collection share", async () => {
  const { card, storage } = fixture();
  card.sources[0].filter = { rules: [{ fieldId: "purchased", datePreset: "this-year" }] };
  storage.listFieldDefinitions = async () => [
    { id: "cost", goodsTypeId: "figures", dataType: "number" },
    { id: "purchased", goodsTypeId: "figures", dataType: "date" }
  ];
  storage.listItems = async () => [{ goodsTypeId: "figures", customValues: { cost: 1200, purchased: "2026-01-01" } }];
  let calls = 0;
  const result = await createDashboardOperations({ storage }).readCardBreakdown(card, {
    now: () => { calls++; return new Date(calls === 1 ? 2026 : 2027, 0, 1); }
  });
  assert.equal(calls, 1);
  assert.equal(result.value, 1200);
  assert.equal(result.breakdown[0].value, 1200);
});

test("dashboard plain reads preserve named repair feedback for unavailable category choices", async () => {
  const { card, storage } = fixture();
  card.groupBy = { type: "field", fields: [{ goodsTypeId: "figures", fieldId: "status", fieldName: "Status", dataType: "select", choiceLabels: [{ id: "owned", label: "Owned" }] }] };
  storage.listGoodsTypes = async () => [{ id: "figures", displayName: "Figures" }];
  storage.listFieldDefinitions = async () => [
    { id: "cost", goodsTypeId: "figures", dataType: "number" },
    { id: "status", displayName: "Status", goodsTypeId: "figures", dataType: "select", options: { choices: [] } }
  ];
  storage.listItems = async () => [{ goodsTypeId: "figures", customValues: { cost: 1200, status: "owned" } }];
  const operations = createDashboardOperations({ storage });
  const result = await operations.readCard(card);
  assert.equal(result.status, "needs-repair");
  assert.equal(result.value, null);
  assert.equal(result.issues[0].choiceName, "Owned");
  assert.deepEqual(await operations.readCardBreakdown(card), { ...result, breakdown: [] });
});
