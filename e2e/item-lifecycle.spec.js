const { test, expect } = require("./fixtures.js");
const { createCollection } = require("./helpers/collections.js");
const { readImage } = require("./helpers/images.js");
const { createItem, itemCard, softDeleteItem } = require("./helpers/items.js");
const { readItemStorage } = require("./helpers/storage.js");

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await createCollection(page);
  await createItem(page, "Retained keepsake");
});

async function openRecovery(page) {
  await page.getByRole("button", { name: "Deleted items", exact: true }).click();
  return page.getByRole("dialog", { name: "Deleted items in Test collection", exact: true });
}

test("cancelling deletion preserves the active item and its image", async ({ page }) => {
  const before = await readItemStorage(page);
  const originalImage = await readImage(itemCard(page, "Retained keepsake").locator("img"));
  await itemCard(page, "Retained keepsake")
    .getByRole("button", { name: "Delete Retained keepsake", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Delete item?", exact: true });
  expect(await readImage(dialog.locator("img"))).toEqual(originalImage);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(await readItemStorage(page)).toEqual(before);

  await page.reload();
  await page.getByRole("button", { name: "Test collection", exact: true }).click();
  expect(await readImage(itemCard(page, "Retained keepsake").locator("img"))).toEqual(originalImage);
  expect(await readItemStorage(page)).toEqual(before);
});

test("deleted items survive reload and restore with their identity and image", async ({ page }) => {
  const before = await readItemStorage(page);
  const originalImage = await readImage(itemCard(page, "Retained keepsake").locator("img"));
  await softDeleteItem(page, "Retained keepsake");
  const deleted = await readItemStorage(page);
  expect(deleted.items).toEqual([{
    ...before.items[0], isDeleted: true, deletedAt: expect.any(String), updatedAt: expect.any(String)
  }]);
  expect(deleted.assets).toEqual(before.assets);

  await page.reload();
  await page.getByRole("button", { name: "Test collection", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No items to display" })).toBeVisible();
  const recovery = await openRecovery(page);
  const retained = recovery.getByRole("listitem").filter({ hasText: "Retained keepsake" });
  expect(await readImage(retained.locator("img"))).toEqual(originalImage);
  await retained.getByRole("button", { name: "Restore Retained keepsake", exact: true }).click();
  await expect(recovery.getByText("No deleted items", { exact: true })).toBeVisible();
  await recovery.getByRole("button", { name: "Close deleted items", exact: true }).click();
  expect(await readImage(itemCard(page, "Retained keepsake").locator("img"))).toEqual(originalImage);

  const restored = await readItemStorage(page);
  expect(restored.items).toEqual([{ ...before.items[0], updatedAt: expect.any(String) }]);
  expect(restored.assets).toEqual(before.assets);
  await page.reload();
  await page.getByRole("button", { name: "Test collection", exact: true }).click();
  expect(await readItemStorage(page)).toEqual(restored);
  expect(await readImage(itemCard(page, "Retained keepsake").locator("img"))).toEqual(originalImage);
});

test("cancelling permanent purge preserves the deleted item and retained asset", async ({ page }) => {
  await softDeleteItem(page, "Retained keepsake");
  const before = await readItemStorage(page);
  const recovery = await openRecovery(page);
  await recovery.getByRole("button", { name: "Permanently delete Retained keepsake", exact: true })
    .click();
  await expect(recovery.getByText(
    "This permanently deletes the retained item and image. This action cannot be undone.",
    { exact: true }
  )).toBeVisible();
  await recovery.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(recovery.getByRole("button", { name: "Restore Retained keepsake", exact: true }))
    .toBeVisible();
  expect(await readItemStorage(page)).toEqual(before);

  await page.reload();
  await page.getByRole("button", { name: "Test collection", exact: true }).click();
  const reopened = await openRecovery(page);
  await expect(reopened.getByRole("button", { name: "Restore Retained keepsake", exact: true }))
    .toBeVisible();
  expect(await readItemStorage(page)).toEqual(before);
});

test("confirmed purge removes only the deleted item and its asset", async ({ page }) => {
  await createItem(page, "Untouched keepsake");
  const before = await readItemStorage(page);
  const survivor = before.items.find(({ name }) => name === "Untouched keepsake");
  const survivorAssets = before.assets.filter(({ id }) => id === survivor.imageAssetId);
  const originalImage = await readImage(itemCard(page, "Untouched keepsake").locator("img"));
  await softDeleteItem(page, "Retained keepsake");
  const recovery = await openRecovery(page);
  await recovery.getByRole("button", { name: "Permanently delete Retained keepsake", exact: true })
    .click();
  await recovery.getByRole("button", { name: "Delete permanently", exact: true }).click();
  await expect(recovery.getByText("No deleted items", { exact: true })).toBeVisible();
  expect(await readItemStorage(page)).toEqual({ items: [survivor], assets: survivorAssets });

  await recovery.getByRole("button", { name: "Close deleted items", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Test collection", exact: true }).click();
  await expect(itemCard(page, "Retained keepsake")).toHaveCount(0);
  expect(await readImage(itemCard(page, "Untouched keepsake").locator("img"))).toEqual(originalImage);
  await expect((await openRecovery(page)).getByText("No deleted items", { exact: true }))
    .toBeVisible();
  expect(await readItemStorage(page)).toEqual({ items: [survivor], assets: survivorAssets });
});
