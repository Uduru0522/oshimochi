const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const ENCODE_CHUNK_SIZE = 0x8000;

export function encodeBytesToBase64(bytes) {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError("Base64 encoding requires a Uint8Array.");
  }

  let binary = "";

  for (let index = 0; index < bytes.length; index += ENCODE_CHUNK_SIZE) {
    binary += String.fromCharCode(
      ...bytes.subarray(index, index + ENCODE_CHUNK_SIZE)
    );
  }

  return btoa(binary);
}

export function decodeBase64ToBytes(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length % 4 !== 0 ||
    !BASE64_PATTERN.test(value)
  ) {
    throw new TypeError("Image content must use canonical base64.");
  }

  let binary;

  try {
    binary = atob(value);
  } catch (error) {
    throw new TypeError("Image content must use canonical base64.", {
      cause: error
    });
  }

  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  if (encodeBytesToBase64(bytes) !== value) {
    throw new TypeError("Image content must use canonical base64.");
  }

  return bytes;
}
