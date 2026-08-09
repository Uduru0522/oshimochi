import { createElement } from "../shared/dom.js";
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

export function renderOptionsView({ languageController, onLanguageChanged, themeController }) {
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

  colorTheme.append(darkMode);
  languageSection.append(languageRow);
  article.append(colorTheme, languageSection);

  return {
    content: article,
    destroy: () => languageMenu.destroy()
  };
}

export function createViewRenderer({
  createGoodsType,
  fieldManagement,
  goodsTypes,
  itemManagement,
  languageController,
  mutationController,
  onNavigate,
  onGoodsTypeCreated,
  onLocalDataReset,
  onLanguageChanged,
  resetLocalData,
  themeController
}) {
  const renderers = {
    [RENDERERS.administration]: () => renderAdministrationView({
      createGoodsType,
      fieldManagement,
      goodsTypes,
      mutationController,
      onGoodsTypeCreated,
      onLocalDataReset,
      resetLocalData
    }),
    [RENDERERS.goodsTypeOverview]: (view) => renderGoodsTypeOverview(view, {
      onOpenItems: () => onNavigate(view.itemsViewId)
    }),
    [RENDERERS.goodsTypeItems]: (view) => renderItemsView(view, {
      itemManagement,
      mutationController,
      onOpenOverview: () => onNavigate(view.overviewViewId)
    }),
    [RENDERERS.options]: () => renderOptionsView({
      languageController,
      onLanguageChanged,
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
