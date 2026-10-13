import {
  STORAGE_ERROR_CODES,
  StorageError
} from "../contracts/storage-contract.js";
import { DATABASE_NAME } from "./database-schema.js";
import { openDatabase } from "./connection.js";
import { createGoodsTypeRepository } from "./goods-type-repository.js";
import { createFieldDefinitionRepository } from "./field-definition-repository.js";
import { createLocalDataRepository } from "./local-data-repository.js";
import { createItemRepository } from "./item-repository.js";

export function createIndexedDbStorage({
  databaseName = DATABASE_NAME,
  indexedDBFactory = globalThis.indexedDB
} = {}) {
  let database = null;
  let goodsTypeRepository = null;
  let fieldDefinitionRepository = null;
  let localDataRepository = null;
  let itemRepository = null;
  let initializationPromise = null;

  function assertInitialized() {
    if (
      !database ||
      !goodsTypeRepository ||
      !fieldDefinitionRepository ||
      !localDataRepository ||
      !itemRepository
    ) {
      throw new StorageError("IndexedDB storage has not been initialized.", {
        code: STORAGE_ERROR_CODES.notInitialized
      });
    }
  }

  async function initialize() {
    if (database) {
      return;
    }

    initializationPromise ??= openDatabase({ databaseName, indexedDBFactory });

    try {
      database = await initializationPromise;
      goodsTypeRepository = createGoodsTypeRepository(database);
      fieldDefinitionRepository = createFieldDefinitionRepository(database);
      localDataRepository = createLocalDataRepository(database);
      itemRepository = createItemRepository(database);
      database.onversionchange = () => close();
    } finally {
      initializationPromise = null;
    }
  }

  async function listGoodsTypes(options) {
    assertInitialized();
    return goodsTypeRepository.list(options);
  }

  async function createGoodsType(bundle) {
    assertInitialized();
    return goodsTypeRepository.create(bundle);
  }

  async function listFieldDefinitions(goodsTypeId, options) {
    assertInitialized();
    return fieldDefinitionRepository.list(goodsTypeId, options);
  }

  async function saveFieldDefinitions(changeSet) {
    assertInitialized();
    return fieldDefinitionRepository.save(changeSet);
  }

  async function resetData() {
    assertInitialized();
    return localDataRepository.reset();
  }

  async function createItem(item) {
    assertInitialized();
    return itemRepository.create(item);
  }

  async function updateItemContent(change) {
    assertInitialized();
    return itemRepository.updateContent(change);
  }

  async function updateItemLifecycle(item) {
    assertInitialized();
    return itemRepository.updateLifecycle(item);
  }

  async function listItems(goodsTypeId, options) {
    assertInitialized();
    return itemRepository.list(goodsTypeId, options);
  }

  async function getAsset(assetId) {
    assertInitialized();
    return itemRepository.getAsset(assetId);
  }

  async function purgeItem(itemId) {
    assertInitialized();
    return itemRepository.purge(itemId);
  }

  function close() {
    database?.close();
    database = null;
    goodsTypeRepository = null;
    fieldDefinitionRepository = null;
    localDataRepository = null;
    itemRepository = null;
  }

  return {
    close,
    createGoodsType,
    createItem,
    getAsset,
    initialize,
    listFieldDefinitions,
    listGoodsTypes,
    listItems,
    purgeItem,
    resetData,
    saveFieldDefinitions,
    updateItemContent,
    updateItemLifecycle
  };
}
