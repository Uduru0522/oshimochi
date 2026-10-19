const { test, expect } = require('./fixtures.js');
const { seedDashboard, addSummary, saveSummary, summary } = require('./helpers/dashboard.js');

async function addSpending(page, title = 'Spending') {
  await addSummary(page, title, 'sum');
  for (const [name, field] of [['Figures', 'figures-price'], ['Tapestries', 'tapestries-cost']]) {
    await page.getByRole('checkbox', { name, exact: true }).check();
    await page.getByRole('combobox', { name: `Number field in ${name}`, exact: true }).selectOption(field);
  }
}

test('live preview keeps a long title above the ring with consistent spacing at wide and narrow widths', async ({ page }) => {
  await seedDashboard(page); await addSpending(page, 'A long preview title that must stay above the ring without touching it');
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const preview = page.locator('.preview-card');
    await preview.scrollIntoViewIfNeeded();
    const positions = await preview.evaluate(card => {
      const title = card.querySelector('#dashboard-preview-title'), ring = card.querySelector('.ring');
      const t = title.getBoundingClientRect(), r = ring.getBoundingClientRect(), c = card.getBoundingClientRect();
      const dialog = card.closest('dialog').getBoundingClientRect();
      return { gap: r.top - t.bottom, left: t.left - c.left, right: c.right - t.right,
        titleHeight: t.height, lineHeight: parseFloat(getComputedStyle(title).lineHeight),
        overflow: title.scrollWidth > title.clientWidth, ellipsis: getComputedStyle(title).textOverflow,
        ringFits: r.left >= c.left && r.right <= c.right, cardFits: c.left >= dialog.left && c.right <= dialog.right };
    });
    expect(positions.gap).toBeGreaterThanOrEqual(15);
    expect(positions.left).toBeGreaterThanOrEqual(16); expect(positions.right).toBeGreaterThanOrEqual(16);
    expect(positions.titleHeight).toBeCloseTo(positions.lineHeight, 0);
    expect(positions.overflow).toBe(true); expect(positions.ellipsis).toBe('ellipsis'); expect(positions.ringFits).toBe(true);
    expect(positions.cardFits).toBe(true);
  }
});

