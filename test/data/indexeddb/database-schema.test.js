import assert from "node:assert/strict";
import test from "node:test";

import {
  DOMAIN_MODEL_VERSION,
  INDEXES,
  OBJECT_STORES,
  upgradeDatabase
} from "../../../src/data/indexeddb/database-schema.js";
import { createSchemaDatabase } from "../../../test-support/indexeddb-fakes.js";

test("version 1 schema creates stable stores, indexes, and metadata", () => {
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

test("version 1 schema leaves an existing version unchanged", () => {
  const database = createSchemaDatabase();

  upgradeDatabase(database, 1);

  assert.equal(database.stores.size, 0);
});
