export function describeItemSaveError(error) {
  let current = error;
  let deepestMessage = "";

  while (current instanceof Error) {
    if (current.name === "QuotaExceededError") {
      return translate("The item could not be saved because browser storage is full.");
    }

    if (current.message) {
      deepestMessage = current.message;
    }
    current = current.cause;
  }

  return deepestMessage || translate("The browser rejected the item save operation.");
}
import { translate } from "../../localization/translate.js";
