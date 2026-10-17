export const BACKUP_ARCHIVE_MIME_TYPE = "application/gzip";

const GZIP_SIGNATURE = Object.freeze([0x1f, 0x8b]);

function requireBackupSource(value) {
  if (
    typeof value?.fileName !== "string" ||
    value.fileName.trim() === "" ||
    typeof value?.mimeType !== "string" ||
    value.mimeType.trim() === "" ||
    typeof value?.text !== "string"
  ) {
    throw new TypeError("A backup archive requires a name, media type, and text.");
  }

  return value;
}

function requireReadableBlob(value) {
  if (
    !value ||
    typeof value.arrayBuffer !== "function" ||
    typeof value.slice !== "function" ||
    typeof value.stream !== "function" ||
    typeof value.text !== "function"
  ) {
    throw new TypeError("A readable backup archive is required.");
  }

  return value;
}

function requireStreamConstructor(value, operation) {
  if (typeof value !== "function") {
    throw new Error(`This browser cannot ${operation} compressed backups.`);
  }

  return value;
}

function createArchiveFileName(fileName) {
  return fileName.toLowerCase().endsWith(".gz")
    ? fileName
    : `${fileName}.gz`;
}

async function hasGzipSignature(blob) {
  const header = new Uint8Array(await blob.slice(0, 2).arrayBuffer());

  return header.length === GZIP_SIGNATURE.length &&
    header.every((value, index) => value === GZIP_SIGNATURE[index]);
}

export async function createGzipBackupArchive(
  value,
  { CompressionStreamClass = globalThis.CompressionStream } = {}
) {
  const backup = requireBackupSource(value);
  const StreamClass = requireStreamConstructor(
    CompressionStreamClass,
    "create"
  );
  const source = new Blob([backup.text], { type: backup.mimeType });
  let compressed;

  try {
    compressed = await new Response(
      source.stream().pipeThrough(new StreamClass("gzip"))
    ).blob();
  } catch (error) {
    throw new Error("The backup could not be compressed.", { cause: error });
  }

  return Object.freeze({
    blob: new Blob([compressed], { type: BACKUP_ARCHIVE_MIME_TYPE }),
    fileName: createArchiveFileName(backup.fileName),
    mimeType: BACKUP_ARCHIVE_MIME_TYPE,
    summary: backup.summary
  });
}

export async function readBackupArchiveText(
  value,
  { DecompressionStreamClass = globalThis.DecompressionStream } = {}
) {
  const archive = requireReadableBlob(value);

  if (!await hasGzipSignature(archive)) {
    throw new TypeError("Choose a compressed Wotagoods backup archive.");
  }

  const StreamClass = requireStreamConstructor(
    DecompressionStreamClass,
    "open"
  );

  try {
    return await new Response(
      archive.stream().pipeThrough(new StreamClass("gzip"))
    ).text();
  } catch (error) {
    throw new TypeError("The compressed backup is damaged or incomplete.", {
      cause: error
    });
  }
}
