import { translate } from "../../localization/translate.js";
import { createActionButton } from "../../shared/action-button.js";
import { createContentTransition } from "../../shared/content-transition.js";
import { createElement } from "../../shared/dom.js";
import { createIcon } from "../../shared/icons.js";
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

function getAccountLabel(account) {
  return account?.email || account?.displayName || translate("Connected account");
}

function getGooglePickerLocale() {
  const language = document.documentElement.lang;

  return language === "zh-Hant" ? "zh-TW" : language;
}

function createProgressStatus(message) {
  const status = createElement("div", { className: "creation-status" });

  status.append(
    createElement("progress", { className: "creation-progress" }),
    createElement("span", { textContent: message })
  );
  return status;
}

function createBlockingProgress() {
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

function createFeedback(message, { isError = false } = {}) {
  return createElement("p", {
    attributes: { role: isError ? "alert" : "status" },
    className: isError ? "form-error backup-feedback" : "backup-feedback",
    textContent: message
  });
}

function createChannelCopy(title, description) {
  const copy = createElement("div", { className: "backup-channel-copy" });

  copy.append(
    createElement("h4", { textContent: title }),
    createElement("p", { textContent: description })
  );
  return copy;
}

function requireProvider(provider) {
  const methods = [
    "clearConfiguration",
    "connect",
    "configure",
    "disconnect",
    "downloadSnapshot",
    "getConfiguration",
    "getState",
    "isConfigured",
    "listSnapshots",
    "prepare",
    "selectDestination",
    "subscribe",
    "uploadSnapshot"
  ];

  if (!provider || typeof provider.name !== "string") {
    throw new TypeError("Data portability requires named backup providers.");
  }

  methods.forEach((method) => {
    if (typeof provider[method] !== "function") {
      throw new TypeError(`Backup provider ${provider.name} is missing ${method}().`);
    }
  });

  return provider;
}

function createConfigurationField(label, attributes = {}) {
  const field = createElement("label", {
    className: "editor-field backup-configuration-field"
  });
  const input = createElement("input", {
    attributes: {
      autocomplete: "off",
      required: "",
      spellcheck: "false",
      type: "text",
      ...attributes
    }
  });

  field.append(
    createElement("span", {
      className: "editor-label",
      textContent: label
    }),
    input
  );
  return { field, input };
}

function createProviderControls(provider) {
  const channel = createElement("div", {
    className: "backup-channel backup-provider-channel"
  });
  const channelControls = createElement("div", {
    className: "backup-channel-controls"
  });
  const actions = createElement("div", { className: "backup-actions" });
  const configurationForm = createElement("form", {
    className: "backup-provider-configuration"
  });
  const configurationFields = createElement("div", {
    className: "backup-configuration-fields"
  });
  const clientIdControl = createConfigurationField(
    translate("Google OAuth client ID"),
    { placeholder: "000000000000-example.apps.googleusercontent.com" }
  );
  const apiKeyControl = createConfigurationField(
    translate("Google Picker API key"),
    { placeholder: "AIza..." }
  );
  const appIdControl = createConfigurationField(
    translate("Google Cloud project number"),
    { inputmode: "numeric", placeholder: "000000000000" }
  );
  const configurationActions = createElement("div", {
    className: "backup-configuration-actions"
  });
  const saveConfigurationButton = createActionButton(
    translate("Save Drive setup"),
    { className: "primary-action", type: "submit" }
  );
  const setupLink = createElement("a", {
    attributes: {
      href: provider.setupUrl,
      rel: "noreferrer",
      target: "_blank"
    },
    className: "secondary-action",
    textContent: translate("Open Google Cloud setup")
  });
  const availability = createElement("p", {
    className: "backup-availability"
  });
  const availabilityMessage = createElement("span", {
    attributes: { "aria-live": "polite" }
  });
  const connectButton = createActionButton(translate("Connect"));
  const backupButton = createActionButton(translate("Back up now"), {
    className: "primary-action"
  });
  const restoreButton = createActionButton(translate("Restore from cloud"));
  const disconnectButton = createActionButton(translate("Disconnect"), {
    className: "backup-disconnect-action"
  });
  const removeConfigurationButton = createActionButton(
    translate("Remove Drive setup")
  );
  const destination = createElement("button", {
    attributes: { type: "button" },
    className: "backup-destination"
  });
  const destinationCopy = createElement("div", {
    className: "backup-destination-copy"
  });
  const destinationName = createElement("strong");
  const destinationChevron = createIcon("chevronRight");
  const chooseDestinationButton = destination;
  const savedConfiguration = provider.getConfiguration();
  const channelCopy = createChannelCopy(
    provider.name,
    translate("Save and restore versioned snapshots outside this device.")
  );

  clientIdControl.input.value = savedConfiguration.clientId;
  apiKeyControl.input.value = savedConfiguration.apiKey;
  appIdControl.input.value = savedConfiguration.appId;
  configurationFields.append(
    clientIdControl.field,
    apiKeyControl.field,
    appIdControl.field
  );
  configurationActions.append(saveConfigurationButton, setupLink);
  configurationForm.append(
    createElement("p", {
      textContent: translate(
        "Use credentials from your own Google Cloud project. Its API quota and your Drive storage remain yours."
      )
    }),
    configurationFields,
    configurationActions
  );
  destinationCopy.append(
    createElement("span", { textContent: translate("Backup folder") }),
    destinationName
  );
  destinationChevron.classList.add("backup-destination-chevron");
  destination.append(destinationCopy, destinationChevron);
  actions.append(
    connectButton,
    backupButton,
    restoreButton,
    removeConfigurationButton
  );
  availability.append(availabilityMessage, disconnectButton);
  channelCopy.append(availability);
  channelControls.append(
    configurationForm,
    destination,
    actions
  );
  channel.append(channelCopy, channelControls);

  return {
    apiKeyInput: apiKeyControl.input,
    appIdInput: appIdControl.input,
    availability,
    availabilityMessage,
    backupButton,
    channel,
    chooseDestinationButton,
    clientIdInput: clientIdControl.input,
    connectButton,
    configurationForm,
    configurationInputs: [
      clientIdControl.input,
      apiKeyControl.input,
      appIdControl.input
    ],
    destination,
    destinationName,
    disconnectButton,
    provider,
    removeConfigurationButton,
    restoreButton,
    saveConfigurationButton,
    state: provider.getState()
  };
}

function updateProviderControls(control, { isBusy }) {
  const { state } = control;
  const isConfigured = control.provider.isConfigured();
  const isConnected = state.status === "connected";
  const selectedDestination = control.provider.getConfiguration().destination;
  const hasDestination = Boolean(selectedDestination);
  const canConnect = isConfigured && (
    state.status === "disconnected" || state.status === "error"
  );

  control.channel.classList.toggle("is-connected", isConnected);
  control.configurationForm.hidden = isConfigured;
  control.connectButton.hidden = !canConnect;
  control.disconnectButton.hidden = !isConnected;
  control.destination.hidden = !isConnected;
  control.backupButton.hidden = !isConnected;
  control.restoreButton.hidden = !isConnected;
  control.removeConfigurationButton.hidden = !isConfigured || isConnected;
  control.configurationInputs.forEach((input) => {
    input.disabled = isBusy;
  });
  control.saveConfigurationButton.disabled = isBusy;
  control.connectButton.disabled = isBusy;
  control.disconnectButton.disabled = isBusy;
  control.chooseDestinationButton.disabled = isBusy;
  control.backupButton.disabled = isBusy || !hasDestination;
  control.restoreButton.disabled = isBusy || !hasDestination;
  control.removeConfigurationButton.disabled = isBusy;
  const destinationAction = translate(
    hasDestination ? "Change Drive folder" : "Choose Drive folder"
  );

  control.chooseDestinationButton.setAttribute("aria-label", destinationAction);
  control.chooseDestinationButton.title = destinationAction;
  control.destinationName.textContent = hasDestination
    ? selectedDestination.name
    : translate("No folder selected");

  if (state.status === "unavailable") {
    control.availabilityMessage.textContent = translate(
      "Enter your own Google OAuth client ID, API key, and Cloud project number. They are stored only on this device."
    );
  } else if (state.status === "loading") {
    control.availabilityMessage.textContent = translate("Preparing cloud backup...");
  } else if (state.status === "connecting") {
    control.availabilityMessage.textContent = translate("Signing in...");
  } else if (isConnected) {
    control.availabilityMessage.textContent = hasDestination
      ? translate("Connected as {account}.", {
          account: getAccountLabel(state.account)
        })
      : translate("Connected as {account}. Choose a Drive folder for backups.", {
          account: getAccountLabel(state.account)
        });
  } else if (state.status === "error") {
    control.availabilityMessage.textContent = translate(
      "Cloud backup could not be prepared. Local file backup is still available."
    );
  } else {
    control.availabilityMessage.textContent = translate(
      "Configured on this device. Connect only when you want to use Drive."
    );
  }
}

export function createDataPortability({
  backupFileService,
  backupOperations,
  backupProviders = [],
  mutationController,
  onRestored
}) {
  const providers = backupProviders.map(requireProvider);
  const container = createElement("section", {
    attributes: { "aria-label": translate("Backup and restore") },
    className: "data-portability"
  });
  const contentTransition = createContentTransition(container);
  const blockingProgress = createBlockingProgress();
  let landingSubscriptions = [];
  let isDestroyed = false;

  function clearLandingSubscriptions() {
    landingSubscriptions.forEach((unsubscribe) => unsubscribe());
    landingSubscriptions = [];
  }

  function replaceContent(update) {
    if (!isDestroyed) {
      contentTransition.replace(update);
    }
  }

  function renderLanding({ feedback = null, isError = false } = {}) {
    clearLandingSubscriptions();
    blockingProgress.close();
    container.removeAttribute("aria-busy");
    const header = createElement("div", { className: "backup-copy" });
    const localChannel = createElement("div", {
      className: "backup-channel backup-local-channel"
    });
    const localControls = createElement("div", {
      className: "backup-channel-controls"
    });
    const localActions = createElement("div", { className: "backup-actions" });
    const exportButton = createActionButton(translate("Export backup"), {
      className: "primary-action"
    });
    const localRestoreButton = createActionButton(translate("Restore from file"));
    const fileInput = createElement("input", {
      attributes: {
        accept: ".json.gz,application/gzip",
        "aria-label": translate("Choose backup file"),
        type: "file"
      }
    });
    const status = createElement("div", {
      attributes: { "aria-live": "polite" },
      className: "backup-status"
    });
    const providerControls = providers.map(createProviderControls);
    const localButtons = [exportButton, localRestoreButton];
    let isBusy = false;
    let isBlocking = false;

    fileInput.hidden = true;
    header.append(
      createElement("h3", { textContent: translate("Backup and restore") }),
      createElement("p", {
        textContent: translate(
          "Keep a complete copy outside this browser, or replace local data from a backup."
        )
      })
    );
    localActions.append(exportButton, localRestoreButton, fileInput);
    localControls.append(localActions);
    localChannel.append(
      createChannelCopy(
        translate("This device"),
        translate("Download a backup file or restore one from this device.")
      ),
      localControls
    );

    if (feedback) {
      status.append(createFeedback(feedback, { isError }));
    }

    function syncDisabledState() {
      localButtons.forEach((button) => {
        button.disabled = isBusy;
      });
      providerControls.forEach((control) => {
        updateProviderControls(control, { isBusy });
      });
    }

    function setBusy(message, { blocking = true } = {}) {
      isBusy = true;
      isBlocking = blocking;
      syncDisabledState();
      container.setAttribute("aria-busy", "true");

      if (blocking) {
        status.replaceChildren();
        blockingProgress.open(message);
      } else {
        status.replaceChildren(createProgressStatus(message));
      }
    }

    function setBusyMessage(message) {
      if (isBlocking) {
        blockingProgress.update(message);
      } else {
        status.replaceChildren(createProgressStatus(message));
      }
    }

    function clearBusy() {
      isBusy = false;
      isBlocking = false;
      blockingProgress.close();
      syncDisabledState();
      container.removeAttribute("aria-busy");
    }

    exportButton.addEventListener("click", async () => {
      setBusy(translate("Preparing backup..."));

      try {
        const backup = await backupOperations.createExport();

        setBusyMessage(translate("Compressing backup..."));
        const archive = await backupFileService.download(backup);
        status.replaceChildren(
          createFeedback(
            translate("{name} is ready in your downloads.", {
              name: archive.fileName
            })
          )
        );
      } catch (error) {
        console.error("Local backup could not be created:", error);
        status.replaceChildren(
          createFeedback(
            translate(
              "The backup could not be created. Existing local data was not changed."
            ),
            { isError: true }
          )
        );
      } finally {
        clearBusy();
      }
    });

    localRestoreButton.addEventListener("click", () => {
      fileInput.value = "";
      fileInput.click();
    });
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];

      if (!file) {
        return;
      }

      setBusy(translate("Reading and validating backup..."));

      try {
        const text = await backupFileService.readText(file);
        const candidate = await backupOperations.inspect(text);

        clearBusy();
        renderReview({ candidate, fileName: file.name });
      } catch (error) {
        console.error("Local backup could not be inspected:", error);
        renderLanding({
          feedback: translate(
            "This backup could not be opened. Choose a valid Wotagoods backup file."
          ),
          isError: true
        });
      }
    });

    providerControls.forEach((control) => {
      const { provider } = control;

      control.configurationForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        setBusy(translate("Saving Drive setup..."));

        try {
          await provider.configure({
            apiKey: control.apiKeyInput.value,
            appId: control.appIdInput.value,
            clientId: control.clientIdInput.value
          });
          status.replaceChildren(
            createFeedback(
              translate("Google Drive setup was saved on this device.")
            )
          );
        } catch (error) {
          console.error(`${provider.name} setup could not be saved:`, error);
          status.replaceChildren(
            createFeedback(
              translate(
                "Enter a valid OAuth web client ID, Google API key, and Cloud project number."
              ),
              { isError: true }
            )
          );
          clearBusy();
          return;
        }

        try {
          await provider.prepare();
        } catch (error) {
          console.error(`${provider.name} could not be prepared:`, error);
          status.replaceChildren(
            createFeedback(
              translate(
                "Google Drive setup was saved, but Google could not be reached. Try Connect when you are online."
              ),
              { isError: true }
            )
          );
        } finally {
          clearBusy();
        }
      });

      control.removeConfigurationButton.addEventListener("click", async () => {
        setBusy(translate("Removing Drive setup..."));

        try {
          await provider.clearConfiguration();
          control.configurationInputs.forEach((input) => {
            input.value = "";
          });
          status.replaceChildren(
            createFeedback(
              translate("Google Drive setup was removed from this device.")
            )
          );
        } catch (error) {
          console.error(`${provider.name} setup could not be removed:`, error);
          status.replaceChildren(
            createFeedback(
              translate("Google Drive setup could not be removed. Try again."),
              { isError: true }
            )
          );
        } finally {
          clearBusy();
        }
      });

      control.connectButton.addEventListener("click", async () => {
        status.replaceChildren();

        try {
          await provider.connect();
        } catch (error) {
          console.error(`${provider.name} could not connect:`, error);
          status.replaceChildren(
            createFeedback(
              translate("Cloud backup could not connect. Try again."),
              { isError: true }
            )
          );
        }
      });

      control.chooseDestinationButton.addEventListener("click", async () => {
        setBusy(translate("Opening Drive folder picker..."), {
          blocking: false
        });

        try {
          const destination = await provider.selectDestination({
            locale: getGooglePickerLocale(),
            origin: globalThis.location?.origin,
            title: translate("Choose a backup folder")
          });

          if (destination) {
            status.replaceChildren(
              createFeedback(translate("Backups will use {folder}.", {
                folder: destination.name
              }))
            );
          } else {
            status.replaceChildren();
          }
        } catch (error) {
          console.error(`${provider.name} folder could not be selected:`, error);
          status.replaceChildren(
            createFeedback(
              translate("A Drive backup folder could not be selected. Try again."),
              { isError: true }
            )
          );
        } finally {
          clearBusy();
        }
      });

      control.disconnectButton.addEventListener("click", async () => {
        setBusy(translate("Disconnecting cloud backup..."));

        try {
          await provider.disconnect();
          status.replaceChildren();
        } catch (error) {
          console.error(`${provider.name} could not disconnect:`, error);
          status.replaceChildren(
            createFeedback(
              translate("Cloud backup could not disconnect. Try again."),
              { isError: true }
            )
          );
        } finally {
          clearBusy();
        }
      });

      control.backupButton.addEventListener("click", async () => {
        setBusy(translate("Preparing backup..."));

        try {
          const backup = await backupOperations.createExport();

          setBusyMessage(translate("Compressing and uploading backup..."));
          const result = await provider.uploadSnapshot(backup);
          const message = result?.retention?.failed > 0
            ? translate(
                "{name} was saved to {provider}, but an older backup could not be removed.",
                { name: backup.fileName, provider: provider.name }
              )
            : translate("{name} was saved to {provider}.", {
                name: backup.fileName,
                provider: provider.name
              });

          status.replaceChildren(createFeedback(message));
        } catch (error) {
          console.error(`${provider.name} backup could not be created:`, error);
          status.replaceChildren(
            createFeedback(
              translate(
                "The backup was not saved to {provider}. Local data was not changed.",
                { provider: provider.name }
              ),
              { isError: true }
            )
          );
        } finally {
          clearBusy();
        }
      });

      control.restoreButton.addEventListener("click", async () => {
        setBusy(translate("Reading cloud backups..."));

        try {
          const snapshots = await provider.listSnapshots();

          clearBusy();
          renderSnapshotPicker({ provider, snapshots });
        } catch (error) {
          console.error(`${provider.name} backups could not be listed:`, error);
          status.replaceChildren(
            createFeedback(
              translate("{provider} backups could not be opened. Try again.", {
                provider: provider.name
              }),
              { isError: true }
            )
          );
          clearBusy();
        }
      });
    });

    replaceContent(() => {
      container.classList.add("backup-landing");
      container.classList.remove("backup-workflow");
      container.replaceChildren(
        header,
        localChannel,
        ...providerControls.map(({ channel }) => channel),
        status
      );

      providerControls.forEach((control) => {
        const { provider } = control;

        landingSubscriptions.push(
          provider.subscribe((state) => {
            control.state = state;
            updateProviderControls(control, { isBusy });
          })
        );

        if (provider.isConfigured()) {
          provider.prepare().catch((error) => {
            console.error(`${provider.name} could not be prepared:`, error);
          });
        }
      });
      syncDisabledState();
    });
  }

  function renderSnapshotPicker({ provider, snapshots }) {
    clearLandingSubscriptions();
    blockingProgress.close();
    container.removeAttribute("aria-busy");
    const content = createElement("div", { className: "backup-review" });
    const heading = createElement("div", { className: "form-heading" });
    const list = createElement("ul", { className: "backup-snapshot-list" });
    const status = createElement("div", {
      attributes: { "aria-live": "polite" },
      className: "creation-status"
    });
    const actions = createElement("div", { className: "form-actions" });
    const cancelButton = createActionButton(translate("Back to backup options"));
    const optionButtons = [];

    heading.append(
      createElement("h3", {
        textContent: translate("Restore from {provider}", {
          provider: provider.name
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
      button.addEventListener("click", async () => {
        optionButtons.forEach((option) => {
          option.disabled = true;
        });
        cancelButton.disabled = true;
        content.setAttribute("aria-busy", "true");
        status.replaceChildren();
        blockingProgress.open(
          translate("Downloading and validating backup...")
        );

        try {
          const text = await provider.downloadSnapshot(snapshot.id);
          const candidate = await backupOperations.inspect(text);

          blockingProgress.close();
          renderReview({
            candidate,
            fileName: snapshot.fileName || translate("Unnamed backup")
          });
        } catch (error) {
          console.error(`${provider.name} backup could not be inspected:`, error);
          blockingProgress.close();
          content.removeAttribute("aria-busy");
          optionButtons.forEach((option) => {
            option.disabled = false;
          });
          cancelButton.disabled = false;
          status.replaceChildren(
            createFeedback(
              translate(
                "This cloud backup could not be opened. Choose another backup or try again."
              ),
              { isError: true }
            )
          );
        }
      });
      optionButtons.push(button);
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

    cancelButton.addEventListener("click", () => renderLanding());
    actions.append(cancelButton);
    content.append(heading, list, status, actions);
    replaceContent(() => {
      container.classList.remove("backup-landing");
      container.classList.add("backup-workflow");
      container.replaceChildren(content);
    });
  }

  function renderReview({ candidate, fileName }) {
    clearLandingSubscriptions();
    blockingProgress.close();
    container.removeAttribute("aria-busy");
    const { summary } = candidate;
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
    cancelButton.addEventListener("click", () => renderLanding());
    restoreButton.addEventListener("click", async () => {
      cancelButton.disabled = true;
      restoreButton.disabled = true;
      restoreButton.textContent = translate("Restoring backup...");
      review.setAttribute("aria-busy", "true");
      status.replaceChildren();
      blockingProgress.open(translate("Replacing local collection data..."));
      let committed = false;

      try {
        await mutationController.run(() => backupOperations.restore(candidate));
        committed = true;
        const didRefresh = await onRestored();

        if (didRefresh === false) {
          blockingProgress.close();
          renderCommittedRefreshError();
        }
      } catch (error) {
        console.error("Local backup could not be restored:", error);
        blockingProgress.close();

        if (committed) {
          renderCommittedRefreshError();
          return;
        }

        review.removeAttribute("aria-busy");
        cancelButton.disabled = false;
        restoreButton.disabled = false;
        restoreButton.textContent = translate("Try restore again");
        status.replaceChildren(
          createFeedback(
            translate(
              "The backup could not be restored. Existing local data is unchanged."
            ),
            { isError: true }
          )
        );
      }
    });

    actions.append(cancelButton, restoreButton);
    replaceContent(() => {
      container.classList.remove("backup-landing");
      container.classList.add("backup-workflow");
      container.replaceChildren(review);
    });
  }

  function renderCommittedRefreshError() {
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
    reloadButton.addEventListener("click", () => globalThis.location.reload());
    replaceContent(() => {
      container.classList.remove("backup-landing");
      container.classList.add("backup-workflow");
      container.replaceChildren(content);
    });
  }

  renderLanding();
  return {
    destroy() {
      isDestroyed = true;
      clearLandingSubscriptions();
      contentTransition.cancel();
      blockingProgress.destroy();
    },
    element: container
  };
}
