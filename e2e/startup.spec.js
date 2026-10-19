const { test, expect } = require("./fixtures.js");

test("fresh user mode opens an empty catalog", async ({ page }) => {
  await page.goto("./");

  await expect(page).toHaveTitle("Oshimochi");
  await expect(page.getByRole("button", { name: "My collection", exact: true }))
    .toHaveAttribute("aria-current", "page");
  await expect(page.getByText("No goods types yet", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Administration", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add goods type", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Backup and restore", exact: true }))
    .toBeVisible();
});

test("debug fixtures never create a user database or leak into user mode", async ({ page }) => {
  await page.goto("./?debug=1");
  await page.getByRole("button", { name: "Tapestries", exact: true }).click();

  await expect(page.getByRole("list", { name: "Collection item cards" })
    .getByRole("listitem").first()).toBeVisible();
  expect(await page.evaluate(async () => {
    const databases = await indexedDB.databases();
    return databases.map(({ name }) => name);
  })).not.toContain("oshimochi");

  await page.goto("./");
  await expect(page.getByText("No goods types yet", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tapestries", exact: true })).toHaveCount(0);
});
