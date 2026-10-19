import {
  STORAGE_ERROR_CODES,
  StorageError
} from "../contracts/storage-contract.js";
import { createDebugCatalog } from "./debug-catalog.js";
import { createDebugDashboardCardRepository } from "./debug-dashboard-card-repository.js";
import {
  createDebugFieldDefinitionRepository
} from "./debug-field-definition-repository.js";
import { createDebugGoodsTypeRepository } from "./debug-goods-type-repository.js";
import { createDebugItemRepository } from "./debug-item-repository.js";
import { createDebugLocalDataRepository } from "./debug-local-data-repository.js";

export function createDebugStorage(options = {}) {
  const catalog = createDebugCatalog(options);
  const fieldDefinitionRepository = createDebugFieldDefinitionRepository(catalog);
  const goodsTypeRepository = createDebugGoodsTypeRepository(catalog);
  const itemRepository = createDebugItemRepository(catalog);
  const localDataRepository = createDebugLocalDataRepository(catalog);
  const dashboardCardRepository = createDebugDashboardCardRepository(catalog);
  let isInitialized = false;

  function assertInitialized() {
    if (!isInitialized) {
      throw new StorageError("Debug storage has not been initialized.", {
        code: STORAGE_ERROR_CODES.notInitialized
      });
    }
  }

  async function initialize() {
    isInitialized = true;
  }

  function close() {
    isInitialized = false;
  }

  return {
    close,
    async createGoodsType(bundle) {
      assertInitialized();
      return goodsTypeRepository.create(bundle);
    },
    async createItem(bundle) {
      assertInitialized();
      return itemRepository.create(bundle);
    },
    async getAsset(assetId) {
      assertInitialized();
      return itemRepository.getAsset(assetId);
    },
    initialize,
    async listDashboardCards() {
      assertInitialized();
      return dashboardCardRepository.list();
    },
    async replaceDashboardCards(change) {
      assertInitialized();
      return dashboardCardRepository.replace(change);
    },
    async listFieldDefinitions(goodsTypeId, options) {
      assertInitialized();
      return fieldDefinitionRepository.list(goodsTypeId, options);
    },
    async listGoodsTypes(options) {
      assertInitialized();
      return goodsTypeRepository.list(options);
    },
    async listItems(goodsTypeId, options) {
      assertInitialized();
      return itemRepository.list(goodsTypeId, options);
    },
    async purgeItem(itemId) {
      assertInitialized();
      return itemRepository.purge(itemId);
    },
    async readDataCatalog() {
      assertInitialized();
      return localDataRepository.readCatalog();
    },
    async replaceDataCatalog(catalog) {
      assertInitialized();
      return localDataRepository.replaceCatalog(catalog);
    },
    async resetData() {
      assertInitialized();
      return localDataRepository.reset();
    },
    async saveFieldDefinitions(changeSet) {
      assertInitialized();
      return fieldDefinitionRepository.save(changeSet);
    },
    async updateItemContent(change) {
      assertInitialized();
      return itemRepository.updateContent(change);
    },
    async updateItemLifecycle(item) {
      assertInitialized();
      return itemRepository.updateLifecycle(item);
    }
  };
}
