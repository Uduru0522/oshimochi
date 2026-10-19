import { createItemThumbnail } from '../items/item-thumbnail.js';
import { translate as t } from '../../localization/translate.js';
import { createIcon } from '../../shared/icons.js';

function element(tag, text = '', className = '') {
  const node = document.createElement(tag); node.textContent = text; node.className = className; return node;
}

export function createRecentItems({ entries, getAsset, onOpen }) {
  const list = element('ol', '', 'recent-items');
  list.setAttribute('aria-label', t('Newest items'));
  const thumbnails = [];
  for (const entry of entries) {
    const { item, goodsType } = entry;
    const row = element('li');
    const button = element('button', '', 'recent-item-row'); button.type = 'button';
    button.setAttribute('aria-label', t('Open {name} in {collection}', { name: item.name, collection: goodsType.displayName }));
    button.title = t('Added {date}', { date: new Intl.DateTimeFormat(document.documentElement.lang, { dateStyle: 'medium' }).format(new Date(item.createdAt)) });
    const thumbnail = createItemThumbnail(item, getAsset, { className: 'recent-thumbnail' });
    thumbnail.element.append(createIcon('goodsType'));
    thumbnail.element.setAttribute('aria-hidden', 'true'); thumbnails.push(thumbnail);
    const copy = element('span', '', 'recent-item-copy');
    copy.append(element('span', item.name, 'recent-item-name'), element('span', goodsType.displayName, 'recent-item-collection'));
    button.append(thumbnail.element, copy); button.onclick = () => onOpen(entry, button);
    row.append(button); list.append(row);
  }
  const content = entries.length ? list : element('p', t('No items yet. Your newest items will appear here.'), 'help recent-empty');
  return { element: content, destroy() { thumbnails.forEach(thumbnail => thumbnail.destroy()); } };
}
