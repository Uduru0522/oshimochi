import { translate } from "../localization/translate.js";

export function applyAppLanguage(elements) {
  document.title = translate("Wotagoods Manager");
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute(
      "content",
      translate("A local-first web app for managing multiple goods collections.")
    );

  elements.appShell.setAttribute("aria-label", translate("Wotagoods Manager"));
  elements.sidebar.setAttribute("aria-label", translate("Main navigation"));
  elements.primaryNavList.setAttribute("aria-label", translate("Main views"));
  elements.utilityNavList.setAttribute("aria-label", translate("Application views"));
  elements.brandSubtitle.textContent = translate("Goods manager");
  delete document.documentElement.dataset.languagePending;
}
