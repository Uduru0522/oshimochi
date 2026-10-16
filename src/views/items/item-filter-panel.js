import {
  cloneItemFilter,
  countActiveItemFilters,
  getNumberFilterDomain
} from "../../application/items/filter-items.js";
import { translate } from "../../localization/translate.js";
import { createActionButton } from "../../shared/action-button.js";
import {
  createDialogCloseController
} from "../../shared/dialog-close-controller.js";
import { createElement } from "../../shared/dom.js";
import { createIcon } from "../../shared/icons.js";
import {
  createDefaultItemFilterRule,
  createItemFilterRuleEditor,
  validateItemFilterRule
} from "./item-filter-rule.js";

export function createItemFilterPanel({ onApply }) {
  const button = createElement("button", {
    attributes: {
      "aria-label": translate("Filter items"),
      title: translate("Filter items"),
      type: "button"
    },
    className: "secondary-action items-filter-action"
  });
  const buttonLabel = createElement("span", { textContent: translate("Filter") });
  const badge = createElement("span", {
    attributes: { "aria-hidden": "true" },
    className: "items-filter-badge"
  });
  const dialog = createElement("dialog", {
    attributes: { "aria-labelledby": "itemFilterTitle" },
    className: "item-filter-dialog"
  });
  const header = createElement("header", { className: "item-filter-header" });
  const heading = createElement("h3", {
    attributes: { id: "itemFilterTitle" },
    textContent: translate("Filter items")
  });
  const closeButton = createElement("button", {
    attributes: {
      "aria-label": translate("Close item filters"),
      title: translate("Close"),
      type: "button"
    },
    className: "item-entry-close"
  });
  const form = createElement("form", { className: "item-filter-form" });
  const body = createElement("div", { className: "item-filter-body" });
  const searchField = createElement("label", { className: "item-filter-search" });
  const searchInput = createElement("input", {
    attributes: {
      autocomplete: "off",
      placeholder: translate('Search, "exact phrase", -excluded'),
      type: "search"
    }
  });
  const addFieldSelect = createElement("select", {
    attributes: { "aria-label": translate("Add field filter") },
    className: "item-filter-add-field"
  });
  const rulesElement = createElement("div", { className: "item-filter-rules" });
  const error = createElement("p", {
    attributes: { role: "alert" },
    className: "item-filter-error"
  });
  const footer = createElement("footer", { className: "item-filter-footer" });
  const clearButton = createActionButton(translate("Clear filters"));
  const cancelButton = createActionButton(translate("Cancel"));
  const applyButton = createActionButton(translate("Apply filters"), {
    className: "primary-action",
    type: "submit"
  });
  let activeFilter = cloneItemFilter();
  let destroyed = false;
  let draftFilter = cloneItemFilter();
  let fields = [];
  let items = [];
  const closeController = createDialogCloseController(dialog);

  function isFilterableField(field) {
    return field && (!field.isBuiltIn || !["id", "image"].includes(field.key));
  }

  button.disabled = true;
  badge.hidden = true;
  button.append(createIcon("filter"), buttonLabel, badge);
  closeButton.append(createIcon("close"));
  searchField.append(
    createElement("strong", { textContent: translate("Search all fields") }),
    searchInput
  );
  const footerActions = createElement("div", { className: "item-filter-footer-actions" });
  footerActions.append(cancelButton, applyButton);
  footer.append(clearButton, footerActions);
  body.append(searchField, addFieldSelect, rulesElement, error);
  header.append(heading, closeButton);
  form.append(body, footer);
  dialog.append(header, form);

  function updateBadge() {
    const count = countActiveItemFilters(activeFilter);
    badge.hidden = count === 0;
    badge.textContent = count > 99 ? "99+" : String(count);
    button.dataset.active = String(count > 0);
    button.setAttribute(
      "aria-label",
      count > 0
        ? translate("Filter items, {count} active", { count })
        : translate("Filter items")
    );
  }

  function getAvailableFields() {
    const usedIds = new Set(draftFilter.rules.map(({ fieldId }) => fieldId));
    return fields.filter((field) => !usedIds.has(field.id) && isFilterableField(field));
  }

  function renderAddFieldOptions() {
    addFieldSelect.replaceChildren(createElement("option", {
      attributes: { value: "" },
      textContent: translate("Add field filter...")
    }));
    getAvailableFields().forEach((field) => {
      addFieldSelect.append(createElement("option", {
        attributes: { value: field.id },
        textContent: field.displayName
      }));
    });
    addFieldSelect.disabled = getAvailableFields().length === 0;
  }

  function renderRules() {
    rulesElement.replaceChildren();
    if (draftFilter.rules.length === 0) {
      rulesElement.append(createElement("p", {
        className: "item-filter-no-rules",
        textContent: translate("No field filters added.")
      }));
    } else {
      draftFilter.rules.forEach((rule) => {
        const field = fields.find(({ id }) => id === rule.fieldId);
        if (!field) {
          return;
        }
        rulesElement.append(createItemFilterRuleEditor({
          field,
          numberDomain: field.dataType === "number"
            ? getNumberFilterDomain(items, field)
            : null,
          rule,
          onRemove: () => {
            draftFilter.rules = draftFilter.rules.filter((entry) => entry !== rule);
            error.textContent = "";
            renderRules();
          }
        }));
      });
    }
    renderAddFieldOptions();
  }

  function renderDraft() {
    draftFilter = cloneItemFilter(activeFilter);
    searchInput.value = draftFilter.query;
    error.textContent = "";
    renderRules();
  }

  addFieldSelect.addEventListener("change", () => {
    const field = fields.find(({ id }) => id === addFieldSelect.value);
    if (field) {
      draftFilter.rules.push(createDefaultItemFilterRule(field));
      error.textContent = "";
      renderRules();
    }
  });
  searchInput.addEventListener("input", () => { draftFilter.query = searchInput.value; });
  clearButton.addEventListener("click", () => {
    draftFilter = cloneItemFilter();
    searchInput.value = "";
    error.textContent = "";
    renderRules();
  });
  cancelButton.addEventListener("click", () => closeController.requestClose());
  closeButton.addEventListener("click", () => closeController.requestClose());
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    for (const rule of draftFilter.rules) {
      const field = fields.find(({ id }) => id === rule.fieldId);
      const numberDomain = field?.dataType === "number"
        ? getNumberFilterDomain(items, field)
        : null;
      const message = field
        ? validateItemFilterRule(rule, field, numberDomain)
        : translate("A filtered field is unavailable.");
      if (message) {
        error.textContent = message;
        error.scrollIntoView({ block: "nearest" });
        return;
      }
    }
    activeFilter = cloneItemFilter(draftFilter);
    updateBadge();
    const appliedFilter = cloneItemFilter(activeFilter);
    closeController.requestClose({ afterClose: () => onApply(appliedFilter) });
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeController.requestClose();
  });
  button.addEventListener("click", () => {
    if (!destroyed && !dialog.open) {
      renderDraft();
      dialog.showModal();
      globalThis.requestAnimationFrame(() => searchInput.focus());
    }
  });

  return {
    button,
    dialog,
    destroy() {
      destroyed = true;
      closeController.destroy();
    },
    setData(nextFields, nextItems) {
      fields = [...nextFields];
      items = [...nextItems];
      activeFilter.rules = activeFilter.rules.filter(({ fieldId }) =>
        isFilterableField(fields.find(({ id }) => id === fieldId))
      );
      button.disabled = false;
      updateBadge();
    },
    setFilter(filter) {
      activeFilter = cloneItemFilter(filter);
      updateBadge();
    }
  };
}
