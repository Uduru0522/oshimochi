import { createDashboardCardRecord } from "../src/data/models/dashboard-card.js";

export function createDashboardCardFixture(overrides = {}) {
  return createDashboardCardRecord({
    id: "spending", title: "Total spent", calculation: "sum", position: 0,
    sources: [{
      goodsTypeId: "figures", goodsTypeName: "Figures",
      fieldId: "figures-price", fieldName: "Purchase price"
    }],
    ...overrides
  }, { now: () => "2026-10-17T00:00:00.000Z" });
}
