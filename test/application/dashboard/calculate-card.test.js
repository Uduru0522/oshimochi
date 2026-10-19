import assert from "node:assert/strict";
import test from "node:test";

import { calculateDashboardCard } from "../../../src/application/dashboard/calculate-card.js";

function collection(id, entries) {
  return {
    goodsType: { id, displayName: id, isDeleted: false },
    fields: [
      { id: `${id}-price`, dataType: "number", displayName: `${id} cost` },
      { id: `${id}-purchased`, dataType: "date" },
      { id: `${id}-owned`, dataType: "boolean", options: { falseLabel: "No", trueLabel: "Yes" } },
      { id: `${id}-status`, dataType: "select", options: { choices: [
        { id: "owned", label: "Owned" }, { id: "wish", label: "Wish list" }
      ] } }
    ].map((field) => ({ ...field, goodsTypeId: id, isBuiltIn: false, isDeleted: false })),
    items: entries.map(({ isDeleted = false, ...values }, index) => ({
      id: `${id}-item-${index}`,
      name: `${id} item ${index}`,
      goodsTypeId: id,
      isDeleted,
      customValues: Object.fromEntries(Object.entries(values).map(([key, value]) => [`${id}-${key}`, value]))
    }))
  };
}

function catalog() {
  return [
    collection("figures", [
      { price: 100, purchased: "2026-01-01", owned: true, status: "owned" },
      { price: 0, purchased: "2026-12-31", owned: false, status: "wish" },
      { purchased: "2026-06-01" },
      { price: 900, purchased: "2026-03-01", isDeleted: true }
    ]),
    collection("tapestries", [
      { price: 300, purchased: "2025-12-31", owned: true, status: "owned" },
      { price: 200, purchased: "2026-06-15", owned: true, status: "owned" }
    ])
  ];
}

function card(calculation = "sum") {
  return { calculation, includeDeleted: false, sources: [
    { goodsTypeId: "figures", fieldId: "figures-price" },
    { goodsTypeId: "tapestries", fieldId: "tapestries-price" }
  ] };
}

test("dashboard sum combines different collection fields and reports missing-value coverage", () => {
  assert.deepEqual(calculateDashboardCard(card(), catalog()), {
    status: "ready", value: 600, matchedItemCount: 5, valueCount: 4, issues: []
  });
});

test("dashboard count includes unpriced items and extrema retain zero", () => {
  for (const [calculation, expected] of [["count", 5], ["minimum", 0], ["maximum", 300]]) {
    assert.equal(calculateDashboardCard(card(calculation), catalog()).value, expected, calculation);
  }
});

test("dashboard average weights individual values across unequal collection sizes", () => {
  const data = [collection("figures", [{ price: 100 }]),
    collection("tapestries", [{ price: 0 }, { price: 200 }, { price: 300 }])];
  assert.equal(calculateDashboardCard(card("average"), data).value, 150);
});

test("dashboard includes deleted items only when requested and ignores unselected collections", () => {
  const data = [...catalog(), collection("other", [{ price: 99999 }])];
  assert.equal(calculateDashboardCard(card(), data).value, 600);
  assert.deepEqual(calculateDashboardCard({ ...card(), includeDeleted: true }, data), {
    status: "ready", value: 1500, matchedItemCount: 6, valueCount: 5, issues: []
  });
});

test("dashboard empty numeric results differ from a measured zero and a zero count", () => {
  const data = [collection("figures", [{}, {}]), collection("tapestries", [])];
  for (const calculation of ["sum", "average", "minimum", "maximum"]) {
    const result = calculateDashboardCard(card(calculation), data);
    assert.equal(result.status, "empty", calculation);
    assert.equal(result.value, null, calculation);
    assert.equal(result.matchedItemCount, 2, calculation);
    assert.equal(result.valueCount, 0, calculation);
  }
  data[0].items[0].customValues["figures-price"] = 0;
  assert.equal(calculateDashboardCard(card(), data).status, "ready");
  assert.equal(calculateDashboardCard(card(), data).value, 0);
  data[0].items = [];
  assert.equal(calculateDashboardCard(card("count"), data).value, 0);
});

test("dashboard applies collection-specific conditions before combining totals", () => {
  const definition = card();
  definition.sources[0].filter = { rules: [
    { fieldId: "figures-purchased", from: "2026-01-01", to: "2026-12-31" },
    { fieldId: "figures-owned", values: [true] }
  ] };
  definition.sources[1].filter = { rules: [
    { fieldId: "tapestries-price", operator: "range", min: 250 },
    { fieldId: "tapestries-status", values: ["owned", "wish"] }
  ] };
  assert.deepEqual(calculateDashboardCard(definition, catalog()), {
    status: "ready", value: 400, matchedItemCount: 2, valueCount: 2, issues: []
  });
});

test("dashboard numeric filters include missing values without treating them as zero", () => {
  const definition = card(); definition.sources = [definition.sources[0]];
  definition.sources[0].filter = { rules: [
    { fieldId: "figures-price", operator: "range", min: 0, max: 0, includeMissing: true }
  ] };
  assert.deepEqual(calculateDashboardCard(definition, catalog()), {
    status: "ready", value: 0, matchedItemCount: 2, valueCount: 1, issues: []
  });
});

