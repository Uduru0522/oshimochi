async function readStorage(page, stores) {
  return page.evaluate(async (storeNames) => {
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open("oshimochi");
      request.onupgradeneeded = () => request.transaction.abort();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    try {
      const records = await new Promise((resolve, reject) => {
        const transaction = database.transaction(storeNames, "readonly");
        const result = {};
        for (const store of storeNames) {
          const request = transaction.objectStore(store).getAll();
          request.onsuccess = () => { result[store] = request.result; };
        }
        transaction.oncomplete = () => resolve(result);
        transaction.onabort = () => reject(transaction.error ?? new Error("Test storage read aborted."));
      });
      const assets = await Promise.all(records.assets.map(async ({ data, ...metadata }) => {
        const digest = await crypto.subtle.digest("SHA-256", await data.arrayBuffer());
        return {
          ...metadata,
          digest: [...new Uint8Array(digest)]
            .map((byte) => byte.toString(16).padStart(2, "0")).join("")
        };
      }));
      return { ...records, assets };
    } finally {
      database.close();
    }
  }, stores);
}

function readItemStorage(page) {
  return readStorage(page, ["items", "assets"]);
}

async function readCatalogStorage(page) {
  const { goods_types, field_definitions, app_metadata, dashboard_cards, ...records } = await readStorage(
    page, ["goods_types", "field_definitions", "items", "assets", "app_metadata", "dashboard_cards"]
  );
  return {
    goodsTypes: goods_types,
    fieldDefinitions: field_definitions,
    metadata: app_metadata,
    dashboardCards: dashboard_cards,
    ...records
  };
}

module.exports = { readCatalogStorage, readItemStorage };
