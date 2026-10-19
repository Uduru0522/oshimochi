import { DASHBOARD_REVEAL_MS, playReadoutMotion } from './readout-motion.js';
import { createRingInteraction } from './ring-interaction.js';
import { createRingRevealPath, createRingShapeMotion } from './ring-shape.js';
import { createNumberFormatter } from './number-format.js';
import { translate as t } from '../../localization/translate.js';

let sweepSequence = 0;
export function displayLabel(entry) {
  const key = JSON.parse(entry.id);
  return key.length === 3 && key[2] === null ? t('Uncategorized') : entry.label;
}
function element(tag, text = '', className = '') {
  const node = document.createElement(tag); node.textContent = text; node.className = className; return node;
}
export function formatValue(value, format) {
  if (value === null) return '—';
  const number = createNumberFormatter(value, format, document.documentElement.lang).format(value);
  if (!format.unit) return number;
  return format.unit.position === 'prefix' ? `${format.unit.symbol}${number}` : `${number} ${format.unit.symbol}`;
}
export function readoutSignature(card, result) {
  return JSON.stringify([result.status, result.value, card.displayMode, card.calculation, card.format,
    result.breakdown?.map(({ id, value }) => [id, value])]);
}
export function createReadout(card, result, { colorFor, animate = false, interactionState = { pinnedId: null } } = {}) {
  const wrapper = element('div', '', 'card-readout');
  const entries = result.breakdown ?? [];
  const negative = entries.some(entry => entry.value < 0);
  const maximum = entries.reduce((maximum, entry) => Math.max(maximum, entry.value ?? 0), 0);
  const scaled = entries.map(entry => maximum > 0 ? (entry.value ?? 0) / maximum : 0);
  const denominator = scaled.reduce((total, value) => total + value, 0);
  const additive = ['sum', 'count'].includes(card.calculation);
  const drawable = result.status === 'ready' && !negative && denominator > 0;
  const contributing = entries.filter(entry => entry.value !== null && entry.value !== 0).length;
  const showRing = additive && (card.displayMode === 'ring' || ((card.displayMode ?? 'auto') === 'auto' && drawable && contributing > 1));
  wrapper.dataset.display = showRing ? 'ring' : 'number';
  wrapper.dataset.status = result.status;
  const display = element('div', '', 'value-display');
  const numberFormat = card.format.type === 'currency' ? card.format : { type: 'number' };
  const counterFormat = createNumberFormatter(result.value, numberFormat, document.documentElement.lang, { fixedPrecision: true });
  const finalText = formatValue(result.value, numberFormat);
  const numeric = element('span', finalText, `value-number${finalText.length > (showRing ? 7 : 11) ? ' long' : ''}`);
  if (!card.format.unit || result.value === null) display.append(numeric);
  else {
    const unit = element('span', card.format.unit.symbol, 'value-unit');
    unit.title = card.format.unit.symbol;
    display.append(...(card.format.unit.position === 'prefix' ? [unit, numeric] : [numeric, unit]));
  }
  display.setAttribute('aria-label', formatValue(result.value, card.format));
  const breakdownName = entry => card.groupBy?.type === 'field' && card.sources.length > 1
    ? `${displayLabel(entry)} · ${entry.goodsTypeName}` : displayLabel(entry);
  function breakdownValue(entry, index) {
    const value = formatValue(entry.value, card.format);
    const share = scaled[index] / denominator * 100;
    const percent = share > 0 && share < .1 ? '<0.1%' : `${new Intl.NumberFormat(document.documentElement.lang, { maximumFractionDigits: 1 }).format(share)}%`;
    return `${value} (${percent})`;
  }
  if (!showRing || !drawable) interactionState.pinnedId = null;
  let reveal = () => {}, interaction = null, stopMotion = () => {};
  const shapes = [];
  if (showRing) {
    const ring = element('div', '', 'ring');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 200 200');
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', t(card.groupBy?.type === 'field' ? 'Breakdown by category' : 'Breakdown by collection'));
    function svgElement(tag, attributes, parent = svg) {
      const node = document.createElementNS(svg.namespaceURI, tag);
      for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
      parent.append(node); return node;
    }
    svgElement('circle', { class: 'ring-hit-area', cx: 100, cy: 100, r: 84, fill: 'none', stroke: 'transparent', 'stroke-width': 60, 'pointer-events': 'stroke', 'aria-hidden': 'true' });
    const definitions = svgElement('defs', {});
    const sweepId = `dashboard-sweep-${++sweepSequence}`;
    const clip = svgElement('clipPath', { id: sweepId, clipPathUnits: 'userSpaceOnUse' }, definitions);
    const sweep = svgElement('path', { class: 'ring-sweep', d: createRingRevealPath(1) }, clip);
    const segments = svgElement('g', { class: 'ring-segments' });
    const slices = [];
    let offset = 0;
    if (drawable) entries.forEach((entry, index) => {
      const share = scaled[index] / denominator * 100;
      if (share <= 0) return;
      const segment = svgElement('path', { class: 'ring-segment', fill: colorFor(entry.id) }, segments);
      const shape = createRingShapeMotion(segment, offset / 100, share / 100); shapes.push(shape);
      segment.setAttribute('role', 'button'); segment.setAttribute('tabindex', '0');
      segment.setAttribute('aria-label', `${breakdownName(entry)}: ${breakdownValue(entry, index)}`);
      segment.dataset.collection = entry.goodsTypeId; segment.dataset.group = entry.id; segment.dataset.share = share;
      segment.dataset.midAngle = String((offset + share / 2) / 100 * 2 * Math.PI);
      slices.push({ element: segment, id: entry.id, label: breakdownName(entry), value: breakdownValue(entry, index),
        color: colorFor(entry.id), start: offset / 100, share: share / 100, setActive: shape.setActive });
      offset += share;
    });
    reveal = progress => {
      sweep.setAttribute('d', createRingRevealPath(progress));
      if (progress === 1) segments.removeAttribute('clip-path');
      else segments.setAttribute('clip-path', `url(#${sweepId})`);
    };
    const center = element('div', '', 'ring-value'); center.append(display); ring.append(svg, center);
    const stage = element('div', '', 'ring-chart'); stage.append(ring); wrapper.append(stage);
    if (drawable) {
      stage.dataset.layout = 'interactive';
      const detail = element('div', '', 'ring-detail');
      detail.setAttribute('role', 'status'); detail.setAttribute('aria-live', 'polite'); detail.setAttribute('aria-atomic', 'true');
      detail.append(element('span', '', 'ring-detail-name'), element('span', '', 'ring-detail-value')); stage.append(detail);
      interaction = createRingInteraction({ svg, detail, items: slices, interactionState, onActivate() { stopMotion(); reveal(1); } });
    } else {
      stage.dataset.layout = 'static';
      svg.setAttribute('aria-hidden', 'true');
    }
    if (!drawable && entries.length) {
      const legend = element('ul', '', 'composition-legend'); legend.setAttribute('aria-label', t(card.groupBy?.type === 'field' ? 'Breakdown by category' : 'Breakdown by collection'));
      entries.forEach(entry => {
        const item = element('li'); item.style.setProperty('--category-color', colorFor(entry.id)); item.dataset.collection = entry.goodsTypeId; item.dataset.group = entry.id;
        const label = breakdownName(entry);
        item.title = `${label}: ${formatValue(entry.value, card.format)}`;
        item.append(element('span', label, 'legend-name'));
        const value = formatValue(entry.value, card.format);
        item.append(element('span', value, 'legend-share'));
        legend.append(item);
      });
      wrapper.append(legend);
    }
    if (negative) wrapper.append(element('p', t('Includes negative totals'), 'composition-note'));
  } else {
    const plain = element('div', '', 'plain-result'); plain.append(display); wrapper.append(plain);
  }
  if (result.status === 'overflow') wrapper.append(element('p', t('Result too large to display'), 'composition-note'));
  return {
    element: wrapper,
    finishMotion() { stopMotion(); reveal(1); },
    play() {
      stopMotion = playReadoutMotion({ element: wrapper, numberElement: numeric, value: result.value,
        formatNumber: value => value === null ? '—' : counterFormat.format(value), reveal, enabled: animate && !interaction?.isInteracting(),
        duration: DASHBOARD_REVEAL_MS, integer: card.calculation === 'count' });
    },
    destroy() { interaction?.destroy(); shapes.forEach(shape => shape.destroy()); stopMotion(); }
  };
}