test('the ring reveal leaves unrevealed pixels clear, including its closing seam', async ({ page }) => {
  await page.goto('./');
  const phases = await page.evaluate(async () => {
    const { createReadout } = await import('./src/views/dashboard/card-readout.js');
    const { createRingRevealPath } = await import('./src/views/dashboard/ring-shape.js');
    const readout = createReadout({ calculation: 'count', displayMode: 'ring', format: { type: 'number' } },
      { status: 'ready', value: 23, breakdown: [{ id: '["figures"]', label: 'Figures', goodsTypeId: 'figures', value: 23 }] },
      { colorFor: () => '#2675c7' });
    const svg = readout.element.querySelector('svg'), segments = svg.querySelector('.ring-segments');
    svg.setAttribute('width', '200'); svg.setAttribute('height', '200');
    const clip = svg.querySelector('clipPath'), sweep = clip.querySelector('path');
    const results = [];
    for (const progress of [0, .25, .5, .75, 1]) {
      sweep.setAttribute('d', createRingRevealPath(progress)); segments.setAttribute('clip-path', `url(#${clip.id})`);
      const image = new Image();
      image.src = `data:image/svg+xml,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 200;
      const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
      const alpha = (x, y) => context.getImageData(x, y, 1, 1).data[3];
      const quarters = [.125, .375, .625, .875].map(turn => alpha(Math.round(100 + 84 * Math.cos(turn * 2 * Math.PI)), Math.round(100 + 84 * Math.sin(turn * 2 * Math.PI))));
      results.push({ progress, quarters, closingSeam: alpha(184, 99), center: alpha(100, 100),
        anyPaint: context.getImageData(0, 0, 200, 200).data.some((value, index) => index % 4 === 3 && value > 0) });
    }
    readout.destroy(); return results;
  });
  expect(phases[0].anyPaint).toBe(false);
  for (const phase of phases) {
    expect(phase.center).toBe(0);
    expect(phase.quarters).toEqual([.125, .375, .625, .875].map(turn => turn < phase.progress ? 255 : 0));
    if (phase.progress < 1) expect(phase.closingSeam).toBe(0);
  }
});

test('the page scrollbar appears during scrolling or edge hover and hides while idle without moving content', async ({ page }) => {
  await seedDashboard(page); await page.setViewportSize({ width: 390, height: 600 });
  const pane = page.locator('.view-panel');
  await expect(pane).toHaveCSS('scrollbar-width', 'none');
  expect(await pane.evaluate(node => node.offsetWidth - node.clientWidth)).toBe(0);
  await page.mouse.move(1, 1);
  await expect(pane).not.toHaveAttribute('data-scrolling', 'true');
  await expect(pane).toHaveCSS('scrollbar-color', 'rgba(0, 0, 0, 0) rgba(0, 0, 0, 0)');
  const before = await pane.evaluate(node => ({ width: node.clientWidth, content: node.firstElementChild.getBoundingClientRect().width }));
  await pane.evaluate(node => { node.scrollTop = 80; });
  await expect(pane).toHaveAttribute('data-scrolling', 'true');
  await expect(pane).not.toHaveCSS('scrollbar-color', 'rgba(0, 0, 0, 0) rgba(0, 0, 0, 0)');
  await expect(pane).not.toHaveAttribute('data-scrolling', 'true');
  await expect(pane).toHaveCSS('scrollbar-color', 'rgba(0, 0, 0, 0) rgba(0, 0, 0, 0)');
  expect(await pane.evaluate(node => ({ width: node.clientWidth, content: node.firstElementChild.getBoundingClientRect().width }))).toEqual(before);
  const bounds = await pane.boundingBox();
  await page.mouse.move(bounds.x + bounds.width - 12, bounds.y + 80);
  await expect(pane).toHaveAttribute('data-scrollbar-edge', 'true');
  await page.mouse.move(bounds.x + 60, bounds.y + 80);
  await expect(pane).not.toHaveAttribute('data-scrollbar-edge', 'true');
  expect(await pane.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
});

test('card editor scrollbars overlay the content through overflowing and fitting calculations and support dragging and keys', async ({ page }) => {
  await seedDashboard(page); await page.setViewportSize({ width: 1440, height: 1000 });
  await addSpending(page, 'Overlay settings');
  const layout = page.locator('#dashboard-editor-layout'), frame = layout.locator('..');
  const rail = frame.getByRole('scrollbar', { name: 'Scroll content', exact: true });
  const measure = () => layout.evaluate(node => ({ width: node.clientWidth, outside: node.offsetWidth,
    fields: node.querySelector('.editor-fields').getBoundingClientRect().width,
    preview: node.querySelector('.preview-pane').getBoundingClientRect().width,
    dialog: node.closest('dialog').getBoundingClientRect().toJSON() }));
  await expect.poll(() => layout.evaluate(node => node.scrollHeight > node.clientHeight + 1)).toBe(true);
  const original = await measure(); expect(original.width).toBe(original.outside);
  await page.getByRole('radio', { name: 'Average', exact: true }).check();
  await expect.poll(() => layout.evaluate(node => node.scrollHeight <= node.clientHeight + 1)).toBe(true);
  await expect(rail).toBeHidden(); expect(await measure()).toEqual(original);
  await page.getByRole('radio', { name: 'Total (sum)', exact: true }).check();
  await expect.poll(() => layout.evaluate(node => node.scrollHeight > node.clientHeight + 1)).toBe(true);
  const bounds = await layout.boundingBox();
  await page.mouse.move(bounds.x + bounds.width - 15, bounds.y + 70);
  await expect(rail).toHaveCSS('opacity', '1');
  const maximum = await layout.evaluate(node => node.scrollHeight - node.clientHeight);
  const thumb = await frame.locator('.overlay-scroll-thumb').boundingBox();
  await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + 30); await page.mouse.down();
  await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + 130, { steps: 8 }); await page.mouse.up();
  await expect.poll(() => layout.evaluate(node => node.scrollTop)).toBeCloseTo(maximum, 0);
  await rail.press('Home'); await expect.poll(() => layout.evaluate(node => node.scrollTop)).toBe(0);
  await rail.press('PageDown'); await expect.poll(() => layout.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
  expect(await measure()).toEqual(original);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await addSpending(page, 'Reopened settings');
  expect(await measure()).toEqual(original);
});

test('new ring reveals stay empty until visibility starts the sweep in the editor and saved cards', async ({ page }) => {
  await seedDashboard(page);
  await page.evaluate(() => {
    const Observer = window.IntersectionObserver;
    window.holdChartReveal = true; window.pendingChartReveals = [];
    window.IntersectionObserver = class extends Observer {
      constructor(callback, options) {
        super((entries, observer) => {
          if (window.holdChartReveal && entries.some(entry => entry.target.matches('.card-readout'))) {
            window.pendingChartReveals.push(() => callback(entries, observer));
          } else callback(entries, observer);
        }, options);
      }
    };
  });
  await addSpending(page, 'No flash');
  const preview = page.locator('#dashboard-preview-value .card-readout');
  async function expectEmpty(readout) {
    await expect(readout).toHaveAttribute('data-motion', 'waiting');
    await expect(readout.locator('.ring-sweep')).toHaveAttribute('d', '');
    await expect(readout.locator('.ring-segments')).toHaveAttribute('clip-path', /url\(#dashboard-sweep-/);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(readout.locator('.ring-sweep')).toHaveAttribute('d', '');
  }
  async function release() {
    await page.evaluate(() => { window.holdChartReveal = false; window.pendingChartReveals.splice(0).forEach(callback => callback()); });
  }
  await expectEmpty(preview); await release();
  await expect(preview).toHaveAttribute('data-motion', 'done');
  await expect(preview.locator('.ring-segments')).not.toHaveAttribute('clip-path');
  await page.evaluate(() => { window.holdChartReveal = true; window.pendingChartReveals = []; });
  await saveSummary(page);
  const card = summary(page, 'No flash').locator('.card-readout');
  await expectEmpty(card); await release();
  await expect(card).toHaveAttribute('data-motion', 'done');
  await expect(card.locator('.ring-segments')).not.toHaveAttribute('clip-path');
});

test('hover switches immediately across neighboring angles while keeping inner and outer forgiveness', async ({ page }) => {
  await seedDashboard(page); await addSpending(page, 'Neighbor previews'); await saveSummary(page);
  const card = summary(page, 'Neighbor previews');
  await expect(card.locator('.card-readout')).toHaveAttribute('data-motion', 'done');
  const transitions = await card.evaluate(card => {
    const svg = card.querySelector('svg'), segments = [...card.querySelectorAll('.ring-segment')];
    const boundary = Number(segments[0].dataset.share) / 100;
    function move(turn, radius) {
      const angle = turn * 2 * Math.PI;
      const point = new DOMPoint(100 + radius * Math.cos(angle), 100 + radius * Math.sin(angle)).matrixTransform(svg.getScreenCTM());
      svg.dispatchEvent(new PointerEvent('pointermove', { clientX: point.x, clientY: point.y, pointerType: 'mouse' }));
      return segments.map(segment => segment.dataset.preview === 'true');
    }
    return [move(boundary - .0001, 84), move(boundary + .0001, 84), move(boundary - .0001, 55), move(boundary - .0001, 113)];
  });
  expect(transitions).toEqual([[true, false], [false, false], [true, false], [true, false]]);
  await expect(card.locator('.ring-detail-name')).toHaveText('Tapestries');
});

test('returning to My collection keeps card positions steady throughout the ring reveal', async ({ page }) => {
  await seedDashboard(page); await addSpending(page); await saveSummary(page);
  await page.getByRole('button', { name: 'Figures', exact: true }).click();
  await expect(page.locator('.dashboard-view')).toHaveCount(0);
  await page.getByRole('button', { name: 'My collection', exact: true }).click();
  const samples = await page.evaluate(async () => {
    const samples = [];
    for (let index = 0; index < 70; index++) {
      await new Promise(requestAnimationFrame);
      const container = document.querySelector('.dashboard-cards');
      const cards = container?.querySelectorAll(':scope > article');
      if (!cards?.length) continue;
      samples.push({ running: Boolean(container.querySelector('.card-readout[data-motion="running"]')),
        loading: !document.querySelector('#dashboard-status').hidden,
        cards: [...cards].map(card => {
          const box = card.getBoundingClientRect();
          return { id: card.dataset.cardId, x: box.x + (box.width - card.offsetWidth) / 2,
            y: box.y + (box.height - card.offsetHeight) / 2 };
        }) });
    }
    return samples;
  });
  expect(samples.some(sample => sample.running)).toBe(true);
  expect(samples.every(sample => !sample.loading)).toBe(true);
  const last = samples.at(-1);
  for (const card of last.cards) {
    const positions = samples.map(sample => sample.cards.find(entry => entry.id === card.id)).filter(Boolean);
    expect(Math.max(...positions.map(position => Math.abs(position.x - card.x)))).toBeLessThan(1);
    expect(Math.max(...positions.map(position => Math.abs(position.y - card.y)))).toBeLessThan(1);
  }
});

test('animated values keep the final decimal precision and unit position while slowing toward the total', async ({ page }) => {
  await seedDashboard(page);
  await page.evaluate(async () => {
    const { createIndexedDbStorage } = await import('./src/data/indexeddb/indexeddb-storage.js');
    const storage = createIndexedDbStorage(); await storage.initialize();
    try {
      const catalog = await storage.readDataCatalog();
      catalog.items.find(item => item.id === 'item-1').customValues['figures-price'] = 1200.2;
      await storage.replaceDataCatalog(catalog);
    } finally { storage.close(); }
  });
  await page.reload(); await addSpending(page, 'Decimal spending');
  await page.getByRole('radiogroup', { name: 'Unit', exact: true }).getByRole('radio', { name: 'NTD — Taiwan dollar', exact: true }).check();
  await saveSummary(page);
  await page.getByRole('button', { name: 'Figures', exact: true }).click(); await expect(page.locator('.dashboard-view')).toHaveCount(0);
  await page.getByRole('button', { name: 'My collection', exact: true }).click();
  const samples = await page.evaluate(async () => {
    const samples = [];
    for (let index = 0; index < 65; index++) {
      await new Promise(requestAnimationFrame);
      const card = document.querySelector('.summary-card[aria-label="Decimal spending"]');
      if (!card) continue;
      const number = card.querySelector('.value-number'), unit = card.querySelector('.value-unit'), box = unit.getBoundingClientRect();
      samples.push({ text: number.textContent, running: card.querySelector('.card-readout').dataset.motion === 'running',
        unitY: box.y - card.getBoundingClientRect().y });
    }
    return samples;
  });
  expect(samples.some(sample => sample.running)).toBe(true);
  expect(samples.every(sample => /^\d[\d,]*\.\d$/.test(sample.text))).toBe(true);
  expect(samples.at(-1).text).toBe('5,700.2');
  const running = samples.filter(sample => sample.running);
  expect(Math.max(...running.map(sample => sample.unitY)) - Math.min(...running.map(sample => sample.unitY))).toBeLessThan(4);
  await expect(summary(page, 'Decimal spending').locator('.value-unit')).toHaveText('NTD');
});
