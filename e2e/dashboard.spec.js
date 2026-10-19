const { test, expect } = require("./fixtures.js");
const { seedDashboard, addSummary, saveSummary, summary, editSummary, enterArrangement, reorderCards } = require("./helpers/dashboard.js");

async function ringStrokePoint(segment, radiusOverride = null) {
  await segment.scrollIntoViewIfNeeded();
  return segment.evaluate((node, radiusOverride) => {
    const angle = Number(node.dataset.midAngle), radius = radiusOverride ?? Number(node.dataset.hitRadius);
    const point = new DOMPoint(100 + radius * Math.cos(angle), 100 + radius * Math.sin(angle)).matrixTransform(node.getScreenCTM());
    return { x: point.x, y: point.y };
  }, radiusOverride);
}

async function ringBandWidth(segment) {
  return segment.evaluate(node => {
    const radii = [...node.getAttribute('d').matchAll(/A ([\d.]+)/g)].map(match => Number(match[1]));
    return Math.max(...radii) - Math.min(...radii);
  });
}

test("fresh dashboard is read-only and offers a collection creation path", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator(".dashboard-title")).toHaveText("My collection");
  await expect(page.locator("#dashboard-item-count")).toHaveText("0");
  await expect(summary(page, "Recent items")).toContainText("No items yet.");
  expect(await page.evaluate(async () => {
    const { createIndexedDbStorage } = await import("./src/data/indexeddb/indexeddb-storage.js");
    const storage = createIndexedDbStorage(); await storage.initialize();
    try { return await storage.listDashboardCards(); } finally { storage.close(); }
  })).toEqual([]);
  await page.getByRole("button", { name: "Create a collection", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add goods type", exact: true })).toBeVisible();
});

test("summary editor selects different numeric fields per collection and preserves units, display, and drafts", async ({ page }) => {
  await seedDashboard(page);
  await addSummary(page, "Total spent", "sum");
  await page.getByRole("checkbox", { name: "Figures", exact: true }).check();
  await page.getByRole("combobox", { name: "Number field in Figures", exact: true }).selectOption("figures-price");
  await page.getByRole("checkbox", { name: "Tapestries", exact: true }).check();
  await page.getByRole("combobox", { name: "Number field in Tapestries", exact: true }).selectOption("tapestries-cost");
  await page.getByRole("radiogroup", { name: "Unit", exact: true }).getByRole("radio", { name: "¥ — Yen", exact: true }).check();
  await expect(page.locator("#dashboard-preview-value .value-number")).toHaveText("5,700");
  await page.evaluate(() => {
    window.defaultRingRevealStarted = false;
    window.defaultRingRevealObserver = new MutationObserver(() => {
      if (document.querySelector('.summary-card[aria-label="Total spent"] .card-readout[data-motion="running"]')) window.defaultRingRevealStarted = true;
    });
    window.defaultRingRevealObserver.observe(document.body, { childList: true, attributes: true, subtree: true, attributeFilter: ['data-motion'] });
  });
  await saveSummary(page);
  await expect.poll(() => page.evaluate(() => window.defaultRingRevealStarted)).toBe(true);
  await page.evaluate(() => window.defaultRingRevealObserver.disconnect());
  const card = summary(page, "Total spent");
  await expect(card.locator(".ring-segment")).toHaveCount(2);
  await expect(card.locator(".value-unit")).toHaveText("¥");
  await expect(card.getByRole("button", { name: "Figures: ¥1,200 (21.1%)", exact: true })).toBeVisible();
  await expect(card.getByRole("button", { name: "Tapestries: ¥4,500 (78.9%)", exact: true })).toBeVisible();
  await card.locator("summary").click(); await page.getByRole("button", { name: "Details for Total spent", exact: true }).click();
  await expect(page.locator("#dashboard-details-body")).toContainText("4 of 5 matching items have a value.");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await editSummary(page, "Total spent");
  await page.getByRole("radiogroup", { name: "Display", exact: true }).getByRole("radio", { name: "Number only", exact: true }).check();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(card.locator(".ring")).toHaveCount(1);
  await editSummary(page, "Total spent");
  await page.getByRole("radiogroup", { name: "Display", exact: true }).getByRole("radio", { name: "Number only", exact: true }).check();
  await saveSummary(page, "Save changes"); await page.reload();
  await expect(card.locator(".value-number")).toHaveText("5,700"); await expect(card.locator(".ring")).toHaveCount(0);
  expect((await card.boundingBox()).height).toBeLessThan(210);
});

