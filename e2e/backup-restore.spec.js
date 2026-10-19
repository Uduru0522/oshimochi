const { createHash } = require("node:crypto");
const { readFile } = require("node:fs/promises");
const { gunzipSync, gzipSync } = require("node:zlib");
const { test, expect } = require("./fixtures.js");
const { createCollection } = require("./helpers/collections.js");
const { openFields, stageField, applyFields } = require("./helpers/fields.js");
const { readImage } = require("./helpers/images.js");
const { createItem, itemCard, softDeleteItem } = require("./helpers/items.js");
const { readCatalogStorage } = require("./helpers/storage.js");

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await createCollection(page, "Test collection", "Catalog backup checks");
  await createItem(page, "Saved keepsake");
});

function backupRegion(page) {
  return page.getByRole("region", { name: "Backup and restore", exact: true });
}

async function exportArchive(page) {
  await page.getByRole("button", { name: "Administration", exact: true }).click();
  const pendingDownload = page.waitForEvent("download");
  await backupRegion(page).getByRole("button", { name: "Export backup", exact: true }).click();
  const download = await pendingDownload;
  const name = download.suggestedFilename();
  const buffer = await readFile(await download.path());
  await expect(backupRegion(page).getByRole("status"))
    .toHaveText(`${name} is ready in your downloads.`);
  return { name, mimeType: "application/gzip", buffer };
}

async function selectArchive(page, archive) {
  const pendingChooser = page.waitForEvent("filechooser");
  await backupRegion(page).getByRole("button", { name: "Restore from file", exact: true })
    .click();
  await (await pendingChooser).setFiles(archive);
}

async function reviewArchive(page, archive) {
  await selectArchive(page, archive);
  await expect(backupRegion(page).getByRole("heading", { name: "Review restore", exact: true }))
    .toBeVisible();
  await expect(backupRegion(page).getByText(archive.name, { exact: true })).toBeVisible();
}

