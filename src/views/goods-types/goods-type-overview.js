import { createElement } from "../../shared/dom.js";
import { translate } from "../../localization/translate.js";
import { createMetaList } from "../../shared/ui-components.js";
import { createGoodsTypeViewAction } from "./goods-type-view-action.js";

export function renderGoodsTypeOverview({ goodsType }, { onOpenItems }) {
  const article = createElement("article", {
    className: "content-panel goods-type-panel"
  });

  article.append(
    createElement("h3", { textContent: translate("Collection information") }),
    createMetaList([
      { label: translate("Goods type ID"), value: goodsType.id },
      {
        label: translate("Description"),
        value: goodsType.description || translate("No description")
      }
    ])
  );

  return {
    content: article,
    topbarAction: createGoodsTypeViewAction({
      icon: "arrowLeft",
      label: translate("Back to items"),
      onSelect: onOpenItems
    })
  };
}
