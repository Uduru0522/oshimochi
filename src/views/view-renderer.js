import { createElement } from "../shared/dom.js";
import { RENDERERS } from "./view-metadata.js";
import { renderAdministrationView } from "./administration/administration-view.js";
import { renderItemsView } from "./items/items-view.js";
import { renderGoodsTypeOverview } from "./goods-types/goods-type-overview.js";
import { renderOptionsView } from "./options/options-view.js";

export function renderPlaceholderView(view) {
  const article = createElement("article", { className: "placeholder" });
  const heading = createElement("h3", { textContent: view.content.heading });
  const description = createElement("p", { textContent: view.content.description });

  article.append(heading, description);

  return article;
}

export function createViewRenderer({
  backupFileService,
  backupProviders,
  goodsTypes,
  languageController,
  mutationController,
  onNavigate,
  onGoodsTypeCreated,
  onLocalDataReset,
  onLocalDataRestored,
  onLanguageChanged,
  operations,
  themeController
}) {
  const renderers = {
    [RENDERERS.administration]: () => renderAdministrationView({
      backupFileService,
      backupOperations: operations.backups,
      backupProviders,
      createGoodsType: operations.goodsTypes.create,
      fieldManagement: operations.fields,
      goodsTypes,
      mutationController,
      onGoodsTypeCreated,
      onLocalDataReset,
      onLocalDataRestored,
      resetLocalData: operations.localData.reset
    }),
    [RENDERERS.goodsTypeOverview]: (view) => renderGoodsTypeOverview(view, {
      onOpenItems: () => onNavigate(view.itemsViewId)
    }),
    [RENDERERS.goodsTypeItems]: (view) => renderItemsView(view, {
      itemManagement: operations.items,
      mutationController,
      onOpenOverview: () => onNavigate(view.overviewViewId)
    }),
    [RENDERERS.options]: () => renderOptionsView({
      languageController,
      onLanguageChanged,
      themeController
    }),
    [RENDERERS.placeholder]: (view) => renderPlaceholderView(view)
  };

  return {
    render(view) {
      const renderer = renderers[view.renderer] ?? renderers[RENDERERS.placeholder];
      return renderer(view);
    }
  };
}
