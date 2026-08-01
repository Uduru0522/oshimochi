import assert from "node:assert/strict";
import test from "node:test";

import {
  createDefaultItemFilterRule,
  validateItemFilterRule
} from "../../src/views/items/item-filter-rule.js";

test("direct-choice filters start with missing values selected implicitly", () => {
  assert.deepEqual(
    createDefaultItemFilterRule({ dataType: "boolean", id: "edition" }),
    { fieldId: "edition", includeMissing: false, values: [] }
  );
});

test("date filters require one endpoint and accept open or exact ranges", () => {
  const field = { dataType: "date", displayName: "Release date", id: "released" };

  assert.match(
    validateItemFilterRule({ from: "", to: "" }, field),
    /at least one date/
  );
  assert.equal(validateItemFilterRule({ from: "", to: "2026-01-01" }, field), "");
  assert.equal(
    validateItemFilterRule({ from: "2026-01-01", to: "2026-01-01" }, field),
    ""
  );
});

test("number filters allow the observed range or missing-only collections", () => {
  const field = { dataType: "number", displayName: "Price", id: "price" };

  assert.equal(validateItemFilterRule({}, field, { min: 0, max: 10 }), "");
  assert.equal(validateItemFilterRule({ includeMissing: true }, field, null), "");
  assert.match(validateItemFilterRule({}, field, null), /no numeric values/);
});
