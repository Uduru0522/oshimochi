const { expect } = require("../fixtures.js");
const { chooseImage } = require("./images.js");

function itemCard(page, name) {
  return page.getByRole("list", { name: "Collection item cards" })
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
}

async function createItem(page, name, { collection = "Test collection" } = {}) {
  await page.getByRole("button", { name: "Add item", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: `Add item to ${collection}`, exact: true });
  await dialog.getByRole("textbox", { name: /^Name/ }).fill(name);
  await chooseImage(page, dialog);
  await dialog.getByRole("button", { name: "Review item", exact: true }).click();
  await dialog.getByRole("button", { name: "Save item", exact: true }).click();
  await expect(dialog.getByRole("heading", { name: "Item saved", exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Done", exact: true }).click();
  await expect(itemCard(page, name)).toBeVisible();
}

module.exports = { createItem, itemCard };
