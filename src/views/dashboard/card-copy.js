import { t } from './dashboard-dom.js';
export function createCardCopy(getCollections) {
  function sourceLabel(source, calculation) {
    const collection = getCollections().find(entry => entry.goodsType.id === source.goodsTypeId);
    const name = collection?.goodsType.displayName ?? source.goodsTypeName;
    const field = collection?.fields.find(entry => entry.id === source.fieldId)?.displayName ?? source.fieldName;
    return calculation === 'count' ? name : `${name} → ${field}`;
  }
  function issueMessage(issue) {
    if (issue.code === 'collection-unavailable') return t('“{collection}” is no longer available. Edit this card to choose another collection or remove it.', { collection: issue.goodsTypeName });
    if (issue.code === 'choice-unavailable') return t('“{choice}” is no longer an option for “{field}” in “{collection}”. Edit this card to update its filter.', { choice: issue.choiceName ?? issue.choiceId, field: issue.fieldName, collection: issue.goodsTypeName });
    if (issue.code === 'numeric-field-required') return t('“{field}” in “{collection}” is not a number field. Edit this card to choose a number field.', { field: issue.fieldName, collection: issue.goodsTypeName });
    if (issue.code === 'category-field-required') return t('“{field}” in “{collection}” cannot group categories. Edit this card to choose a selection or two-option field.', { field: issue.fieldName, collection: issue.goodsTypeName });
    return t('“{field}” is no longer available in “{collection}”. Edit this card to choose another field or remove this collection.', { field: issue.fieldName, collection: issue.goodsTypeName });
  }
  function coverage(result, calculation) {
    if (result.status === 'needs-repair') return '';
    if (calculation === 'count') return '';
    if (result.status === 'overflow') return t('The result is too large to display.');
    return t('{used} of {matched} matching items have a value.', { used: result.valueCount, matched: result.matchedItemCount });
  }

  return { sourceLabel, issueMessage, coverage };
}
export function describeRule(rule, fields) {
  const field = fields.find(field => field.id === rule.fieldId);
  let condition;
  if (rule.dataType === 'date') condition = rule.datePreset === 'this-year' ? t('This year')
    : t('{from} to {to}', { from: rule.from || t('Any'), to: rule.to || t('Any') });
  else if (rule.dataType === 'number') condition = t('{from} to {to}', { from: rule.min ?? t('Any'), to: rule.max ?? t('Any') });
  else if (['boolean', 'select'].includes(rule.dataType)) {
    const values = rule.values.map(value => rule.dataType === 'boolean'
      ? (value ? field?.options.trueLabel ?? t('Yes') : field?.options.falseLabel ?? t('No'))
      : field?.options.choices.find(choice => choice.id === value)?.label ?? rule.choiceLabels?.find(choice => choice.id === value)?.label ?? value);
    condition = values.length ? values.join(t(' or ')) : t('No selected values');
  } else {
    const operators = { contains: 'Contains', not_contains: 'Does not contain', equals: 'Equals', starts_with: 'Starts with', ends_with: 'Ends with', domain_equals: 'Domain equals' };
    condition = t('{operator} “{value}”', { operator: t(operators[rule.operator]), value: rule.value });
  }
  return t('{field}: {condition}{missing}', { field: field?.displayName ?? rule.fieldName, condition,
    missing: rule.includeMissing ? t(' (include missing)') : '' });
}
