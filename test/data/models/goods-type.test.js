import assert from "node:assert/strict";
import test from "node:test";

import {
  createGoodsTypeRecord,
  parseGoodsTypeRecord
} from "../../../src/data/models/goods-type.js";

const FIXED_TIME = "2026-07-20T00:00:00.000Z";

test("goods-type creation normalizes editable text and creates active lifecycle data", () => {
  const record = createGoodsTypeRecord(
    {
      id: "  figures  ",
      displayName: "  Figures  ",
      description: "Scale figures"
    },
    { now: () => FIXED_TIME }
  );

  assert.deepEqual(record, {
    id: "figures",
    displayName: "Figures",
    description: "Scale figures",
    isDeleted: false,
    deletedAt: null,
    createdAt: FIXED_TIME,
    updatedAt: FIXED_TIME
  });
});

test("goods-type creation requires stable identity", () => {
  assert.throws(
    () => createGoodsTypeRecord({ id: "", displayName: "Figures" }),
    /id must be a non-empty string/
  );
});

test("goods-type parsing rejects inconsistent deletion state", () => {
  assert.throws(
    () => parseGoodsTypeRecord({
      id: "figures",
      displayName: "Figures",
      description: "",
      isDeleted: false,
      deletedAt: FIXED_TIME,
      createdAt: FIXED_TIME,
      updatedAt: FIXED_TIME
    }),
    /deletedAt must be null/
  );
});

test("goods-type parsing rejects malformed timestamps", () => {
  assert.throws(
    () => parseGoodsTypeRecord({
      id: "figures",
      displayName: "Figures",
      description: "",
      isDeleted: false,
      deletedAt: null,
      createdAt: "not-a-date",
      updatedAt: FIXED_TIME
    }),
    /createdAt must be an ISO 8601 UTC timestamp/
  );
});

test("goods-type parsing rejects noncanonical persisted identity", () => {
  assert.throws(
    () => parseGoodsTypeRecord({
      id: " figures ",
      displayName: "Figures",
      description: "",
      isDeleted: false,
      deletedAt: null,
      createdAt: FIXED_TIME,
      updatedAt: FIXED_TIME
    }),
    /id cannot have leading or trailing whitespace/
  );
});
