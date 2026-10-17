import {
  SNAPSHOT_MIME_TYPE,
  createPortableSnapshot,
  createSnapshotFileName,
  deserializePortableSnapshot,
  serializePortableSnapshot
} from "./snapshot-format.js";
import { createSnapshotSummary } from "./snapshot-summary.js";

function defaultIdGenerator() {
  return globalThis.crypto.randomUUID();
}

export function createBackupOperations({
  storage,
  generateId = defaultIdGenerator,
  now = () => new Date().toISOString()
}) {
  if (
    typeof storage?.readDataCatalog !== "function" ||
    typeof storage?.replaceDataCatalog !== "function"
  ) {
    throw new TypeError("Backup operations require complete catalog storage.");
  }

  const catalogsByCandidate = new WeakMap();

  async function createExport() {
    const catalog = await storage.readDataCatalog();
    const snapshot = await createPortableSnapshot(catalog, {
      generateId,
      now
    });

    return Object.freeze({
      fileName: createSnapshotFileName(snapshot.createdAt),
      mimeType: SNAPSHOT_MIME_TYPE,
      summary: createSnapshotSummary(snapshot),
      text: serializePortableSnapshot(snapshot)
    });
  }

  async function inspect(text) {
    const { catalog, snapshot } = await deserializePortableSnapshot(text);
    const candidate = Object.freeze({
      summary: createSnapshotSummary(snapshot)
    });

    catalogsByCandidate.set(candidate, catalog);
    return candidate;
  }

  async function restore(candidate) {
    const catalog = catalogsByCandidate.get(candidate);

    if (!catalog) {
      throw new TypeError("Restore requires a validated snapshot candidate.");
    }

    const result = await storage.replaceDataCatalog(catalog);
    catalogsByCandidate.delete(candidate);
    return result;
  }

  return Object.freeze({ createExport, inspect, restore });
}
