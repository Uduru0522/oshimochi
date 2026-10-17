import assert from "node:assert/strict";
import test from "node:test";

import {
  SNAPSHOT_APPLICATION,
  SNAPSHOT_FORMAT_VERSION,
  createPortableSnapshot,
  createSnapshotFileName,
  deserializePortableSnapshot,
  parsePortableSnapshot,
  serializePortableSnapshot
} from "../../../src/application/backups/snapshot-format.js";
import { createDataCatalogFixture } from "../../../test-support/data-catalog-fixtures.js";

const CREATED_AT = "2026-10-17T12:34:56.789Z";
const SNAPSHOT_ID = "snapshot-1";

async function createSnapshot() {
  return createPortableSnapshot(createDataCatalogFixture(), {
    generateId: () => SNAPSHOT_ID,
    now: () => CREATED_AT
  });
}

test("portable snapshot uses the current identity and versions", async () => {
  const snapshot = await createSnapshot();

  assert.equal(snapshot.application, SNAPSHOT_APPLICATION);
  assert.equal(snapshot.exportFormatVersion, SNAPSHOT_FORMAT_VERSION);
  assert.equal(snapshot.domainModelVersion, 1);
  assert.equal(snapshot.snapshotId, SNAPSHOT_ID);
  assert.equal(snapshot.createdAt, CREATED_AT);
});

test("portable snapshot orders each record set by identity", async () => {
  const catalog = createDataCatalogFixture();
  const secondItem = {
    ...catalog.items[0],
    id: "aaa-item",
    imageAssetId: null,
    name: "First by identity"
  };
  catalog.items.unshift(secondItem);

  const snapshot = await createPortableSnapshot(catalog, {
    generateId: () => SNAPSHOT_ID,
    now: () => CREATED_AT
  });

  assert.deepEqual(
    snapshot.data.items.map(({ id }) => id),
    ["aaa-item", "item-1"]
  );
  assert.deepEqual(
    snapshot.data.fieldDefinitions.map(({ id }) => id),
    [...snapshot.data.fieldDefinitions.map(({ id }) => id)].sort()
  );
});

test("portable snapshot round trip preserves image bytes and domain records", async () => {
  const catalog = createDataCatalogFixture();
  const serialized = serializePortableSnapshot(
    await createPortableSnapshot(catalog, {
      generateId: () => SNAPSHOT_ID,
      now: () => CREATED_AT
    })
  );

  const result = await deserializePortableSnapshot(serialized);

  assert.deepEqual(
    new Uint8Array(await result.catalog.assets[0].data.arrayBuffer()),
    new Uint8Array(await catalog.assets[0].data.arrayBuffer())
  );
  assert.deepEqual(
    {
      ...result.catalog,
      assets: result.catalog.assets.map(({ data, ...asset }) => asset)
    },
    {
      ...catalog,
      assets: catalog.assets.map(({ data, ...asset }) => asset),
      fieldDefinitions: [...catalog.fieldDefinitions].sort(
        (left, right) => left.id.localeCompare(right.id)
      )
    }
  );
});

test("portable snapshot serialization is readable and ends with one newline", async () => {
  const serialized = serializePortableSnapshot(await createSnapshot());

  assert.match(serialized, /^\{\n  "application": "oshimochi"/);
  assert.equal(serialized.endsWith("\n"), true);
  assert.equal(serialized.endsWith("\n\n"), false);
});

test("portable snapshot rejects another application identity", async () => {
  const snapshot = await createSnapshot();
  snapshot.application = "another-app";

  await assert.rejects(
    parsePortableSnapshot(snapshot),
    /not an Oshimochi snapshot/
  );
});

test("portable snapshot rejects an unsupported format version", async () => {
  const snapshot = await createSnapshot();
  snapshot.exportFormatVersion = 2;

  await assert.rejects(
    parsePortableSnapshot(snapshot),
    /Unsupported snapshot format version/
  );
});

test("portable snapshot rejects malformed base64 image content", async () => {
  const snapshot = await createSnapshot();
  snapshot.data.assets[0].content = "not base64";

  await assert.rejects(parsePortableSnapshot(snapshot), /canonical base64/);
});

test("portable snapshot rejects image byte-size mismatch", async () => {
  const snapshot = await createSnapshot();
  snapshot.data.assets[0].byteSize += 1;

  await assert.rejects(parsePortableSnapshot(snapshot), /byteSize/);
});

test("portable snapshot rejects broken domain relationships", async () => {
  const snapshot = await createSnapshot();
  snapshot.data.assets = [];

  await assert.rejects(parsePortableSnapshot(snapshot), /unknown image asset/);
});

test("portable snapshot reports malformed JSON separately", async () => {
  await assert.rejects(
    deserializePortableSnapshot("{"),
    /valid JSON/
  );
});

test("snapshot filename uses a filesystem-safe UTC timestamp", () => {
  assert.equal(
    createSnapshotFileName(CREATED_AT),
    "oshimochi-backup-2026-10-17T12-34-56-789Z.json"
  );
});
