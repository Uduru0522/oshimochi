import {
  STORAGE_ERROR_CODES,
  StorageError
} from "../contracts/storage-contract.js";
import { parseFieldDefinitionRecord } from "../models/field-definition.js";
import { filterRecordsByScope } from "../models/record-lifecycle.js";

export function createDebugFieldDefinitionRepository(catalog) {
  async function list(goodsTypeId, { scope } = {}) {
    const matchingFields = filterRecordsByScope(
      catalog.fieldDefinitions.filter((field) => field.goodsTypeId === goodsTypeId),
      scope
    ).sort(
      (left, right) =>
        left.position - right.position || left.createdAt.localeCompare(right.createdAt)
    );

    return structuredClone(matchingFields);
  }

  async function save({ goodsTypeId, fieldDefinitions }) {
    let parsedFields;

    try {
      parsedFields = fieldDefinitions.map(parseFieldDefinitionRecord);

      if (parsedFields.some((field) => field.goodsTypeId !== goodsTypeId)) {
        throw new TypeError("A field definition belongs to a different goods type.");
      }
    } catch (error) {
      throw new StorageError("The field-definition write contains invalid data.", {
        cause: error,
        code: STORAGE_ERROR_CODES.invalidData
      });
    }

    const changedIds = new Set(parsedFields.map(({ id }) => id));
    const resultingFields = [
      ...catalog.fieldDefinitions.filter(({ id }) => !changedIds.has(id)),
      ...parsedFields
    ];
    const activeKeys = resultingFields
      .filter((field) => field.goodsTypeId === goodsTypeId && !field.isDeleted)
      .map(({ key }) => key);

    if (
      changedIds.size !== parsedFields.length ||
      new Set(activeKeys).size !== activeKeys.length
    ) {
      throw new StorageError("Field changes contain duplicate identity.", {
        code: STORAGE_ERROR_CODES.operationFailed
      });
    }

    catalog.fieldDefinitions.splice(0, catalog.fieldDefinitions.length, ...resultingFields);
    return structuredClone(parsedFields);
  }

  return { list, save };
}
