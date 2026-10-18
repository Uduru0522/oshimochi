const { test, expect } = require("./fixtures.js");

test.beforeEach(async ({ page }) => {
  await page.goto("./?debug=1");
  await page.getByRole("button", { name: "Tapestries", exact: true }).click();
  await expect(page.getByRole("list", { name: "Collection item cards" })
    .getByRole("listitem").first()).toBeVisible();
});

async function openFilters(page) {
  await page.getByRole("button", { name: /^Filter items/ }).click();
  return page.getByRole("dialog", { name: "Filter items", exact: true });
}

function cardNames(page) {
  return page.getByRole("list", { name: "Collection item cards" }).getByRole("heading");
}

test("search applies phrases and exclusions while cancelled changes keep the active query", async ({ page }) => {
  const expected = [
    "Orchestra Performance Main Visual", "Starry Night Festival B1 Tapestry", "Summer Festival B2 Tapestry"
  ];
  const filters = await openFilters(page);
  await filters.getByRole("searchbox", { name: "Search all fields", exact: true })
    .fill('"Starlight Memories" -Moonlit');
  await filters.getByRole("button", { name: "Apply filters", exact: true }).click();
  await expect.poll(async () => (await cardNames(page).allTextContents()).sort()).toEqual(expected);

  await openFilters(page);
  await filters.getByRole("searchbox", { name: "Search all fields", exact: true })
    .fill("nothing-matches-this");
  await filters.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect.poll(async () => (await cardNames(page).allTextContents()).sort()).toEqual(expected);
  await openFilters(page);
  await expect(filters.getByRole("searchbox", { name: "Search all fields", exact: true }))
    .toHaveValue('"Starlight Memories" -Moonlit');
});

test("choice filters combine with search and can be cleared from an empty result", async ({ page }) => {
  const originalNames = await cardNames(page).allTextContents();
  const filters = await openFilters(page);
  await filters.getByRole("searchbox", { name: "Search all fields", exact: true })
    .fill('"Starlight Memories"');
  await filters.getByRole("combobox", { name: "Add field filter", exact: true })
    .selectOption({ label: "Display status" });
  await filters.getByRole("checkbox", { name: "Displayed", exact: true }).check();
  await filters.getByRole("button", { name: "Apply filters", exact: true }).click();
  await expect.poll(async () => (await cardNames(page).allTextContents()).sort()).toEqual([
    "Moonlit Concert Tapestry", "Orchestra Performance Main Visual",
    "Starry Night Festival B1 Tapestry", "Summer Festival B2 Tapestry"
  ]);

  await openFilters(page);
  await filters.getByRole("checkbox", { name: "Displayed", exact: true }).uncheck();
  await filters.getByRole("checkbox", { name: "Stored", exact: true }).check();
  await filters.getByRole("button", { name: "Apply filters", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No matching items", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(cardNames(page)).toHaveText(originalNames);
  await expect(page.getByRole("button", { name: "Filter items", exact: true })).toBeVisible();
});

test("numeric sort and applied filters survive switching between cards and list", async ({ page }) => {
  const filters = await openFilters(page);
  await filters.getByRole("searchbox", { name: "Search all fields", exact: true })
    .fill('"Cafe Collection"');
  await filters.getByRole("button", { name: "Apply filters", exact: true }).click();
  await page.getByRole("button", { name: /^Sort items/ }).click();
  const sort = page.getByRole("dialog", { name: "Sort items", exact: true });
  await sort.getByRole("button", { name: "Sort field", exact: true }).click();
  await sort.getByRole("option", { name: "Width (cm)", exact: true }).click();
  await sort.getByText("Ascending", { exact: true }).click();
  await expect(sort.getByRole("radio", { name: "Ascending", exact: true })).toBeChecked();
  await sort.getByRole("button", { name: "Apply sort", exact: true }).click();
  const expected = [
    "Afternoon Tea Party Tapestry", "Rainy Day Cafe Tapestry",
    "Autumn Reading Room Scroll", "Winter Cafe Wall Scroll"
  ];
  await expect(cardNames(page)).toHaveText(expected);

  await page.getByRole("button", { name: "List view", exact: true }).click();
  await expect(page.getByRole("list", { name: "Collection items", exact: true })
    .getByRole("heading")).toHaveText(expected);
  await page.getByRole("button", { name: "Card view", exact: true }).click();
  await expect(cardNames(page)).toHaveText(expected);
  await expect(page.getByRole("button", { name: "Filter items, 1 active", exact: true }))
    .toBeVisible();
});
