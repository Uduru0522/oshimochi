import { parseDataCatalog } from "../../data/models/data-catalog.js";
import { DOMAIN_MODEL_VERSION } from "../../data/models/domain-model.js";
import {
  requireRecord,
  requireString,
  requireTimestamp
} from "../../data/models/record-validation.js";
import {
  decodeBase64ToBytes,
  encodeBytesToBase64
} from "./base64.js";

export const SNAPSHOT_APPLICATION = "wotagoods-manager";
export const SNAPSHOT_FORMAT_VERSION = 1;
export const SNAPSHOT_MIME_TYPE = "application/json";

function defaultIdGenerator() {
  return globalThis.crypto.randomUUID();
}

function compareIds(left, right) {
  if (left.id === right.id) {
    return 0;
  }

  return left.id < right.id ? -1 : 1;
}

function sortRecords(records) {
  return [...records].sort(compareIds);
}

function createPortableAsset(asset, content) {
  return {
    id: asset.id,
    mediaType: asset.mediaType,
    width: asset.width,
    height: asset.height,
    byteSize: asset.byteSize,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
    encoding: "base64",
    content
  };
}

async function encodeAsset(asset) {
  const bytes = new Uint8Array(await asset.data.arrayBuffer());
  return createPortableAsset(asset, encodeBytesToBase64(bytes));
}

async function decodeAsset(value) {
  const input = requireRecord(value, "Snapshot asset");

  if (input.encoding !== "base64") {
    throw new TypeError("Snapshot asset encoding must be base64.");
  }

  const bytes = decodeBase64ToBytes(input.content);
  const data = new Blob([bytes], { type: input.mediaType });

  return {
    domain: {
      id: input.id,
      data,
      mediaType: input.mediaType,
      width: input.width,
      height: input.height,
      byteSize: input.byteSize,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt
    },
    portable: createPortableAsset(input, input.content)
  };
}

function requireVersion(value, expected, fieldName) {
  if (!Number.isSafeInteger(value) || value !== expected) {
    throw new TypeError(`Unsupported ${fieldName}: ${String(value)}.`);
  }

  return value;
}

function requireSnapshotData(value) {
  const data = requireRecord(value, "Snapshot data");

  for (const key of ["goodsTypes", "fieldDefinitions", "items", "assets"]) {
    if (!Array.isArray(data[key])) {
      throw new TypeError(`Snapshot ${key} must be an array.`);
    }
  }

  return data;
}

function createSnapshotEnvelope({ createdAt, data, snapshotId }) {
  return {
    application: SNAPSHOT_APPLICATION,
    exportFormatVersion: SNAPSHOT_FORMAT_VERSION,
    domainModelVersion: DOMAIN_MODEL_VERSION,
    snapshotId,
    createdAt,
    data
  };
}

export async function createPortableSnapshot(
  value,
  {
    generateId = defaultIdGenerator,
    now = () => new Date().toISOString()
  } = {}
) {
  const catalog = parseDataCatalog(value);
  const createdAt = requireTimestamp(now(), "createdAt");
  const snapshotId = requireString(generateId(), "snapshotId", {
    allowEmpty: false,
    canonical: true
  });
  const assets = await Promise.all(sortRecords(catalog.assets).map(encodeAsset));

  return createSnapshotEnvelope({
    createdAt,
    snapshotId,
    data: {
      goodsTypes: sortRecords(catalog.goodsTypes),
      fieldDefinitions: sortRecords(catalog.fieldDefinitions),
      items: sortRecords(catalog.items),
      assets
    }
  });
}

export async function parsePortableSnapshot(value) {
  const input = requireRecord(value, "Snapshot");

  if (input.application !== SNAPSHOT_APPLICATION) {
    throw new TypeError("This file is not a Wotagoods Manager snapshot.");
  }

  requireVersion(
    input.exportFormatVersion,
    SNAPSHOT_FORMAT_VERSION,
    "snapshot format version"
  );
  requireVersion(
    input.domainModelVersion,
    DOMAIN_MODEL_VERSION,
    "domain model version"
  );

  const snapshotId = requireString(input.snapshotId, "snapshotId", {
    allowEmpty: false,
    canonical: true
  });
  const createdAt = requireTimestamp(input.createdAt, "createdAt");
  const data = requireSnapshotData(input.data);
  const decodedAssets = await Promise.all(data.assets.map(decodeAsset));
  const catalog = parseDataCatalog({
    assets: decodedAssets.map(({ domain }) => domain),
    fieldDefinitions: data.fieldDefinitions,
    goodsTypes: data.goodsTypes,
    items: data.items
  });
  const snapshot = createSnapshotEnvelope({
    createdAt,
    snapshotId,
    data: {
      goodsTypes: sortRecords(catalog.goodsTypes),
      fieldDefinitions: sortRecords(catalog.fieldDefinitions),
      items: sortRecords(catalog.items),
      assets: decodedAssets
        .map(({ portable }) => portable)
        .sort(compareIds)
    }
  });

  return { catalog, snapshot };
}

export function serializePortableSnapshot(snapshot) {
  return `${JSON.stringify(snapshot, null, 2)}\n`;
}

export async function deserializePortableSnapshot(text) {
  if (typeof text !== "string") {
    throw new TypeError("Snapshot content must be text.");
  }

  let value;

  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new TypeError("Snapshot content must be valid JSON.", { cause: error });
  }

  return parsePortableSnapshot(value);
}

export function createSnapshotFileName(createdAt) {
  const timestamp = requireTimestamp(createdAt, "createdAt")
    .replace(/[:.]/g, "-");

  return `wotagoods-backup-${timestamp}.json`;
}