test("summary editor exposes fixed choices and keeps preset, custom, and deleted-item settings usable", async ({ page }) => {
  await seedDashboard(page);
  await addSummary(page, "Unit choices");
  const editor = page.locator("#dashboard-editor");
  const calculation = editor.getByRole("radiogroup", { name: "What would you like to calculate?", exact: true });
  for (const label of ["Total (sum)", "Number of items", "Average", "Lowest value", "Highest value"]) {
    await expect(calculation.getByRole("radio", { name: label, exact: true })).toBeVisible();
  }
  const unit = editor.getByRole("radiogroup", { name: "Unit", exact: true });
  await expect(unit.getByRole("radio")).toHaveCount(5);
  for (const label of ["No unit", "¥ — Yen", "$ — Dollar", "NTD — Taiwan dollar", "Custom..."]) {
    await expect(unit.getByRole("radio", { name: label, exact: true })).toBeVisible();
  }
  const custom = editor.getByRole("textbox", { name: "Custom unit", exact: true });
  await expect(custom).toBeVisible(); await expect(custom).toBeDisabled();
  await page.getByRole("checkbox", { name: "Figures", exact: true }).check();
  await expect(editor.getByRole("combobox")).toHaveCount(0);
  const source = editor.locator('.collection-source[data-collection="figures"]');
  const filters = source.getByRole("button", { name: "Filter items (optional)", exact: true });
  await expect(filters).toHaveAttribute("aria-expanded", "false");
  const [checkboxBox, filtersBox] = await Promise.all([source.getByRole("checkbox", { name: "Figures", exact: true }).boundingBox(), filters.boundingBox()]);
  expect(Math.abs(checkboxBox.y + checkboxBox.height / 2 - filtersBox.y - filtersBox.height / 2)).toBeLessThan(5);
  const [groupingBox, displayBox] = await Promise.all([
    editor.getByRole("radiogroup", { name: "Break down by", exact: true }).boundingBox(),
    editor.getByRole("radiogroup", { name: "Display", exact: true }).boundingBox()
  ]);
  expect(Math.abs(groupingBox.y - displayBox.y)).toBeLessThan(2);
  await unit.getByRole("radio", { name: "NTD — Taiwan dollar", exact: true }).check();
  await expect(custom).toBeDisabled();
  await expect(editor.getByRole("radio", { name: "Before the number", exact: true })).toBeChecked();
  await saveSummary(page); await page.reload();
  const card = summary(page, "Unit choices");
  await expect(card.locator(".value-unit")).toHaveText("NTD");
  await expect(card.locator(".value-number")).toHaveText("3");
  await expect(card.locator(".value-unit + .value-number")).toHaveCount(1);
  await editSummary(page, "Unit choices");
  await expect(unit.getByRole("radio", { name: "NTD — Taiwan dollar", exact: true })).toBeChecked();
  await unit.getByRole("radio", { name: "Custom...", exact: true }).check();
  await expect(custom).toBeEnabled(); await custom.fill("冊");
  await editor.getByRole("radio", { name: "After the number", exact: true }).check();
  await editor.getByRole("checkbox", { name: "Include deleted items", exact: true }).check();
  await expect(page.locator("#dashboard-preview-value .value-number")).toHaveText("4");
  await saveSummary(page, "Save changes"); await page.reload();
  await expect(card.locator(".value-number")).toHaveText("4");
  await expect(card.locator(".value-number + .value-unit")).toHaveText("冊");
  await editSummary(page, "Unit choices");
  await expect(unit.getByRole("radio", { name: "Custom...", exact: true })).toBeChecked();
  await expect(custom).toHaveValue("冊");
  await expect(editor.getByRole("checkbox", { name: "Include deleted items", exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
});

test("long custom units wrap to one ellipsized line for ring and number cards in either position", async ({ page }) => {
  await seedDashboard(page); await addSummary(page, "Long unit");
  await page.getByRole("checkbox", { name: "Figures", exact: true }).check();
  const unitText = 'W'.repeat(32);
  await page.getByRole("radiogroup", { name: "Unit", exact: true }).getByRole("radio", { name: "Custom...", exact: true }).check();
  await page.getByRole("textbox", { name: "Custom unit", exact: true }).fill(unitText);
  await saveSummary(page);
  const card = summary(page, "Long unit");
  for (const display of ['Number only', 'Ring']) {
    for (const position of ['Before the number', 'After the number']) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await editSummary(page, "Long unit");
      await page.getByRole("radiogroup", { name: "Display", exact: true }).getByRole("radio", { name: display, exact: true }).check();
      await page.getByRole("radiogroup", { name: "Unit position", exact: true }).getByRole("radio", { name: position, exact: true }).check();
      await saveSummary(page, "Save changes");
      await expect(card.locator('.card-readout')).toHaveAttribute('data-motion', 'done');
      await expect(card.locator('.value-unit')).toHaveAttribute('title', unitText);
      await expect(card.locator('.value-display')).toHaveAttribute('aria-label', position === 'Before the number' ? `${unitText}3` : `3 ${unitText}`);
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await expect.poll(() => card.evaluate(node => node.getAnimations().length)).toBe(0);
        const layout = await card.locator('.value-display').evaluate((node, prefix) => {
          const unit = node.querySelector('.value-unit'), number = node.querySelector('.value-number');
          const unitBox = unit.getBoundingClientRect(), numberBox = number.getBoundingClientRect(), box = node.getBoundingClientRect();
          const style = getComputedStyle(unit);
          return { singleLine: unitBox.height <= parseFloat(style.lineHeight) + 1,
            truncated: unit.scrollWidth > unit.clientWidth, ellipsis: style.textOverflow,
            separateLine: prefix ? unitBox.bottom <= numberBox.top : unitBox.top >= numberBox.bottom,
            contained: unitBox.left >= box.left - 1 && unitBox.right <= box.right + 1,
            overflow: document.documentElement.scrollWidth > innerWidth };
        }, position === 'Before the number');
        expect(layout).toEqual({ singleLine: true, truncated: true, ellipsis: 'ellipsis', separateLine: true, contained: true, overflow: false });
      }
    }
  }
});

test("saved filters include categories, false, numeric zero and relative dates", async ({ page }) => {
  await seedDashboard(page);
  await addSummary(page, "This year", "sum");
  await page.getByRole("checkbox", { name: "Figures", exact: true }).check();
  await page.getByRole("combobox", { name: "Number field in Figures", exact: true }).selectOption("figures-price");
  const source = page.locator('.collection-source[data-collection="figures"]');
  await source.getByText("Filter items (optional)", { exact: true }).click();
  await source.getByRole("combobox", { name: "Add field filter", exact: true }).selectOption("figures-purchased");
  await source.getByRole("combobox", { name: "Date period", exact: true }).selectOption("this-year");
  await source.getByRole("combobox", { name: "Add field filter", exact: true }).selectOption("figures-owned");
  await source.getByRole("checkbox", { name: "Not owned", exact: true }).check();
  await expect(page.locator("#dashboard-preview-value .value-number")).toHaveText("0");
  await saveSummary(page);
  await page.reload(); await expect(summary(page, "This year").locator(".value-number")).toHaveText("0");
  await editSummary(page, "This year");
  await page.getByRole("radiogroup", { name: "What would you like to calculate?", exact: true }).getByRole("radio", { name: "Number of items", exact: true }).check();
  await source.getByText("Filters applied", { exact: true }).click();
  await expect(source.getByRole("combobox", { name: "Date period", exact: true })).toHaveValue("this-year");
  await source.getByRole("combobox", { name: "Add field filter", exact: true }).selectOption("figures-status");
  await source.getByRole("checkbox", { name: "Wanted", exact: true }).check();
  await expect(page.locator("#dashboard-preview-value .value-number")).toHaveText("1");
  await saveSummary(page, "Save changes");
  await expect(summary(page, "This year").locator(".value-number")).toHaveText("1");
});

test("recent items show newest creations, open details, and can be hidden, reordered, and restored", async ({ page }) => {
  await seedDashboard(page); const recent = summary(page, "Recent items");
  await expect(recent.locator(".recent-item-row")).toHaveCount(5);
  await expect(recent.locator(".recent-item-name")).toHaveText(["Concert tapestry", "Summer tapestry", "Desk figure", "Mini figure", "Limited edition figure"]);
  await recent.getByRole("button", { name: "Open Limited edition figure in Figures", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Limited edition figure", exact: true })).toBeVisible();
  await expect(page.locator(".item-detail-values")).toContainText("Purchase price");
  await page.getByRole("button", { name: "Close item details", exact: true }).click();
  await addSummary(page, "Figures"); await page.getByRole("checkbox", { name: "Figures", exact: true }).check(); await saveSummary(page);
  await reorderCards(page, ['Figures', 'Recent items']);
  await expect(page.locator(".dashboard-cards article h3")).toHaveText(["Figures", "Recent items"]);
  await recent.locator("summary").click(); await page.getByRole("button", { name: "Hide Recent items", exact: true }).click();
  await expect(recent).toHaveCount(0);
  await page.reload(); await expect(page.locator("#dashboard-item-count")).toHaveText("5"); await expect(recent).toHaveCount(0);
  await page.getByRole("button", { name: "Add card", exact: true }).click(); await page.getByRole("button", { name: "Recent items", exact: true }).click();
  await expect(recent.locator(".recent-item-row")).toHaveCount(5);
  await page.getByRole("button", { name: "Administration", exact: true }).click(); await page.getByRole("button", { name: "My collection", exact: true }).click();
  await expect(page.locator(".dashboard-cards article h3")).toHaveText(["Figures", "Recent items"]);
});

test("unavailable fields have named repair actions and accept a replacement field", async ({ page }) => {
  await seedDashboard(page, { repair: true });
  const card = summary(page, "Spending");
  await expect(card).toContainText('“Purchase price” is no longer available in “Figures”.');
  await expect(card.locator(".value-number")).toHaveText("—");
  await editSummary(page, "Spending");
  await page.getByRole("combobox", { name: "Number field in Figures", exact: true }).selectOption("figures-shipping");
  await saveSummary(page, "Save changes"); await expect(card.locator(".value-number")).toHaveText("180");
});

test("debug dashboard edits remain temporary and never create a user database", async ({ page }) => {
  await page.goto("./?debug=1"); await expect(summary(page, "Recent items").locator(".recent-item-row")).toHaveCount(5);
  await addSummary(page, "Debug count"); await page.getByRole("checkbox", { name: "Tapestries", exact: true }).check(); await saveSummary(page);
  expect(await page.evaluate(async () => (await indexedDB.databases()).map(({ name }) => name))).not.toContain("oshimochi");
  await page.reload(); await expect(summary(page, "Debug count")).toHaveCount(0);
  await page.goto("./"); await expect(page.locator("#dashboard-item-count")).toHaveText("0"); await expect(summary(page, "Debug count")).toHaveCount(0);
});

test("failed dashboard reads show an honest retry state and leave storage unchanged", async ({ page }) => {
  await page.addInitScript(() => { window.failDashboardRead = true; });
  await page.route("**/src/application/dashboard/read-card.js", async route => {
    const response = await route.fetch();
    const source = (await response.text()).replace('async function readOverview() {', 'async function readOverview() { if (globalThis.failDashboardRead) throw new Error("Read failure");');
    await route.fulfill({ response, body: source });
  });
  await page.goto("./");
  await expect(page.getByText("Could not load your collection. Your data has not been changed.", { exact: true })).toBeVisible();
  await expect(page.locator(".dashboard-view .stats")).not.toBeVisible();
  await page.evaluate(() => { window.failDashboardRead = false; });
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator("#dashboard-item-count")).toHaveText("0");
  await expect(summary(page, "Recent items")).toContainText("No items yet.");
});

test("dashboard cards remain usable offline with cached main-app assets", async ({ page, context }) => {
  await seedDashboard(page);
  await addSummary(page, "Offline total", "count");
  await page.getByRole("checkbox", { name: "Figures", exact: true }).check(); await saveSummary(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }));
  });
  await context.setOffline(true);
  try {
    await page.reload(); await expect(summary(page, "Offline total").locator(".value-number")).toHaveText("3");
    await editSummary(page, "Offline total");
    await page.getByRole("textbox", { name: "Card name", exact: true }).fill("Offline renamed");
    await saveSummary(page, "Save changes");
    await expect(summary(page, "Offline renamed").locator(".value-number")).toHaveText("3");
  } finally { await context.setOffline(false); }
});

