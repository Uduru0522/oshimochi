import { translate } from "../../localization/translate.js";
import { createElement } from "../../shared/dom.js";

export function createProgressStatus(message) {
  const status = createElement("div", { className: "creation-status" });

  status.append(
    createElement("progress", { className: "creation-progress" }),
    createElement("span", { textContent: message })
  );
  return status;
}

export function createBlockingProgress() {
  const dialog = createElement("dialog", {
    attributes: {
      "aria-label": translate("Backup operation in progress"),
      tabindex: "-1"
    },
    className: "backup-progress-dialog"
  });
  const message = createElement("strong", {
    className: "backup-progress-message"
  });
  const content = createElement("div", {
    attributes: {
      "aria-live": "polite",
      role: "status"
    },
    className: "backup-progress-content"
  });

  content.append(
    createElement("span", {
      attributes: { "aria-hidden": "true" },
      className: "backup-progress-spinner"
    }),
    message
  );
  dialog.append(content);
  dialog.addEventListener("cancel", (event) => event.preventDefault());

  function update(value) {
    message.textContent = value;
  }

  function close() {
    if (dialog.open) {
      dialog.close();
    }
  }

  return {
    close,
    destroy() {
      close();
      dialog.remove();
    },
    open(value) {
      update(value);

      if (!dialog.isConnected) {
        document.body.append(dialog);
      }

      if (!dialog.open) {
        dialog.showModal();
        dialog.focus();
      }
    },
    update
  };
}
