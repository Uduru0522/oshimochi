import assert from "node:assert/strict";
import test from "node:test";

import { createViewDefinitions } from "../../src/views/view-definitions.js";
import { NAV_KINDS, RENDERERS } from "../../src/views/view-metadata.js";

const GOODS_TYPE = {
  id: "figures",
  displayName: "Figures",
  description: "Scale figures"
};

test("goods types open Items directly and keep Overview as a secondary route", () => {
  const views = createViewDefinitions([GOODS_TYPE]);
  const goodsViews = views.filter((view) => view.goodsTypeId === GOODS_TYPE.id);
  const items = goodsViews.find((view) => view.id === "goods:figures");
  const overview = goodsViews.find((view) => view.id === "goods:figures:overview");

  assert.equal(goodsViews.length, 2);
  assert.equal(items.label, "Figures");
  assert.equal(items.renderer, RENDERERS.goodsTypeItems);
  assert.equal(items.nav.kind, NAV_KINDS.goodsType);
  assert.equal(items.overviewViewId, overview.id);
  assert.equal(overview.renderer, RENDERERS.goodsTypeOverview);
  assert.equal(overview.nav, undefined);
  assert.equal(overview.navigationId, items.id);
  assert.equal(overview.itemsViewId, items.id);
  assert.equal(views.some((view) => view.id === "goods:figures:add"), false);
});
