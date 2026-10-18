const { test, expect } = require("./fixtures.js");
const { createCollection } = require("./helpers/collections.js");
const { chooseImage, readImage } = require("./helpers/images.js");
const { createItem, itemCard } = require("./helpers/items.js");
const { readItemStorage } = require("./helpers/storage.js");

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await createCollection(page);
  await createItem(page, "Original keepsake");
});

async function openEditor(page) {
  await itemCard(page, "Original keepsake")
    .getByRole("button", { name: "Edit Original keepsake", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Edit Test collection item", exact: true });
  await expect(dialog.getByRole("textbox", { name: /^Name/ })).toHaveValue("Original keepsake");
  return dialog;
}

async function saveChanges(dialog) {
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(dialog.getByRole("heading", { name: "Changes saved", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Done", exact: true }).click();
  await expect(dialog).not.toBeVisible();
}

test("editing a name preserves item identity and image bytes after reload", async ({ page }) => {
  const before = await readItemStorage(page);
  const originalImage = await readImage(itemCard(page, "Original keepsake").locator("img"));
  const dialog = await openEditor(page);
  expect(await readImage(dialog.getByAltText("Current item image"))).toEqual(originalImage);
  await dialog.getByRole("textbox", { name: /^Name/ }).fill("Renamed keepsake");
  await dialog.getByRole("button", { name: "Review item", exact: true }).click();
  await saveChanges(dialog);

  await expect(itemCard(page, "Original keepsake")).toHaveCount(0);
  await expect(itemCard(page, "Renamed keepsake")).toHaveCount(1);
  const after = await readItemStorage(page);
  expect(after.items).toEqual([{
    ...before.items[0], name: "Renamed keepsake", updatedAt: expect.any(String)
  }]);
  expect(after.assets).toEqual(before.assets);

  await page.reload();
  await page.getByRole("button", { name: "Test collection", exact: true }).click();
  expect(await readImage(itemCard(page, "Renamed keepsake").locator("img"))).toEqual(originalImage);
  expect(await readItemStorage(page)).toEqual(after);
});

test("image replacement removes the old asset and persists the reviewed image", async ({ page }) => {
  const before = await readItemStorage(page);
  const originalImage = await readImage(itemCard(page, "Original keepsake").locator("img"));
  const dialog = await openEditor(page);
  await chooseImage(page, dialog, "Landscape", ["#2d8b57", "#d4ad39"]);
  await dialog.getByRole("button", { name: "Review item", exact: true }).click();
  const replacement = await readImage(dialog.getByAltText("Item image", { exact: true }));
  expect({ width: replacement.width, height: replacement.height })
    .toEqual({ width: 792, height: 560 });
  expect(replacement).not.toEqual(originalImage);
  await saveChanges(dialog);

  const after = await readItemStorage(page);
  expect(after.items).toEqual([{
    ...before.items[0], imageAssetId: expect.any(String), updatedAt: expect.any(String)
  }]);
  expect(after.items[0].imageAssetId).not.toBe(before.items[0].imageAssetId);
  expect(after.assets).toHaveLength(1);
  expect(after.assets[0].id).toBe(after.items[0].imageAssetId);
  expect(after.assets[0].digest).not.toBe(before.assets[0].digest);

  await page.reload();
  await page.getByRole("button", { name: "Test collection", exact: true }).click();
  expect(await readImage(itemCard(page, "Original keepsake").locator("img"))).toEqual(replacement);
  expect(await readItemStorage(page)).toEqual(after);
});

test("closing edit review leaves saved values and image bytes unchanged", async ({ page }) => {
  const before = await readItemStorage(page);
  const originalImage = await readImage(itemCard(page, "Original keepsake").locator("img"));
  const dialog = await openEditor(page);
  await dialog.getByRole("textbox", { name: /^Name/ }).fill("Unconfirmed edit");
  await chooseImage(page, dialog, "Landscape", ["#2d8b57", "#d4ad39"]);
  await dialog.getByRole("button", { name: "Review item", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Save changes", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Close item editor", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(await readItemStorage(page)).toEqual(before);

  await page.reload();
  await page.getByRole("button", { name: "Test collection", exact: true }).click();
  await expect(itemCard(page, "Unconfirmed edit")).toHaveCount(0);
  expect(await readImage(itemCard(page, "Original keepsake").locator("img"))).toEqual(originalImage);
  expect(await readItemStorage(page)).toEqual(before);
});