test("dashboard editor and category labels are translated and fit narrow screens", async ({ page }) => {
  await seedDashboard(page);
  for (const [language, dashboardTitle, recentTitle, addLabel, summaryLabel, editorTitle, nameLabel, cancelLabel, categoryLabel, countLabel] of [
    ["ja", "マイコレクション", "最近追加したアイテム", "カードを追加", "集計カード", "集計カードを追加", "カード名", "キャンセル", "カテゴリ項目", "アイテム数"],
    ["zh-Hant", "我的收藏", "最近新增的物品", "新增卡片", "摘要卡片", "新增摘要卡片", "卡片名稱", "取消", "分類欄位", "物品數量"]
  ]) {
    await page.evaluate(language => localStorage.setItem("oshimochi.language", language), language); await page.reload();
    await expect(page.locator(".dashboard-title")).toHaveText(dashboardTitle);
    await expect(page.getByRole("button", { name: dashboardTitle, exact: true })).toHaveAttribute("aria-current", "page");
    await expect(summary(page, recentTitle).locator(".recent-item-row")).toHaveCount(5);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: addLabel, exact: true }).click();
    await page.getByRole("button", { name: summaryLabel, exact: true }).click();
    await expect(page.getByRole("dialog", { name: editorTitle, exact: true })).toBeVisible();
    await page.getByRole("textbox", { name: nameLabel, exact: true }).fill("Localized");
    await page.getByRole("radio", { name: countLabel, exact: true }).check();
    await page.getByRole("checkbox", { name: "Figures", exact: true }).check();
    await page.getByRole("radio", { name: categoryLabel, exact: true }).check();
    await expect(page.getByRole("combobox", { name: new RegExp(categoryLabel) })).toBeVisible();
    expect(await page.locator('#dashboard-editor').evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    await expect(page.getByRole("button", { name: cancelLabel, exact: true })).toBeInViewport();
    await page.getByRole("button", { name: cancelLabel, exact: true }).click();
    await expect(page.locator('#dashboard-editor')).not.toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("category rings use accent shades with neutral numbers and compact automatic cards", async ({ page }) => {
  await seedDashboard(page); await addSummary(page, "Ownership");
  await page.getByRole("radiogroup", { name: "Break down by", exact: true }).getByRole("radio", { name: "A category field", exact: true }).check();
  await page.getByRole("checkbox", { name: "Figures", exact: true }).check();
  await page.getByRole("combobox", { name: "Category field in Figures", exact: true }).selectOption("figures-status");
  await saveSummary(page);
  const ring = summary(page, "Ownership");
  await expect(ring.locator(".ring-segment")).toHaveCount(3);
  await expect(ring.getByRole("button", { name: "Uncategorized: 1 (33.3%)", exact: true })).toBeVisible();
  await expect(ring.getByRole("button", { name: /: 1 \(33\.3%\)$/ })).toHaveCount(3);
  await expect(ring.locator('.ring-chart')).toHaveAttribute('data-layout', 'interactive');
  await expect(ring.locator('.composition-legend, .ring-callout-lines')).toHaveCount(0);
  await expect(ring.locator('.ring-detail-name')).toHaveText('Owned');
  await expect(ring.locator('.ring-segment[aria-pressed="true"]')).toHaveCount(1);
  await expect(ring.locator('.ring-track')).toHaveCount(0);
  await addSummary(page, "Plain count"); await page.getByRole("checkbox", { name: "Figures", exact: true }).check(); await saveSummary(page);
  const plain = summary(page, "Plain count"); await expect(plain.locator(".ring")).toHaveCount(0);
  expect((await plain.boundingBox()).height / (await ring.boundingBox()).height).toBeLessThan(.55);
  await page.getByRole("button", { name: "Options", exact: true }).click();
  await page.getByRole("radio", { name: "Blue", exact: true }).check(); await page.locator("#darkModeToggle").check();
  await page.getByRole("button", { name: "My collection", exact: true }).click();
  await expect(plain.locator(".value-number")).toHaveText("3");
  const colors = await page.evaluate(() => {
    const probe = document.createElement('span'); document.body.append(probe);
    probe.style.color = 'var(--text)'; const text = getComputedStyle(probe).color;
    probe.style.color = 'var(--accent-ink)'; const accent = getComputedStyle(probe).color; probe.remove();
    return { text, accent, shades: [...document.querySelectorAll('.ring-segment')].map(node => node.getAttribute('fill')) };
  });
  await expect(ring.locator('.value-number')).toHaveCSS('color', colors.text);
  await expect(plain.locator('.value-number')).toHaveCSS('color', colors.accent);
  expect(new Set(colors.shades).size).toBe(3);
  expect(colors.shades.every(color => color.includes('var(--accent)'))).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.reload();
  await expect(ring.locator('.card-readout')).toHaveAttribute('data-motion', 'done');
  await expect(ring.locator('.value-number')).toHaveText('3');
});

test("dashboard rings stay centered and long titles stay on one line at desktop and phone widths", async ({ page }) => {
  await seedDashboard(page);
  const title = 'My collection spending with a deliberately long card title that should stay on one line';
  await addSummary(page, title, 'sum');
  for (const [collection, field] of [['Figures', 'figures-price'], ['Tapestries', 'tapestries-cost']]) {
    await page.getByRole('checkbox', { name: collection, exact: true }).check();
    await page.getByRole('combobox', { name: `Number field in ${collection}`, exact: true }).selectOption(field);
  }
  await saveSummary(page);
  const card = summary(page, title);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(card.locator('.ring-chart')).toHaveAttribute('data-layout', 'interactive');
    await expect.poll(async () => card.evaluate(card => {
      const ring = card.querySelector('.ring').getBoundingClientRect(), box = card.getBoundingClientRect();
      return Math.abs((ring.left + ring.right) / 2 - (box.left + box.right) / 2);
    })).toBeLessThan(1);
    const layout = await card.evaluate(card => {
      const title = card.querySelector('h3'), styles = getComputedStyle(title);
      return { ellipsis: styles.textOverflow, wrap: styles.whiteSpace, clipped: title.scrollWidth > title.clientWidth,
        overflow: document.documentElement.scrollWidth > innerWidth };
    });
    expect(layout).toEqual({ ellipsis: 'ellipsis', wrap: 'nowrap', clipped: true, overflow: false });
    await expect(card.getByRole('button', { name: 'Figures: 1,200 (21.1%)', exact: true })).toBeVisible();
    await expect(card.getByRole('button', { name: 'Tapestries: 4,500 (78.9%)', exact: true })).toBeVisible();
    await expect(card.locator('.composition-legend, .ring-callout-lines')).toHaveCount(0);
  }
  await expect(card.locator('h3')).toHaveAttribute('title', title);
  await expect(page.locator('.dashboard-view use[href*="oshimochi"]')).toHaveCount(0);
});

test("card columns reflow smoothly without scaling type and respect reduced motion", async ({ page }) => {
  await seedDashboard(page); await addSummary(page, "Count");
  await page.getByRole("checkbox", { name: "Figures", exact: true }).check(); await saveSummary(page);
  const cards = page.locator('.dashboard-cards');
  await expect(cards).toHaveCSS('--card-columns', '3');
  await expect.poll(() => cards.evaluate(container => [...container.children].flatMap(child => child.getAnimations()).length)).toBe(0);
  await cards.evaluate(container => {
    window.cardReflows = [];
    window.cardReflowObserver = new MutationObserver(() => {
      const animations = [...container.children].flatMap(child => child.getAnimations().map(animation => animation.effect.getKeyframes()));
      window.cardReflows.push({ columns: container.style.getPropertyValue('--card-columns'), animations });
    });
    window.cardReflowObserver.observe(container, { attributes: true, attributeFilter: ['style'] });
    window.cardResizeSamples = [];
    window.cardResizeObserver = new ResizeObserver(() => {
      const scrollport = container.closest('.view-panel');
      window.cardResizeSamples.push({ columns: container.style.getPropertyValue('--card-columns'),
        boxes: [...container.children].filter(child => !child.dataset.cardExiting).map(child => {
          const box = child.getBoundingClientRect(), animation = child.getAnimations().find(animation => {
            const first = animation.effect.getKeyframes()[0]; return first.width && first.translate;
          });
          const first = animation?.effect.getKeyframes()[0];
          const current = getComputedStyle(child).translate.split(' ').map(parseFloat), start = first?.translate.split(' ').map(parseFloat) ?? [0, 0];
          return { id: child.dataset.cardId || child.id,
            x: box.left + (box.width - child.offsetWidth) / 2 + scrollport.scrollLeft - (current[0] || 0) + start[0],
            y: box.top + (box.height - child.offsetHeight) / 2 + scrollport.scrollTop - (current[1] || 0) + (start[1] || 0), width: first ? parseFloat(first.width) : box.width };
        }) });
    });
    window.cardResizeObserver.observe(container);
  });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  for (const [width, columns] of [[1220, '2'], [1440, '3'], [390, '1'], [1440, '3']]) {
    const before = await cards.evaluate(container => {
      window.cardReflows = []; window.cardResizeSamples = [];
      const scrollport = container.closest('.view-panel');
      return [...container.children].map(child => { const box = child.getBoundingClientRect();
        return { id: child.dataset.cardId || child.id, x: box.left + scrollport.scrollLeft, y: box.top + scrollport.scrollTop, width: box.width }; });
    });
    await page.setViewportSize({ width, height: 900 });
    await expect(cards).toHaveCSS('--card-columns', columns);
    await expect.poll(() => page.evaluate(columns => window.cardReflows.some(entry =>
      entry.columns === columns && entry.animations.some(frames => frames[0].width && frames.at(-1).width && frames[0].translate)), columns)).toBe(true);
    const initialSample = await page.evaluate(() => window.cardResizeSamples[0]);
    expect(initialSample.columns).toBe(columns);
    const first = initialSample.boxes;
    for (const previous of before) {
      const next = first.find(box => box.id === previous.id);
      expect(Math.abs(next.x - previous.x)).toBeLessThan(3);
      expect(Math.abs(next.y - previous.y)).toBeLessThan(3);
      expect(Math.abs(next.width - previous.width)).toBeLessThan(3);
    }
    expect(await page.evaluate(() => window.cardReflows.some(entry => entry.animations.some(frames => frames.some(frame => Number.isFinite(parseFloat(frame.rotate)) && Math.abs(parseFloat(frame.rotate)) > .01))))).toBe(true);
    await expect.poll(() => cards.evaluate(container => [...container.children].flatMap(child => child.getAnimations()).length)).toBe(0);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(page.locator('.dashboard-title')).toHaveCSS('font-size', '32px');
    const layout = await cards.evaluate(container => {
      const boxes = [...container.children].map(child => child.getBoundingClientRect());
      return { overlap: boxes.some((a, index) => boxes.slice(index + 1).some(b =>
        Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1)),
        overflow: document.documentElement.scrollWidth > innerWidth };
    });
    expect(layout).toEqual({ overlap: false, overflow: false });
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1220, height: 900 });
  await expect(cards).toHaveCSS('--card-columns', '2');
  expect(await cards.evaluate(container => [...container.children].flatMap(child => child.getAnimations()).length)).toBe(0);
  await page.evaluate(() => { window.cardReflowObserver.disconnect(); window.cardResizeObserver.disconnect(); });
});

