import assert from "node:assert/strict";
import test from "node:test";

import { createAssetRecord, parseAssetRecord } from "../../../src/data/models/asset.js";

const FIXED_TIME = "2026-07-20T00:00:00.000Z";

function createValidAsset(overrides = {}) {
  const data = overrides.data ?? new Blob(["image"], { type: "image/jpeg" });

  return {
    id: "asset-1",
    data,
    mediaType: "image/jpeg",
    width: 560,
    height: 792,
    byteSize: data.size,
    createdAt: FIXED_TIME,
    updatedAt: FIXED_TIME,
    ...overrides
  };
}

test("asset creation derives byte size and timestamps from the image", () => {
  const data = new Blob(["image"], { type: "image/jpeg" });
  const asset = createAssetRecord(
    { id: " asset-1 ", data, mediaType: " image/jpeg ", width: 560, height: 792 },
    { now: () => FIXED_TIME }
  );

  assert.equal(asset.id, "asset-1");
  assert.equal(asset.byteSize, data.size);
  assert.equal(asset.createdAt, FIXED_TIME);
});

test("asset parsing requires image Blob data", () => {
  assert.throws(
    () => parseAssetRecord(createValidAsset({ data: "not-a-blob" })),
    /image Blob/
  );
});

test("asset parsing requires matching Blob and declared media types", () => {
  assert.throws(
    () => parseAssetRecord(createValidAsset({ mediaType: "image/png" })),
    /Blob type must match/
  );
});

test("asset parsing requires byte metadata to match the Blob", () => {
  assert.throws(
    () => parseAssetRecord(createValidAsset({ byteSize: 999 })),
    /byteSize must match/
  );
});

test("asset parsing requires positive image dimensions", () => {
  assert.throws(
    () => parseAssetRecord(createValidAsset({ width: 0 })),
    /width must be a positive integer/
  );
});
