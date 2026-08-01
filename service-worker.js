const CACHE_NAME = "wotagoods-manager-v93";

const ASSET_GROUPS = {
  app: [
    "./src/application/data/reset-local-data.js",
    "./src/application/fields/field-configuration.js",
    "./src/application/fields/manage-fields.js",
    "./src/application/goods-types/create-goods-type.js",
    "./src/application/items/item-values.js",
    "./src/application/items/item-field-value.js",
    "./src/application/items/filter-items.js",
    "./src/application/items/sort-items.js",
    "./src/application/items/manage-items.js",
    "./src/app/app-elements.js",
    "./src/app/app-mode.js",
    "./src/app/app-runtime.js",
    "./src/app/app-shell.js",
    "./src/app/config.js",
    "./src/app/layout-transition.js",
    "./src/app/mutation-controller.js",
    "./src/app/startup-state.js",
    "./src/app/startup-coordinator.js",
    "./src/app/view-scroll-state.js",
    "./src/app/view-router.js"
  ],
  core: [
    "./",
    "./index.html",
    "./src/bootstrap/theme-bootstrap.js",
    "./src/main.js",
    "./src/styles/app.css"
  ],
  data: [
    "./src/data/create-storage.js",
    "./src/data/contracts/storage-contract.js",
    "./src/data/debug/debug-fixtures.js",
    "./src/data/debug/debug-storage.js",
    "./src/data/indexeddb/connection.js",
    "./src/data/indexeddb/database-schema.js",
    "./src/data/indexeddb/field-definition-repository.js",
    "./src/data/indexeddb/goods-type-repository.js",
    "./src/data/indexeddb/indexeddb-storage.js",
    "./src/data/indexeddb/item-repository.js",
    "./src/data/indexeddb/local-data-repository.js",
    "./src/data/indexeddb/requests.js",
    "./src/data/models/asset.js",
    "./src/data/models/built-in-fields.js",
    "./src/data/models/field-definition.js",
    "./src/data/models/goods-type.js",
    "./src/data/models/item.js"
  ],
  install: [
    "./manifest.webmanifest",
    "./icons/icon-192.svg",
    "./icons/icon-512.svg"
  ],
  navigation: [
    "./src/navigation/navigation.js",
    "./src/navigation/nav-items.js",
    "./src/navigation/primary-navigation.js",
    "./src/navigation/scrollable-row.js",
    "./src/navigation/utility-navigation.js"
  ],
  services: [
    "./src/services/service-worker-registration.js",
    "./src/services/storage.js",
    "./src/services/theme.js"
  ],
  shared: [
    "./src/shared/action-button.js",
    "./src/shared/content-transition.js",
    "./src/shared/drag-scroll.js",
    "./src/shared/dom.js",
    "./src/shared/icons.js",
    "./src/shared/motion.js",
    "./src/shared/select-menu.js",
    "./src/shared/ui-components.js"
  ],
  views: [
    "./src/views/administration/administration-view.js",
    "./src/views/administration/field-change-review.js",
    "./src/views/administration/field-change-set.js",
    "./src/views/administration/field-editor.js",
    "./src/views/administration/field-list.js",
    "./src/views/administration/field-manager.js",
    "./src/views/administration/goods-type-creator.js",
    "./src/views/administration/local-data-reset.js",
    "./src/views/items/item-entry-dialog.js",
    "./src/views/items/item-entry-form.js",
    "./src/views/items/item-entry-review.js",
    "./src/views/items/item-filter-panel.js",
    "./src/views/items/item-filter-rule.js",
    "./src/views/items/item-form-field.js",
    "./src/views/items/item-browser.js",
    "./src/views/items/item-crop-editor.js",
    "./src/views/items/item-display-model.js",
    "./src/views/items/item-display-value.js",
    "./src/views/items/image-processor.js",
    "./src/views/items/item-image-field.js",
    "./src/views/items/item-list.js",
    "./src/views/items/item-missing-warning.js",
    "./src/views/items/item-save-error.js",
    "./src/views/items/item-sort-panel.js",
    "./src/views/items/item-thumbnail.js",
    "./src/views/items/item-value-format.js",
    "./src/views/items/items-view.js",
    "./src/views/view-definitions.js",
    "./src/views/view-metadata.js",
    "./src/views/view-renderer.js"
  ]
};

const APP_ASSETS = Object.values(ASSET_GROUPS).flat();
const APP_ASSET_URLS = new Set(
  APP_ASSETS.map((asset) => new URL(asset, self.location.href).href)
);

function getNormalizedRequestUrl(requestUrl) {
  const url = new URL(requestUrl);

  url.hash = "";
  url.search = "";

  return url.href;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const requestUrl = getNormalizedRequestUrl(event.request.url);

  if (event.request.method !== "GET" || !APP_ASSET_URLS.has(requestUrl)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        const responseClone = networkResponse.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(requestUrl, responseClone);
        });

        return networkResponse;
      })
      .catch(() => caches.match(requestUrl))
  );
});
