import assert from "node:assert/strict";
import test from "node:test";

import { selectItemCardFields } from "../../src/views/items/item-card-context.js";

const fields = [
  { id: "name", isBuiltIn: true, key: "name", dataType: "text" },
  { id: "first", displayName: "First", isBuiltIn: false, dataType: "text" },
  { id: "second", displayName: "Second", isBuiltIn: false, dataType: "text" },
  { id: "third", displayName: "Third", isBuiltIn: false, dataType: "number" },
  { id: "fourth", displayName: "Fourth", isBuiltIn: false, dataType: "text" },
  { id: "fifth", displayName: "Fifth", isBuiltIn: false, dataType: "text" }
];
const item = {
  name: "Collection match",
  customValues: {
    first: "Default",
    second: "Search match",
    third: 3,
    fourth: "Filtered fourth",
    fifth: "Filtered fifth"
  }
};

test("card context prioritizes filtered, searched, sorted, then default fields", () => {
  const context = selectItemCardFields(item, fields, {
    filter: {
      query: "search",
      rules: [{ fieldId: "fourth" }]
    },
    sort: { fieldId: "third", type: "field" }
  });

  assert.deepEqual(
    context.visibleFieldValues.map(({ field }) => field.id),
    ["fourth", "second", "third"]
  );
  assert.deepEqual(context.hiddenFilteredFieldValues, []);
  assert.equal(context.hiddenOtherFieldCount, 2);
});

test("card context caps many filters and reports hidden filtered values", () => {
  const context = selectItemCardFields(item, fields, {
    filter: {
      rules: ["fifth", "fourth", "third", "second", "first"].map((fieldId) => ({ fieldId }))
    }
  });

  assert.deepEqual(
    context.visibleFieldValues.map(({ field }) => field.id),
    ["fifth", "fourth", "third"]
  );
  assert.deepEqual(
    context.hiddenFilteredFieldValues.map(({ field }) => field.id),
    ["second", "first"]
  );
});

test("built-in title filters do not consume custom field slots", () => {
  const context = selectItemCardFields(item, fields, {
    filter: { query: "collection", rules: [{ fieldId: "name" }] }
  });

  assert.deepEqual(
    context.visibleFieldValues.map(({ field }) => field.id),
    ["first", "second", "third"]
  );
});
