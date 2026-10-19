import { STORAGE_ERROR_CODES, StorageError } from "../contracts/storage-contract.js";
import { parseDashboardCards } from "../models/dashboard-card.js";
import { areJsonValuesEqual } from "../models/record-validation.js";
import { OBJECT_STORES } from "./database-schema.js";
import { requestToPromise, transactionToPromise } from "./requests.js";

export function createDashboardCardRepository(database) {
  async function list() {
    let records;
    try {
      const transaction = database.transaction(OBJECT_STORES.dashboardCards, "readonly");
      [records] = await Promise.all([
        requestToPromise(transaction.objectStore(OBJECT_STORES.dashboardCards).getAll()),
        transactionToPromise(transaction)
      ]);
    } catch (cause) {
      throw new StorageError("Dashboard cards could not be read.", {
        cause, code: STORAGE_ERROR_CODES.operationFailed
      });
    }
    try { return parseDashboardCards(records); }
    catch (cause) {
      throw new StorageError("Stored dashboard cards are invalid.", {
        cause, code: STORAGE_ERROR_CODES.invalidData
      });
    }
  }

  async function replace({ cards, expectedCards }) {
    let replacement, expected;
    try {
      replacement = parseDashboardCards(cards);
      expected = parseDashboardCards(expectedCards);
    } catch (cause) {
      throw new StorageError("Dashboard card changes are invalid.", {
        cause, code: STORAGE_ERROR_CODES.invalidData
      });
    }
    let transaction, completion;
    try {
      transaction = database.transaction(OBJECT_STORES.dashboardCards, "readwrite");
      completion = transactionToPromise(transaction);
      const store = transaction.objectStore(OBJECT_STORES.dashboardCards);
      const current = parseDashboardCards(await requestToPromise(store.getAll()));
      if (!areJsonValuesEqual(current, expected)) {
        throw new StorageError("Dashboard cards changed in another window. Reload the cards before saving.", {
          code: STORAGE_ERROR_CODES.conflict
        });
      }
      await Promise.all([
        requestToPromise(store.clear()),
        ...replacement.map((card) => requestToPromise(store.add(card))),
        completion
      ]);
    } catch (cause) {
      try { transaction?.abort(); } catch { /* A finished transaction cannot be aborted. */ }
      await completion?.catch(() => {});
      if (cause instanceof StorageError) throw cause;
      throw new StorageError("Dashboard card changes could not be saved.", {
        cause, code: STORAGE_ERROR_CODES.operationFailed
      });
    }
    return structuredClone(replacement);
  }

  return { list, replace };
}
