import { translate } from "../../localization/translate.js";
import { createActionButton } from "../../shared/action-button.js";
import { createElement } from "../../shared/dom.js";
import { createMetaList } from "../../shared/ui-components.js";

function formatDateTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.valueOf())) {
    return translate("Unknown date");
  }

  return new Intl.DateTimeFormat(document.documentElement.lang, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function formatBytes(value) {
  if (!Number.isFinite(value) || value < 0) {
    return translate("Size unavailable");
  }

  const units = ["B", "KB", "MB", "GB"];
  let amount = value;
  let unitIndex = 0;

  while (amount >= 1000 && unitIndex < units.length - 1) {
    amount /= 1000;
    unitIndex += 1;
  }

  return `${new Intl.NumberFormat(document.documentElement.lang, {
    maximumFractionDigits: unitIndex === 0 ? 0 : 1
  }).format(amount)} ${units[unitIndex]}`;
}

function formatLifecycleCount({ deleted, total }) {
  return translate("{count} total, {deleted} deleted", {
    count: total,
    deleted
  });
}

export function createSnapshotPicker({ providerName, snapshots }) {
  const content = createElement("div", { className: "backup-review" });
  const heading = createElement("div", { className: "form-heading" });
  const list = createElement("ul", { className: "backup-snapshot-list" });
  const status = createElement("div", {
    attributes: { "aria-live": "polite" },
    className: "creation-status"
  });
  const actions = createElement("div", { className: "form-actions" });
  const cancelButton = createActionButton(translate("Back to backup options"));
  const options = [];

  heading.append(
    createElement("h3", {
      textContent: translate("Restore from {provider}", {
        provider: providerName
      })
    }),
    createElement("p", {
      textContent: translate("Choose a backup to validate and review.")
    })
  );

  snapshots.forEach((snapshot) => {
    const item = createElement("li");
    const button = createElement("button", {
      attributes: { type: "button" },
      className: "backup-snapshot-option"
    });

    button.append(
      createElement("strong", {
        textContent: snapshot.fileName || translate("Unnamed backup")
      }),
      createElement("span", {
        textContent: translate("{date} - {size}", {
          date: formatDateTime(snapshot.createdAt ?? snapshot.updatedAt),
          size: formatBytes(snapshot.size)
        })
      })
    );
    options.push({ button, snapshot });
    item.append(button);
    list.append(item);
  });

  if (snapshots.length === 0) {
    list.append(
      createElement("li", {
        className: "empty-note",
        textContent: translate("No cloud backups yet.")
      })
    );
  }

  actions.append(cancelButton);
  content.append(heading, list, status, actions);
  return { content, status, cancelButton, options };
}

export function createRestoreReview({ summary, fileName }) {
  const review = createElement("div", { className: "backup-review" });
  const heading = createElement("div", { className: "form-heading" });
  const warning = createElement("p", {
    className: "backup-replacement-warning",
    textContent: translate(
      "Restoring this backup replaces every local collection, field, item, and image. This cannot be undone inside the app."
    )
  });
  const status = createElement("div", {
    attributes: { "aria-live": "polite" },
    className: "creation-status"
  });
  const actions = createElement("div", { className: "form-actions" });
  const cancelButton = createActionButton(translate("Cancel"));
  const restoreButton = createActionButton(translate("Restore this backup"), {
    className: "danger-action"
  });

  heading.append(
    createElement("h3", { textContent: translate("Review restore") }),
    createElement("p", {
      textContent: translate(
        "The file is valid. Review its contents before replacing local data."
      )
    })
  );
  review.append(
    heading,
    createMetaList([
      { label: translate("Backup file"), value: fileName },
      { label: translate("Created"), value: formatDateTime(summary.createdAt) },
      {
        label: translate("Goods types"),
        value: formatLifecycleCount(summary.counts.goodsTypes)
      },
      {
        label: translate("Fields"),
        value: formatLifecycleCount(summary.counts.fieldDefinitions)
      },
      {
        label: translate("Items"),
        value: formatLifecycleCount(summary.counts.items)
      },
      {
        label: translate("Images"),
        value: translate("{count} files, {size}", {
          count: summary.counts.assets.total,
          size: formatBytes(summary.assetBytes)
        })
      }
    ]),
    warning,
    status,
    actions
  );
  actions.append(cancelButton, restoreButton);
  return { review, status, cancelButton, restoreButton };
}

export function createRestoreRefreshError() {
  const content = createElement("div", { className: "backup-committed" });
  const reloadButton = createActionButton(translate("Reload application"), {
    className: "primary-action"
  });

  content.append(
    createElement("h3", { textContent: translate("Backup restored") }),
    createElement("p", {
      textContent: translate(
        "Local data was replaced, but the screen could not refresh. Reload the application to continue."
      )
    }),
    reloadButton
  );
  return { content, reloadButton };
}
