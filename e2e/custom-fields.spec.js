const { test, expect } = require("./fixtures.js");
const { createCollection } = require("./helpers/collections.js");
const { openFields, stageField, applyFields } = require("./helpers/fields.js");
const { chooseImage } = require("./helpers/images.js");
const { itemCard } = require("./helpers/items.js");
const { readItemStorage } = require("./helpers/storage.js");

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await createCollection(page);
  await openFields(page);
});

async function openEntry(page) {
  await page.getByRole("button", { name: "Test collection", exact: true }).click();
  await page.getByRole("button", { name: "Add item", exact: true }).click();
  return page.getByRole("dialog", { name: "Add item to Test collection", exact: true });
}

test("all custom field types retain normalized values after reload", async ({ page }) => {
  for (const field of [
    { name: "Series", required: true },
    { name: "Notes", type: "long_text" },
    { name: "Price", type: "number" },
    { name: "Release date", type: "date" },
    { name: "Displayed", type: "boolean" },
    { name: "Reference", type: "url" },
    { name: "Condition", type: "select", choices: ["Sealed", "Opened"] }
  ]) {
    await stageField(page, field);
  }
  await applyFields(page);
  const dialog = await openEntry(page);
  await dialog.getByRole("textbox", { name: /^Name/ }).fill("Typed keepsake");
  await dialog.getByRole("textbox", { name: /^Series/ }).fill("Starlight");
  await dialog.getByRole("textbox", { name: /^Notes/ }).fill("First line\nSecond line");
  await dialog.getByRole("spinbutton", { name: /^Price/ }).fill("0");
  await dialog.getByLabel(/^Release date/).fill("2025-02-03");
  await expect(dialog.getByRole("switch", { name: /^Displayed/ })).not.toBeChecked();
  await dialog.getByRole("textbox", { name: /^Reference/ }).fill("example.com/typed");
  await dialog.getByRole("combobox", { name: /^Condition/ }).selectOption({ label: "Opened" });
  await chooseImage(page, dialog);
  await dialog.getByRole("button", { name: "Review item", exact: true }).click();
  await dialog.getByRole("button", { name: "Save item", exact: true }).click();
  await dialog.getByRole("button", { name: "Done", exact: true }).click();
  await expect(itemCard(page, "Typed keepsake")).toBeVisible();

  const storedValues = (await readItemStorage(page)).items[0].customValues;
  expect(Object.keys(storedValues)).toHaveLength(7);
  expect(Object.values(storedValues)).toEqual(expect.arrayContaining([
    "Starlight", "First line\nSecond line", 0, "2025-02-03", false, "https://example.com/typed"
  ]));

  await page.reload();
  await page.getByRole("button", { name: "Test collection", exact: true }).click();
  await itemCard(page, "Typed keepsake")
    .getByRole("button", { name: "Edit Typed keepsake", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit Test collection item", exact: true });
  await expect(editor.getByRole("textbox", { name: /^Series/ })).toHaveValue("Starlight");
  await expect(editor.getByRole("textbox", { name: /^Notes/ }))
    .toHaveValue("First line\nSecond line");
  await expect(editor.getByRole("spinbutton", { name: /^Price/ })).toHaveValue("0");
  await expect(editor.getByLabel(/^Release date/)).toHaveValue("2025-02-03");
  await expect(editor.getByRole("switch", { name: /^Displayed/ })).not.toBeChecked();
  await expect(editor.getByRole("textbox", { name: /^Reference/ }))
    .toHaveValue("https://example.com/typed");
  await expect(editor.getByRole("combobox", { name: /^Condition/ }).locator("option:checked"))
    .toHaveText("Opened");
});

test("leaving staged fields unapplied preserves the protected schema", async ({ page }) => {
  const protectedFields = page.getByRole("button", { name: "Protected field", exact: true });
  await expect(protectedFields).toHaveCount(3);
  for (const field of await protectedFields.all()) {
    await expect(field).toBeDisabled();
  }
  await stageField(page, { name: "Unapplied note" });
  await expect(page.getByText("1 staged change(s)", { exact: true })).toBeVisible();
  await openEntry(page);
  await page.reload();
  await page.getByRole("button", { name: "Test collection", exact: true }).click();
  await openFields(page);
  await expect(page.getByRole("button", { name: "Protected field", exact: true })).toHaveCount(3);
  await expect(page.getByText("Unapplied note", { exact: true })).toHaveCount(0);
  await expect(page.getByText("0 staged change(s)", { exact: true })).toBeVisible();
});

test("a required custom field prevents review when its value is missing", async ({ page }) => {
  await stageField(page, { name: "Series", required: true });
  await applyFields(page);
  const dialog = await openEntry(page);
  await dialog.getByRole("textbox", { name: /^Name/ }).fill("Missing series");
  await chooseImage(page, dialog);
  await dialog.getByRole("button", { name: "Review item", exact: true }).click();
  expect(await dialog.getByRole("textbox", { name: /^Series/ })
    .evaluate((input) => input.validity.valueMissing)).toBe(true);
  await expect(dialog.getByRole("button", { name: "Save item", exact: true })).toHaveCount(0);
  expect((await readItemStorage(page)).items).toHaveLength(0);
});

test("an explicit HTTP address is rejected before review or storage", async ({ page }) => {
  await stageField(page, { name: "Reference", type: "url" });
  await applyFields(page);
  const dialog = await openEntry(page);
  await dialog.getByRole("textbox", { name: /^Name/ }).fill("Unsafe address");
  await dialog.getByRole("textbox", { name: /^Reference/ }).fill("http://example.com/typed");
  await chooseImage(page, dialog);
  await dialog.getByRole("button", { name: "Review item", exact: true }).click();
  await expect(dialog.getByText("Reference must use https.", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Save item", exact: true })).toHaveCount(0);
  expect((await readItemStorage(page)).items).toHaveLength(0);
});
