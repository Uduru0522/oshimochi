import assert from "node:assert/strict";
import test from "node:test";

import {
  createApplicationOperations
} from "../../src/application/create-application-operations.js";

function createStorageStub() {
  return {
    async createGoodsType() {},
    async createItem() {},
    async getAsset() { return null; },
    async listFieldDefinitions() { return []; },
    async listGoodsTypes() { return []; },
    async listDashboardCards() { return []; },
    async replaceDashboardCards() {},
    async listItems() { return []; },
    async purgeItem() {},
    async readDataCatalog() {
      return {
        assets: [],
        fieldDefinitions: [],
        goodsTypes: [],
        items: []
      };
    },
    async replaceDataCatalog() {},
    async resetData() {},
    async saveFieldDefinitions() {},
    async updateItemContent() {},
    async updateItemLifecycle() {}
  };
}

test("application operation composition exposes feature-owned capabilities", () => {
  const operations = createApplicationOperations({ storage: createStorageStub() });

  assert.equal(typeof operations.backups.createExport, "function");
  assert.equal(typeof operations.backups.inspect, "function");
  assert.equal(typeof operations.backups.restore, "function");
  assert.equal(typeof operations.dashboard.readCard, "function");
  assert.equal(typeof operations.dashboard.listCards, "function");
  assert.equal(typeof operations.dashboard.replaceCards, "function");
  assert.equal(typeof operations.goodsTypes.create, "function");
  assert.equal(typeof operations.fields.applyChanges, "function");
  assert.equal(typeof operations.items.softDeleteItem, "function");
  assert.equal(typeof operations.items.restoreItem, "function");
  assert.equal(typeof operations.items.purgeItem, "function");
  assert.equal(typeof operations.localData.reset, "function");
  assert.equal(Object.isFrozen(operations), true);
});
