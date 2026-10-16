import { createAppMode } from "./app-mode.js";
import { applyAppLanguage } from "./app-language.js";
import { getAppElements } from "./app-elements.js";
import { mountAppRuntime } from "./app-runtime.js";
import { bindLayoutTransition } from "./layout-transition.js";
import { createMutationController } from "./mutation-controller.js";
import { createStartupCoordinator } from "./startup-coordinator.js";
import { renderStartupError, renderStartupLoading } from "./startup-state.js";
import { bindViewScrollState } from "./view-scroll-state.js";
import { createAppStorage } from "../data/create-storage.js";
import { createThemeController } from "../services/theme.js";
import { createLanguageController } from "../services/language.js";
import { registerServiceWorker } from "../services/service-worker-registration.js";
import { createIcon } from "../shared/icons.js";
import { getGoodsTypeItemsViewId } from "../views/goods-types/goods-type-view-ids.js";
import { VIEW_IDS } from "../views/view-metadata.js";
import { APP_CONFIG } from "./config.js";

export function createApp({ storageFactory = createAppStorage } = {}) {
  const elements = getAppElements();
  const appMode = createAppMode();
  const languageController = createLanguageController();
  const themeController = createThemeController();
  const mutationController = createMutationController(elements.appShell);
  let unmountRuntime = null;
  let startupCoordinator;

  elements.projectRepositoryLink.href = APP_CONFIG.project.repositoryUrl;
  elements.projectRepositoryIcon.replaceChildren(createIcon("github"));

  startupCoordinator = createStartupCoordinator({
    createStorage: storageFactory,
    indexedDBFactory: globalThis.indexedDB,
    isDebugMode: appMode.isDebugMode,
    mountApplication: ({ goodsTypes, initialViewId, storage }) => {
      unmountRuntime?.();
      unmountRuntime = mountAppRuntime({
        elements,
        goodsTypes,
        initialViewId,
        mutationController,
        onGoodsTypeCreated: (goodsTypeId) =>
          startupCoordinator.refresh({
            initialViewId: getGoodsTypeItemsViewId(goodsTypeId)
          }),
        onLocalDataReset: () => startupCoordinator.refresh(),
        onLanguageChanged: () => {
          applyAppLanguage(elements);
          startupCoordinator.refresh({ initialViewId: VIEW_IDS.options });
        },
        storage,
        languageController,
        themeController
      });
    },
    renderError: (error, options) => renderStartupError(elements, error, options),
    renderLoading: () => renderStartupLoading(elements)
  });
  let hasStarted = false;

  function handlePageHide(event) {
    if (!event.persisted) {
      stop();
    }
  }

  function stop() {
    if (!hasStarted) {
      return;
    }

    hasStarted = false;
    unmountRuntime?.();
    unmountRuntime = null;
    startupCoordinator.stop();
    window.removeEventListener("pagehide", handlePageHide);
  }

  async function start() {
    if (hasStarted) {
      return;
    }

    hasStarted = true;
    languageController.initialize();
    applyAppLanguage(elements);
    themeController.initialize();
    bindLayoutTransition();
    bindViewScrollState(elements.viewPanel);
    registerServiceWorker();
    window.addEventListener("pagehide", handlePageHide);
    await startupCoordinator.start();
  }

  return {
    start,
    stop
  };
}
