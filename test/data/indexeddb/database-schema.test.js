import assert from "node:assert/strict";
import test from "node:test";

import {
  DOMAIN_MODEL_VERSION,
  INDEXES,
  OBJECT_STORES,
  upgradeDatabase
} from "../../../src/data/indexeddb/database-schema.js";
import { createSchemaDatabase } from "../../../test-support/indexeddb-fakes.js";

test("current schema creates stable stores, indexes, and metadata", () => {
  const database = createSchemaDatabase();

  upgradeDatabase(database, 0);

  assert.deepEqual([...database.stores.keys()].sort(), [...Object.values(OBJECT_STORES)].sort());
  assert.deepEqual(
    database.stores.get(OBJECT_STORES.fieldDefinitions).indexes.get(
      INDEXES.fieldDefinitionsByGoodsTypeAndKey
    ),
    { keyPath: ["goodsTypeId", "key"], options: { unique: true } }
  );
  assert.deepEqual(database.stores.get(OBJECT_STORES.metadata).records, [
    { key: "domainModelVersion", value: DOMAIN_MODEL_VERSION }
  ]);
});

test("current schema leaves an existing version unchanged", () => {
  const database = createSchemaDatabase();

  upgradeDatabase(database, 2);

  assert.equal(database.stores.size, 0);
});

test("version 1 upgrade adds dashboard storage and preserves existing collection records", () => {
  const database = createSchemaDatabase();
  upgradeDatabase(database, 0);
  database.stores.delete(OBJECT_STORES.dashboardCards);
  const goodsTypes = database.stores.get(OBJECT_STORES.goodsTypes);
  goodsTypes.records.push({ id: "existing" });
  upgradeDatabase(database, 1, { objectStore: (name) => database.stores.get(name) });
  assert.deepEqual(goodsTypes.records, [{ id: "existing" }]);
  assert.deepEqual(database.stores.get(OBJECT_STORES.dashboardCards).options, { keyPath: "id" });
  assert.equal(database.stores.get(OBJECT_STORES.metadata).records.at(-1).value, DOMAIN_MODEL_VERSION);
});
