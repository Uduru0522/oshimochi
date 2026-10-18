import { translate } from "../../localization/translate.js";
import { createActionButton } from "../../shared/action-button.js";
import { createElement } from "../../shared/dom.js";
import { createIcon } from "../../shared/icons.js";

function getAccountLabel(account) {
  return account?.email || account?.displayName || translate("Connected account");
}

export function createChannelCopy(title, description) {
  const copy = createElement("div", { className: "backup-channel-copy" });

  copy.append(
    createElement("h4", { textContent: title }),
    createElement("p", { textContent: description })
  );
  return copy;
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

export function createProviderControls(provider) {
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

export function updateProviderControls(control, { isBusy }) {
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