test("ring slices preview, pin one breakdown, and keep keyboard selection usable", async ({ page }) => {
  await seedDashboard(page); await addSummary(page, "Spending", "sum");
  for (const [collection, field] of [["Figures", "figures-price"], ["Tapestries", "tapestries-cost"]]) {
    await page.getByRole("checkbox", { name: collection, exact: true }).check();
    await page.getByRole("combobox", { name: `Number field in ${collection}`, exact: true }).selectOption(field);
  }
  await saveSummary(page);
  await addSummary(page, "Counter");
  await page.getByRole("checkbox", { name: "Figures", exact: true }).check(); await saveSummary(page);
  const card = summary(page, "Spending");
  const figures = card.getByRole("button", { name: "Figures: 1,200 (21.1%)", exact: true });
  const tapestries = card.getByRole("button", { name: "Tapestries: 4,500 (78.9%)", exact: true });
  const active = card.locator('.ring-segment[data-active="true"]');
  const pinned = card.locator('.ring-segment[aria-pressed="true"]');
  await expect(card.locator(".card-readout")).toHaveAttribute("data-motion", "done");
  await expect(card.locator(".ring-detail-name")).toHaveText("Tapestries");
  await expect(card.locator(".ring-detail-value")).toHaveText("4,500 (78.9%)");
  await expect(active).toHaveCount(1); await expect(pinned).toHaveCount(1);
  expect(await ringBandWidth(tapestries)).toBeCloseTo(34, 4);
  let point = await ringStrokePoint(figures, 58); await page.mouse.move(point.x, point.y);
  await expect(figures).toHaveAttribute('data-preview', 'true');
  await expect(card.locator(".ring-detail-name")).toHaveText("Tapestries");
  await expect(card.locator(".ring-detail-value")).toHaveText("4,500 (78.9%)");
  await expect(page.locator('.dashboard-ring-preview')).toContainText('Figures');
  const defaultPreview = await page.locator('.dashboard-ring-preview').boundingBox();
  expect(Math.abs(defaultPreview.x - point.x)).toBeLessThan(20);
  expect(Math.abs(defaultPreview.y - point.y)).toBeLessThan(24);
  await expect(active).toHaveCount(1); await expect(pinned).toHaveCount(1);
  await expect.poll(() => ringBandWidth(figures)).toBeCloseTo(28, 4);
  await expect(card.locator(".value-number")).toHaveText("5,700");
  await page.mouse.move(1, 1);
  await expect(active).toHaveCount(1); await expect(card.locator(".ring-detail-name")).toHaveText("Tapestries");
  point = await ringStrokePoint(figures); await page.mouse.move(point.x, point.y);
  await expect(page.locator('.dashboard-ring-preview')).toContainText('Figures');
  await page.mouse.down();
  const duringPress = await page.locator('.dashboard-ring-preview').boundingBox();
  expect(Math.abs(duringPress.x - point.x)).toBeLessThan(20);
  expect(Math.abs(duringPress.y - point.y)).toBeLessThan(24);
  await page.mouse.up();
  await expect(figures).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.dashboard-ring-preview')).toHaveCount(0);
  await page.keyboard.press('Escape');
  point = await ringStrokePoint(figures, 58); await page.mouse.click(point.x, point.y);
  await expect(figures).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => ringBandWidth(figures)).toBeCloseTo(34, 4);
  point = await ringStrokePoint(tapestries); await page.mouse.move(point.x, point.y);
  await expect(card.locator(".ring-detail-name")).toHaveText("Figures");
  await expect(tapestries).toHaveAttribute("data-preview", "true");
  await expect(figures).toHaveAttribute("data-active", "true");
  await expect(page.locator('.dashboard-ring-preview')).toContainText('Tapestries');
  const bottom = await tapestries.evaluate(node => {
    const point = new DOMPoint(100, 195).matrixTransform(node.getScreenCTM());
    return { x: point.x, y: point.y };
  });
  await page.mouse.move(bottom.x, bottom.y);
  await expect.poll(async () => {
    const preview = await page.locator('.dashboard-ring-preview').boundingBox();
    return Math.abs(preview.x - bottom.x) < 20 && Math.abs(preview.y - bottom.y) < 24;
  }).toBe(true);
  await expect(figures).toHaveAttribute("aria-pressed", "true");
  await expect(active).toHaveCount(1); await expect(pinned).toHaveCount(1);
  await expect.poll(() => ringBandWidth(tapestries)).toBeCloseTo(28, 4);
  await expect.poll(() => ringBandWidth(figures)).toBeCloseTo(34, 4);
  await page.mouse.move(1, 1);
  await expect(card.locator(".ring-detail-name")).toHaveText("Figures");
  await expect.poll(() => ringBandWidth(figures)).toBeCloseTo(34, 4);
  point = await ringStrokePoint(tapestries);
  await page.mouse.click(point.x, point.y);
  await expect(tapestries).toHaveAttribute("aria-pressed", "true");
  await expect(figures).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => ringBandWidth(tapestries)).toBeCloseTo(34, 4);
  await expect.poll(() => ringBandWidth(figures)).toBeCloseTo(28, 4);
  await expect(card.locator(".ring-detail-value")).toHaveText("4,500 (78.9%)");
  await reorderCards(page, ['Recent items', 'Counter', 'Spending']);
  await expect(page.locator(".dashboard-cards article h3")).toHaveText(["Recent items", "Counter", "Spending"]);
  await expect(tapestries).toHaveAttribute("aria-pressed", "true");
  await expect(card.locator(".ring-detail-name")).toHaveText("Tapestries");
  await expect.poll(() => ringBandWidth(tapestries)).toBeCloseTo(34, 4);
  point = await ringStrokePoint(tapestries); await page.mouse.click(point.x, point.y);
  await expect(pinned).toHaveCount(1); await expect(active).toHaveCount(1);
  await expect(card.locator(".ring-detail-name")).toHaveText("Tapestries");
  await page.mouse.move(1, 1); await figures.focus();
  await expect(figures).toBeFocused(); await expect(card.locator(".ring-detail-name")).toHaveText("Tapestries");
  await expect(page.locator('.dashboard-ring-preview')).toContainText('Figures');
  await page.keyboard.press("Enter"); await expect(figures).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Tab"); await expect(tapestries).toBeFocused();
  await expect(card.locator(".ring-detail-name")).toHaveText("Figures");
  await expect(page.locator('.dashboard-ring-preview')).toContainText('Tapestries');
  await expect(figures).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Space"); await expect(tapestries).toHaveAttribute("aria-pressed", "true");
  await expect(card.locator(".ring-detail-name")).toHaveText("Tapestries");
  await expect(active).toHaveCount(1); await expect(pinned).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(active).toHaveCount(1); await expect(pinned).toHaveCount(1);
  await expect(card.locator(".ring-detail-name")).toHaveText("Tapestries");
  await expect(card.locator(".value-number")).toHaveText("5,700");
  await expect.poll(() => ringBandWidth(tapestries)).toBeCloseTo(34, 4);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await figures.focus(); await page.keyboard.press("Enter");
  expect(await ringBandWidth(figures)).toBeCloseTo(34, 4);
  await page.keyboard.press("Escape");
  expect(await ringBandWidth(figures)).toBeCloseTo(28, 4);
});