test("dashboard this-year filters advance with the local year without rewriting saved bounds", () => {
  const definition = card();
  for (const source of definition.sources) source.filter = { rules: [
    { fieldId: `${source.goodsTypeId}-purchased`, datePreset: "this-year", from: "1999-01-01" }
  ] };
  const data = catalog(); const before = structuredClone({ definition, data });
  const current = calculateDashboardCard(definition, data, { now: () => new Date(2026, 11, 31, 23, 59) });
  assert.equal(current.matchedItemCount, 4);
  assert.equal(current.valueCount, 3);
  const next = calculateDashboardCard(definition, data, { now: () => new Date(2027, 0, 1) });
  assert.equal(next.status, "empty");
  assert.equal(next.matchedItemCount, 0);
  assert.deepEqual({ definition, data }, before);
});

test("dashboard field and choice label renames preserve saved references", () => {
  const definition = card();
  definition.sources[0].filter = { rules: [{ fieldId: "figures-status", values: ["owned"] }] };
  const data = catalog(); const before = calculateDashboardCard(definition, data);
  data[0].goodsType.displayName = "New collection title";
  data[0].fields[0].displayName = "New purchase cost title";
  data[0].fields[3].options.choices[0].label = "Purchased";
  assert.deepEqual(calculateDashboardCard(definition, data), before);
});

test("dashboard broken references require repair and never expose partial totals", () => {
  const scenarios = [
    ["collection-unavailable", (data) => data.splice(0, 1)],
    ["collection-unavailable", (data) => { data[0].goodsType.isDeleted = true; }],
    ["field-unavailable", (data) => data[0].fields.splice(0, 1)],
    ["field-unavailable", (data) => { data[0].fields[0].isDeleted = true; }],
    ["field-unavailable", (data) => { data[0].fields[0].goodsTypeId = "tapestries"; }],
    ["numeric-field-required", (data) => { data[0].fields[0].dataType = "text"; }],
    ["field-unavailable", (data, definition) => {
      definition.sources[0].filter = { rules: [{ fieldId: "removed", values: [true] }] };
    }],
    ["field-unavailable", (data, definition) => {
      data[0].fields[2].isDeleted = true;
      definition.sources[0].filter = { rules: [{ fieldId: "figures-owned", values: [true] }] };
    }],
    ["choice-unavailable", (data, definition) => {
      definition.sources[0].filter = { rules: [{ fieldId: "figures-status", values: ["removed"] }] };
    }]
  ];
  for (const [code, change] of scenarios) {
    const data = catalog(); const definition = card(); change(data, definition);
    const result = calculateDashboardCard(definition, data);
    assert.equal(result.status, "needs-repair", code);
    assert.equal(result.value, null, code);
    assert.equal(result.matchedItemCount, null, code);
    assert.equal(result.valueCount, null, code);
    assert.equal(result.issues[0].code, code);
    assert.equal(result.issues[0].goodsTypeId, "figures");
  }
});

test("dashboard unavailable references retain names and prefer current labels when available", () => {
  const definition = card();
  const source = definition.sources[0];
  source.goodsTypeName = "Figures";
  source.fieldName = "Purchase price";
  source.filter = { rules: [{
    fieldId: "figures-status", fieldName: "Status", values: ["wish"],
    choiceLabels: [{ id: "wish", label: "Wish list" }]
  }] };
  const data = catalog();
  data[0].goodsType.displayName = "Collectible figures";
  data[0].fields.splice(0, 1);
  data[0].fields.find(({ id }) => id === "figures-status").options.choices.pop();
  const result = calculateDashboardCard(definition, data);
  assert.equal(result.value, null);
  assert.deepEqual(result.issues, [
    { code: "field-unavailable", goodsTypeId: "figures", goodsTypeName: "Collectible figures",
      fieldId: "figures-price", fieldName: "Purchase price" },
    { code: "choice-unavailable", goodsTypeId: "figures", goodsTypeName: "Collectible figures",
      fieldId: "figures-status", fieldName: "Status", choiceId: "wish", choiceName: "Wish list" }
  ]);
  data.shift();
  assert.equal(calculateDashboardCard(definition, data).issues[0].goodsTypeName, "Figures");
});

test("dashboard duplicate sources and unsupported calculations are rejected", () => {
  assert.throws(() => calculateDashboardCard({ ...card(), sources: [] }, catalog()), /at least one/);
  const definition = card(); definition.sources.push({ ...definition.sources[0] });
  assert.throws(() => calculateDashboardCard(definition, catalog()), /twice/);
  assert.throws(() => calculateDashboardCard(card("multiply"), catalog()), /Unsupported/);
});

test("dashboard relative date rules reject unsupported presets and non-date fields", () => {
  const definition = card();
  definition.sources[0].filter = { rules: [{ fieldId: "figures-price", datePreset: "this-year" }] };
  assert.throws(() => calculateDashboardCard(definition, catalog()), /date field/);
  definition.sources[0].filter.rules[0] = { fieldId: "figures-purchased", datePreset: "unknown" };
  assert.throws(() => calculateDashboardCard(definition, catalog()), /Unsupported/);
  definition.sources[0].filter.rules[0].datePreset = "this-year";
  assert.throws(() => calculateDashboardCard(definition, catalog(), { now: () => "invalid" }), /calendar year/);
});

test("dashboard overflow is explicit while representable averages and tiny values survive", () => {
  const data = [collection("figures", [{ price: 1e308 }, { price: 1e308 }])];
  const definition = { ...card(), sources: [card().sources[0]] };
  const result = calculateDashboardCard(definition, data);
  assert.equal(result.status, "overflow");
  assert.equal(result.value, null);
  assert.equal(result.valueCount, 2);
  assert.equal(calculateDashboardCard({ ...definition, calculation: "average" }, data).value, 1e308);
  data[0].items.forEach((item) => { item.customValues["figures-price"] = Number.MIN_VALUE; });
  assert.equal(calculateDashboardCard({ ...definition, calculation: "average" }, data).value, Number.MIN_VALUE);
});
