import {
  STORAGE_ERROR_CODES,
  StorageError
} from "../contracts/storage-contract.js";
import { OBJECT_STORES } from "./database-schema.js";
import { parseFieldDefinitionRecord } from "../models/field-definition.js";
import { parseGoodsTypeRecord } from "../models/goods-type.js";
import {
  filterRecordsByScope,
  requireRecordScope
} from "../models/record-lifecycle.js";
import { requestToPromise, transactionToPromise } from "./requests.js";

function sortByCreationTime(records) {
  return records.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export function createGoodsTypeRepository(database) {
  async function create({ goodsType, fieldDefinitions }) {
    let parsedGoodsType;
    let parsedFields;

    try {
      parsedGoodsType = parseGoodsTypeRecord(goodsType);
      parsedFields = fieldDefinitions.map(parseFieldDefinitionRecord);

      if (parsedFields.some(({ goodsTypeId }) => goodsTypeId !== parsedGoodsType.id)) {
        throw new TypeError("A field definition belongs to a different goods type.");
      }

      if (new Set(parsedFields.map(({ key }) => key)).size !== parsedFields.length) {
        throw new TypeError("Field definition keys must be unique within a goods type.");
      }
    } catch (error) {
      throw new StorageError("The goods type write contains invalid data.", {
        cause: error,
        code: STORAGE_ERROR_CODES.invalidData
      });
    }

    try {
      const transaction = database.transaction(
        [OBJECT_STORES.goodsTypes, OBJECT_STORES.fieldDefinitions],
        "readwrite"
      );
      const goodsTypeStore = transaction.objectStore(OBJECT_STORES.goodsTypes);
      const fieldStore = transaction.objectStore(OBJECT_STORES.fieldDefinitions);
      const requests = [
        requestToPromise(goodsTypeStore.add(parsedGoodsType)),
        ...parsedFields.map((field) => requestToPromise(fieldStore.add(field)))
      ];

      await Promise.all([...requests, transactionToPromise(transaction)]);
    } catch (error) {
      throw new StorageError("The goods type could not be saved to the local database.", {
        cause: error,
        code: STORAGE_ERROR_CODES.operationFailed
      });
    }

    return structuredClone(parsedGoodsType);
  }

  async function list({ scope } = {}) {
    const requestedScope = requireRecordScope(scope);
    let records;

    try {
      const transaction = database.transaction(OBJECT_STORES.goodsTypes, "readonly");
      const request = transaction.objectStore(OBJECT_STORES.goodsTypes).getAll();
      [records] = await Promise.all([
        requestToPromise(request),
        transactionToPromise(transaction)
      ]);
    } catch (error) {
      throw new StorageError(
        "Goods types could not be read from the local database.",
        {
          cause: error,
          code: STORAGE_ERROR_CODES.operationFailed
        }
      );
    }

    try {
      const visibleRecords = filterRecordsByScope(
        records.map(parseGoodsTypeRecord),
        requestedScope
      );

      return structuredClone(sortByCreationTime(visibleRecords));
    } catch (error) {
      throw new StorageError(
        "The local database contains an invalid goods type record.",
        {
          cause: error,
          code: STORAGE_ERROR_CODES.invalidData
        }
      );
    }
  }

  return { create, list };
}
