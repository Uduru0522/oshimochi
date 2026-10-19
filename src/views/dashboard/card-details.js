import { element, t } from './dashboard-dom.js';
import { describeRule } from './card-copy.js';
import { displayLabel, formatValue } from './card-readout.js';

export function createCardDetails(card, result, { collections, sourceLabel, coverage, calculationNames }) {
  const details = element('div', '', 'card-explanation');
  if (result) {
    const explanation = coverage(result, card.calculation);
    if (explanation) details.append(element('p', explanation, 'help'));
    if (result.breakdown?.some(entry => entry.value < 0)) details.append(element('p', t('Ring proportions cannot represent negative category totals. The breakdown keeps the signed values.'), 'help'));
    if (result.breakdown?.length) {
      const table = element('table', '', 'details-breakdown');
      const header = element('thead'), row = element('tr'); row.append(element('th', t('Category')), element('th', t('Total'))); header.append(row);
      const body = element('tbody');
      for (const entry of result.breakdown) {
        const row = element('tr');
        const label = card.groupBy?.type === 'field' && card.sources.length > 1 ? `${displayLabel(entry)} · ${entry.goodsTypeName}` : displayLabel(entry);
        row.append(element('td', label), element('td', formatValue(entry.value, card.format))); body.append(row);
      }
      table.append(header, body); details.append(table);
    }
  }
  details.append(element('p', `${calculationNames[card.calculation]} · ${card.includeDeleted ? t('Includes deleted items') : t('Active items only')}`, 'sources'));
  if (card.groupBy?.type === 'field') {
    details.append(element('p', t('Grouped by {fields}.', { fields: card.groupBy.fields.map(field => t('{field} in {collection}', { field: field.fieldName, collection: collections.find(entry => entry.goodsType.id === field.goodsTypeId)?.goodsType.displayName ?? field.goodsTypeId })).join('; ') }), 'sources'));
  }
  for (const source of card.sources) {
    const sourceDetails = element('div', '', 'detail-source');
    sourceDetails.append(element('strong', sourceLabel(source, card.calculation)));
    if (source.filter.query) sourceDetails.append(element('p', t('Search: {query}', { query: source.filter.query })));
    for (const rule of source.filter.rules) sourceDetails.append(element('p', describeRule(rule, collections.find(entry => entry.goodsType.id === source.goodsTypeId)?.fields ?? [])));
    if (!source.filter.query && !source.filter.rules.length) sourceDetails.append(element('p', t('No filters.'), 'help'));
    details.append(sourceDetails);
  }
  return details;
}
