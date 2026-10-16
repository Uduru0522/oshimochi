import { APP_CONFIG } from "./config.js";
import { createViewRouter } from "./view-router.js";
import { createNavigation } from "../navigation/navigation.js";
import { createViewDefinitions } from "../views/view-definitions.js";
import { createViewRenderer } from "../views/view-renderer.js";
import { createApplicationOperations } from "../application/create-application-operations.js";

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
  const operations = createApplicationOperations({ storage });
  let router;
  const renderer = createViewRenderer({
    goodsTypes,
    mutationController,
    onNavigate: (viewId) => router.setActiveView(viewId),
    onGoodsTypeCreated,
    onLocalDataReset,
    onLanguageChanged,
    operations,
    projectRepositoryUrl: APP_CONFIG.project.repositoryUrl,
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
    viewToolbar: elements.viewToolbar,
    viewTitle: elements.viewTitle
  });

  navigation.render();
  router.setActiveView(initialViewId);
  return () => router.destroy();
}
