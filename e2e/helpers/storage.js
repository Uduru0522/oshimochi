async function readItemStorage(page) {
  return page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open("oshimochi");
      request.onupgradeneeded = () => request.transaction.abort();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    try {
      const records = await new Promise((resolve, reject) => {
        const transaction = database.transaction(["items", "assets"], "readonly");
        const result = {};
        for (const store of ["items", "assets"]) {
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
      return { items: records.items, assets };
    } finally {
      database.close();
    }
  });
}

module.exports = { readItemStorage };
