import { translate } from "../localization/translate.js";

export function applyAppLanguage(elements) {
  const moreLabel = translate("More");
  const projectLinkLabel = translate("View project on GitHub");

  document.title = translate("Oshimochi");
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute(
      "content",
      translate("A local-first web app for managing multiple goods collections.")
    );

  elements.appShell.setAttribute("aria-label", translate("Oshimochi"));
  elements.sidebar.setAttribute("aria-label", translate("Main navigation"));
  elements.primaryNavList.setAttribute("aria-label", translate("Main views"));
  elements.utilityNavList.setAttribute("aria-label", translate("Application views"));
  elements.utilityMenuToggle.setAttribute("aria-label", moreLabel);
  elements.utilityMenuToggle.setAttribute("title", moreLabel);
  elements.projectRepositoryLink.setAttribute("aria-label", projectLinkLabel);
  elements.projectRepositoryLink.setAttribute("title", projectLinkLabel);
  elements.brandSubtitle.textContent = translate("Goods manager");
  delete document.documentElement.dataset.languagePending;
}
