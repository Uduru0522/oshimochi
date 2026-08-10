import assert from "node:assert/strict";
import test from "node:test";

import {
  areJsonValuesEqual,
  requireJsonValue,
  requirePositiveInteger,
  requireRecord,
  requireString,
  requireTimestamp
} from "../../../src/data/models/record-validation.js";

test("record validation accepts plain objects only", () => {
  const record = { id: "record" };

  assert.equal(requireRecord(record), record);
  assert.throws(() => requireRecord([]), /must be an object/);
});

test("string validation distinguishes empty and noncanonical text", () => {
  assert.equal(requireString("", "label"), "");
  assert.throws(
    () => requireString("  ", "label", { allowEmpty: false }),
    /non-empty string/
  );
  assert.throws(
    () => requireString(" value ", "label", { canonical: true }),
    /leading or trailing whitespace/
  );
});

test("timestamp validation accepts canonical UTC timestamps only", () => {
  const timestamp = "2026-07-20T00:00:00.000Z";

  assert.equal(requireTimestamp(timestamp, "createdAt"), timestamp);
  assert.throws(() => requireTimestamp("2026-07-20", "createdAt"), /ISO 8601 UTC/);
});

test("JSON validation clones compatible structures and rejects unsupported values", () => {
  const value = { nested: [null, true, 3, "text"] };

  assert.deepEqual(requireJsonValue(value, "value"), value);
  assert.throws(() => requireJsonValue({ invalid: Infinity }, "value"), /JSON-compatible/);
});

test("positive integer validation rejects zero and unsafe values", () => {
  assert.equal(requirePositiveInteger(1, "width"), 1);
  assert.throws(() => requirePositiveInteger(0, "width"), /positive integer/);
  assert.throws(() => requirePositiveInteger(Number.MAX_VALUE, "width"), /positive integer/);
});

test("JSON equality ignores object key order but preserves array order", () => {
  assert.equal(areJsonValuesEqual({ first: 1, second: 2 }, { second: 2, first: 1 }), true);
  assert.equal(areJsonValuesEqual([1, 2], [2, 1]), false);
  assert.equal(areJsonValuesEqual({ value: 1 }, { value: 2 }), false);
});
