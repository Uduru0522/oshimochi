import { STORAGE_ERROR_CODES, StorageError } from "../contracts/storage-contract.js";
import { parseDashboardCards } from "../models/dashboard-card.js";
import { areJsonValuesEqual } from "../models/record-validation.js";

export function createDebugDashboardCardRepository(catalog) {
  async function list() {
    return parseDashboardCards(catalog.dashboardCards);
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
    if (!areJsonValuesEqual(parseDashboardCards(catalog.dashboardCards), expected)) {
      throw new StorageError("Dashboard cards changed in another window. Reload the cards before saving.", {
        code: STORAGE_ERROR_CODES.conflict
      });
    }
    catalog.dashboardCards.splice(0, catalog.dashboardCards.length, ...replacement);
    return structuredClone(replacement);
  }

  return { list, replace };
}
