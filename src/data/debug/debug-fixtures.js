import { createAssetRecord } from "../models/asset.js";
import { createBuiltInFieldDefinitions } from "../models/built-in-fields.js";
import { createFieldDefinitionRecord } from "../models/field-definition.js";
import { createGoodsTypeRecord } from "../models/goods-type.js";
import { createItemRecord } from "../models/item.js";
import {
  CUSTOM_FIELD_FIXTURES,
  GOODS_TYPE_FIXTURES,
  OTHER_ITEM_CATALOG,
  TAPESTRY_CATALOG
} from "./debug-fixture-data.js";

const FIXTURE_TIMESTAMP = "2026-01-01T00:00:00.000Z";

function setOptionalValue(values, key, value) {
  if (value !== undefined) {
    values[key] = value;
  }
}

function createTapestryCatalogEntry(record, index) {
  const id = `tapestry-${record.key}`;
  const customValues = {
    "tapestries-display_status": record.isDisplayed
  };

  setOptionalValue(customValues, "tapestries-series", record.series);
  setOptionalValue(customValues, "tapestries-notes", record.notes);
  setOptionalValue(customValues, "tapestries-width_cm", record.widthCm);
  setOptionalValue(customValues, "tapestries-release_date", record.releaseDate);
  setOptionalValue(customValues, "tapestries-source", record.source);
  setOptionalValue(customValues, "tapestries-condition", record.condition);
  setOptionalValue(customValues, "tapestries-purchase_price", record.purchasePrice);

  return {
    id,
    goodsTypeId: "tapestries",
    name: record.name,
    customValues,
    addedDaysAgo: record.addedDaysAgo ?? 31 - index,
    updatedDaysAgo: record.updatedDaysAgo,
    purchasedDaysAgo: record.purchasedDaysAgo,
    image: record.image
  };
}

const DEBUG_ITEM_CATALOG = Object.freeze([
  ...TAPESTRY_CATALOG.map(createTapestryCatalogEntry),
  ...OTHER_ITEM_CATALOG
]);

const ITEM_FIXTURES = Object.freeze(
  DEBUG_ITEM_CATALOG.map(({ image, ...record }) => Object.freeze({
    ...record,
    imageAssetId: `asset-${record.id}`
  }))
);

const ASSET_FIXTURES = Object.freeze(
  DEBUG_ITEM_CATALOG.map(({ id, image }) => {
    const isPortrait = image.orientation === "portrait";

    return Object.freeze({
      id: `asset-${id}`,
      label: image.label,
      width: isPortrait ? 560 : 792,
      height: isPortrait ? 792 : 560,
      color: image.color
    });
  })
);

function createFixtureAsset({ color, height, id, label, width }) {
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="${color}"/>`,
    `<rect x="32" y="32" width="${width - 64}" height="${height - 64}" rx="24" fill="#f5f7f7" opacity="0.92"/>`,
    `<circle cx="${width / 2}" cy="${height * 0.4}" r="${Math.min(width, height) * 0.2}" fill="${color}" opacity="0.8"/>`,
    `<text x="50%" y="72%" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(Math.min(width, height) * 0.09)}" font-weight="700" fill="#172126">${label}</text>`,
    "</svg>"
  ].join("");
  const data = new Blob([svg], { type: "image/svg+xml" });

  return createAssetRecord(
    { data, height, id, mediaType: "image/svg+xml", width },
    { now: () => FIXTURE_TIMESTAMP }
  );
}

export function createDebugGoodsTypes() {
  return GOODS_TYPE_FIXTURES.map((record) =>
    createGoodsTypeRecord(record, { now: () => FIXTURE_TIMESTAMP })
  );
}

export function createDebugFieldDefinitions(goodsTypes = createDebugGoodsTypes()) {
  return goodsTypes.flatMap((goodsType) => {
    const builtInFields = createBuiltInFieldDefinitions({
      goodsTypeId: goodsType.id,
      generateId: (key) => `${goodsType.id}-${key}`,
      now: () => FIXTURE_TIMESTAMP
    });
    const customFields = (CUSTOM_FIELD_FIXTURES[goodsType.id] ?? []).map((field, index) =>
      createFieldDefinitionRecord(
        {
          ...field,
          id: `${goodsType.id}-${field.key}`,
          goodsTypeId: goodsType.id,
          position: builtInFields.length + index
        },
        { now: () => FIXTURE_TIMESTAMP }
      )
    );

    return [...builtInFields, ...customFields];
  });
}

export function createDebugItems({ now = () => new Date().toISOString() } = {}) {
  const anchor = new Date(now());
  function daysAgo(days) {
    const date = new Date(anchor);
    date.setDate(date.getDate() - days);
    return date;
  }
  return ITEM_FIXTURES.map((record) => {
    const addedDaysAgo = record.addedDaysAgo;
    const createdAt = daysAgo(addedDaysAgo).toISOString();
    const updatedAt = daysAgo(record.updatedDaysAgo ?? Math.min(3, addedDaysAgo)).toISOString();
    const customValues = { ...record.customValues };
    if (record.purchasedDaysAgo !== undefined) {
      const date = daysAgo(record.purchasedDaysAgo);
      customValues[`${record.goodsTypeId}-purchased_on`] = [date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
    }
    return createItemRecord({ ...record, customValues, createdAt, updatedAt,
      deletedAt: record.isDeleted ? updatedAt : null }, { now: () => anchor.toISOString() });
  });
}

export function createDebugAssets() {
  return ASSET_FIXTURES.map(createFixtureAsset);
}
