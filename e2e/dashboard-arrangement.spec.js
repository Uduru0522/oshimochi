const { test, expect } = require('./fixtures.js');
const { seedDashboard, addSummary, saveSummary, summary, enterArrangement } = require('./helpers/dashboard.js');

const titles = page => page.locator('.dashboard-cards > article:not([data-card-exiting]) h3');
async function seedCards(page) {
  await seedDashboard(page);
  for (const title of ['Alpha', 'Beta']) {
    await addSummary(page, title); await page.getByRole('checkbox', { name: 'Figures', exact: true }).check(); await saveSummary(page);
  }
}
async function settled(page) {
  await expect.poll(() => page.locator('.dashboard-cards').evaluate(container => [...container.children].flatMap(card => card.getAnimations())
    .filter(animation => animation.effect.getKeyframes().some(frame => frame.width)).length)).toBe(0);
}
async function storedIds(page) {
  return page.evaluate(async () => {
    const { createIndexedDbStorage } = await import('./src/data/indexeddb/indexeddb-storage.js');
    const storage = createIndexedDbStorage(); await storage.initialize();
    try { return (await storage.listDashboardCards()).map(card => card.id); } finally { storage.close(); }
  });
}

async function placements(page) {
  return page.locator('.dashboard-cards').evaluate(container => {
    const origin = container.getBoundingClientRect();
    return [...container.querySelectorAll(':scope > article:not([data-card-exiting])')].map(card => {
      const box = card.getBoundingClientRect();
      return { id: card.dataset.cardId, left: card.style.left, top: card.style.top,
        x: box.x - origin.x + (box.width - card.offsetWidth) / 2,
        y: box.y - origin.y + (box.height - card.offsetHeight) / 2, width: card.offsetWidth, height: card.offsetHeight };
    });
  });
}

test('window focus refreshes quietly without moving unchanged cards', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 450 });
  await seedCards(page); await settled(page);
  for (const [scrollTop, height] of [[0, 450], [80, 500], [40, 550]]) {
    await page.locator('.view-panel').evaluate((node, value) => { node.scrollTop = value; }, scrollTop);
    await page.setViewportSize({ width: 1440, height });
    const result = await page.evaluate(async () => {
      const status = document.querySelector('#dashboard-status'), card = document.querySelector('.dashboard-cards > article');
      let shown = false;
      const observer = new MutationObserver(() => { if (!status.hidden) shown = true; });
      observer.observe(status, { attributes: true, attributeFilter: ['hidden'] });
      const before = card.getBoundingClientRect(), frames = [];
      window.dispatchEvent(new Event('focus'));
      for (let frame = 0; frame < 24; frame++) {
        await new Promise(requestAnimationFrame);
        const box = card.getBoundingClientRect(); frames.push(Math.hypot(box.x - before.x, box.y - before.y));
      }
      observer.disconnect(); return { shown, maximum: Math.max(...frames) };
    });
    expect(result.shown).toBe(false); expect(result.maximum).toBeLessThan(1);
  }
  await page.evaluate(async () => {
    const { createIndexedDbStorage } = await import('./src/data/indexeddb/indexeddb-storage.js');
    const storage = createIndexedDbStorage(); await storage.initialize();
    try {
      const cards = await storage.listDashboardCards();
      await storage.replaceDashboardCards({ cards: cards.map(card => card.title === 'Alpha' ? { ...card, title: 'Updated elsewhere' } : card), expectedCards: cards });
    } finally { storage.close(); }
    window.dispatchEvent(new Event('focus'));
  });
  await expect(summary(page, 'Updated elsewhere')).toBeVisible();
});

