import {
  createGzipBackupArchive,
  readBackupArchiveText
} from "./backup-archive.js";

export function createBackupFileService({
  createArchive = createGzipBackupArchive,
  documentObject = globalThis.document,
  readArchiveText = readBackupArchiveText,
  schedule = globalThis.setTimeout,
  urlApi = globalThis.URL
} = {}) {
  async function download(backup) {
    const archive = await createArchive(backup);

    if (
      typeof archive?.fileName !== "string" ||
      archive.fileName.trim() === "" ||
      typeof archive?.mimeType !== "string" ||
      archive.mimeType.trim() === "" ||
      !(archive.blob instanceof Blob)
    ) {
      throw new TypeError("A backup download requires a compressed archive.");
    }

    const objectUrl = urlApi.createObjectURL(archive.blob);
    const link = documentObject.createElement("a");

    link.download = archive.fileName;
    link.href = objectUrl;
    link.hidden = true;

    try {
      documentObject.body.append(link);
      link.click();
    } finally {
      link.remove();
      schedule(() => urlApi.revokeObjectURL(objectUrl), 0);
    }

    return archive;
  }

  async function readText(file) {
    return readArchiveText(file);
  }

  return Object.freeze({ download, readText });
}
