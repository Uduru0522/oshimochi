import assert from "node:assert/strict";
import test from "node:test";

import {
  STORAGE_ERROR_CODES,
  StorageError,
  assertStorageAdapter
} from "../../../src/data/contracts/storage-contract.js";

test("storage contract rejects adapters with missing capabilities", () => {
  assert.throws(
    () => assertStorageAdapter({ initialize() {} }),
    (error) =>
      error instanceof StorageError && error.code === STORAGE_ERROR_CODES.invalidAdapter
  );
});
