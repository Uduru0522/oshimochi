import { parseRecordTimestamps } from "./record-lifecycle.js";
import {
  requirePositiveInteger,
  requireRecord,
  requireString
} from "./record-validation.js";

export function parseAssetRecord(value) {
  const input = requireRecord(value, "Asset");
  const mediaType = requireString(input.mediaType, "mediaType", {
    allowEmpty: false,
    canonical: true
  });
  const timestamps = parseRecordTimestamps(input);

  if (!(input.data instanceof Blob) || !mediaType.startsWith("image/")) {
    throw new TypeError("Asset data must be an image Blob.");
  }

  if (input.data.type && input.data.type !== mediaType) {
    throw new TypeError("Asset Blob type must match mediaType.");
  }

  const byteSize = requirePositiveInteger(input.byteSize, "byteSize");

  if (byteSize !== input.data.size) {
    throw new TypeError("byteSize must match the Blob size.");
  }

  return {
    id: requireString(input.id, "id", { allowEmpty: false, canonical: true }),
    data: input.data,
    mediaType,
    width: requirePositiveInteger(input.width, "width"),
    height: requirePositiveInteger(input.height, "height"),
    byteSize,
    ...timestamps
  };
}

export function createAssetRecord(input, { now = () => new Date().toISOString() } = {}) {
  const timestamp = now();

  return parseAssetRecord({
    ...input,
    id: input.id?.trim(),
    mediaType: input.mediaType?.trim(),
    byteSize: input.data?.size,
    createdAt: input.createdAt ?? timestamp,
    updatedAt: input.updatedAt ?? timestamp
  });
}
