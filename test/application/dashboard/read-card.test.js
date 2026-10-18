import assert from "node:assert/strict";
import test from "node:test";

import { createDashboardOperations } from "../../../src/application/dashboard/read-card.js";

function fixture() {
  const reads = [];
  const card = { calculation: "sum", sources: [{ goodsTypeId: "figures", fieldId: "cost" }] };
  const storage = {
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
