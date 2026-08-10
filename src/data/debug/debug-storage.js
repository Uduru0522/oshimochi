import {
  STORAGE_ERROR_CODES,
  StorageError
} from "../contracts/storage-contract.js";
import { createDebugCatalog } from "./debug-catalog.js";
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
