import { createElement } from "../shared/dom.js";
import { createIcon } from "../shared/icons.js";
import { translate } from "../localization/translate.js";
import { createSelectMenu } from "../shared/select-menu.js";
import { RENDERERS } from "./view-metadata.js";
import { renderAdministrationView } from "./administration/administration-view.js";
import { renderItemsView } from "./items/items-view.js";
import { renderGoodsTypeOverview } from "./goods-types/goods-type-overview.js";
import {
  createSettingsSection,
  createSwitchSetting
} from "../shared/ui-components.js";

export function renderPlaceholderView(view) {
  const article = createElement("article", { className: "placeholder" });
  const heading = createElement("h3", { textContent: view.content.heading });
  const description = createElement("p", { textContent: view.content.description });

  article.append(heading, description);

  return article;
}

function createProjectRepositoryLink(repositoryUrl) {
  const link = createElement("a", {
    attributes: {
      "aria-label": translate("View project on GitHub"),
      href: repositoryUrl,
      rel: "noopener noreferrer",
      target: "_blank"
    },
    className: "secondary-action project-repository-action"
  });

  link.append(createIcon("github"), createElement("span", { textContent: "GitHub" }));
  return link;
}

export function renderOptionsView({
  languageController,
  onLanguageChanged,
  projectRepositoryUrl,
  themeController
}) {
  const article = createElement("article", { className: "settings-view" });
  const colorTheme = createSettingsSection({
    title: translate("Color theme"),
    description: translate("Adjust the application's appearance.")
  });
  const darkMode = createSwitchSetting({
    checked: themeController.isDarkMode(),
    description: translate("Use a darker interface for lower-light environments."),
    id: "darkModeToggle",
    label: translate("Dark mode"),
    onChange: (isEnabled) => themeController.setDarkMode(isEnabled)
  });
  const languageSection = createSettingsSection({
    title: translate("Language"),
    description: translate("Choose the language used by the application interface.")
  });
  const languageRow = createElement("div", { className: "setting-row language-setting" });
  const languageCopy = createElement("span");
  const languageTitle = createElement("strong", {
    textContent: translate("Interface language")
  });
  const languageDescription = createElement("small", {
    textContent: translate("Changes apply immediately and are saved in this browser.")
  });
  const languageMenu = createSelectMenu({
    ariaLabel: translate("Interface language"),
    emptyLabel: translate("Select...")
  });
  const projectSection = createSettingsSection({
    title: translate("About"),
    description: translate("Project links and information.")
  });
  const projectRow = createElement("div", { className: "setting-row project-setting" });
  const projectCopy = createElement("span");
  const projectTitle = createElement("strong", {
    textContent: translate("Source code")
  });
  const projectDescription = createElement("small", {
    textContent: translate("View the source code and releases for this project.")
  });
  const projectLink = createProjectRepositoryLink(projectRepositoryUrl);

  languageMenu.setOptions([
    { label: translate("English"), value: "en" },
    { label: translate("Japanese"), value: "ja" },
    { label: translate("Traditional Chinese"), value: "zh-Hant" }
  ]);
  languageMenu.value = languageController.getLanguage();
  languageMenu.element.addEventListener("change", () => {
    languageController.setLanguage(languageMenu.value);
    onLanguageChanged();
  });
  languageCopy.append(languageTitle, languageDescription);
  languageRow.append(languageCopy, languageMenu.element);
  projectCopy.append(projectTitle, projectDescription);
  projectRow.append(projectCopy, projectLink);

  colorTheme.append(darkMode);
  languageSection.append(languageRow);
  projectSection.classList.add("project-settings-section");
  projectSection.append(projectRow);
  article.append(colorTheme, languageSection, projectSection);

  return {
    content: article,
    destroy: () => languageMenu.destroy()
  };
}

export function createViewRenderer({
  goodsTypes,
  languageController,
  mutationController,
  onNavigate,
  onGoodsTypeCreated,
  onLocalDataReset,
  onLanguageChanged,
  operations,
  projectRepositoryUrl,
  themeController
}) {
  const renderers = {
    [RENDERERS.administration]: () => renderAdministrationView({
      createGoodsType: operations.goodsTypes.create,
      fieldManagement: operations.fields,
      goodsTypes,
      mutationController,
      onGoodsTypeCreated,
      onLocalDataReset,
      resetLocalData: operations.localData.reset
    }),
    [RENDERERS.goodsTypeOverview]: (view) => renderGoodsTypeOverview(view, {
      onOpenItems: () => onNavigate(view.itemsViewId)
    }),
    [RENDERERS.goodsTypeItems]: (view) => renderItemsView(view, {
      itemManagement: operations.items,
      mutationController,
      onOpenOverview: () => onNavigate(view.overviewViewId)
    }),
    [RENDERERS.options]: () => renderOptionsView({
      languageController,
      onLanguageChanged,
      projectRepositoryUrl,
      themeController
    }),
    [RENDERERS.placeholder]: (view) => renderPlaceholderView(view)
  };

  return {
    render(view) {
      const renderer = renderers[view.renderer] ?? renderers[RENDERERS.placeholder];
      return renderer(view);
    }
  };
}
