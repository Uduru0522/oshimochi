import assert from "node:assert/strict";
import test from "node:test";
import { createDashboardCardRecord, createRecentItemsCardRecord, parseDashboardCardRecord, parseDashboardCards } from "../../../src/data/models/dashboard-card.js";
import { createDashboardCardFixture } from "../../../test-support/dashboard-card-fixtures.js";

function withRules(rules) {
  const base = createDashboardCardFixture();
  return createDashboardCardRecord({ ...base, sources: [{ ...base.sources[0], filter: { query: '"limited" -damaged', rules } }] });
}

test("recent-items cards preserve hidden state and order without calculation fields", () => {
  const recent = createRecentItemsCardRecord({ visible: false, position: 1 });
  assert.deepEqual(parseDashboardCardRecord(JSON.parse(JSON.stringify(recent))), recent);
  assert.equal(recent.type, "recent-items");
  assert.equal(recent.visible, false);
  assert.equal(Object.hasOwn(recent, "title"), false);
  assert.equal(Object.hasOwn(recent, "sources"), false);
  assert.equal(createRecentItemsCardRecord().visible, true);
  assert.deepEqual(parseDashboardCards([recent, createDashboardCardFixture()]).map(({ id }) => id), ["spending", "recent-items"]);
  for (const changes of [{ visible: "yes" }, { visible: undefined }, { position: -1 },
    { updatedAt: "invalid" }, { id: "" }, { type: "unknown" }]) {
    assert.throws(() => parseDashboardCardRecord({ ...recent, ...changes }), TypeError);
  }
  assert.throws(() => parseDashboardCards([recent, { ...recent, id: "another", position: 2 }]), /Only one/);
});

test("dashboard definitions preserve numeric fields, currency, labels, and order through JSON", () => {
  const value = createDashboardCardFixture({ format: { type: "currency", currency: "JPY" } });
  assert.deepEqual(parseDashboardCardRecord(JSON.parse(JSON.stringify(value))), value);
  assert.equal(value.sources[0].fieldName, "Purchase price");
  assert.deepEqual(parseDashboardCards([value, { ...value, id: "first", position: 1 }]).map(({ id }) => id), ["spending", "first"]);
  const copy = parseDashboardCardRecord(value); copy.sources[0].goodsTypeName = "Other";
  assert.equal(value.sources[0].goodsTypeName, "Figures");
});

test("dashboard display preferences default to automatic and survive JSON with invalid combinations rejected", () => {
  assert.equal(createDashboardCardFixture().displayMode, "auto");
  for (const displayMode of ["auto", "number", "ring"]) {
    const value = createDashboardCardFixture({ displayMode });
    assert.equal(parseDashboardCardRecord(JSON.parse(JSON.stringify(value))).displayMode, displayMode);
  }
  for (const displayMode of [null, "", "pie", 1]) assert.throws(() => createDashboardCardFixture({ displayMode }));
  assert.throws(() => createDashboardCardFixture({ calculation: "average", displayMode: "ring" }));
});

test("dashboard grouping definitions round-trip stable field mappings and reject incomplete category choices", () => {
  const groupBy = { type: "field", fields: [{ goodsTypeId: "figures", fieldId: "status", fieldName: "Status", dataType: "select", choiceLabels: [{ id: "owned", label: "Owned" }] }] };
  const card = createDashboardCardFixture({ groupBy });
  assert.deepEqual(parseDashboardCardRecord(JSON.parse(JSON.stringify(card))).groupBy, groupBy);
  assert.deepEqual(createDashboardCardFixture().groupBy, { type: "collection" });
  const copy = parseDashboardCardRecord(card); copy.groupBy.fields[0].choiceLabels[0].label = "Other";
  assert.equal(card.groupBy.fields[0].choiceLabels[0].label, "Owned");
  const boolean = { type: "field", fields: [{ goodsTypeId: "figures", fieldId: "owned", fieldName: "Owned?", dataType: "boolean", falseLabel: "No", trueLabel: "Yes" }] };
  assert.deepEqual(createDashboardCardFixture({ groupBy: boolean }).groupBy, boolean);
  for (const invalid of [null, {}, { type: "unknown" }, { type: "field", fields: [] },
    { type: "field", fields: [groupBy.fields[0], groupBy.fields[0]] },
    { type: "field", fields: [{ ...groupBy.fields[0], goodsTypeId: "other" }] },
    { type: "field", fields: [{ ...groupBy.fields[0], dataType: "number" }] },
    { type: "field", fields: [{ ...groupBy.fields[0], choiceLabels: [{ id: "owned", label: "" }] }] }]) {
    assert.throws(() => createDashboardCardFixture({ groupBy: invalid }));
  }
  assert.throws(() => createDashboardCardFixture({ calculation: "average", groupBy }));
});

