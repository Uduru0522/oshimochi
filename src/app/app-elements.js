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
    brandSubtitle: queryRequiredElement(selectors.brandSubtitle),
    primaryNavList: queryRequiredElement(selectors.primaryNavList),
    projectRepositoryIcon: queryRequiredElement(selectors.projectRepositoryIcon),
    projectRepositoryLink: queryRequiredElement(selectors.projectRepositoryLink),
    sidebar: queryRequiredElement(selectors.sidebar),
    utilityNavList: queryRequiredElement(selectors.utilityNavList),
    viewActions: queryRequiredElement(selectors.viewActions),
    viewPanel: queryRequiredElement(selectors.viewPanel),
    viewSection: queryRequiredElement(selectors.viewSection),
    viewTitle: queryRequiredElement(selectors.viewTitle)
  };
}
