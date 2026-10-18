import { translate } from "../../localization/translate.js";
import { createActionButton } from "../../shared/action-button.js";
import { createContentTransition } from "../../shared/content-transition.js";
import { createElement } from "../../shared/dom.js";
import {
  createBlockingProgress,
  createProgressStatus
} from "./backup-progress.js";
import {
  createChannelCopy,
  createProviderControls,
  updateProviderControls
} from "./backup-channels.js";
import {
  createRestoreRefreshError,
  createRestoreReview,
  createSnapshotPicker
} from "./backup-restore-views.js";

function getGooglePickerLocale() {
  const language = document.documentElement.lang;

  return language === "zh-Hant" ? "zh-TW" : language;
}

function createFeedback(message, { isError = false } = {}) {
  return createElement("p", {
    attributes: { role: isError ? "alert" : "status" },
    className: isError ? "form-error backup-feedback" : "backup-feedback",
    textContent: message
  });
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
            "This backup could not be opened. Choose a valid Oshimochi backup file."
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
    const { content, status, cancelButton, options } = createSnapshotPicker({
      providerName: provider.name,
      snapshots
    });
    const optionButtons = options.map(({ button }) => button);

    options.forEach(({ button, snapshot }) => {
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
    });

    cancelButton.addEventListener("click", () => renderLanding());
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
    const { review, status, cancelButton, restoreButton } = createRestoreReview({
      summary: candidate.summary,
      fileName
    });
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

    replaceContent(() => {
      container.classList.remove("backup-landing");
      container.classList.add("backup-workflow");
      container.replaceChildren(review);
    });
  }

  function renderCommittedRefreshError() {
    const { content, reloadButton } = createRestoreRefreshError();
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
