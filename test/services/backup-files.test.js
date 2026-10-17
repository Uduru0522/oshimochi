import assert from "node:assert/strict";
import test from "node:test";

import { createBackupFileService } from "../../src/services/backup-files.js";

test("backup file service downloads an archive through a temporary object URL", async () => {
  const events = [];
  const archive = {
    blob: new Blob(["compressed"], { type: "application/gzip" }),
    fileName: "backup.json.gz",
    mimeType: "application/gzip"
  };
  const link = {
    click() {
      events.push("click");
    },
    remove() {
      events.push("remove");
    }
  };
  const service = createBackupFileService({
    async createArchive(backup) {
      assert.equal(backup.text, "{}");
      return archive;
    },
    documentObject: {
      body: {
        append(value) {
          assert.equal(value, link);
          events.push("append");
        }
      },
      createElement(tagName) {
        assert.equal(tagName, "a");
        return link;
      }
    },
    schedule(callback, delay) {
      assert.equal(delay, 0);
      events.push("schedule");
      callback();
    },
    urlApi: {
      createObjectURL(blob) {
        assert.equal(blob, archive.blob);
        events.push("create");
        return "blob:backup";
      },
      revokeObjectURL(value) {
        assert.equal(value, "blob:backup");
        events.push("revoke");
      }
    }
  });

  const result = await service.download({
    fileName: "backup.json",
    mimeType: "application/json",
    text: "{}"
  });

  assert.equal(result, archive);
  assert.equal(link.download, "backup.json.gz");
  assert.equal(link.href, "blob:backup");
  assert.equal(link.hidden, true);
  assert.deepEqual(events, [
    "create",
    "append",
    "click",
    "remove",
    "schedule",
    "revoke"
  ]);
});

test("backup file service reads a selected gzip archive", async () => {
  const service = createBackupFileService({
    readArchiveText: async (file) => {
      assert.equal(file.type, "application/gzip");
      return "snapshot";
    }
  });

  assert.equal(
    await service.readText(new Blob(["compressed"], { type: "application/gzip" })),
    "snapshot"
  );
});

test("backup file service releases its object URL after a failed click", async () => {
  const events = [];
  const service = createBackupFileService({
    createArchive: async () => ({
      blob: new Blob(["compressed"], { type: "application/gzip" }),
      fileName: "backup.json.gz",
      mimeType: "application/gzip"
    }),
    documentObject: {
      body: { append() {} },
      createElement() {
        return {
          click() {
            throw new Error("download blocked");
          },
          remove() {
            events.push("remove");
          }
        };
      }
    },
    schedule(callback) {
      callback();
    },
    urlApi: {
      createObjectURL: () => "blob:backup",
      revokeObjectURL(value) {
        events.push(`revoke:${value}`);
      }
    }
  });

  await assert.rejects(
    service.download({
      fileName: "backup.json",
      mimeType: "application/json",
      text: "{}"
    }),
    /download blocked/
  );
  assert.deepEqual(events, ["remove", "revoke:blob:backup"]);
});

test("backup file service rejects an unreadable selection", async () => {
  const service = createBackupFileService();

  await assert.rejects(service.readText({}), /readable backup archive/);
});
