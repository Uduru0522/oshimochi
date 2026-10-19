import { createElement } from '../../shared/dom.js';
import { createIcon } from '../../shared/icons.js';
import { createDialogCloseController } from '../../shared/dialog-close-controller.js';
import { translate as t } from '../../localization/translate.js';
import { formatItemFieldValue } from './item-value-format.js';

let sequence = 0;

// Read-only, independent of the dashboard so the collection browser can reuse it.
export function createItemDetailDialog({ getAsset }) {
  const titleId = `item-detail-title-${++sequence}`;
  const make = (tag, className, textContent = '') => createElement(tag, { className, textContent });
  const dialog = make('dialog', 'item-detail-dialog'); dialog.setAttribute('aria-labelledby', titleId);
  const header = make('header', 'item-detail-header');
  const title = make('h2', 'item-detail-title'); title.id = titleId; title.tabIndex = -1;
  const close = make('button', 'item-detail-close'); close.type = 'button';
  close.setAttribute('aria-label', t('Close item details')); close.title = t('Close'); close.append(createIcon('close'));
  header.append(title, close);
  const body = make('div', 'item-detail-layout');
  const picture = make('div', 'item-detail-picture');
  const values = make('dl', 'item-detail-values'); values.tabIndex = 0;
  values.setAttribute('aria-label', t('Item details'));
  body.append(picture, values); dialog.append(header, body);
  let returnFocus = null, version = 0, imageUrl = '';
  function releaseImage() {
    version++;
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    imageUrl = '';
  }
  function placeholder(message, state) {
    picture.dataset.state = state;
    const copy = make('p', 'item-detail-image-status', message); copy.setAttribute('role', 'status');
    picture.replaceChildren(createIcon('goodsType'), copy);
  }
  const closing = createDialogCloseController(dialog, { onClosed() {
    releaseImage(); picture.replaceChildren();
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  } });
  close.onclick = () => closing.requestClose();
  dialog.addEventListener('cancel', event => { event.preventDefault(); closing.requestClose(); });

  async function loadImage(item) {
    releaseImage();
    const request = version;
    if (!item.imageAssetId) { placeholder(t('No image'), 'empty'); return; }
    placeholder(t('Loading image…'), 'loading');
    try {
      const asset = await getAsset(item.imageAssetId);
      if (request !== version) return;
      if (!asset) { placeholder(t('Image unavailable'), 'unavailable'); return; }
      imageUrl = URL.createObjectURL(asset.data);
      const image = document.createElement('img'); image.alt = item.name;
      image.onload = () => {
        if (request !== version) return;
        URL.revokeObjectURL(imageUrl); imageUrl = '';
        picture.dataset.state = 'ready'; picture.replaceChildren(image);
      };
      image.onerror = () => {
        if (request !== version) return;
        URL.revokeObjectURL(imageUrl); imageUrl = '';
        placeholder(t('Image unavailable'), 'unavailable');
      };
      image.src = imageUrl;
    } catch {
      if (request === version) placeholder(t('Image unavailable'), 'unavailable');
    }
  }

  return {
    element: dialog,
    get isOpen() { return dialog.open; },
    open({ item, goodsType, fields, returnFocus: trigger }) {
      returnFocus = trigger;
      title.textContent = title.title = item.name;
      values.replaceChildren();
      const add = (label, value) => values.append(make('dt', '', label), make('dd', '', value));
      add(t('Collection'), goodsType.displayName);
      add(t('Added'), new Intl.DateTimeFormat(document.documentElement.lang, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt)));
      for (const field of fields.filter(field => !field.isBuiltIn)) add(field.displayName, formatItemFieldValue(field, item.customValues[field.id]));
      loadImage(item);
      if (!dialog.open) dialog.showModal();
      values.scrollTop = 0; title.focus({ preventScroll: true });
    },
    destroy() { releaseImage(); closing.destroy(); dialog.remove(); }
  };
}
