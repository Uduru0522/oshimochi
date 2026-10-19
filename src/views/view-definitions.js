import { NAV_GROUPS, NAV_KINDS, RENDERERS, VIEW_IDS } from "./view-metadata.js";
import { translate } from "../localization/translate.js";
import {
  getGoodsTypeItemsViewId,
  getGoodsTypeOverviewViewId
} from "./goods-types/goods-type-view-ids.js";

function createGoodsTypeViews(goodsTypes) {
  return goodsTypes.flatMap((goodsType) => {
    const itemsViewId = getGoodsTypeItemsViewId(goodsType.id);
    const overviewViewId = getGoodsTypeOverviewViewId(goodsType.id);

    return [
      {
        id: itemsViewId,
        label: goodsType.displayName,
        icon: "goodsType",
        section: goodsType.displayName,
        title: translate("{name} items", { name: goodsType.displayName }),
        renderer: RENDERERS.goodsTypeItems,
        nav: {
          group: NAV_GROUPS.primary,
          kind: NAV_KINDS.goodsType
        },
        goodsTypeId: goodsType.id,
        goodsType,
        overviewViewId
      },
      {
        id: overviewViewId,
        section: translate("Goods type"),
        title: translate("{name} overview", { name: goodsType.displayName }),
        renderer: RENDERERS.goodsTypeOverview,
        navigationId: itemsViewId,
        goodsTypeId: goodsType.id,
        goodsType,
        itemsViewId
      }
    ];
  });
}

export function createViewDefinitions(goodsTypes) {
  return [
    {
      id: VIEW_IDS.dashboard,
      label: translate("My collection"),
      icon: "dashboard",
      section: translate("Overview"),
      title: translate("My collection"),
      renderer: RENDERERS.dashboard,
      nav: {
        group: NAV_GROUPS.primary,
        kind: NAV_KINDS.view
      }
    },
    ...createGoodsTypeViews(goodsTypes),
    {
      id: VIEW_IDS.administration,
      label: translate("Administration"),
      icon: "administration",
      section: translate("Database setup"),
      title: translate("Administration"),
      renderer: RENDERERS.administration,
      nav: {
        group: NAV_GROUPS.utility,
        kind: NAV_KINDS.view
      },
      content: {
        heading: translate("Create and manage goods types."),
        description: translate(
          "Create collections here. Custom-field management will build on the same local database model."
        )
      }
    },
    {
      id: VIEW_IDS.options,
      label: translate("Options"),
      icon: "options",
      section: translate("Application"),
      title: translate("Options"),
      renderer: RENDERERS.options,
      nav: {
        group: NAV_GROUPS.utility,
        kind: NAV_KINDS.view
      }
    }
  ];
}

export function getViewById(views, viewId) {
  return views.find((view) => view.id === viewId) ?? views[0];
}