test.describe("dashboard touch interaction", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("tapping a ring switches or retains its pin and leaving the dashboard restores the largest default", async ({ page }) => {
    await seedDashboard(page); await addSummary(page, "Ownership");
    await page.getByRole("radiogroup", { name: "Break down by", exact: true }).getByRole("radio", { name: "A category field", exact: true }).check();
    await page.getByRole("checkbox", { name: "Figures", exact: true }).check();
    await page.getByRole("combobox", { name: "Category field in Figures", exact: true }).selectOption("figures-status");
    await saveSummary(page);
    const card = summary(page, "Ownership");
    const owned = card.getByRole("button", { name: "Owned: 1 (33.3%)", exact: true });
    const wanted = card.getByRole("button", { name: "Wanted: 1 (33.3%)", exact: true });
    const active = card.locator('.ring-segment[data-active="true"]');
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator(".card-readout")).toHaveAttribute("data-motion", "done");
    await expect(card.locator(".ring-detail-name")).toHaveText("Owned");
    let point = await ringStrokePoint(owned); await page.touchscreen.tap(point.x, point.y);
    await expect(owned).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => ringBandWidth(owned)).toBeCloseTo(34, 4);
    await expect(card.locator(".ring-detail-name")).toHaveText("Owned"); await expect(active).toHaveCount(1);
    point = await ringStrokePoint(wanted); await page.touchscreen.tap(point.x, point.y);
    await expect(wanted).toHaveAttribute("aria-pressed", "true");
    await expect(owned).toHaveAttribute("aria-pressed", "false");
    await expect(card.locator(".ring-detail-value")).toHaveText("1 (33.3%)"); await expect(active).toHaveCount(1);
    point = await ringStrokePoint(wanted); await page.touchscreen.tap(point.x, point.y);
    await expect(active).toHaveCount(1); await expect(card.locator(".ring-detail-name")).toHaveText("Wanted");
    await expect(card.locator('.ring-segment[aria-pressed="true"]')).toHaveCount(1);
    point = await ringStrokePoint(owned); await page.touchscreen.tap(point.x, point.y);
    await expect(owned).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Figures", exact: true }).click();
    await expect(page.locator(".dashboard-view")).toHaveCount(0);
    await page.getByRole("button", { name: "My collection", exact: true }).click();
    await expect(card.locator(".value-number")).toHaveText("3");
    await expect(active).toHaveCount(1); await expect(card.locator('.ring-segment[aria-pressed="true"]')).toHaveCount(1);
    expect(await ringBandWidth(owned)).toBeCloseTo(34, 4);
    await expect(card.locator(".ring-detail-name")).toHaveText("Owned");
    await expect(card.locator(".composition-legend, .ring-callout-lines")).toHaveCount(0);
  });
});

