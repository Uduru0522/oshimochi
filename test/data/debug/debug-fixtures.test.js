import assert from "node:assert/strict";
import test from "node:test";
import { createDebugStorage } from "../../../src/data/debug/debug-storage.js";
import { parseDataCatalog } from "../../../src/data/models/data-catalog.js";
import { createDashboardOperations } from "../../../src/application/dashboard/read-card.js";

async function fixtures(anchor = new Date(2026, 9, 19, 12)) {
  const storage = createDebugStorage({ now: () => anchor });
  await storage.initialize();
  return { storage, dashboard: createDashboardOperations({ storage }), now: () => anchor };
}

test("default debug cards are healthy editable examples with real field mappings and complete image references", async () => {
  const { storage, dashboard, now } = await fixtures();
  const catalog = await storage.readDataCatalog();
  assert.deepEqual(parseDataCatalog(catalog), catalog);
  assert.equal(catalog.dashboardCards.length, 7);
  const cards = (await dashboard.listCards()).filter(card => card.type !== "recent-items");
  for (const card of cards) {
    const result = await dashboard.readCardBreakdown(card, { now });
    assert.equal(result.status, "ready", card.title);
    assert.ok(result.matchedItemCount > 0, card.title);
  }
  const spending = cards.find(card => card.id === "debug-total-spent");
  const total = await dashboard.readCardBreakdown(spending, { now });
  assert.equal(total.value, 144401);
  assert.equal(total.matchedItemCount, 30);
  assert.equal(total.valueCount, 27, "missing prices are distinct from the three included zero prices");
  assert.equal((await dashboard.readCard({ ...spending, includeDeleted: true }, { now })).value, 156401);
  assert.deepEqual(new Set(spending.sources.map(source => source.fieldName)), new Set(["Purchase price", "Paid price"]));
  const average = await dashboard.readCard(cards.find(card => card.id === "debug-average-figure-price"), { now });
  assert.equal(average.value, 9250.5);
  const condition = await dashboard.readCardBreakdown(cards.find(card => card.id === "debug-tapestry-condition"), { now });
  assert.equal(condition.breakdown.length, 4);
  assert.ok(condition.breakdown.some(entry => JSON.parse(entry.id)[2] === null));
  assert.ok((await dashboard.readCard(cards.find(card => card.id === "debug-tapestries-on-display"), { now })).value > 0);
});

test("relative debug purchases keep the current-year example meaningful across calendar boundaries", async () => {
  for (const anchor of [new Date(2026, 0, 1, 12), new Date(2027, 11, 31, 12)]) {
    const { dashboard, now } = await fixtures(anchor);
    const cards = await dashboard.listCards();
    const total = await dashboard.readCard(cards.find(card => card.id === "debug-total-spent"), { now });
    const thisYear = await dashboard.readCard(cards.find(card => card.id === "debug-spent-this-year"), { now });
    assert.equal(thisYear.status, "ready");
    assert.ok(thisYear.value >= 2900 && thisYear.value < total.value);
    assert.ok(thisYear.matchedItemCount < total.matchedItemCount);
  }
});

test("debug recent items mix collections by creation time and exclude a newly edited older item", async () => {
  const { dashboard, storage } = await fixtures();
  const recent = await dashboard.readRecentItems();
  assert.deepEqual(recent.map(({ item }) => item.id), ["acrylic-gallery-panel", "figure-limited-edition", "tapestry-midnight-blue-edition", "acrylic-anniversary-stand", "tapestry-summer-festival"]);
  assert.equal(new Set(recent.map(({ goodsType }) => goodsType.id)).size, 3);
  const items = await storage.listItems("tapestries");
  const edited = items.find(item => item.id === "tapestry-winter-cafe");
  assert.ok(edited.updatedAt >= recent[0].item.createdAt);
  assert.ok(!recent.some(({ item }) => item.id === edited.id));
});

test("explicit or partial debug catalogs do not inherit unrelated default summary cards", async () => {
  for (const options of [{ goodsTypes: [] }, { items: [] }, { dashboardCards: [] }]) {
    const storage = createDebugStorage(options); await storage.initialize();
    assert.deepEqual(await storage.listDashboardCards(), []);
  }
  const { storage: first } = await fixtures(), { storage: second } = await fixtures();
  const original = await first.listDashboardCards();
  await first.replaceDashboardCards({ cards: [], expectedCards: original });
  assert.deepEqual(await second.listDashboardCards(), original);
});
