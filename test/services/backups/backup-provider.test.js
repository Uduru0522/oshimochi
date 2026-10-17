import assert from "node:assert/strict";
import test from "node:test";

import {
  BACKUP_PROVIDER_STATUS,
  assertBackupProvider,
  createBackupProviderState
} from "../../../src/services/backups/backup-provider.js";

function createProvider() {
  return {
    clearConfiguration() {},
    connect() {},
    configure() {},
    disconnect() {},
    downloadSnapshot() {},
    getConfiguration() {},
    getState() {},
    id: "example",
    isConfigured() {},
    listSnapshots() {},
    name: "Example",
    prepare() {},
    selectDestination() {},
    subscribe() {},
    uploadSnapshot() {}
  };
}

test("backup provider contract accepts a complete provider", () => {
  const provider = createProvider();

  assert.equal(assertBackupProvider(provider), provider);
});

test("backup provider contract rejects one missing an operation", () => {
  const provider = createProvider();

  delete provider.downloadSnapshot;

  assert.throws(
    () => assertBackupProvider(provider),
    /missing downloadSnapshot/
  );
});

test("backup provider state freezes copied account and snapshot values", () => {
  const account = { email: "owner@example.com", uid: "owner" };
  const lastBackup = { id: "snapshot-1" };
  const state = createBackupProviderState({
    account,
    lastBackup,
    status: BACKUP_PROVIDER_STATUS.connected
  });

  account.email = "changed@example.com";
  lastBackup.id = "changed";

  assert.equal(state.account.email, "owner@example.com");
  assert.equal(state.lastBackup.id, "snapshot-1");
  assert.equal(Object.isFrozen(state), true);
  assert.equal(Object.isFrozen(state.account), true);
});

test("backup provider state rejects an unknown status", () => {
  assert.throws(
    () => createBackupProviderState({ status: "unknown" }),
    /Unsupported backup provider status/
  );
});
