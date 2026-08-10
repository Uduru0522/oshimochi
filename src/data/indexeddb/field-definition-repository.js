import {
  STORAGE_ERROR_CODES,
  StorageError
} from "../contracts/storage-contract.js";
import { parseFieldDefinitionRecord } from "../models/field-definition.js";
import {
  filterRecordsByScope,
  requireRecordScope
} from "../models/record-lifecycle.js";
import { INDEXES, OBJECT_STORES } from "./database-schema.js";
import { requestToPromise, transactionToPromise } from "./requests.js";

function sortFields(records) {
  return records.sort(
    (left, right) => left.position - right.position || left.createdAt.localeCompare(right.createdAt)
  );
}

export function createFieldDefinitionRepository(database) {
  async function list(goodsTypeId, { scope } = {}) {
    const requestedScope = requireRecordScope(scope);
    let records;

    try {
      const transaction = database.transaction(OBJECT_STORES.fieldDefinitions, "readonly");
      const store = transaction.objectStore(OBJECT_STORES.fieldDefinitions);
      const request = store.index(INDEXES.fieldDefinitionsByGoodsType).getAll(goodsTypeId);
      [records] = await Promise.all([
        requestToPromise(request),
        transactionToPromise(transaction)
      ]);
    } catch (error) {
      throw new StorageError("Field definitions could not be read from the local database.", {
        cause: error,
        code: STORAGE_ERROR_CODES.operationFailed
      });
    }

    try {
      const visibleRecords = filterRecordsByScope(
        records.map(parseFieldDefinitionRecord),
        requestedScope
      );

      return structuredClone(sortFields(visibleRecords));
    } catch (error) {
      throw new StorageError("The local database contains an invalid field definition.", {
        cause: error,
        code: STORAGE_ERROR_CODES.invalidData
      });
    }
  }

  async function save({ goodsTypeId, fieldDefinitions }) {
    let parsedFields;

    try {
      parsedFields = fieldDefinitions.map(parseFieldDefinitionRecord);

      if (parsedFields.some((field) => field.goodsTypeId !== goodsTypeId)) {
        throw new TypeError("A field definition belongs to a different goods type.");
      }

      if (new Set(parsedFields.map(({ id }) => id)).size !== parsedFields.length) {
        throw new TypeError("Field definition IDs must be unique.");
      }
    } catch (error) {
      throw new StorageError("The field-definition write contains invalid data.", {
        cause: error,
        code: STORAGE_ERROR_CODES.invalidData
      });
    }

    try {
      const transaction = database.transaction(OBJECT_STORES.fieldDefinitions, "readwrite");
      const store = transaction.objectStore(OBJECT_STORES.fieldDefinitions);
      const requests = parsedFields.map((field) => requestToPromise(store.put(field)));

      await Promise.all([...requests, transactionToPromise(transaction)]);
    } catch (error) {
      throw new StorageError("Field changes could not be saved to the local database.", {
        cause: error,
        code: STORAGE_ERROR_CODES.operationFailed
      });
    }

    return structuredClone(parsedFields);
  }

  return { list, save };
}
