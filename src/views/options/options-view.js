import { translate } from "../../localization/translate.js";
import { createElement } from "../../shared/dom.js";
import { createSelectMenu } from "../../shared/select-menu.js";
import {
  createSettingsSection,
  createSwitchSetting
} from "../../shared/ui-components.js";

const ACCENT_LABELS = Object.freeze({
  blue: "Blue",
  green: "Green",
  orange: "Orange",
  pink: "Pink",
  purple: "Purple",
  red: "Red",
  yellow: "Yellow"
});

function createAccentSetting(themeController) {
  const row = createElement("div", { className: "setting-row accent-setting" });
  const copy = createElement("span");
  const title = createElement("strong", { textContent: translate("Accent color") });
  const description = createElement("small", {
    textContent: translate("Choose the color used for highlights and controls.")
  });
  const options = createElement("fieldset", {
    attributes: { "aria-label": translate("Accent color") },
    className: "accent-options"
  });
  const selectedAccent = themeController.getAccent();

  themeController.getAccentOptions().forEach((accent) => {
    const label = translate(ACCENT_LABELS[accent]);
    const option = createElement("label", {
      attributes: { title: label },
      className: "accent-option",
      dataset: { accentOption: accent }
    });
    const input = createElement("input", {
      attributes: {
        "aria-label": label,
        name: "accentColor",
        type: "radio",
        value: accent
      },
      className: "accent-option-input"
    });
    const swatch = createElement("span", {
      attributes: { "aria-hidden": "true" },
      className: "accent-option-swatch"
    });

    input.checked = accent === selectedAccent;
    input.addEventListener("change", () => {
      if (input.checked) {
        themeController.setAccent(accent);
      }
    });
    option.append(input, swatch);
    options.append(option);
  });

  copy.append(title, description);
  row.append(copy, options);

  return row;
}

function createLanguageSetting({ languageController, onLanguageChanged }) {
  const row = createElement("div", { className: "setting-row language-setting" });
  const copy = createElement("span");
  const title = createElement("strong", {
    textContent: translate("Interface language")
  });
  const description = createElement("small", {
    textContent: translate("Changes apply immediately and are saved in this browser.")
  });
  const menu = createSelectMenu({
    ariaLabel: translate("Interface language"),
    emptyLabel: translate("Select...")
  });

  menu.setOptions([
    { label: translate("English"), value: "en" },
    { label: translate("Japanese"), value: "ja" },
    { label: translate("Traditional Chinese"), value: "zh-Hant" }
  ]);
  menu.value = languageController.getLanguage();
  menu.element.addEventListener("change", () => {
    languageController.setLanguage(menu.value);
    onLanguageChanged();
  });
  copy.append(title, description);
  row.append(copy, menu.element);

  return { element: row, menu };
}

export function renderOptionsView({
  languageController,
  onLanguageChanged,
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
  const accent = createAccentSetting(themeController);
  const languageSection = createSettingsSection({
    title: translate("Language"),
    description: translate("Choose the language used by the application interface.")
  });
  const language = createLanguageSetting({ languageController, onLanguageChanged });

  colorTheme.append(darkMode, accent);
  languageSection.append(language.element);
  article.append(colorTheme, languageSection);

  return {
    content: article,
    destroy: () => language.menu.destroy()
  };
}
