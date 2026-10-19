import { createDialogCloseController } from '../../shared/dialog-close-controller.js';
import { element, t } from './dashboard-dom.js';
import { createCardEditor } from './card-editor.js';
import { createCardCopy } from './card-copy.js';
import { createReadout, readoutSignature } from './card-readout.js';
import { playReadoutMotion } from './readout-motion.js';
import { createCardBoard } from './card-board.js';
import { createCardDetails } from './card-details.js';
import { createCardArrangement, reorderVisibleCards } from './card-arrangement.js';
import { createRecentItems } from './recent-items.js';
import { createItemDetailDialog } from '../items/item-detail-dialog.js';

export function createDashboardController({ root, refs, operations, getAsset, mutationController, onCreateCollection }) {
  const $ = id => refs[id];
  const addCardButton = $('add-card');
  const calculationNames = { sum: t('Total'), count: t('Number of items'), average: t('Average'), minimum: t('Lowest value'), maximum: t('Highest value') };
  let saved = [], storedCards = [], collections = [], busy = false, destroyed = false, loadVersion = 0;
  let noticeTimer = 0, detailsReturnFocus = null, overviewMotions = [];
  const itemDetails = createItemDetailDialog({ getAsset }); root.append(itemDetails.element);
  const defaultRecentCard = operations.createRecentCard({ id: crypto.randomUUID() });
  const { sourceLabel, issueMessage, coverage } = createCardCopy(() => collections);
  const board = createCardBoard({ container: $('cards'), addButton: addCardButton,
    readCard: card => card.type === 'recent-items' ? operations.readRecentItems() : operations.readCardBreakdown(card),
    createCard: createCardRecord,
    createEmpty() {
      const empty = element('div', '', 'empty-state'); empty.dataset.cardSpan = 'full';
      empty.append(element('p', t('Create your first collection to start adding items and summary cards.'), 'help'),
        action(t('Create a collection'), () => onCreateCollection()));
      return empty;
    }
  });
  const editor = createCardEditor({ refs, operations, getCollections: () => collections, getCards: () => saved,
   categoryColor, sourceLabel, issueMessage, coverage, calculationNames,
   async onSave(card, original) {
     await replaceCards(original ? saved.map(entry => entry.id === card.id ? card : entry) : [...saved, card]);
     if (!destroyed) notice(t('“{title}” saved.', { title: card.title }));
   },
   onClosed() { if (!destroyed) addCardButton.focus({ preventScroll: true }); }
  });
  const events = new AbortController();
  const arrangement = createCardArrangement({ root, container: $('cards'), bar: $('arrange-bar'), status: $('arrange-status'),
    saveButton: $('save-order'), cancelButton: $('cancel-order'), layout: board.layout,
    getIds: () => saved.filter(visible).map(card => card.id),
    async onSave(ids) {
      busy = true;
      try { await replaceCards(ordered(reorderVisibleCards(saved, ids))); notice(t('Card order saved.')); }
      finally { busy = false; }
    },
    onError(error) { notice(error.code === 'conflict' ? t('Your cards changed in another tab. Cancel this edit and reload the saved cards before trying again.') : error.message, true); }
  });
  const detailsClose = createDialogCloseController($('details-dialog'), { onClosed() {
    if (detailsReturnFocus?.isConnected) detailsReturnFocus.focus({ preventScroll: true });
  } });
  const pickerClose = createDialogCloseController($('card-picker'));
  function withDefaultRecent(cards) {
    return cards.some(card => card.type === 'recent-items') ? cards
      : [defaultRecentCard, ...cards.map((card, index) => ({ ...card, position: index + 1 }))];
  }
  function visible(card) { return card.type !== 'recent-items' || card.visible; }
  function cardTitle(card) { return card.type === 'recent-items' ? t("Recent items") : card.title; }

  function notice(message, error = false) {
    clearTimeout(noticeTimer);
    const close = element('button', '✕'); close.type = 'button'; close.setAttribute('aria-label', t("Dismiss message"));
    close.onclick = () => { $('notice').hidden = true; clearTimeout(noticeTimer); };
    $('notice').replaceChildren(element('span', message), close);
    $('notice').hidden = false; $('notice').classList.toggle('error', error);
    $('notice').setAttribute('role', error ? 'alert' : 'status');
    if (!error) noticeTimer = setTimeout(() => { $('notice').hidden = true; }, 2400);
  }
  async function run(action) {
    if (destroyed || busy) return;
    busy = true;
    try { await action(); }
    catch (error) {
      if (destroyed) return;
      const message = error.code === 'conflict'
        ? t("Your cards changed in another tab. Cancel this edit and reload the saved cards before trying again.")
        : error.message;
      notice(message, true);
    } finally { busy = false; }
  }
  function action(label, handler, { disabled = false, className = '', accessibleName = label } = {}) {
    const button = element('button', label, className); button.type = 'button'; button.disabled = disabled;
    button.setAttribute('aria-label', accessibleName); button.onclick = () => run(handler); return button;
  }
  function categoryColor(id) {
    const collectionIds = [...new Set([...collections.map(entry => JSON.stringify([entry.goodsType.id])), ...saved.flatMap(card => (card.sources ?? []).map(source => JSON.stringify([source.goodsTypeId])))])].sort();
    const categoryIds = collections.flatMap(({ goodsType, fields }) => fields.flatMap(field => {
      const values = field.dataType === 'select' ? field.options.choices.map(choice => choice.id) : field.dataType === 'boolean' ? [false, true] : [];
      return values.length ? [...values, null].map(value => JSON.stringify([goodsType.id, field.id, value])) : [];
    })).sort();
    const ids = collectionIds.includes(id) ? collectionIds : categoryIds;
    const index = Math.max(0, ids.indexOf(id));
    const tones = [100, 76, 52, 94, 64, 34, 86, 42];
    const strength = Math.max(26, tones[index % tones.length] - Math.floor(index / tones.length) * 7);
    return `color-mix(in oklab, var(--accent) ${strength}%, var(--surface))`;
  }
  function ordered(cards) {
    const updatedAt = new Date().toISOString();
    return cards.map((card, position) => ({ ...card, position, updatedAt }));
  }
  async function replaceCards(cards) {
    storedCards = await mutationController.run(() => operations.replaceCards({ cards, expectedCards: storedCards }));
    if (destroyed) return;
    saved = storedCards;
    await renderCards();
  }
  function createCardShell(card) {
    const title = cardTitle(card);
    const article = element('article', '', 'summary-card'); article.dataset.cardId = card.id;
    article.setAttribute('aria-label', title);
    const heading = element('div', '', 'card-heading');
    const drag = element('button', '⠿', 'card-drag-handle'); drag.type = 'button'; drag.hidden = true;
    drag.setAttribute('aria-label', t('Rearrange {title}', { title })); drag.setAttribute('aria-describedby', 'dashboard-arrange-instructions'); heading.append(drag);
    const name = element('h3', title); name.title = title; heading.append(name);
    const menu = element('details', '', 'card-options');
    const toggle = element('summary', '⋯'); toggle.setAttribute('aria-label', t('Actions for {title}', { title }));
    const actions = element('div', '', 'card-options-panel');
    menu.append(toggle, actions); heading.append(menu); article.append(heading);
    menu.addEventListener('toggle', () => {
      if (menu.open) root.querySelectorAll('.card-options[open]').forEach(other => { if (other !== menu) other.open = false; });
    });
    return { article, menu, toggle, actions };
  }
  function appendArrangeAction({ actions, menu, toggle }) {
    actions.append(action(t('Rearrange cards'), () => {
      menu.open = false; board.finishMotion(); arrangement.open(toggle);
    }));
  }
  function openDetails(title, content, returnFocus) {
    detailsReturnFocus = returnFocus;
    $('details-title').textContent = $('details-title').title = title;
    $('details-body').replaceChildren(content); if (!destroyed) $('details-dialog').showModal();
  }
  function openRecentItem(entry, button) {
    const fields = collections.find(collection => collection.goodsType.id === entry.goodsType.id)?.fields ?? [];
    itemDetails.open({ ...entry, fields, returnFocus: button });
  }
  function renderCards(options) {
    return board.render(saved.filter(visible), { ...options,
      metadata: collections.map(({ goodsType, fields }) => [goodsType, fields]),
      showEmpty: !collections.length && !saved.some(card => card.type !== 'recent-items')
    });
  }
  function createCardRecord(card, { data, failed, previous }) {
    const shell = createCardShell(card), { article, menu, toggle, actions } = shell;
    let disposed = false;
    const record = { article, readout: null, recent: null, signature: previous?.signature,
      interactionState: previous?.interactionState ?? { pinnedId: null },
      dispose() { if (disposed) return; disposed = true; record.readout?.destroy(); record.recent?.destroy(); } };
    if (card.type === 'recent-items') {
      article.classList.add('recent-card');
      try {
        if (failed) throw new Error('Read failed');
        record.recent = createRecentItems({ entries: data, getAsset, onOpen: openRecentItem });
        article.append(record.recent.element);
      } catch {
        article.append(element('p', t("Could not load recent items."), 'error-box'), action(t("Try again"), () => renderCards()));
      }
      actions.append(action(t("Details"), () => {
        menu.open = false;
        openDetails(t("Recent items"), element('p', t("The five newest active items across all active collections, ordered by when they were added. Editing an older item does not move it to the top."), 'card-explanation'), toggle);
      }, { accessibleName: t('Details for {title}', { title: t('Recent items') }) }));
      appendArrangeAction(shell);
      actions.append(action(t("Hide card"), async () => {
        await replaceCards(saved.map(entry => entry.id === card.id ? { ...entry, visible: false, updatedAt: new Date().toISOString() } : entry));
        notice(t("Recent items hidden. Use the plus button to add it again.")); addCardButton.focus({ preventScroll: true });
      }, { accessibleName: t("Hide Recent items") }));
      return record;
    }
    try {
      if (failed) throw new Error('Read failed');
      const result = data;
      const signature = readoutSignature(card, result);
      const readout = createReadout(card, result, { colorFor: categoryColor, animate: record.signature !== signature,
        interactionState: record.interactionState });
      record.signature = signature; record.readout = readout;
      article.dataset.display = readout.element.dataset.display;
      article.append(readout.element);
      if (result.status === 'needs-repair') {
        for (const issue of result.issues) article.append(element('p', issueMessage(issue), 'error-box'));
      }
    } catch {
      article.append(element('p', t("Could not load this result. Reload the cards to try again."), 'error-box'),
        action(t('Try again'), () => renderCards()));
    }
    const details = createCardDetails(card, failed ? null : data, { collections, sourceLabel, coverage, calculationNames });
    actions.append(action(t("Details"), () => {
      menu.open = false; openDetails(card.title, details, toggle);
    }, { accessibleName: t('Details for {title}', { title: card.title }) }),
      action(t("Edit card"), () => { menu.open = false; editor.open(saved.find(entry => entry.id === card.id) ?? card); }, { accessibleName: t('Edit {title}', { title: card.title }) }));
    appendArrangeAction(shell);
    actions.append(action(t("Remove"), async () => {
        if (!confirm(t('Remove “{title}”? This removes the card only. Your items are kept.', { title: card.title }))) return;
        await replaceCards(ordered(saved.filter(entry => entry.id !== card.id))); notice(t("Card removed.")); addCardButton.focus({ preventScroll: true });
      }, { accessibleName: t('Remove {title}', { title: card.title }), className: 'danger' }));
    return record;
  }

  async function reload({ quiet = false } = {}) {
    const version = ++loadVersion;
    board.invalidate();
    if (!quiet) { $('status').hidden = false; $('status').textContent = t('Loading your collection...'); }
    $('add-card').disabled = true; root.setAttribute('aria-busy', 'true');
    try {
      const [overview, cards] = await Promise.all([operations.readOverview(), operations.listCards()]);
      if (destroyed || version !== loadVersion) return;
      collections = overview.collections; storedCards = cards; saved = withDefaultRecent(cards);
      overviewMotions.forEach(stop => stop()); overviewMotions = [];
      for (const [id, value] of [['collection-count', overview.counts.collections], ['item-count', overview.counts.activeItems], ['deleted-count', overview.counts.deletedItems]]) {
        const number = $(id), changed = number.dataset.value !== String(value);
        number.dataset.value = String(value); number.textContent = String(value);
        overviewMotions.push(playReadoutMotion({ element: number, numberElement: number, value,
          formatNumber: value => new Intl.NumberFormat(document.documentElement.lang).format(Math.round(value)), enabled: changed, integer: true }));
      }
      await renderCards({ beforeCommit() {
        if (version !== loadVersion) return;
        $('status').hidden = true; $('overview').hidden = false; $('cards').hidden = false;
        $('collection-count').closest('dl').hidden = false;
      } });
      if (!destroyed && version === loadVersion) { $('status').hidden = true; $('add-card').disabled = false; }
    } catch {
      if (destroyed || version !== loadVersion) return;
      $('cards').hidden = true; $('collection-count').closest('dl').hidden = true;
      $('status').replaceChildren(element('p', t('Could not load your collection. Your data has not been changed.')),
        action(t("Try again"), reload));
    } finally { if (!destroyed && version === loadVersion) root.removeAttribute('aria-busy'); }
  }

  $('add-card').onclick = () => {
    $('choose-summary').disabled = collections.length === 0;
    $('summary-unavailable').hidden = collections.length !== 0;
    const recentVisible = saved.some(card => card.type === 'recent-items' && card.visible);
    $('choose-recent').disabled = recentVisible;
    $('choose-recent-description').textContent = t(recentVisible ? 'Already on this page.' : 'Your five newest items across all collections.');
    $('card-picker').showModal();
  };
  $('close-card-picker').onclick = () => pickerClose.requestClose();
  $('choose-summary').onclick = () => pickerClose.requestClose({ afterClose: () => editor.open() });
  $('choose-recent').onclick = () => pickerClose.requestClose({ afterClose: () => run(async () => {
    const recent = saved.find(card => card.type === 'recent-items');
    await replaceCards(ordered([...saved.filter(card => card !== recent), { ...recent, visible: true }]));
    if (!destroyed) notice(t('Recent items added.'));
  }) });
  $('close-details').onclick = $('dismiss-details').onclick = () => detailsClose.requestClose();
  for (const [dialog, close] of [[$('details-dialog'), detailsClose], [$('card-picker'), pickerClose]]) {
    dialog.addEventListener('cancel', event => { event.preventDefault(); close.requestClose(); });
  }
  root.addEventListener('click', event => {
    root.querySelectorAll('.card-options[open]').forEach(menu => { if (!menu.contains(event.target)) menu.open = false; });
  }, { signal: events.signal });
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape') root.querySelectorAll('.card-options[open]').forEach(menu => { menu.open = false; });
  }, { signal: events.signal });
  window.addEventListener('focus', () => {
    if (!destroyed && !busy && !arrangement.isOpen && !editor.isOpen && !itemDetails.isOpen && !$('details-dialog').open && !$('card-picker').open) run(() => reload({ quiet: true }));
  }, { signal: events.signal });
  run(reload);
  return { destroy() {
    destroyed = true; loadVersion++; clearTimeout(noticeTimer);
    events.abort(); arrangement.destroy(); board.destroy(); editor.destroy(); detailsClose.destroy(); pickerClose.destroy();
    itemDetails.destroy();
    overviewMotions.forEach(stop => stop());
  } };
}