async function addFieldAndDeletedItem(page) {
  await openFields(page);
  await stageField(page, { name: "Series" });
  await applyFields(page);
  await page.getByRole("button", { name: "Test collection", exact: true }).click();
  await itemCard(page, "Saved keepsake")
    .getByRole("button", { name: "Edit Saved keepsake", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Edit Test collection item", exact: true });
  await editor.getByRole("textbox", { name: /^Series/ }).fill("Starlight");
  await editor.getByRole("button", { name: "Review item", exact: true }).click();
  await editor.getByRole("button", { name: "Save changes", exact: true }).click();
  await editor.getByRole("button", { name: "Done", exact: true }).click();
  await createItem(page, "Deleted keepsake");
  await softDeleteItem(page, "Deleted keepsake");
}

test("a downloaded gzip backup contains the complete catalog without changing storage", async ({ page }) => {
  await addFieldAndDeletedItem(page);
  const before = await readCatalogStorage(page);
  const archive = await exportArchive(page);
  expect(archive.name).toMatch(/^oshimochi-backup-\d{4}-\d{2}-\d{2}T[\d-]+Z\.json\.gz$/);
  const snapshot = JSON.parse(gunzipSync(archive.buffer).toString("utf8"));
  expect(snapshot).toMatchObject({
    application: "oshimochi", exportFormatVersion: 2, domainModelVersion: 2,
    snapshotId: expect.any(String), createdAt: expect.any(String)
  });
  expect(snapshot.data.goodsTypes).toEqual(before.goodsTypes);
  expect(snapshot.data.fieldDefinitions).toEqual(before.fieldDefinitions);
  expect(snapshot.data.items).toEqual(before.items);
  expect(snapshot.data.dashboardCards).toEqual(before.dashboardCards);
  expect(snapshot.data.items.filter(({ isDeleted }) => isDeleted)).toHaveLength(1);
  expect(snapshot.data.assets.map(({ encoding, content, ...metadata }) => {
    expect(encoding).toBe("base64");
    return {
      ...metadata,
      digest: createHash("sha256").update(Buffer.from(content, "base64")).digest("hex")
    };
  })).toEqual(before.assets);
  expect(await readCatalogStorage(page)).toEqual(before);
});

test("confirmed restore replaces newer data and retains fields deleted items and image bytes", async ({ page }) => {
  await addFieldAndDeletedItem(page);
  const before = await readCatalogStorage(page);
  const image = await readImage(itemCard(page, "Saved keepsake").locator("img"));
  const archive = await exportArchive(page);
  await createCollection(page, "Newer collection");
  await createItem(page, "Newer keepsake", { collection: "Newer collection" });
  const newer = await readCatalogStorage(page);
  expect(newer.items).toHaveLength(3);
  await page.getByRole("button", { name: "Administration", exact: true }).click();
  await reviewArchive(page, archive);
  await expect(backupRegion(page).getByText("2 total, 1 deleted", { exact: true })).toBeVisible();
  expect(await readCatalogStorage(page)).toEqual(newer);
  await backupRegion(page).getByRole("button", { name: "Restore this backup", exact: true }).click();
  await expect(page.getByRole("button", { name: "Newer collection", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Test collection", exact: true }).click();
  expect(await readCatalogStorage(page)).toEqual(before);
  expect(await readImage(itemCard(page, "Saved keepsake").locator("img"))).toEqual(image);
  await page.reload();
  await page.getByRole("button", { name: "Test collection", exact: true }).click();
  expect(await readCatalogStorage(page)).toEqual(before);
  expect(await readImage(itemCard(page, "Saved keepsake").locator("img"))).toEqual(image);
  await page.getByRole("button", { name: "Deleted items", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Deleted items in Test collection", exact: true })
    .getByRole("button", { name: "Restore Deleted keepsake", exact: true })).toBeVisible();
});

test("cancelling restore review leaves the newer catalog unchanged after reload", async ({ page }) => {
  const archive = await exportArchive(page);
  await createCollection(page, "Newer collection");
  const before = await readCatalogStorage(page);
  await page.getByRole("button", { name: "Administration", exact: true }).click();
  await reviewArchive(page, archive);
  await backupRegion(page).getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(backupRegion(page).getByRole("button", { name: "Restore from file", exact: true }))
    .toBeVisible();
  expect(await readCatalogStorage(page)).toEqual(before);
  await page.reload();
  await expect(page.getByRole("button", { name: "Newer collection", exact: true })).toBeVisible();
  expect(await readCatalogStorage(page)).toEqual(before);
});

test("debug restore changes only its temporary catalog and resets on reload", async ({ page }) => {
  const archive = await exportArchive(page);
  await page.getByRole("button", { name: "Test collection", exact: true }).click();
  await createItem(page, "Newer user keepsake");
  const before = await readCatalogStorage(page);
  await page.goto("./?debug=1");
  await expect(page.getByRole("button", { name: "Tapestries", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Administration", exact: true }).click();
  await reviewArchive(page, archive);
  await backupRegion(page).getByRole("button", { name: "Restore this backup", exact: true }).click();
  await page.getByRole("button", { name: "Test collection", exact: true }).click();
  await expect(itemCard(page, "Saved keepsake")).toBeVisible();
  await expect(itemCard(page, "Newer user keepsake")).toHaveCount(0);
  expect(await readCatalogStorage(page)).toEqual(before);
  await page.reload();
  await expect(page.getByRole("button", { name: "Tapestries", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Test collection", exact: true })).toHaveCount(0);
  await page.goto("./");
  await page.getByRole("button", { name: "Test collection", exact: true }).click();
  await expect(itemCard(page, "Newer user keepsake")).toBeVisible();
  expect(await readCatalogStorage(page)).toEqual(before);
});

test.describe("invalid local backup files", () => {
  test.use({ expectedConsoleErrors: [/^Local backup could not be inspected:/] });

  const invalidArchives = [
    { name: "uncompressed JSON", transform: (archive, snapshot) => Buffer.from(JSON.stringify(snapshot)) },
    { name: "truncated gzip", transform: (archive) => archive.buffer.subarray(0, 10) },
    {
      name: "unsupported snapshot version",
      transform: (archive, snapshot) => gzipSync(JSON.stringify({ ...snapshot, exportFormatVersion: 999 }))
    },
    {
      name: "missing image records",
      transform: (archive, snapshot) => gzipSync(JSON.stringify({
        ...snapshot, data: { ...snapshot.data, assets: [] }
      }))
    }
  ];

  for (const { name, transform } of invalidArchives) {
    test(`${name} is rejected without changing the catalog`, async ({ page }) => {
      const before = await readCatalogStorage(page);
      const archive = await exportArchive(page);
      const snapshot = JSON.parse(gunzipSync(archive.buffer).toString("utf8"));
      await selectArchive(page, { ...archive, buffer: transform(archive, snapshot) });
      await expect(backupRegion(page).getByRole("alert")).toHaveText(
        "This backup could not be opened. Choose a valid Oshimochi backup file."
      );
      await expect(backupRegion(page).getByRole("button", { name: "Restore this backup", exact: true }))
        .toHaveCount(0);
      await expect(backupRegion(page).getByRole("button", { name: "Restore from file", exact: true }))
        .toBeEnabled();
      expect(await readCatalogStorage(page)).toEqual(before);
      await page.reload();
      await page.getByRole("button", { name: "Test collection", exact: true }).click();
      await expect(itemCard(page, "Saved keepsake")).toBeVisible();
      expect(await readCatalogStorage(page)).toEqual(before);
    });
  }
});
