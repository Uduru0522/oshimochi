import assert from "node:assert/strict";
import test from "node:test";

import { getNextViewScrollState } from "../../src/app/view-scroll-state.js";

test("view scroll state enters compact mode after both scroll margins are crossed", () => {
  assert.equal(
    getNextViewScrollState({ isCompact: false, maxScrollTop: 400, scrollTop: 97 }),
    true
  );
});

test("view scroll state remains expanded when there is too little scroll range", () => {
  assert.equal(
    getNextViewScrollState({ isCompact: false, maxScrollTop: 180, scrollTop: 100 }),
    false
  );
});

test("view scroll state stays compact when compacting reduces the scroll range", () => {
  assert.equal(
    getNextViewScrollState({ isCompact: true, maxScrollTop: 180, scrollTop: 96 }),
    true
  );
});

test("view scroll state expands again only near the top", () => {
  assert.equal(
    getNextViewScrollState({ isCompact: true, maxScrollTop: 400, scrollTop: 31 }),
    false
  );
});
