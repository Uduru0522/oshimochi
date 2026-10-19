import assert from "node:assert/strict";
import test from "node:test";

import { createSnapshotSummary } from "../../../src/application/backups/snapshot-summary.js";

test("snapshot summary separates active, deleted, and binary totals", () => {
  const snapshot = {
    application: "oshimochi",
    exportFormatVersion: 1,
    domainModelVersion: 1,
    snapshotId: "snapshot-1",
    createdAt: "2026-10-17T12:34:56.789Z",
    data: {
      goodsTypes: [
        { isDeleted: false },
        { isDeleted: true }
      ],
      fieldDefinitions: [{ isDeleted: false }],
      items: [
        { isDeleted: false },
        { isDeleted: false },
        { isDeleted: true }
      ],
      assets: [
        { byteSize: 10 },
        { byteSize: 15 }
      ]
    }
  };

  assert.deepEqual(createSnapshotSummary(snapshot), {
    application: "oshimochi",
    assetBytes: 25,
    counts: {
      dashboardCards: { total: 0 },
      assets: { total: 2 },
      fieldDefinitions: { active: 1, deleted: 0, total: 1 },
      goodsTypes: { active: 1, deleted: 1, total: 2 },
      items: { active: 2, deleted: 1, total: 3 }
    },
    createdAt: "2026-10-17T12:34:56.789Z",
    domainModelVersion: 1,
    exportFormatVersion: 1,
    snapshotId: "snapshot-1"
  });
});
