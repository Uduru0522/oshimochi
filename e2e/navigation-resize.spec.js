const { test, expect } = require('./fixtures.js');
const { seedDashboard, addSummary, saveSummary } = require('./helpers/dashboard.js');

// Chromium normally hides native scrollbars in headless tests, which would
// conceal width changes when the desktop navigation starts overflowing.
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

async function seedLongNavigation(page, { summaryCount = 0 } = {}) {
  await seedDashboard(page);
  await page.evaluate(async summaryCount => {
    const { createIndexedDbStorage } = await import('./src/data/indexeddb/indexeddb-storage.js');
    const { createGoodsTypeRecord } = await import('./src/data/models/goods-type.js');
    const { createBuiltInFieldDefinitions } = await import('./src/data/models/built-in-fields.js');
    const { createDashboardCardFixture } = await import('./test-support/dashboard-card-fixtures.js');
    const storage = createIndexedDbStorage(); await storage.initialize();
    try {
      const catalog = await storage.readDataCatalog();
      for (let index = 3; index <= 8; index++) {
        const id = `collection-${index}`;
        catalog.goodsTypes.push(createGoodsTypeRecord({ id, displayName: `Collection ${index}` }));
        catalog.fieldDefinitions.push(...createBuiltInFieldDefinitions({ goodsTypeId: id, generateId: key => `${id}-${key}` }));
      }
      catalog.dashboardCards = Array.from({ length: summaryCount }, (_, index) => createDashboardCardFixture({
        id: `summary-${index}`, title: `Summary ${index}`, position: index, displayMode: 'ring'
      }));
      await storage.replaceDataCatalog(catalog);
    } finally { storage.close(); }
  }, summaryCount);
  await page.reload();
}

async function geometry(page) {
  return page.evaluate(() => {
    const box = node => {
      const { x, y, width, height } = node.getBoundingClientRect();
      return { x, y, width, height };
    };
    return {
      tab: box(document.querySelector('.nav-item')),
      title: box(document.querySelector('.dashboard-title')),
      cards: [...document.querySelectorAll('.dashboard-cards > article')].map(box)
    };
  });
}

function expectSteady(actual, expected) {
  for (const [index, box] of [actual.tab, actual.title, ...actual.cards].entries()) {
    const original = [expected.tab, expected.title, ...expected.cards][index];
    for (const key of ['x', 'y', 'width', 'height']) expect(Math.abs(box[key] - original[key]), `${index}: ${key}`).toBeLessThan(1);
  }
}

test('height resizing keeps navigation and dashboard geometry steady across the native scrollbar threshold', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await seedLongNavigation(page);
  await addSummary(page, 'Figure count');
  await page.getByRole('checkbox', { name: 'Figures', exact: true }).check();
  await saveSummary(page);
  await expect(page.locator('.dashboard-cards [data-motion="running"]')).toHaveCount(0);
  const navigation = page.locator('.navigation-stack'), pane = page.locator('.view-panel');
  const original = await geometry(page);
  await expect.poll(() => navigation.evaluate(node => node.scrollHeight > node.clientHeight)).toBe(false);

  for (const height of [850, 800, 700, 500, 800, 1000]) {
    await page.setViewportSize({ width: 1440, height });
    expectSteady(await geometry(page), original);
  }
  await page.setViewportSize({ width: 1440, height: 600 });
  await expect.poll(() => navigation.evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true);
  expect(await navigation.evaluate(node => node.offsetWidth - node.clientWidth)).toBeGreaterThan(0);
  await navigation.evaluate(node => { node.scrollTop = 80; });
  await pane.evaluate(node => { node.scrollTop = 20; });
  await expect.poll(() => pane.evaluate(node => node.scrollTop)).toBe(20);
  const scrolled = await geometry(page);
  for (const height of [500, 450, 550, 600]) {
    await page.setViewportSize({ width: 1440, height });
    expectSteady(await geometry(page), scrolled);
    expect(await navigation.evaluate(node => node.scrollTop)).toBe(80);
    expect(await pane.evaluate(node => node.scrollTop)).toBe(20);
  }

  await page.getByRole('button', { name: 'Figures', exact: true }).click();
  const tabWidth = await page.locator('.nav-item').first().evaluate(node => node.getBoundingClientRect().width);
  for (const height of [1000, 500, 900]) {
    await page.setViewportSize({ width: 1440, height });
    expect(await page.locator('.nav-item').first().evaluate(node => node.getBoundingClientRect().width)).toBeCloseTo(tabWidth, 0);
  }

  await page.setViewportSize({ width: 390, height: 650 });
  await expect(navigation).toHaveCSS('scrollbar-gutter', 'auto');
  expect(await navigation.evaluate(node => node.offsetWidth - node.clientWidth)).toBe(0);
  await expect.poll(() => page.locator('.nav-list').evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true);
  await page.getByRole('button', { name: 'Collection 8', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Collection 8', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('deep dashboard scrolling survives viewport resizing, focus refreshes and card reflow without a top flash', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 600 });
  await seedLongNavigation(page, { summaryCount: 12 });
  await expect(page.locator('.dashboard-cards > article')).toHaveCount(13);
  const pane = page.locator('.view-panel'), navigation = page.locator('.navigation-stack');
  await expect.poll(() => pane.evaluate(node => node.scrollHeight - node.clientHeight)).toBeGreaterThan(1000);
  await pane.evaluate(node => { node.scrollTop = 450; });
  await navigation.evaluate(node => { node.scrollTop = 80; });
  await expect(page.locator('.card-readout[data-motion="running"]')).toHaveCount(0);
  await page.evaluate(() => {
    const pane = document.querySelector('.view-panel');
    window.scrollFrames = [];
    function sample() { window.scrollFrames.push(pane.scrollTop); window.scrollFrame = requestAnimationFrame(sample); }
    sample();
  });
  for (const { width, height, focus } of [
    { width: 1440, height: 550 },
    { width: 1440, height: 650, focus: true },
    { width: 1439, height: 600 },
    { width: 1440, height: 700 },
    { width: 1250, height: 550 },
    { width: 1440, height: 600 }
  ]) {
    await page.setViewportSize({ width, height });
    if (focus) await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.evaluate(async () => { for (let index = 0; index < 20; index++) await new Promise(requestAnimationFrame); });
    expect(await pane.evaluate(node => node.scrollTop)).toBe(450);
    expect(await navigation.evaluate(node => node.scrollTop)).toBe(80);
  }
  const positions = await page.evaluate(() => { cancelAnimationFrame(window.scrollFrame); return window.scrollFrames; });
  expect(Math.min(...positions)).toBe(450);
  expect(Math.max(...positions)).toBe(450);
});
