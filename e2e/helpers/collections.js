const { expect } = require("../fixtures.js");

async function reviewCollection(page, name, description = "") {
  await page.getByRole("button", { name: "Administration", exact: true }).click();
  await page.getByRole("button", { name: "Add goods type", exact: true }).click();
  await page.getByRole("textbox", { name: /^Display name/ }).fill(name);
  await page.getByRole("textbox", { name: /^Description/ }).fill(description);
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Review goods type", exact: true }))
    .toBeVisible();
}

async function createCollection(page, name = "Test collection", description = "") {
  await reviewCollection(page, name, description);
  await page.getByRole("button", { name: "Create goods type", exact: true }).click();
  await expect(page.getByRole("button", { name, exact: true }))
    .toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: "Add item", exact: true })).toBeVisible();
}

module.exports = { createCollection, reviewCollection };
