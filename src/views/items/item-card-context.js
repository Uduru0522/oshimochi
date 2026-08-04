import { getItemSearchMatchingFieldIds } from "../../application/items/filter-items.js";

export const ITEM_CARD_VISIBLE_FIELD_COUNT = 3;

function unique(values) {
  return [...new Set(values)];
}

export function selectItemCardFields(
  item,
  fields,
  { filter = {}, sort = null } = {},
  visibleFieldCount = ITEM_CARD_VISIBLE_FIELD_COUNT
) {
  const customFields = fields.filter(({ isBuiltIn }) => !isBuiltIn);
  const fieldsById = new Map(customFields.map((field) => [field.id, field]));
  const ruleFieldIds = Array.isArray(filter.rules)
    ? filter.rules.map(({ fieldId }) => fieldId)
    : [];
  const searchFieldIds = getItemSearchMatchingFieldIds(item, fields, filter.query)
    .filter((fieldId) => fieldsById.has(fieldId));
  const filteredFieldIds = unique([...ruleFieldIds, ...searchFieldIds])
    .filter((fieldId) => fieldsById.has(fieldId));
  const sortFieldIds = sort?.type === "field" && fieldsById.has(sort.fieldId)
    ? [sort.fieldId]
    : [];
  const prioritizedFieldIds = unique([
    ...filteredFieldIds,
    ...sortFieldIds,
    ...customFields.map(({ id }) => id)
  ]);
  const visibleFieldIds = prioritizedFieldIds.slice(0, visibleFieldCount);
  const visibleFieldIdSet = new Set(visibleFieldIds);
  const toFieldValue = (fieldId) => ({
    field: fieldsById.get(fieldId),
    value: item.customValues[fieldId]
  });

  return {
    hiddenFilteredFieldValues: filteredFieldIds
      .filter((fieldId) => !visibleFieldIdSet.has(fieldId))
      .map(toFieldValue),
    hiddenOtherFieldCount: Math.max(0, customFields.length - visibleFieldIds.length),
    visibleFieldValues: visibleFieldIds.map(toFieldValue)
  };
}
