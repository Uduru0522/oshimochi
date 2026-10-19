import { createDialogCloseController } from '../../shared/dialog-close-controller.js';
import { createOverlayScrollbar } from '../../shared/overlay-scrollbar.js';
import { element, t } from './dashboard-dom.js';
import { createCardPreview } from './card-preview.js';
import { createCardFilters, readCardFilters } from './card-filters.js';
export function createCardEditor({ refs, operations, getCollections, getCards, categoryColor, sourceLabel, issueMessage, coverage, calculationNames, onSave, onClosed }) {
  const $ = id => refs[id];
  const scrollbar = createOverlayScrollbar($('editor-layout'), { label: t('Scroll content') });
  let collections = [], saved = [], draft = null, saving = false, destroyed = false;
  const preview = createCardPreview({ refs, readCard: card => operations.readCardBreakdown(card), colorFor: categoryColor,
    sourceLabel, issueMessage, coverage, calculationNames,
    onValidityChange(valid) { $('save-card').disabled = saving || !valid; }
  });
  const closeController = createDialogCloseController($('editor'), { canClose: () => !saving,
    onCloseRequested: preview.close, onClosed: () => { draft = null; onClosed(); }
  });
  function showEditorError(message = '') { $('editor-error').textContent = message; $('editor-error').hidden = !message; }
  function renderSources() {
    $('sources').replaceChildren();
    const entries = [...collections];
    for (const source of draft.sources.values()) {
      if (!entries.some(entry => entry.goodsType.id === source.goodsTypeId)) {
        entries.push({ goodsType: { id: source.goodsTypeId, displayName: source.goodsTypeName, unavailable: true }, fields: [], items: [] });
      }
    }
    for (const collection of entries) {
      const { goodsType, fields } = collection;
      let source = draft.sources.get(goodsType.id);
      if (!source) {
        source = { checked: false, goodsTypeId: goodsType.id, goodsTypeName: goodsType.displayName, fieldId: '', fieldName: '', filter: { query: '', rules: [] } };
        draft.sources.set(goodsType.id, source);
      }
      const row = element('div', '', 'collection-source'); row.dataset.collection = goodsType.id;
      const label = element('label', '', 'check');
      const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = source.checked;
      label.append(checkbox, element('strong', goodsType.unavailable ? t('{name} (unavailable)', { name: goodsType.displayName }) : goodsType.displayName));
      const filters = createCardFilters({ source, collection, onChange: updatePreview });
      const heading = element('div', '', 'collection-source-heading'); heading.append(label, filters.toggle);
      filters.toggle.disabled = !source.checked;
      filters.element.hidden = true;
      const controls = element('div', '', 'source-controls'); controls.hidden = !source.checked;
      const numeric = fields.filter(field => field.dataType === 'number');
      if (draft.calculation !== 'count') {
        const fieldLabel = element('label'); fieldLabel.append(element('span', t('Number field in {collection}', { collection: goodsType.displayName })));
        const select = document.createElement('select'); select.setAttribute('aria-label', t('Number field in {collection}', { collection: goodsType.displayName }));
        select.append(new Option(t("Choose a number field…"), ''));
        for (const field of numeric) select.append(new Option(field.displayName, field.id));
        if (source.fieldId && !numeric.some(field => field.id === source.fieldId)) {
          const unavailable = new Option(t('{name} (unavailable)', { name: source.fieldName }), source.fieldId); unavailable.disabled = true; select.append(unavailable);
        }
        select.value = source.fieldId;
        select.onchange = () => { source.fieldId = select.value; source.fieldName = numeric.find(field => field.id === select.value)?.displayName ?? ''; updatePreview(); };
        fieldLabel.append(select); controls.append(fieldLabel);
        if (!numeric.length) controls.append(element('p', t("This collection has no number fields. Choose another collection, or use Number of items."), 'help'));
      }
      if (draft.groupByType === 'field' && ['sum', 'count'].includes(draft.calculation)) {
        const options = fields.filter(field => ['select', 'boolean'].includes(field.dataType));
        const groupLabel = element('label'); groupLabel.append(element('span', t('Category field in {collection}', { collection: goodsType.displayName })));
        const groupSelect = document.createElement('select'); groupSelect.setAttribute('aria-label', t('Category field in {collection}', { collection: goodsType.displayName }));
        groupSelect.append(new Option(t("Choose a category field…"), ''));
        for (const field of options) groupSelect.append(new Option(field.displayName, field.id));
        if (source.groupFieldId && !options.some(field => field.id === source.groupFieldId)) {
          const unavailable = new Option(t('{name} (unavailable)', { name: source.groupFieldName }), source.groupFieldId); unavailable.disabled = true; groupSelect.append(unavailable);
        }
        groupSelect.value = source.groupFieldId ?? '';
        groupSelect.onchange = () => { source.groupFieldId = groupSelect.value; source.groupFieldName = options.find(field => field.id === groupSelect.value)?.displayName ?? ''; updatePreview(); };
        groupLabel.append(groupSelect); controls.append(groupLabel);
        if (!options.length) controls.append(element('p', t("This collection has no selection or two-option fields. Choose another collection, or break down by collection."), 'help'));
      }
      row.append(heading, controls, filters.element); $('sources').append(row);
      checkbox.onchange = () => {
        source.checked = checkbox.checked; controls.hidden = !checkbox.checked;
        filters.toggle.disabled = !checkbox.checked;
        if (!checkbox.checked) filters.close();
        updatePreview();
      };
    }
  }
  function readDraft() {
    const title = $('card-title').value.trim();
    if (!title) throw new Error(t("Give this card a name."));
    const selected = [...draft.sources.values()].filter(source => source.checked);
    if (!selected.length) throw new Error(t("Choose at least one collection."));
    const sources = selected.map(source => {
      const collection = collections.find(entry => entry.goodsType.id === source.goodsTypeId);
      if (!collection) throw new Error(t('“{collection}” is unavailable. Uncheck it and choose another collection.', { collection: source.goodsTypeName }));
      const field = collection.fields.find(entry => entry.id === source.fieldId && entry.dataType === 'number');
      if (draft.calculation !== 'count' && !field) throw new Error(t('Choose a number field for “{collection}”.', { collection: collection.goodsType.displayName }));
      return { goodsTypeId: source.goodsTypeId, goodsTypeName: collection.goodsType.displayName,
        fieldId: field?.id ?? null, fieldName: field?.displayName ?? null, filter: readCardFilters(source, collection) };
    });
    const timestamp = new Date().toISOString();
    const categoryGrouping = draft.groupByType === 'field' && ['sum', 'count'].includes(draft.calculation);
    const groupingFields = categoryGrouping ? selected.map(source => {
      const field = collections.find(entry => entry.goodsType.id === source.goodsTypeId)?.fields.find(field => field.id === source.groupFieldId && ['select', 'boolean'].includes(field.dataType));
      if (!field) throw new Error(t('Choose a category field for “{collection}”.', { collection: source.goodsTypeName }));
      return { goodsTypeId: source.goodsTypeId, fieldId: field.id, fieldName: field.displayName, dataType: field.dataType,
        ...(field.dataType === 'select' ? { choiceLabels: field.options.choices.map(({ id, label }) => ({ id, label })) } : { falseLabel: field.options.falseLabel, trueLabel: field.options.trueLabel }) };
    }) : [];
    return operations.createCard({
      id: draft.original?.id ?? draft.id, title, calculation: draft.calculation,
      displayMode: ['sum', 'count'].includes(draft.calculation) ? $('display-mode').value : 'number',
      includeDeleted: $('include-deleted').checked,
      position: draft.original?.position ?? Math.max(-1, ...saved.map(card => card.position)) + 1,
      sources,
      groupBy: categoryGrouping ? { type: 'field', fields: groupingFields } : { type: 'collection' },
      format: readUnit(),
      createdAt: draft.original?.createdAt ?? timestamp, updatedAt: timestamp
    });
  }
  function readUnit() {
    const selection = $('unit').value;
    const format = { type: 'number', currency: null };
    if (!selection) return format;
    const symbol = selection === 'custom' ? $('custom-unit').value.trim() : selection;
    if (!symbol) throw new Error(t("Enter a custom unit, or choose No unit."));
    return { ...format, unit: { symbol, position: $('unit-position').value } };
  }
  function syncUnit() {
    const selection = $('unit').value;
    $('custom-unit').disabled = selection !== 'custom';
    $('unit-position-label').hidden = !selection;
  }
  function updatePreview() {
    showEditorError();
    return preview.update({ title: $('card-title').value.trim(), readDraft });
  }
  function syncCalculation() {
    draft.calculation = $('calculation').value;
    const count = draft.calculation === 'count';
    $('grouping-controls').hidden = !['sum', 'count'].includes(draft.calculation);
    $('display-controls').hidden = !['sum', 'count'].includes(draft.calculation);
    $('source-help').textContent = count ? t("Select the collections whose items you want to count.") : t("Select collections, then choose the number field to calculate in each one.");
    renderSources(); updatePreview();
  }
  function openEditor(card = null) {
    if (destroyed || $('editor').open) return;
    collections = getCollections(); saved = getCards();
    preview.open();
    draft = { original: card ? structuredClone(card) : null, id: crypto.randomUUID(), calculation: card?.calculation ?? 'sum', groupByType: card?.groupBy?.type ?? 'collection',
      sources: new Map((card?.sources ?? []).map(source => {
        const field = card?.groupBy?.fields?.find(field => field.goodsTypeId === source.goodsTypeId);
        return [source.goodsTypeId, { ...structuredClone(source), checked: true, groupFieldId: field?.fieldId ?? '', groupFieldName: field?.fieldName ?? '' }];
      })) };
    $('editor-heading').textContent = card ? t("Edit summary card") : t("Add summary card");
    $('save-card').textContent = card ? t("Save changes") : t("Save card");
    $('card-title').value = card?.title ?? '';
    $('calculation').value = draft.calculation;
    $('group-by').value = draft.groupByType;
    $('display-mode').value = card?.displayMode ?? 'auto';
    const currencySymbols = { JPY: '¥', USD: '$', TWD: 'NTD', EUR: '€', GBP: '£', KRW: '₩' };
    const symbol = card?.format.unit?.symbol ?? (card?.format.type === 'currency' ? currencySymbols[card.format.currency] ?? card.format.currency : '');
    $('unit').value = [...$('unit').options].some(option => option.value === symbol && option.value !== 'custom') ? symbol : 'custom';
    $('custom-unit').value = $('unit').value === 'custom' ? symbol : '';
    $('unit-position').value = card?.format.unit?.position ?? (card?.format.type === 'currency' ? 'prefix' : 'suffix');
    $('include-deleted').checked = card?.includeDeleted ?? false;
    syncUnit(); $('preview-details').open = false;
    $('editor').showModal(); syncCalculation(); $('card-title').focus();
  }
  function closeEditor() { closeController.requestClose(); }
  $('close-editor').onclick = $('cancel-editor').onclick = closeEditor;
  $('editor').addEventListener('cancel', event => { event.preventDefault(); closeEditor(); });
  $('card-title').oninput = updatePreview;
  $('calculation').onchange = syncCalculation;
  $('group-by').onchange = () => { draft.groupByType = $('group-by').value; renderSources(); updatePreview(); };
  $('display-mode').onchange = updatePreview;
  $('unit').onchange = () => {
    $('unit-position').value = ['¥', '$', 'NTD'].includes($('unit').value) ? 'prefix' : 'suffix';
    syncUnit(); updatePreview();
    if ($('unit').value === 'custom') $('custom-unit').focus();
  };
  $('custom-unit').oninput = updatePreview;
  $('unit-position').onchange = $('include-deleted').onchange = updatePreview;
  $('card-form').onsubmit = async event => {
    event.preventDefault();
    if (saving || destroyed) return;
    saving = true;
    const controls = [...$('card-form').querySelectorAll('button, input, select')];
    const disabled = controls.map(control => control.disabled);
    controls.forEach(control => { control.disabled = true; });
    try {
      const card = readDraft();
      const result = await operations.readCard(card);
      if (destroyed) return;
      if (result.status === 'needs-repair') throw new Error(result.issues.map(issueMessage).join(' '));
      await onSave(card, draft.original);
      if (!destroyed) { saving = false; closeEditor(); }
    } catch (error) { if (!destroyed) showEditorError(error.code === 'conflict' ? t('Your cards changed in another tab. Cancel this edit and reload the saved cards before trying again.') : error.message); }
    finally {
      saving = false; controls.forEach((control, index) => { control.disabled = disabled[index]; });
      $('save-card').disabled = !preview.valid;
    }
  };

  return { open: openEditor, get isOpen() { return $('editor').open; }, destroy() { destroyed = true; preview.close(); scrollbar.destroy(); closeController.destroy(); } };
}
