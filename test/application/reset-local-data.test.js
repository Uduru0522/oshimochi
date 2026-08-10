import assert from "node:assert/strict";
import test from "node:test";

import { createResetLocalDataOperation } from "../../src/application/data/reset-local-data.js";

test("local-data reset delegates one complete reset to storage", async () => {
  let resetCount = 0;
  const resetLocalData = createResetLocalDataOperation({
    storage: {
      async resetData() {
        resetCount += 1;
      }
    }
  });

  await resetLocalData();

  assert.equal(resetCount, 1);
});

test("local-data reset exposes storage failures to its caller", async () => {
  const storageFailure = new Error("reset failed");
  const resetLocalData = createResetLocalDataOperation({
    storage: {
      async resetData() {
        throw storageFailure;
      }
    }
  });

  await assert.rejects(resetLocalData(), (error) => error === storageFailure);
});
