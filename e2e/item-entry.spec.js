const { test, expect } = require("./fixtures.js");
const { createCollection } = require("./helpers/collections.js");
const { chooseImage, readImage } = require("./helpers/images.js");
const { itemCard } = require("./helpers/items.js");

async function openEntry(page) {
  await page.goto("./");
  await createCollection(page);
  await page.getByRole("button", { name: "Add item", exact: true }).click();
  return page.getByRole("dialog", { name: "Add item to Test collection", exact: true });
}

for (const { orientation, width, height } of [
  { orientation: "Portrait", width: 560, height: 792 },
  { orientation: "Landscape", width: 792, height: 560 }
]) {
  test(`confirmed ${orientation.toLowerCase()} item image survives reload`, async ({ page }) => {
    const dialog = await openEntry(page);
    const name = `${orientation} keepsake`;
    await dialog.getByRole("textbox", { name: /^Name/ }).fill(name);
    await chooseImage(page, dialog, orientation);
    const crop = dialog.getByLabel("Crop selection", { exact: true });
    await expect(crop).toBeVisible();
    const originalCrop = await crop.boundingBox();
    await dialog.getByRole("slider", { name: "Crop size", exact: true }).press("Home");
    await dialog.getByRole("slider", { name: "Crop size", exact: true }).press("ArrowRight");
    await expect.poll(async () => (await crop.boundingBox()).width)
      .toBeLessThan(originalCrop.width);
    await dialog.getByRole("button", { name: "Review item", exact: true }).click();
    const reviewedImage = await readImage(dialog.getByAltText("Item image", { exact: true }));
    expect({ width: reviewedImage.width, height: reviewedImage.height }).toEqual({ width, height });
    expect(reviewedImage.pixels[0]).toBeGreaterThan(reviewedImage.pixels[2] + 80);
    expect(reviewedImage.pixels[30]).toBeGreaterThan(reviewedImage.pixels[28] + 80);

    await dialog.getByRole("button", { name: "Save item", exact: true }).click();
    await expect(dialog.getByRole("heading", { name: "Item saved", exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "Done", exact: true }).click();
    const card = itemCard(page, name);
    await expect(card).toHaveCount(1);
    expect(await readImage(card.locator("img"))).toEqual(reviewedImage);

    await page.reload();
    await page.getByRole("button", { name: "Test collection", exact: true }).click();
    await expect(itemCard(page, name)).toHaveCount(1);
    expect(await readImage(itemCard(page, name).locator("img"))).toEqual(reviewedImage);
  });
}

test("an image is required before item review", async ({ page }) => {
  const dialog = await openEntry(page);
  await dialog.getByRole("textbox", { name: /^Name/ }).fill("Missing image");
  await dialog.getByRole("button", { name: "Review item", exact: true }).click();
  await expect(dialog.getByText("Choose an image before reviewing this item.", { exact: true }))
    .toBeVisible();
  await expect(dialog.getByRole("button", { name: "Save item", exact: true })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Close item entry", exact: true }).click();

  await page.reload();
  await page.getByRole("button", { name: "Test collection", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No items to display" })).toBeVisible();
});

test("an empty item name cannot advance to review", async ({ page }) => {
  const dialog = await openEntry(page);
  await chooseImage(page, dialog);
  await dialog.getByRole("button", { name: "Review item", exact: true }).click();

  const name = dialog.getByRole("textbox", { name: /^Name/ });
  expect(await name.evaluate((input) => input.validity.valueMissing)).toBe(true);
  await expect(dialog.getByRole("heading", { name: "Item information" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Save item", exact: true })).toHaveCount(0);
});

test("closing item review preserves its draft without saving it", async ({ page }) => {
  const dialog = await openEntry(page);
  await dialog.getByRole("textbox", { name: /^Name/ }).fill("Unconfirmed item");
  await chooseImage(page, dialog);
  await dialog.getByRole("button", { name: "Review item", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Save item", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Close item entry", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No items to display" })).toBeVisible();

  await page.getByRole("button", { name: "Add item", exact: true }).click();
  await expect(dialog.getByText("Unconfirmed item", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Back", exact: true }).click();
  await expect(dialog.getByRole("textbox", { name: /^Name/ })).toHaveValue("Unconfirmed item");

  await page.reload();
  await page.getByRole("button", { name: "Test collection", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No items to display" })).toBeVisible();
});
