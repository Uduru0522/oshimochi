const { test, expect } = require('./fixtures.js');
const { seedDashboard, addSummary, saveSummary, summary } = require('./helpers/dashboard.js');

async function gateReads(page) {
  await page.addInitScript(() => {
    window.dashboardPendingReads = new Map();
    window.dashboardCompletedReads = [];
    window.dashboardReadGate = card => {
      if (card.title !== window.dashboardBlockedTitle) return;
      return new Promise((resolve, reject) => window.dashboardPendingReads.set(card.title, { resolve, reject }));
    };
  });
  await page.route('**/src/application/dashboard/read-card.js', async route => {
    const response = await route.fetch();
    const source = (await response.text()).replace('async function readCardBreakdown(card, options) {',
      'async function readCardBreakdown(card, options) { await globalThis.dashboardReadGate?.(card);')
      .replace('return calculateDashboardBreakdown(definition, collections, options);',
        'const result = calculateDashboardBreakdown(definition, collections, options); globalThis.dashboardCompletedReads.push(card.title); return result;');
    await route.fulfill({ response, body: source });
  });
}

test('preview generations discard late results and clear failed results before allowing a save', async ({ page }) => {
  await gateReads(page); await seedDashboard(page);
  await page.evaluate(() => { window.dashboardBlockedTitle = 'Slow'; });
  await addSummary(page, 'Slow');
  await page.getByRole('checkbox', { name: 'Figures', exact: true }).check();
  await expect.poll(() => page.evaluate(() => window.dashboardPendingReads.has('Slow'))).toBe(true);
  await expect(page.getByRole('button', { name: 'Save card', exact: true })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Card name', exact: true }).fill('Current');
  await page.getByRole('checkbox', { name: 'Tapestries', exact: true }).check();
  await expect(page.locator('#dashboard-preview-value .value-number')).toHaveText('5');
  await page.evaluate(() => { window.dashboardPendingReads.get('Slow').resolve(); });
  await expect.poll(() => page.evaluate(() => window.dashboardCompletedReads.includes('Slow'))).toBe(true);
  await expect(page.locator('#dashboard-preview-value .value-number')).toHaveText('5');
  await expect(page.locator('#dashboard-preview-title')).toHaveText('Current');

  await page.evaluate(() => { window.dashboardBlockedTitle = 'Broken'; });
  await page.getByRole('textbox', { name: 'Card name', exact: true }).fill('Broken');
  await expect.poll(() => page.evaluate(() => window.dashboardPendingReads.has('Broken'))).toBe(true);
  await page.evaluate(() => { window.dashboardPendingReads.get('Broken').reject(new Error('Preview read failed')); });
  await expect(page.locator('#dashboard-preview-value')).toHaveText('—');
  await expect(page.locator('#dashboard-preview-guidance')).toHaveText('Could not load the preview. Change a setting to try again.');
  await expect(page.getByRole('button', { name: 'Save card', exact: true })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Card name', exact: true }).fill('Recovered');
  await expect(page.locator('#dashboard-preview-value .value-number')).toHaveText('5');
  await saveSummary(page); await expect(summary(page, 'Recovered').locator('.value-number')).toHaveText('5');
});

test('closing an editor invalidates pending errors without contaminating the next session', async ({ page }) => {
  await gateReads(page); await seedDashboard(page);
  await page.evaluate(() => { window.dashboardBlockedTitle = 'Old session'; });
  await addSummary(page, 'Old session');
  await page.getByRole('checkbox', { name: 'Figures', exact: true }).check();
  await expect.poll(() => page.evaluate(() => window.dashboardPendingReads.has('Old session'))).toBe(true);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('#dashboard-editor')).not.toBeVisible();
  await addSummary(page, 'New session');
  await page.getByRole('checkbox', { name: 'Figures', exact: true }).check();
  await expect(page.locator('#dashboard-preview-value .value-number')).toHaveText('3');
  await page.evaluate(() => { window.dashboardPendingReads.get('Old session').reject(new Error('Late old error')); });
  await expect(page.locator('#dashboard-preview-guidance')).toBeHidden();
  await expect(page.locator('#dashboard-preview-title')).toHaveText('New session');
  await saveSummary(page); await expect(summary(page, 'New session')).toBeVisible();
  await expect(summary(page, 'Old session')).toHaveCount(0);
});

test('a pending dashboard refresh creates no partial readouts and cannot render after leaving the view', async ({ page }) => {
  await gateReads(page);
  await page.route('**/src/views/dashboard/card-readout.js', async route => {
    const response = await route.fetch();
    const source = (await response.text()).replace("  const wrapper = element('div', '', 'card-readout');",
      "  globalThis.dashboardCreatedReadouts?.push(card.title); const wrapper = element('div', '', 'card-readout');");
    await route.fulfill({ response, body: source });
  });
  await seedDashboard(page);
  for (const title of ['First card', 'Deferred card']) {
    await addSummary(page, title); await page.getByRole('checkbox', { name: 'Figures', exact: true }).check(); await saveSummary(page);
  }
  await page.getByRole('button', { name: 'Figures', exact: true }).click();
  await page.evaluate(() => {
    window.dashboardCreatedReadouts = []; window.dashboardCompletedReads = [];
    window.dashboardBlockedTitle = 'Deferred card';
  });
  await page.getByRole('button', { name: 'My collection', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.dashboardPendingReads.has('Deferred card'))).toBe(true);
  expect(await page.evaluate(() => window.dashboardCreatedReadouts)).toEqual([]);
  await page.getByRole('button', { name: 'Figures', exact: true }).click();
  await expect(page.locator('.dashboard-view')).toHaveCount(0);
  await page.evaluate(() => { window.dashboardPendingReads.get('Deferred card').resolve(); });
  await expect.poll(() => page.evaluate(() => window.dashboardCompletedReads.includes('Deferred card'))).toBe(true);
  expect(await page.evaluate(() => window.dashboardCreatedReadouts)).toEqual([]);
  await expect(page.getByRole('button', { name: 'Figures', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.evaluate(() => { window.dashboardBlockedTitle = ''; });
  await page.getByRole('button', { name: 'My collection', exact: true }).click();
  for (const title of ['First card', 'Deferred card']) await expect(summary(page, title).locator('.value-number')).toHaveText('3');
});
