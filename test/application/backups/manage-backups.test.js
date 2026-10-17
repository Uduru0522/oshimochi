import assert from "node:assert/strict";
import test from "node:test";

import { createBackupOperations } from "../../../src/application/backups/manage-backups.js";
import { createDataCatalogFixture } from "../../../test-support/data-catalog-fixtures.js";

const CREATED_AT = "2026-10-17T12:34:56.789Z";

function createStorage(catalog = createDataCatalogFixture()) {
  const calls = {
    reads: 0,
    replacements: []
  };

  return {
    calls,
    async readDataCatalog() {
      calls.reads += 1;
      return structuredClone(catalog);
    },
    async replaceDataCatalog(replacement) {
      calls.replacements.push(structuredClone(replacement));
      return structuredClone(replacement);
    }
  };
}

function createOperations(storage) {
  return createBackupOperations({
    storage,
    generateId: () => "snapshot-1",
    now: () => CREATED_AT
  });
}

test("backup export reads once and returns a downloadable snapshot", async () => {
  const storage = createStorage();
  const backups = createOperations(storage);

  const result = await backups.createExport();

  assert.equal(storage.calls.reads, 1);
  assert.deepEqual(storage.calls.replacements, []);
  assert.equal(
    result.fileName,
    "oshimochi-backup-2026-10-17T12-34-56-789Z.json"
  );
  assert.equal(result.mimeType, "application/json");
  assert.equal(JSON.parse(result.text).snapshotId, "snapshot-1");
  assert.equal(result.summary.counts.items.total, 1);
});

test("backup inspection validates without writing local data", async () => {
  const sourceStorage = createStorage();
  const sourceBackups = createOperations(sourceStorage);
  const exported = await sourceBackups.createExport();
  const targetStorage = createStorage();
  const targetBackups = createOperations(targetStorage);

  const candidate = await targetBackups.inspect(exported.text);

  assert.equal(candidate.summary.snapshotId, "snapshot-1");
  assert.deepEqual(targetStorage.calls.replacements, []);
});

test("backup restore replaces data from its validated candidate", async () => {
  const sourceBackups = createOperations(createStorage());
  const exported = await sourceBackups.createExport();
  const targetStorage = createStorage();
  const targetBackups = createOperations(targetStorage);
  const candidate = await targetBackups.inspect(exported.text);

  await targetBackups.restore(candidate);

  assert.equal(targetStorage.calls.replacements.length, 1);
  assert.equal(targetStorage.calls.replacements[0].items[0].name, "Example");
});

test("backup restore rejects an object that was not inspected", async () => {
  const storage = createStorage();
  const backups = createOperations(storage);

  await assert.rejects(
    backups.restore({ summary: {} }),
    /validated snapshot candidate/
  );
  assert.deepEqual(storage.calls.replacements, []);
});

test("backup inspection rejects invalid content before replacement", async () => {
  const storage = createStorage();
  const backups = createOperations(storage);

  await assert.rejects(backups.inspect("{}"));

  assert.deepEqual(storage.calls.replacements, []);
});

test("backup restore candidate cannot be reused after a successful replacement", async () => {
  const sourceBackups = createOperations(createStorage());
  const exported = await sourceBackups.createExport();
  const targetStorage = createStorage();
  const targetBackups = createOperations(targetStorage);
  const candidate = await targetBackups.inspect(exported.text);

  await targetBackups.restore(candidate);

  await assert.rejects(
    targetBackups.restore(candidate),
    /validated snapshot candidate/
  );
  assert.equal(targetStorage.calls.replacements.length, 1);
});

test("backup restore candidate remains usable after a failed replacement", async () => {
  const sourceBackups = createOperations(createStorage());
  const exported = await sourceBackups.createExport();
  const targetStorage = createStorage();
  const originalReplace = targetStorage.replaceDataCatalog;
  let shouldFail = true;

  targetStorage.replaceDataCatalog = async (catalog) => {
    if (shouldFail) {
      shouldFail = false;
      throw new Error("write failed");
    }

    return originalReplace(catalog);
  };

  const targetBackups = createOperations(targetStorage);
  const candidate = await targetBackups.inspect(exported.text);

  await assert.rejects(targetBackups.restore(candidate), /write failed/);
  await targetBackups.restore(candidate);

  assert.equal(targetStorage.calls.replacements.length, 1);
  assert.equal(targetStorage.calls.replacements[0].items[0].name, "Example");
});