test('mixed-height card positions match the saved view and the drag preview stays anchored while scrolling', async ({ page }) => {
  await seedCards(page);
  await addSummary(page, 'Breakdown');
  await page.getByRole('checkbox', { name: 'Figures', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Tapestries', exact: true }).check(); await saveSummary(page);
  for (const width of [1440, 1000, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await enterArrangement(page, 'Recent items'); await settled(page);
    const handle = page.getByRole('button', { name: 'Rearrange Recent items', exact: true });
    await handle.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
    const source = await summary(page, 'Recent items').boundingBox(), grip = await handle.boundingBox();
    const start = { x: grip.x + grip.width / 2, y: grip.y + grip.height / 2 };
    await page.mouse.move(start.x, start.y); await page.mouse.down();
    for (const [dx, dy] of [[12, 12], [45, 55], [-10, 30]]) {
      await page.mouse.move(start.x + dx, start.y + dy);
      await expect(page.locator('.dashboard-drag-ghost')).toHaveCount(1);
      await expect.poll(() => page.locator('.dashboard-drag-ghost').evaluate((node, { source, dx, dy }) => {
        const box = node.getBoundingClientRect();
        return Math.hypot(box.x + (box.width - node.offsetWidth) / 2 - source.x - dx,
          box.y + (box.height - node.offsetHeight) / 2 - source.y - dy);
      }, { source, dx, dy })).toBeLessThan(3);
    }
    await expect(page.locator('.dashboard-drag-ghost .dashboard-drag-placeholder')).toBeVisible();
    await expect(page.locator('.dashboard-drag-ghost img, .dashboard-drag-ghost svg')).toHaveCount(0);
    await page.locator('.view-panel').evaluate(node => { node.scrollTop += 150; });
    await page.mouse.move(start.x + 30, start.y + 40);
    await expect.poll(() => page.locator('.dashboard-drag-ghost').evaluate((node, source) => {
      const box = node.getBoundingClientRect();
      return Math.abs(box.y + (box.height - node.offsetHeight) / 2 - source.y - 40);
    }, source)).toBeLessThan(3);
    await page.keyboard.press('Escape'); await page.mouse.up(); await settled(page);
    const move = page.getByRole('button', { name: 'Rearrange Breakdown', exact: true });
    await move.focus(); await move.press('ArrowLeft'); await settled(page);
    const draft = await placements(page);
    await page.getByRole('button', { name: 'Save order', exact: true }).click();
    await expect(page.locator('#dashboard-arrange-bar')).not.toBeVisible(); await settled(page);
    const saved = await placements(page);
    expect(saved.map(({ id, left, top, width, height }) => ({ id, left, top, width, height })))
      .toEqual(draft.map(({ id, left, top, width, height }) => ({ id, left, top, width, height })));
    for (let index = 0; index < draft.length; index++) {
      expect(Math.abs(saved[index].x - draft[index].x)).toBeLessThan(2);
      expect(Math.abs(saved[index].y - draft[index].y)).toBeLessThan(2);
    }
  }
});

test('arrangement drafts preserve nodes and storage until saved, and Cancel restores the previous order', async ({ page }) => {
  await seedCards(page); const before = await storedIds(page);
  await page.locator('.dashboard-cards').evaluate(container => { window.originalCards = [...container.querySelectorAll(':scope > article')]; });
  await expect(page.getByRole('button', { name: 'Rearrange cards', exact: true, includeHidden: true })).toHaveCount(3);
  await enterArrangement(page, 'Beta'); await settled(page);
  await expect(page.locator('.card-drag-handle:visible')).toHaveCount(3);
  await expect(summary(page, 'Beta')).toHaveCSS('animation-name', 'dashboard-card-wiggle');
  const handle = page.getByRole('button', { name: 'Rearrange Beta', exact: true });
  await handle.focus(); await handle.press('ArrowLeft');
  await expect(titles(page)).toHaveText(['Recent items', 'Beta', 'Alpha']);
  expect(await storedIds(page)).toEqual(before);
  expect(await page.evaluate(() => window.originalCards.every(card => card.isConnected))).toBe(true);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(titles(page)).toHaveText(['Recent items', 'Alpha', 'Beta']); expect(await storedIds(page)).toEqual(before);
  await enterArrangement(page, 'Beta'); await handle.focus(); await handle.press('ArrowUp');
  await expect(titles(page)).toHaveText(['Beta', 'Recent items', 'Alpha']);
  await page.getByRole('button', { name: 'Save order', exact: true }).click();
  await expect(page.locator('#dashboard-arrange-bar')).not.toBeVisible();
  expect(await page.evaluate(() => window.originalCards.every(card => card.isConnected))).toBe(true);
  const expected = await page.locator('.dashboard-cards > article').evaluateAll(cards => cards.map(card => card.dataset.cardId));
  expect(await storedIds(page)).toEqual(expected);
  await page.reload(); await expect(titles(page)).toHaveText(['Beta', 'Recent items', 'Alpha']);
  await page.emulateMedia({ reducedMotion: 'reduce' }); await enterArrangement(page, 'Beta');
  await expect(summary(page, 'Beta')).toHaveCSS('animation-name', 'none');
  await page.keyboard.press('Escape'); await expect(page.locator('#dashboard-arrange-bar')).not.toBeVisible();
});

test('mouse dragging moves retained cards, and adding or removing cards animates without rebuilding their neighbors', async ({ page }) => {
  await seedCards(page); await enterArrangement(page, 'Beta'); await settled(page);
  const source = await page.getByRole('button', { name: 'Rearrange Beta', exact: true }).boundingBox();
  const target = await summary(page, 'Recent items').boundingBox();
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2); await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + 30, { steps: 8 });
  await expect(page.locator('.dashboard-drag-ghost')).toHaveCount(1);
  await page.keyboard.press('Escape'); await page.mouse.up();
  await expect(page.locator('.dashboard-drag-ghost')).toHaveCount(0);
  await expect(page.locator('#dashboard-arrange-bar')).toBeVisible();
  await expect(titles(page)).toHaveText(['Recent items', 'Alpha', 'Beta']);
  await settled(page);
  const retrySource = await page.getByRole('button', { name: 'Rearrange Beta', exact: true }).boundingBox();
  const retryTarget = await summary(page, 'Recent items').boundingBox();
  await page.mouse.move(retrySource.x + retrySource.width / 2, retrySource.y + retrySource.height / 2); await page.mouse.down();
  await page.mouse.move(retryTarget.x + retryTarget.width / 2, retryTarget.y + 30, { steps: 8 });
  await expect(page.locator('.dashboard-drag-ghost')).toHaveCount(1);
  await page.mouse.up(); await expect(page.locator('.dashboard-drag-ghost')).toHaveCount(0);
  await expect(titles(page)).toHaveText(['Beta', 'Recent items', 'Alpha']);
  await page.getByRole('button', { name: 'Save order', exact: true }).click();
  await expect(page.locator('#dashboard-arrange-bar')).not.toBeVisible(); await settled(page);
  await page.locator('.dashboard-cards').evaluate(container => {
    window.retainedCards = [...container.querySelectorAll(':scope > article')];
    window.entrySeen = window.exitSeen = false;
    window.cardMutationObserver = new MutationObserver(() => {
      const card = [...container.children].find(card => card.getAttribute('aria-label') === 'Gamma');
      if (!card) return;
      if (card.dataset.cardExiting) window.exitSeen = card.getAnimations().some(animation => animation.effect.getKeyframes().at(-1).opacity === '0');
      else if (card.getAnimations().some(animation => animation.effect.getKeyframes()[0].opacity === '0')) window.entrySeen = true;
    });
    window.cardMutationObserver.observe(container, { childList: true, attributes: true, subtree: true });
  });
  await addSummary(page, 'Gamma'); await page.getByRole('checkbox', { name: 'Figures', exact: true }).check(); await saveSummary(page);
  await expect.poll(() => page.evaluate(() => window.entrySeen)).toBe(true);
  expect(await page.evaluate(() => window.retainedCards.every(card => card.isConnected))).toBe(true);
  await summary(page, 'Gamma').locator('summary').click(); page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Remove Gamma', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.exitSeen)).toBe(true);
  await expect(summary(page, 'Gamma')).toHaveCount(0);
  expect(await page.evaluate(() => window.retainedCards.every(card => card.isConnected))).toBe(true);
  await page.evaluate(() => window.cardMutationObserver.disconnect());
});

test.describe('touch card arrangement', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('a touch drag rearranges cards in a narrow layout and cancellation leaves saved order intact', async ({ page }) => {
    await seedCards(page); const before = await storedIds(page);
    await enterArrangement(page, 'Beta'); await settled(page);
    const handle = page.getByRole('button', { name: 'Rearrange Beta', exact: true });
    await handle.evaluate(node => node.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' }));
    const source = await handle.boundingBox(), target = await summary(page, 'Alpha').boundingBox();
    const client = await page.context().newCDPSession(page);
    const start = { x: source.x + source.width / 2, y: source.y + source.height / 2 };
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x + 8, y: start.y - 8 }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: target.x + target.width / 2, y: Math.max(20, target.y + 30) }] });
    await expect(page.locator('.dashboard-drag-ghost')).toHaveCount(1);
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.locator('.dashboard-drag-ghost')).toHaveCount(0);
    await expect(titles(page)).toHaveText(['Recent items', 'Beta', 'Alpha']);
    expect(await storedIds(page)).toEqual(before);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(titles(page)).toHaveText(['Recent items', 'Alpha', 'Beta']); expect(await storedIds(page)).toEqual(before);
    await client.detach();
  });
});
