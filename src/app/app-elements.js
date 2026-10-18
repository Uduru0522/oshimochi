import { APP_CONFIG } from "./config.js";

function queryRequiredElement(selector) {
  const element = document.querySelector(selector);

  if (!element) {
    throw new Error(`Required element not found: ${selector}`);
  }

  return element;
}

export function getAppElements() {
  const { selectors } = APP_CONFIG;

  return {
    appShell: queryRequiredElement(selectors.appShell),
    primaryNavList: queryRequiredElement(selectors.primaryNavList),
    projectExternalIcon: queryRequiredElement(selectors.projectExternalIcon),
    projectRepositoryIcon: queryRequiredElement(selectors.projectRepositoryIcon),
    projectRepositoryLink: queryRequiredElement(selectors.projectRepositoryLink),
    sidebar: queryRequiredElement(selectors.sidebar),
    utilityMenu: queryRequiredElement(selectors.utilityMenu),
    utilityMenuIcon: queryRequiredElement(selectors.utilityMenuIcon),
    utilityMenuToggle: queryRequiredElement(selectors.utilityMenuToggle),
    utilityNavList: queryRequiredElement(selectors.utilityNavList),
    viewActions: queryRequiredElement(selectors.viewActions),
    viewPanel: queryRequiredElement(selectors.viewPanel),
    viewSection: queryRequiredElement(selectors.viewSection),
    viewToolbar: queryRequiredElement(selectors.viewToolbar),
    viewTitle: queryRequiredElement(selectors.viewTitle)
  };
}
