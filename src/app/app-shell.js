import { createAppMode } from "./app-mode.js";
import { applyAppLanguage } from "./app-language.js";
import { getAppElements } from "./app-elements.js";
import { mountAppRuntime } from "./app-runtime.js";
import { bindLayoutTransition } from "./layout-transition.js";
import { createMutationController } from "./mutation-controller.js";
import { createStartupCoordinator } from "./startup-coordinator.js";
import { renderStartupError, renderStartupLoading } from "./startup-state.js";
import { createAppStorage } from "../data/create-storage.js";
import { createThemeController } from "../services/theme.js";
import { createLanguageController } from "../services/language.js";
import { createBackupFileService } from "../services/backup-files.js";
import { createGoogleDriveBackupProvider } from "../services/backups/google-drive-backup-provider.js";
import { createGoogleDriveConfiguration } from "../services/backups/google-drive-configuration.js";
import { createGoogleIdentityLoader } from "../services/backups/google-identity.js";
import { createGooglePickerLoader } from "../services/backups/google-picker.js";
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
  const backupFileService = createBackupFileService();
  const googleDriveConfiguration = createGoogleDriveConfiguration();
  const googleIdentityLoader = createGoogleIdentityLoader();
  const googlePickerLoader = createGooglePickerLoader();
  const backupProviders = Object.freeze([
    createGoogleDriveBackupProvider({
      configuration: googleDriveConfiguration,
      loadIdentity: googleIdentityLoader.load,
      loadPicker: googlePickerLoader.load,
      maxSnapshots: APP_CONFIG.backups.retainedCloudSnapshots
    })
  ]);
  const mutationController = createMutationController(elements.appShell);
  let unmountRuntime = null;
  let startupCoordinator;

  elements.projectRepositoryLink.href = APP_CONFIG.project.repositoryUrl;
  elements.projectExternalIcon.replaceChildren(createIcon("externalLink"));
  elements.projectRepositoryIcon.replaceChildren(createIcon("github"));
  elements.utilityMenuIcon.replaceChildren(createIcon("moreVertical"));

  startupCoordinator = createStartupCoordinator({
    createStorage: storageFactory,
    indexedDBFactory: globalThis.indexedDB,
    isDebugMode: appMode.isDebugMode,
    mountApplication: ({ goodsTypes, initialViewId, storage }) => {
      unmountRuntime?.();
      unmountRuntime = mountAppRuntime({
        backupFileService,
        backupProviders,
        elements,
        goodsTypes,
        initialViewId,
        mutationController,
        onGoodsTypeCreated: (goodsTypeId) =>
          startupCoordinator.refresh({
            initialViewId: getGoodsTypeItemsViewId(goodsTypeId)
          }),
        onLocalDataReset: () => startupCoordinator.refresh(),
        onLocalDataRestored: () => startupCoordinator.refresh({
          initialViewId: VIEW_IDS.administration
        }),
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
    backupProviders.forEach((provider) => provider.destroy?.());
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
    registerServiceWorker();
    window.addEventListener("pagehide", handlePageHide);
    await startupCoordinator.start();
  }

  return {
    start,
    stop
  };
}
