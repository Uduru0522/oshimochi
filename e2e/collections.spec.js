const { test, expect } = require("./fixtures.js");
const { createCollection, reviewCollection } = require("./helpers/collections.js");

test("confirmed collection details survive reload", async ({ page }) => {
  await page.goto("./");
  await createCollection(page, "Wall scrolls", "Stored in the study.");
  await expect(page.getByRole("heading", { name: "No items to display" })).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Wall scrolls", exact: true }).click();
  await page.getByRole("button", { name: "Collection overview", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Wall scrolls overview" })).toHaveCount(1);
  await expect(page.getByText("Stored in the study.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back to items", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add item", exact: true })).toBeVisible();
});

test("backing out of collection review does not save a collection", async ({ page }) => {
  await page.goto("./");
  await reviewCollection(page, "Unconfirmed collection", "Unsaved description.");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByRole("textbox", { name: /^Display name/ }))
    .toHaveValue("Unconfirmed collection");
  await expect(page.getByRole("textbox", { name: /^Description/ }))
    .toHaveValue("Unsaved description.");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();

  await page.reload();
  await expect(page.getByText("No goods types yet", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Unconfirmed collection", exact: true }))
    .toHaveCount(0);
});

test("debug collection edits reset without changing an existing user catalog", async ({ page }) => {
  await page.goto("./");
  await createCollection(page, "Personal collection", "Keep this user description.");

  await page.goto("./?debug=1");
  await createCollection(page, "Debug-only collection");
  await page.reload();
  await expect(page.getByRole("button", { name: "Tapestries", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Debug-only collection", exact: true }))
    .toHaveCount(0);

  await page.goto("./");
  await page.getByRole("button", { name: "Personal collection", exact: true }).click();
  await expect(page.getByRole("button", { name: "Debug-only collection", exact: true }))
    .toHaveCount(0);
  await expect(page.getByRole("button", { name: "Tapestries", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Collection overview", exact: true }).click();
  await expect(page.getByText("Keep this user description.", { exact: true })).toBeVisible();
});
