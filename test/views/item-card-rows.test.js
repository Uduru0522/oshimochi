import assert from "node:assert/strict";
import test from "node:test";

import { getItemCardRowTones } from "../../src/views/items/item-cards.js";

test("item card row tones assign one tone to every card in a rendered row", () => {
  assert.deepEqual(
    getItemCardRowTones([0, 0, 0, 260, 260, 520]),
    [0, 0, 0, 1, 1, 2]
  );
});

test("item card row tones repeat after the third rendered row", () => {
  assert.deepEqual(
    getItemCardRowTones([0, 260, 520, 780]),
    [0, 1, 2, 0]
  );
});
