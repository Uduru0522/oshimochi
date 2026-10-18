const { expect } = require("../fixtures.js");

async function openFields(page, collection = "Test collection") {
  await page.getByRole("button", { name: "Administration", exact: true }).click();
  await page.getByRole("combobox", { name: "Goods type", exact: true })
    .selectOption({ label: collection });
  await page.getByRole("button", { name: "Manage fields", exact: true }).click();
  await expect(page.getByRole("heading", { name: `${collection} fields`, exact: true }))
    .toBeVisible();
}

async function stageField(page, { name, type = "text", required = false, choices }) {
  await page.getByRole("button", { name: "Add field", exact: true }).click();
  const editor = page.locator(".field-editor");
  await editor.getByRole("textbox", { name: /^Field name/ }).fill(name);
  await editor.getByRole("combobox", { name: /^Data type/ }).selectOption(type);
  if (required) {
    await editor.getByRole("checkbox", { name: "Require a value when registering an item" })
      .check();
  }
  if (choices) {
    await editor.getByRole("textbox", { name: /^Options/ }).fill(choices.join("\n"));
  }
  await editor.getByRole("button", { name: "Stage field", exact: true }).click();
  await expect(editor).toHaveCount(0);
}

async function applyFields(page) {
  await page.getByRole("button", { name: "Review and apply", exact: true }).click();
  await page.getByRole("button", { name: "Apply staged changes", exact: true }).click();
  await expect(page.getByText("Field changes applied.", { exact: true })).toBeVisible();
}

module.exports = { openFields, stageField, applyFields };
