import { parseAssetRecord } from "./asset.js";
import { parseDashboardCards } from "./dashboard-card.js";
import { BUILT_IN_ITEM_FIELDS } from "./built-in-fields.js";
import { parseFieldDefinitionRecord } from "./field-definition.js";
import { parseGoodsTypeRecord } from "./goods-type.js";
import { parseItemRecord } from "./item.js";
import { requireRecord } from "./record-validation.js";

const BUILT_IN_FIELDS_BY_KEY = new Map(
  BUILT_IN_ITEM_FIELDS.map((field) => [field.key, field])
);

function requireArray(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${fieldName} must be an array.`);
  }

  return value;
}

function assertUnique(records, getIdentity, entityName) {
  const identities = records.map(getIdentity);

  if (new Set(identities).size !== identities.length) {
    throw new TypeError(`${entityName} identities must be unique.`);
  }
}

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function assertStoredFieldValue(field, value) {
  switch (field.dataType) {
    case "boolean":
      if (typeof value !== "boolean") {
        throw new TypeError(`${field.displayName} must store a boolean.`);
      }
      return;
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new TypeError(`${field.displayName} must store a finite number.`);
      }
      return;
    case "date":
      if (!isValidDate(value)) {
        throw new TypeError(`${field.displayName} must store a valid date.`);
      }
      return;
    case "url": {
      let url;

      try {
        url = new URL(value);
      } catch {
        throw new TypeError(`${field.displayName} must store a valid web address.`);
      }

      if (url.protocol !== "https:") {
        throw new TypeError(`${field.displayName} must store an HTTPS address.`);
      }
      return;
    }
    case "select":
      if (!field.options.choices.some(({ id }) => id === value)) {
        throw new TypeError(`${field.displayName} has an unknown selection.`);
      }
      return;
    case "long_text":
    case "text":
      if (typeof value !== "string" || value.trim() === "") {
        throw new TypeError(`${field.displayName} must store non-empty text.`);
      }
      return;
    default:
      throw new TypeError(`Unsupported custom field type: ${field.dataType}.`);
  }
}

function assertBuiltInFields(goodsType, fields) {
  const builtInFields = fields.filter(({ isBuiltIn }) => isBuiltIn);

  if (builtInFields.length !== BUILT_IN_ITEM_FIELDS.length) {
    throw new TypeError(
      `${goodsType.displayName} must contain every protected built-in field.`
    );
  }

  builtInFields.forEach((field) => {
    const expected = BUILT_IN_FIELDS_BY_KEY.get(field.key);

    if (
      !expected ||
      field.dataType !== expected.dataType ||
      field.displayName !== expected.displayName ||
      field.isRequired !== expected.isRequired ||
      field.position !== expected.position ||
      field.defaultValue !== null ||
      field.options !== null ||
      field.isDeleted
    ) {
      throw new TypeError(
        `${goodsType.displayName} contains an invalid protected built-in field.`
      );
    }
  });
}

function assertFieldCatalog(goodsTypes, fields) {
  const goodsTypesById = new Map(goodsTypes.map((record) => [record.id, record]));
  const fieldsByGoodsType = new Map(goodsTypes.map(({ id }) => [id, []]));

  fields.forEach((field) => {
    if (!goodsTypesById.has(field.goodsTypeId)) {
      throw new TypeError("A field definition refers to an unknown goods type.");
    }

    fieldsByGoodsType.get(field.goodsTypeId).push(field);
  });

  goodsTypes.forEach((goodsType) => {
    const ownedFields = fieldsByGoodsType.get(goodsType.id);

    assertUnique(ownedFields, ({ key }) => key, "Field keys within a goods type");
    assertUnique(ownedFields, ({ position }) => position, "Field positions within a goods type");
    assertBuiltInFields(goodsType, ownedFields);
  });
}

function assertItemCatalog(goodsTypes, fields, items, assets) {
  const goodsTypeIds = new Set(goodsTypes.map(({ id }) => id));
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const fieldsByGoodsType = new Map(goodsTypes.map(({ id }) => [id, new Map()]));
  const ownedAssetIds = new Set();

  fields.forEach((field) => {
    fieldsByGoodsType.get(field.goodsTypeId).set(field.id, field);
  });

  items.forEach((item) => {
    if (!goodsTypeIds.has(item.goodsTypeId)) {
      throw new TypeError("An item refers to an unknown goods type.");
    }

    const ownedFields = fieldsByGoodsType.get(item.goodsTypeId);

    Object.entries(item.customValues).forEach(([fieldId, value]) => {
      const field = ownedFields.get(fieldId);

      if (!field || field.isBuiltIn) {
        throw new TypeError("An item value refers to an unknown custom field.");
      }

      assertStoredFieldValue(field, value);
    });

    if (item.imageAssetId === null) {
      return;
    }

    if (!assetsById.has(item.imageAssetId)) {
      throw new TypeError("An item refers to an unknown image asset.");
    }

    if (ownedAssetIds.has(item.imageAssetId)) {
      throw new TypeError("An image asset cannot belong to more than one item.");
    }

    ownedAssetIds.add(item.imageAssetId);
  });
}

export function parseDataCatalog(value) {
  const input = requireRecord(value, "Data catalog");
  const goodsTypes = requireArray(input.goodsTypes, "goodsTypes")
    .map(parseGoodsTypeRecord);
  const fieldDefinitions = requireArray(input.fieldDefinitions, "fieldDefinitions")
    .map(parseFieldDefinitionRecord);
  const items = requireArray(input.items, "items").map(parseItemRecord);
  const assets = requireArray(input.assets, "assets").map(parseAssetRecord);
  const dashboardCards = parseDashboardCards(input.dashboardCards === undefined ? [] : input.dashboardCards);

  assertUnique(goodsTypes, ({ id }) => id, "Goods type");
  assertUnique(fieldDefinitions, ({ id }) => id, "Field definition");
  assertUnique(items, ({ id }) => id, "Item");
  assertUnique(assets, ({ id }) => id, "Asset");
  assertFieldCatalog(goodsTypes, fieldDefinitions);
  assertItemCatalog(goodsTypes, fieldDefinitions, items, assets);

  return { assets, dashboardCards, fieldDefinitions, goodsTypes, items };
}
