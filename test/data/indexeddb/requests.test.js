import assert from "node:assert/strict";
import test from "node:test";

import { requestToPromise } from "../../../src/data/indexeddb/requests.js";

test("request promise resolves with an IndexedDB request result", async () => {
  const request = {};
  const result = requestToPromise(request);

  request.result = { id: "result" };
  request.onsuccess();

  assert.deepEqual(await result, { id: "result" });
});

test("request promise rejects with an IndexedDB request error", async () => {
  const request = {};
  const result = requestToPromise(request);

  request.error = new Error("request failed");
  request.onerror();

  await assert.rejects(result, /request failed/);
});
