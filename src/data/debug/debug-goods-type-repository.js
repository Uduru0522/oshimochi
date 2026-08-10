import {
  STORAGE_ERROR_CODES,
  StorageError
} from "../contracts/storage-contract.js";
import { parseFieldDefinitionRecord } from "../models/field-definition.js";
import { parseGoodsTypeRecord } from "../models/goods-type.js";
import { filterRecordsByScope } from "../models/record-lifecycle.js";

export function createDebugGoodsTypeRepository(catalog) {
  async function list({ scope } = {}) {
    return structuredClone(filterRecordsByScope(catalog.goodsTypes, scope));
  }

  async function create({ goodsType, fieldDefinitions }) {
    let parsedGoodsType;
    let parsedFields;

    try {
      parsedGoodsType = parseGoodsTypeRecord(goodsType);
      parsedFields = fieldDefinitions.map(parseFieldDefinitionRecord);
    } catch (error) {
      throw new StorageError("The goods type write contains invalid data.", {
        cause: error,
        code: STORAGE_ERROR_CODES.invalidData
      });
    }

    const existingIds = new Set([
      ...catalog.goodsTypes.map(({ id }) => id),
      ...catalog.fieldDefinitions.map(({ id }) => id)
    ]);
    const newIds = [parsedGoodsType.id, ...parsedFields.map(({ id }) => id)];
    const fieldKeys = parsedFields.map(({ key }) => key);

    if (parsedFields.some(({ goodsTypeId }) => goodsTypeId !== parsedGoodsType.id)) {
      throw new StorageError("A field definition belongs to a different goods type.", {
        code: STORAGE_ERROR_CODES.invalidData
      });
    }

    if (
      new Set(newIds).size !== newIds.length ||
      newIds.some((id) => existingIds.has(id)) ||
      new Set(fieldKeys).size !== fieldKeys.length
    ) {
      throw new StorageError("The goods type contains duplicate record identity.", {
        code: STORAGE_ERROR_CODES.operationFailed
      });
    }

    catalog.goodsTypes.push(parsedGoodsType);
    catalog.fieldDefinitions.push(...parsedFields);
    return structuredClone(parsedGoodsType);
  }

  return { create, list };
}