test("item details animate with a large persistent image, scrollable fields, and an honest empty state", async ({ page }) => {
  await seedDashboard(page);
  const trigger = page.getByRole('button', { name: 'Open Limited edition figure in Figures', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Limited edition figure', exact: true });
  const picture = dialog.locator('.item-detail-picture'), values = dialog.locator('.item-detail-values');
  await expect(picture).toHaveAttribute('data-state', 'ready');
  await expect(picture.getByRole('img', { name: 'Limited edition figure', exact: true })).toBeVisible();
  const split = await dialog.evaluate(node => {
    const picture = node.querySelector('.item-detail-picture').getBoundingClientRect();
    const values = node.querySelector('.item-detail-values').getBoundingClientRect();
    return { ratio: picture.width / values.width, height: picture.height, animation: getComputedStyle(node).animationName,
      fit: getComputedStyle(node.querySelector('img')).objectFit };
  });
  expect(split.ratio).toBeCloseTo(1, 1); expect(split.height).toBeGreaterThan(600);
  expect((await dialog.boundingBox()).height).toBeGreaterThan(740);
  expect(split.animation).toBe('dialog-enter'); expect(split.fit).toBe('contain');
  await page.setViewportSize({ width: 390, height: 700 });
  await expect.poll(() => values.evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true);
  await values.evaluate(node => { node.scrollTop = node.scrollHeight; });
  await expect(picture.locator('img')).toBeInViewport();
  expect((await picture.boundingBox()).height).toBeGreaterThan(150);
  expect(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible(); await expect(trigger).toBeFocused();
  await page.getByRole('button', { name: 'Open Mini figure in Figures', exact: true }).click();
  await expect(picture).toHaveCount(0);
  const empty = page.getByRole('dialog', { name: 'Mini figure', exact: true });
  await expect(empty.locator('.item-detail-picture')).toHaveAttribute('data-state', 'empty');
  await expect(empty.getByText('No image', { exact: true })).toBeVisible();
  await expect(empty.locator('.item-detail-values')).toContainText('Purchase price');
  await page.getByRole('button', { name: 'Close item details', exact: true }).click();
});
