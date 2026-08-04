import assert from "node:assert/strict";
import test from "node:test";

import { getContainedImageFrame } from "../../src/views/items/item-thumbnail.js";

test("portrait thumbnails use a full-height centered frame", () => {
  assert.deepEqual(getContainedImageFrame(560, 792), {
    height: "100%",
    width: `${(560 / 792) * 100}%`
  });
});

test("landscape thumbnails use a full-width centered frame", () => {
  assert.deepEqual(getContainedImageFrame(792, 560), {
    height: `${(560 / 792) * 100}%`,
    width: "100%"
  });
});

test("square thumbnails occupy the complete frame", () => {
  assert.deepEqual(getContainedImageFrame(640, 640), {
    height: "100%",
    width: "100%"
  });
});