test("dashboard preset and custom units survive storage while invalid units are rejected", () => {
  for (const [symbol, position] of [["¥", "prefix"], ["kg", "suffix"], ["個", "suffix"], ["my points", "suffix"]]) {
    const value = createDashboardCardFixture({ calculation: "count", format: { type: "number", currency: null, unit: { symbol, position } } });
    assert.deepEqual(parseDashboardCardRecord(JSON.parse(JSON.stringify(value))).format.unit, { symbol, position });
  }
  for (const unit of [null, {}, { symbol: "", position: "suffix" }, { symbol: "x".repeat(33), position: "prefix" },
    { symbol: "kg\ncm", position: "suffix" }, { symbol: "kg", position: "middle" }]) {
    assert.throws(() => createDashboardCardFixture({ format: { type: "number", currency: null, unit } }));
  }
  assert.throws(() => createDashboardCardFixture({ format: { type: "currency", currency: "JPY", unit: { symbol: "kg", position: "suffix" } } }));
});

test("dashboard saved filters round-trip every supported type with zero and false intact", () => {
  const rules = [
    { fieldId: "notes", fieldName: "Notes", dataType: "text", operator: "contains", value: "signed" },
    { fieldId: "long-notes", fieldName: "Description", dataType: "long_text", operator: "ends_with", value: "boxed" },
    { fieldId: "source", fieldName: "Source", dataType: "url", operator: "domain_equals", value: "example.com" },
    { fieldId: "price", fieldName: "Cost", dataType: "number", operator: "range", min: 0 },
    { fieldId: "owned", fieldName: "Owned", dataType: "boolean", values: [false] },
    { fieldId: "date", fieldName: "Purchased", dataType: "date", from: "2026-01-01", to: "2026-12-31" },
    { fieldId: "release", fieldName: "Released", dataType: "date", datePreset: "this-year" },
    { fieldId: "status", fieldName: "Status", dataType: "select", values: ["wish"], choiceLabels: [{ id: "wish", label: "Wish list" }] }
  ];
  const value = withRules(rules);
  assert.deepEqual(parseDashboardCardRecord(JSON.parse(JSON.stringify(value))), value);
  assert.equal(value.sources[0].filter.rules[3].min, 0);
  assert.deepEqual(value.sources[0].filter.rules[4].values, [false]);
  assert.equal(value.sources[0].filter.rules[7].choiceLabels[0].label, "Wish list");
});

test("dashboard count definitions require neither a numeric field nor currency formatting", () => {
  const card = createDashboardCardFixture({ calculation: "count" });
  assert.equal(card.sources[0].fieldId, null);
  assert.equal(card.sources[0].fieldName, null);
  assert.throws(() => createDashboardCardFixture({ calculation: "count", format: { type: "currency", currency: "JPY" } }));
});

test("dashboard definitions reject incomplete mappings and ambiguous ordering", () => {
  const changes = [
    (card) => { card.title = " "; }, (card) => { card.id = " bad"; },
    (card) => { card.position = -1; }, (card) => { card.calculation = "multiply"; },
    (card) => { card.includeDeleted = "yes"; }, (card) => { card.sources = []; },
    (card) => { card.sources[0].fieldName = ""; }, (card) => { card.sources[0].goodsTypeName = ""; },
    (card) => { delete card.sources[0].filter; }, (card) => { card.sources[0].filter.rules = null; },
    (card) => { card.sources.push(structuredClone(card.sources[0])); },
    (card) => { card.format = { type: "currency", currency: ["JPY"] }; },
    (card) => { card.format = { type: "currency", currency: "yen" }; },
    (card) => { card.format.currency = "JPY"; }, (card) => { card.updatedAt = "invalid"; }
  ];
  for (const change of changes) {
    const card = createDashboardCardFixture(); change(card);
    assert.throws(() => parseDashboardCardRecord(card), TypeError);
  }
  const card = createDashboardCardFixture();
  assert.throws(() => parseDashboardCards([card, card]), /unique/);
  assert.throws(() => parseDashboardCards([card, { ...card, id: "other" }]), /positions/);
});

test("dashboard saved filters reject invalid bounds, values, and missing choice labels", () => {
  const invalid = [
    { dataType: "number", operator: "range", min: 10, max: 0 },
    { dataType: "number", operator: "range", min: Infinity },
    { dataType: "number", operator: "equals", min: 0 },
    { dataType: "date", from: "2026-02-30", to: "" },
    { dataType: "date", from: "2026-12-01", to: "2026-01-01" },
    { dataType: "date", from: "", to: "" },
    { dataType: "date", datePreset: "next-century" },
    { dataType: "boolean", values: ["false"] },
    { dataType: "boolean", values: [true, true] },
    { dataType: "select", values: ["wish"], choiceLabels: [] },
    { dataType: "text", operator: "contains", value: "" },
    { dataType: "text", operator: "execute", value: "x" },
    { dataType: "image", values: [true] }
  ];
  for (const rule of invalid) assert.throws(() => withRules([{ fieldId: "field", fieldName: "Field", ...rule }]), TypeError);
});
