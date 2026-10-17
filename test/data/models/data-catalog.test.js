import assert from "node:assert/strict";
import test from "node:test";

import { parseDataCatalog } from "../../../src/data/models/data-catalog.js";
import { createDataCatalogFixture } from "../../../test-support/data-catalog-fixtures.js";

test("data catalog parses a complete connected record set", () => {
  const catalog = createDataCatalogFixture();

  assert.deepEqual(parseDataCatalog(catalog), catalog);
});

test("data catalog accepts an older item with a missing required custom value", () => {
  const catalog = createDataCatalogFixture();
  catalog.items[0].customValues = {};

  assert.deepEqual(parseDataCatalog(catalog), catalog);
});

test("data catalog rejects duplicate record identities", () => {
  const catalog = createDataCatalogFixture();
  catalog.items.push(structuredClone(catalog.items[0]));

  assert.throws(() => parseDataCatalog(catalog), /Item identities must be unique/);
});

test("data catalog rejects fields owned by an unknown goods type", () => {
  const catalog = createDataCatalogFixture();
  catalog.fieldDefinitions.at(-1).goodsTypeId = "missing";

  assert.throws(() => parseDataCatalog(catalog), /unknown goods type/);
});

test("data catalog rejects an incomplete protected field set", () => {
  const catalog = createDataCatalogFixture();
  catalog.fieldDefinitions = catalog.fieldDefinitions.filter(({ key }) => key !== "image");

  assert.throws(() => parseDataCatalog(catalog), /every protected built-in field/);
});

test("data catalog rejects custom values for another goods type", () => {
  const catalog = createDataCatalogFixture();
  catalog.items[0].customValues = { unknown: "value" };

  assert.throws(() => parseDataCatalog(catalog), /unknown custom field/);
});

test("data catalog rejects stored values that do not match the field type", () => {
  const catalog = createDataCatalogFixture();
  catalog.items[0].customValues["figures-series"] = 42;

  assert.throws(() => parseDataCatalog(catalog), /must store non-empty text/);
});

test("data catalog rejects a missing image asset reference", () => {
  const catalog = createDataCatalogFixture();
  catalog.assets = [];

  assert.throws(() => parseDataCatalog(catalog), /unknown image asset/);
});

test("data catalog preserves an unreferenced asset", () => {
  const catalog = createDataCatalogFixture();
  catalog.items[0].imageAssetId = null;

  assert.equal(parseDataCatalog(catalog).assets.length, 1);
});
