import assert from "node:assert/strict";
import test from "node:test";

import {
  createGoodsTypeCreationOperation
} from "../../src/application/goods-types/create-goods-type.js";
import { BUILT_IN_ITEM_FIELDS } from "../../src/data/models/built-in-fields.js";

const FIXED_TIME = "2026-07-20T00:00:00.000Z";

test("goods-type creation builds the type and protected fields as one storage request", async () => {
  const writes = [];
  const generatedIds = ["goods-id", "field-id", "field-name", "field-image"];
  const createGoodsType = createGoodsTypeCreationOperation({
    storage: {
      async createGoodsType(bundle) {
        writes.push(bundle);
      }
    },
    generateId: () => generatedIds.shift(),
    now: () => FIXED_TIME
  });

  const result = await createGoodsType({
    displayName: "  Figures  ",
    description: "  Scale and prize figures.  "
  });

  assert.equal(writes.length, 1);
  assert.deepEqual(result.goodsType, {
    id: "goods-id",
    displayName: "Figures",
    description: "Scale and prize figures.",
    isDeleted: false,
    deletedAt: null,
    createdAt: FIXED_TIME,
    updatedAt: FIXED_TIME
  });
  assert.deepEqual(
    result.fieldDefinitions.map(({ key, isBuiltIn, goodsTypeId }) => ({
      key,
      isBuiltIn,
      goodsTypeId
    })),
    BUILT_IN_ITEM_FIELDS.map(({ key }) => ({
      key,
      isBuiltIn: true,
      goodsTypeId: "goods-id"
    }))
  );
  assert.ok(
    result.fieldDefinitions.every(
      ({ createdAt, updatedAt }) => createdAt === FIXED_TIME && updatedAt === FIXED_TIME
    )
  );
  assert.equal(
    result.fieldDefinitions.find(({ key }) => key === "image").isRequired,
    true
  );
});

test("goods-type creation validates before writing", async () => {
  let writeCount = 0;
  const createGoodsType = createGoodsTypeCreationOperation({
    storage: {
      async createGoodsType() {
        writeCount += 1;
      }
    },
    generateId: () => "generated-id"
  });

  await assert.rejects(createGoodsType({ displayName: "   " }), /displayName/);
  assert.equal(writeCount, 0);
});
