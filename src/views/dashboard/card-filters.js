import { getNumberFilterDomain } from "../../application/items/filter-items.js";
import { createDefaultItemFilterRule, createItemFilterRuleEditor, validateItemFilterRule } from "../items/item-filter-rule.js";
import { element as e, labeled, select, t } from "./dashboard-dom.js";

let sequence = 0;
export function createCardFilters({ source, collection, onChange }) {
  const fields = collection.fields.filter(field => !field.isBuiltIn || !["id", "image"].includes(field.key));
  const panel = e("div", "", "source-filters", { id: `dashboard-source-filters-${++sequence}` }); panel.hidden = true;
  const toggle = e("button", "", "source-filter-toggle", { type: "button", "aria-expanded": "false", "aria-controls": panel.id });
  function updateLabel() {
    toggle.textContent = t(source.filter.query || source.filter.rules.length ? "Filters applied" : "Filter items (optional)");
    toggle.setAttribute("aria-label", toggle.textContent);
  }
  function changed() { updateLabel(); onChange(); }
  function close() { panel.hidden = true; toggle.setAttribute("aria-expanded", "false"); }
  toggle.onclick = () => { panel.hidden = !panel.hidden; toggle.setAttribute("aria-expanded", String(!panel.hidden)); };
  updateLabel();
  const query = e("input", "", "", { type: "search", placeholder: t("Search item names and text fields") }); query.value = source.filter.query;
  query.oninput = () => { source.filter.query = query.value; changed(); };
  panel.append(labeled(t("Search items in {collection}", { collection: collection.goodsType.displayName }), query));
  const add = select([], { "aria-label": t("Add field filter") }), rules = e("div", "", "item-filter-rules");
  panel.append(add, rules);
  function renderRules() {
    rules.replaceChildren();
    const available = fields.filter(field => !source.filter.rules.some(rule => rule.fieldId === field.id));
    add.replaceChildren(new Option(t("Add field filter..."), ""));
    available.forEach(field => add.append(new Option(field.displayName, field.id))); add.disabled = available.length === 0;
    for (const rule of source.filter.rules) {
      const field = fields.find(field => field.id === rule.fieldId);
      const onRemove = () => { source.filter.rules = source.filter.rules.filter(entry => entry !== rule); renderRules(); changed(); };
      if (!field || field.dataType !== rule.dataType) {
        const warning = e("div", "", "error-box");
        const remove = e("button", t("Remove condition"), "", { type: "button" }); remove.onclick = onRemove;
        warning.append(e("p", t('“{field}” is unavailable. Remove this condition or choose another field.', { field: rule.fieldName })), remove); rules.append(warning); continue;
      }
      const editor = createItemFilterRuleEditor({ field, rule, onRemove,
        numberDomain: field.dataType === "number" ? getNumberFilterDomain(collection.items, field) : null });
      if (field.dataType === "date") {
        const period = select([["range", "Date range"], ["this-year", "This year"]], { "aria-label": t("Date period") });
        period.value = rule.datePreset ?? "range";
        const controls = editor.querySelector(".item-filter-rule-controls"); controls.hidden = rule.datePreset === "this-year";
        period.onchange = () => {
          rule.datePreset = period.value === "this-year" ? "this-year" : null;
          if (rule.datePreset) { rule.from = ""; rule.to = ""; }
          controls.hidden = Boolean(rule.datePreset); changed();
        };
        editor.insertBefore(labeled(t("Date period"), period), controls);
      }
      rules.append(editor);
    }
  }
  add.onchange = () => {
    const field = fields.find(field => field.id === add.value);
    if (!field) return;
    source.filter.rules.push({ ...createDefaultItemFilterRule(field), dataType: field.dataType, fieldName: field.displayName,
      ...(field.dataType === "select" ? { choiceLabels: field.options.choices.map(({ id, label }) => ({ id, label })) } : {}) });
    renderRules(); changed();
  };
  rules.addEventListener("input", changed); rules.addEventListener("change", changed);
  renderRules(); return { toggle, element: panel, close };
}

export function readCardFilters(source, collection) {
  return { query: source.filter.query, rules: source.filter.rules.map(rule => {
    const field = collection.fields.find(field => field.id === rule.fieldId);
    if (!field || field.dataType !== rule.dataType) throw new Error(t('“{field}” is unavailable. Remove this condition or choose another field.', { field: rule.fieldName }));
    const message = rule.datePreset === "this-year" ? "" : validateItemFilterRule(rule, field,
      field.dataType === "number" ? getNumberFilterDomain(collection.items, field) : null);
    if (message) throw new Error(message);
    return { ...structuredClone(rule), fieldName: field.displayName,
      ...(field.dataType === "select" ? { choiceLabels: [...new Map([...(rule.choiceLabels ?? []), ...field.options.choices].map(choice => [choice.id, { id: choice.id, label: choice.label }])).values()] } : {}) };
  }) };
}
