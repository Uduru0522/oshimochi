import { getItemFieldValue } from "./item-field-value.js";

export const ITEM_SORT_DIRECTIONS = Object.freeze({
  ASCENDING: "ascending",
  DESCENDING: "descending"
});

export const ITEM_SORT_METADATA = Object.freeze({
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt"
});

export const DEFAULT_ITEM_SORT = Object.freeze({
  direction: ITEM_SORT_DIRECTIONS.DESCENDING,
  key: ITEM_SORT_METADATA.UPDATED_AT,
  type: "metadata"
});

const textCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base"
});

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function getComparableValue(item, fieldsById, sort) {
  if (sort.type === "metadata") {
    return item[sort.key];
  }

  const field = fieldsById.get(sort.fieldId);
  if (!field) {
    return undefined;
  }

  const value = getItemFieldValue(item, field);
  if (!hasValue(value)) {
    return value;
  }

  if (field.dataType === "boolean") {
    return value ? field.options.trueLabel : field.options.falseLabel;
  }

  if (field.dataType === "select") {
    return field.options.choices.find(({ id }) => id === value)?.label ?? value;
  }

  return value;
}

function compareValues(left, right) {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  if (typeof left === "boolean" && typeof right === "boolean") {
    return Number(left) - Number(right);
  }

  return textCollator.compare(String(left), String(right));
}

export function cloneItemSort(sort = DEFAULT_ITEM_SORT) {
  if (sort?.type === "field") {
    return {
      direction: sort.direction,
      fieldId: sort.fieldId,
      type: "field"
    };
  }

  return {
    direction: sort?.direction ?? DEFAULT_ITEM_SORT.direction,
    key: sort?.key ?? DEFAULT_ITEM_SORT.key,
    type: "metadata"
  };
}

export function sortItems(items, fields, sort = DEFAULT_ITEM_SORT) {
  const fieldsById = new Map(fields.map((field) => [field.id, field]));
  const direction = sort.direction === ITEM_SORT_DIRECTIONS.ASCENDING ? 1 : -1;

  return items
    .map((item, index) => ({ index, item }))
    .sort((leftEntry, rightEntry) => {
      const leftValue = getComparableValue(leftEntry.item, fieldsById, sort);
      const rightValue = getComparableValue(rightEntry.item, fieldsById, sort);
      const leftHasValue = hasValue(leftValue);
      const rightHasValue = hasValue(rightValue);

      if (leftHasValue !== rightHasValue) {
        return leftHasValue ? -1 : 1;
      }

      if (!leftHasValue) {
        return leftEntry.index - rightEntry.index;
      }

      const comparison = compareValues(leftValue, rightValue);
      return comparison === 0
        ? leftEntry.index - rightEntry.index
        : comparison * direction;
    })
    .map(({ item }) => item);
}
