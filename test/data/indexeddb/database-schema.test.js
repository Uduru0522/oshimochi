import assert from "node:assert/strict";
import test from "node:test";

import {
  DOMAIN_MODEL_VERSION,
  INDEXES,
  OBJECT_STORES,
  upgradeDatabase
} from "../../../src/data/indexeddb/database-schema.js";
import {
  createFieldMigrationTransaction,
  createSchemaDatabase
} from "../../../test-support/indexeddb-fakes.js";

test("a fresh schema creates stable stores, indexes, and metadata", () => {
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

test("version 2 marks a legacy protected image field as required", { timeout: 1000 }, async () => {
  const migration = createFieldMigrationTransaction([
    {
      id: "figures-image",
      key: "image",
      isBuiltIn: true,
      isRequired: false,
      updatedAt: "2026-07-20T00:00:00.000Z"
    }
  ]);

  upgradeDatabase({}, 1, migration.transaction);
  await migration.done;

  assert.deepEqual(migration.records, [
    {
      id: "figures-image",
      key: "image",
      isBuiltIn: true,
      isRequired: true,
      updatedAt: "2026-07-20T00:00:00.000Z"
    }
  ]);
});

test("version 2 leaves custom image fields unchanged", { timeout: 1000 }, async () => {
  const migration = createFieldMigrationTransaction([
    {
      id: "figures-reference-image",
      key: "reference_image",
      isBuiltIn: false,
      isRequired: false
    }
  ]);

  upgradeDatabase({}, 1, migration.transaction);
  await migration.done;

  assert.equal(migration.records[0].isRequired, false);
});

test("version 2 schema leaves the current version unchanged", () => {
  const database = createSchemaDatabase();

  upgradeDatabase(database, 2);

  assert.equal(database.stores.size, 0);
});
