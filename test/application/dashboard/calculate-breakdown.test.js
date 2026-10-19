import assert from "node:assert/strict";
import test from "node:test";
import { calculateDashboardBreakdown } from "../../../src/application/dashboard/calculate-breakdown.js";

function fixture() {
  const source = { goodsTypeId: "figures", goodsTypeName: "Figures", fieldId: "cost", fieldName: "Cost" };
  const group = { goodsTypeId: "figures", fieldId: "status", fieldName: "Status", dataType: "select",
    choiceLabels: [{ id: "owned", label: "Owned" }, { id: "wanted", label: "Wanted" }] };
  const card = { calculation: "count", includeDeleted: false, sources: [source], groupBy: { type: "field", fields: [group] } };
  const collection = {
    goodsType: { id: "figures", displayName: "Figures" },
    fields: [
      { id: "cost", goodsTypeId: "figures", dataType: "number" },
      { id: "status", goodsTypeId: "figures", displayName: "Status", dataType: "select", options: { choices: group.choiceLabels } },
      { id: "owned", goodsTypeId: "figures", displayName: "Owned?", dataType: "boolean", options: { falseLabel: "Not owned", trueLabel: "Owned" } }
    ],
    items: [
      { id: "one", goodsTypeId: "figures", name: "One", customValues: { cost: 100, status: "owned", owned: true } },
      { id: "two", goodsTypeId: "figures", name: "Two", customValues: { cost: 0, status: "wanted", owned: false } },
      { id: "three", goodsTypeId: "figures", name: "Three", customValues: { cost: 200 } },
      { id: "four", goodsTypeId: "figures", name: "Four", customValues: { status: "owned" } },
      { id: "deleted", goodsTypeId: "figures", name: "Deleted", isDeleted: true, customValues: { cost: 900, status: "wanted" } }
    ]
  };
  return { card, collections: [collection] };
}

test("dashboard selection breakdowns count each matching item including uncategorized items", () => {
  const { card, collections } = fixture();
  const result = calculateDashboardBreakdown(card, collections);
  assert.equal(result.value, 4);
  assert.deepEqual(Object.fromEntries(result.breakdown.map(({ label, value }) => [label, value])), {
    Owned: 2, Wanted: 1, Uncategorized: 1
  });
  assert.equal(result.breakdown.reduce((sum, entry) => sum + entry.value, 0), result.value);
  card.includeDeleted = true;
  assert.equal(calculateDashboardBreakdown(card, collections).breakdown.find(({ label }) => label === "Wanted").value, 2);
});

test("dashboard category sums retain zero and missing numeric values after applying filters", () => {
  const { card, collections } = fixture(); card.calculation = "sum";
  const result = calculateDashboardBreakdown(card, collections);
  assert.equal(result.value, 300);
  assert.equal(result.valueCount, 3);
  assert.equal(result.breakdown.find(({ label }) => label === "Wanted").value, 0);
  assert.equal(result.breakdown.find(({ label }) => label === "Owned").matchedItemCount, 2);
  card.sources[0].filter = { rules: [{ fieldId: "cost", operator: "range", min: 0, max: 0 }] };
  const filtered = calculateDashboardBreakdown(card, collections);
  assert.equal(filtered.value, 0);
  assert.deepEqual(filtered.breakdown.map(({ label, value }) => [label, value]), [["Wanted", 0]]);
  collections[0].items[1].customValues = { status: "wanted" };
  delete card.sources[0].filter;
  assert.equal(calculateDashboardBreakdown(card, collections).breakdown.find(({ label }) => label === "Wanted").value, null);
});

test("dashboard two-option grouping distinguishes false from missing and keeps stable identities after renames", () => {
  const { card, collections } = fixture();
  card.groupBy.fields = [{ goodsTypeId: "figures", fieldId: "owned", fieldName: "Owned?", dataType: "boolean", falseLabel: "Not owned", trueLabel: "Owned" }];
  const before = calculateDashboardBreakdown(card, collections);
  assert.deepEqual(Object.fromEntries(before.breakdown.map(({ label, value }) => [label, value])), {
    Owned: 1, "Not owned": 1, Uncategorized: 2
  });
  collections[0].fields[2].options.falseLabel = "Wanted";
  const after = calculateDashboardBreakdown(card, collections);
  assert.equal(after.breakdown.find(({ label }) => label === "Wanted").id, before.breakdown.find(({ label }) => label === "Not owned").id);
});

test("dashboard categories in different collections stay distinct even with matching choice IDs and labels", () => {
  const { card, collections } = fixture();
  const other = structuredClone(collections[0]);
  other.goodsType = { id: "other", displayName: "Tapestries" };
  other.fields.forEach(field => { field.goodsTypeId = "other"; });
  other.items = [{ goodsTypeId: "other", customValues: { status: "owned", cost: 300 } }];
  collections.push(other);
  card.sources.push({ ...card.sources[0], goodsTypeId: "other" });
  card.groupBy.fields.push({ ...card.groupBy.fields[0], goodsTypeId: "other" });
  const result = calculateDashboardBreakdown(card, collections);
  assert.equal(result.value, 5);
  const owned = result.breakdown.filter(({ label }) => label === "Owned");
  assert.equal(owned.length, 2);
  assert.notEqual(owned[0].id, owned[1].id);
  assert.deepEqual(owned.map(({ goodsTypeName }) => goodsTypeName), ["Figures", "Tapestries"]);
});

test("dashboard unavailable grouping fields or used choices never expose a partial chart", () => {
  const { card, collections } = fixture();
  collections[0].fields[1].isDeleted = true;
  let result = calculateDashboardBreakdown(card, collections);
  assert.equal(result.status, "needs-repair");
  assert.equal(result.value, null);
  assert.equal(result.issues[0].fieldName, "Status");
  collections[0].fields[1].isDeleted = false;
  collections[0].fields[1].options.choices = [{ id: "wanted", label: "Wanted" }];
  result = calculateDashboardBreakdown(card, collections);
  assert.equal(result.status, "needs-repair");
  assert.equal(result.value, null);
  assert.deepEqual(result.breakdown, []);
  assert.equal(result.issues[0].choiceName, "Owned");
  collections[0].fields[1].dataType = "text";
  result = calculateDashboardBreakdown(card, collections);
  assert.equal(result.issues[0].code, "category-field-required");
});
