import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_ITEM_PRESENTATION,
  ITEM_PRESENTATIONS
} from "../../src/views/items/item-presentation-control.js";

test("cards are the default item presentation", () => {
  assert.equal(DEFAULT_ITEM_PRESENTATION, ITEM_PRESENTATIONS.cards);
});
