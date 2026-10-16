import { STORAGE_ERROR_CODES } from "../data/contracts/storage-contract.js";
import { translate } from "../localization/translate.js";
import { createElement } from "../shared/dom.js";

function resetNavigation(elements) {
  elements.primaryNavList.replaceChildren();
  elements.utilityNavList.replaceChildren();
}

function setTitle(elements, section, title) {
  elements.viewSection.textContent = section;
  elements.viewTitle.textContent = title;
}

function resetViewToolbar(elements) {
  elements.viewActions.replaceChildren();
  elements.viewToolbar.hidden = true;
}

export function renderStartupLoading(elements) {
  const status = createElement("article", {
    attributes: {
      "aria-busy": "true",
      role: "status"
    },
    className: "placeholder startup-state"
  });

  status.append(
    createElement("h3", { textContent: translate("Opening your collection") }),
    createElement("p", { textContent: translate("Loading local data...") })
  );

  resetNavigation(elements);
  resetViewToolbar(elements);
  setTitle(elements, translate("Application"), translate("Opening collection"));
  elements.viewPanel.replaceChildren(status);
}

export function renderStartupError(elements, error, { onRetry }) {
  const isUpgradeBlocked = error?.code === STORAGE_ERROR_CODES.upgradeBlocked;
  const article = createElement("article", {
    attributes: { role: "alert" },
    className: "placeholder startup-state"
  });
  const actions = createElement("div", { className: "startup-actions" });
  const retryButton = createElement("button", {
    attributes: { type: "button" },
    className: "primary-action",
    textContent: translate("Retry")
  });

  retryButton.addEventListener("click", () => void onRetry());
  actions.append(retryButton);
  article.append(
    createElement("h3", {
      textContent: translate("Your collection could not be opened")
    }),
    createElement("p", {
      textContent: isUpgradeBlocked
        ? translate("Close other Wotagoods tabs, then retry. Your saved data has not been changed.")
        : translate("Local browser storage is unavailable or could not be initialized. Your saved data has not been changed.")
    }),
    actions
  );

  resetNavigation(elements);
  resetViewToolbar(elements);
  setTitle(elements, translate("Application"), translate("Storage unavailable"));
  elements.viewPanel.replaceChildren(article);
}
