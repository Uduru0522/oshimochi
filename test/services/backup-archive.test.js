import assert from "node:assert/strict";
import test from "node:test";

import {
  BACKUP_ARCHIVE_MIME_TYPE,
  createGzipBackupArchive,
  readBackupArchiveText
} from "../../src/services/backup-archive.js";

const REPETITIVE_SNAPSHOT = JSON.stringify({
  application: "oshimochi",
  content: "portable-content-".repeat(4_000)
});

test("backup archive creates a smaller gzip file for compressible content", async () => {
  const summary = Object.freeze({ snapshotId: "snapshot-1" });
  const archive = await createGzipBackupArchive({
    fileName: "oshimochi-backup.json",
    mimeType: "application/json",
    summary,
    text: REPETITIVE_SNAPSHOT
  });

  assert.equal(archive.fileName, "oshimochi-backup.json.gz");
  assert.equal(archive.mimeType, BACKUP_ARCHIVE_MIME_TYPE);
  assert.equal(archive.blob.type, BACKUP_ARCHIVE_MIME_TYPE);
  assert.equal(archive.summary, summary);
  assert.ok(archive.blob.size < new Blob([REPETITIVE_SNAPSHOT]).size);
});

test("backup archive restores gzip content exactly", async () => {
  const archive = await createGzipBackupArchive({
    fileName: "backup.json",
    mimeType: "application/json",
    text: REPETITIVE_SNAPSHOT
  });

  assert.equal(await readBackupArchiveText(archive.blob), REPETITIVE_SNAPSHOT);
});

test("backup archive reader rejects uncompressed content", async () => {
  const plainText = new Blob([REPETITIVE_SNAPSHOT], {
    type: "application/json"
  });

  await assert.rejects(
    readBackupArchiveText(plainText),
    /compressed Oshimochi backup archive/
  );
});

test("backup archive reader rejects damaged gzip content", async () => {
  const damaged = new Blob([
    new Uint8Array([0x1f, 0x8b, 0x00, 0x01, 0x02])
  ], { type: BACKUP_ARCHIVE_MIME_TYPE });

  await assert.rejects(
    readBackupArchiveText(damaged),
    /compressed backup is damaged or incomplete/
  );
});
