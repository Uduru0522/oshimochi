const { expect } = require("../fixtures.js");

async function seedDashboard(page, { repair = false } = {}) {
  await page.route("**/__dashboard-fixture", route => route.fulfill({ contentType: "text/html", body: '<!doctype html><title>Fixture</title><link rel="icon" href="data:,">' }));
  await page.goto("./__dashboard-fixture");
  await page.evaluate(async ({ repair }) => {
    const { createIndexedDbStorage } = await import("./src/data/indexeddb/indexeddb-storage.js");
    const { createDashboardCatalogFixture } = await import("./test-support/dashboard-catalog-fixtures.js");
    const { createDashboardCardFixture } = await import("./test-support/dashboard-card-fixtures.js");
    const storage = createIndexedDbStorage(); await storage.initialize();
    try {
      const catalog = createDashboardCatalogFixture();
      if (repair) {
        const field = catalog.fieldDefinitions.find(field => field.id === "figures-price"); field.isDeleted = true; field.deletedAt = field.updatedAt;
        catalog.dashboardCards = [createDashboardCardFixture({ title: "Spending", sources: [{ goodsTypeId: "figures", goodsTypeName: "Figures", fieldId: "figures-price", fieldName: "Purchase price" }] })];
      }
      await storage.replaceDataCatalog(catalog);
    } finally { storage.close(); }
  }, { repair });
  await page.goto("./");
  await expect(page.locator("#dashboard-item-count")).toHaveText("5");
}
async function addSummary(page, title, calculation = "count") {
  await page.getByRole("button", { name: "Add card", exact: true }).click();
  await page.getByRole("button", { name: "Summary card", exact: true }).click();
  await page.getByRole("textbox", { name: "Card name", exact: true }).fill(title);
  const calculationLabels = { sum: "Total (sum)", count: "Number of items", average: "Average", minimum: "Lowest value", maximum: "Highest value" };
  await page.getByRole("radiogroup", { name: "What would you like to calculate?", exact: true }).getByRole("radio", { name: calculationLabels[calculation], exact: true }).check();
}
async function saveSummary(page, label = "Save card") {
  await page.getByRole("button", { name: label, exact: true }).click();
  await expect(page.locator("#dashboard-editor")).not.toBeVisible();
}
function summary(page, title) { return page.getByRole("article", { name: title, exact: true }); }
async function editSummary(page, title) {
  await summary(page, title).getByText("⋯", { exact: true }).click();
  await page.getByRole("button", { name: `Edit ${title}`, exact: true }).click();
}
async function enterArrangement(page, title) {
  await summary(page, title).locator('summary').click();
  await page.getByRole('button', { name: 'Rearrange cards', exact: true }).click();
  await expect(page.locator('#dashboard-arrange-bar')).toBeVisible();
}
async function reorderCards(page, titles) {
  await enterArrangement(page, titles[0]);
  for (const [target, title] of titles.entries()) {
    const current = await page.locator('.dashboard-cards > article:not([data-card-exiting]) h3').allTextContents();
    const handle = page.getByRole('button', { name: `Rearrange ${title}`, exact: true });
    await handle.focus();
    for (let index = current.indexOf(title); index !== target; index += index < target ? 1 : -1) {
      await handle.press(index < target ? 'ArrowRight' : 'ArrowLeft');
    }
  }
  await page.getByRole('button', { name: 'Save order', exact: true }).click();
  await expect(page.locator('#dashboard-arrange-bar')).not.toBeVisible();
}
module.exports = { seedDashboard, addSummary, saveSummary, summary, editSummary, enterArrangement, reorderCards };
