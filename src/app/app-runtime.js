import { APP_CONFIG } from "./config.js";
import { createViewRouter } from "./view-router.js";
import { createNavigation } from "../navigation/navigation.js";
import { createViewDefinitions } from "../views/view-definitions.js";
import { createViewRenderer } from "../views/view-renderer.js";
import { createGoodsTypeCreationOperation } from "../application/goods-types/create-goods-type.js";
import { createFieldManagementOperations } from "../application/fields/manage-fields.js";
import { createResetLocalDataOperation } from "../application/data/reset-local-data.js";
import { createItemManagementOperations } from "../application/items/manage-items.js";

export function mountAppRuntime({
  elements,
  goodsTypes,
  initialViewId = APP_CONFIG.defaultViewId,
  languageController,
  mutationController,
  onGoodsTypeCreated,
  onLocalDataReset,
  onLanguageChanged,
  storage,
  themeController
}) {
  const views = createViewDefinitions(goodsTypes);
  let router;
  const renderer = createViewRenderer({
    createGoodsType: createGoodsTypeCreationOperation({ storage }),
    fieldManagement: createFieldManagementOperations({ storage }),
    goodsTypes,
    itemManagement: createItemManagementOperations({ storage }),
    mutationController,
    onNavigate: (viewId) => router.setActiveView(viewId),
    onGoodsTypeCreated,
    onLocalDataReset,
    onLanguageChanged,
    resetLocalData: createResetLocalDataOperation({ storage }),
    languageController,
    themeController
  });

  const navigation = createNavigation({
    primaryContainer: elements.primaryNavList,
    utilityContainer: elements.utilityNavList,
    views,
    onSelect: (viewId) => router.setActiveView(viewId)
  });

  router = createViewRouter({
    navigation,
    renderer,
    views,
    viewActions: elements.viewActions,
    viewPanel: elements.viewPanel,
    viewSection: elements.viewSection,
    viewTitle: elements.viewTitle
  });

  navigation.render();
  router.setActiveView(initialViewId);
  return () => router.destroy();
}
