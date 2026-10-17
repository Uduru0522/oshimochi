import {
  STORAGE_ERROR_CODES,
  StorageError
} from "../contracts/storage-contract.js";
import {
  DATABASE_NAME,
  DATABASE_VERSION,
  upgradeDatabase
} from "./database-schema.js";

function createConnectionError(message, code, cause) {
  return new StorageError(message, { cause, code });
}

export function openDatabase({
  databaseName = DATABASE_NAME,
  indexedDBFactory,
  version = DATABASE_VERSION
}) {
  if (!indexedDBFactory) {
    return Promise.reject(
      createConnectionError(
        "IndexedDB is unavailable in this browser.",
        STORAGE_ERROR_CODES.unavailable
      )
    );
  }

  return new Promise((resolve, reject) => {
    let isSettled = false;
    let request;

    function rejectOnce(error) {
      if (!isSettled) {
        isSettled = true;
        reject(error);
      }
    }

    try {
      request = indexedDBFactory.open(databaseName, version);
    } catch (error) {
      rejectOnce(
        createConnectionError(
          "The local database could not be opened.",
          STORAGE_ERROR_CODES.initializationFailed,
          error
        )
      );
      return;
    }

    request.onupgradeneeded = (event) => {
      try {
        upgradeDatabase(request.result, event.oldVersion, request.transaction);
      } catch (error) {
        request.transaction?.abort();
        rejectOnce(
          createConnectionError(
            "The local database could not be upgraded.",
            STORAGE_ERROR_CODES.initializationFailed,
            error
          )
        );
      }
    };

    request.onerror = () => {
      rejectOnce(
        createConnectionError(
          "The local database could not be opened.",
          STORAGE_ERROR_CODES.initializationFailed,
          request.error
        )
      );
    };

    request.onblocked = () => {
      rejectOnce(
        createConnectionError(
          "A different app tab is blocking the local database upgrade. Close other Wotagoods tabs and retry.",
          STORAGE_ERROR_CODES.upgradeBlocked
        )
      );
    };

    request.onsuccess = () => {
      if (isSettled) {
        request.result.close();
        return;
      }

      isSettled = true;
      resolve(request.result);
    };
  });
}
