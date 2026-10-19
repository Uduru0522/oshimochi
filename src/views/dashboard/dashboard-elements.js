import { createIcon } from "../../shared/icons.js";
import { element as e, labeled, t } from "./dashboard-dom.js";
import { createChoiceControl } from "./choice-control.js";

export function createDashboardElements() {
  const refs = {};
  function node(tag, id, text = "", className = "", attributes = {}) {
    const result = e(tag, text, className, { ...attributes, id: `dashboard-${id}` });
    refs[id] = result; return result;
  }
  function action(id, label, attributes = {}) {
    return node("button", id, t(label), "", { type: "button", ...attributes });
  }
  function modal(id, titleId, title, closeId, closeLabel) {
    const dialog = node("dialog", id, "", "dashboard-dialog", { "aria-labelledby": `dashboard-${titleId}` });
    const header = e("header", "", "dialog-header");
    const close = action(closeId, "", { "aria-label": t(closeLabel), title: t("Close") });
    close.append(createIcon("close")); header.append(node("h2", titleId, t(title)), close); dialog.append(header);
    return dialog;
  }
  const root = e("article", "", "dashboard-view", { "aria-label": t("My collection") });
  const status = node("div", "status", t("Loading your collection..."), "dashboard-status", { role: "status" });
  const notice = node("div", "notice", "", "dashboard-notice", { role: "status" }); notice.hidden = true;
  const overview = node("header", "overview", "", "dashboard-overview"); overview.hidden = true;
  const welcome = e("div", "", "dashboard-welcome");
  const keepsakes = e("span", "", "dashboard-keepsakes", { "aria-hidden": "true" });
  keepsakes.append(e("span", "", "keepsake-card"), e("span", "", "keepsake-card"));
  const title = e("h2", t("My collection"), "dashboard-title", { title: t("My collection") });
  title.append(e("span", "", "collection-period", { "aria-hidden": "true" }));
  welcome.append(keepsakes, title);
  const stats = e("dl", "", "stats", { "aria-label": t("Collection overview") });
  for (const [id, label] of [["collection-count", "Collections"], ["item-count", "Items"], ["deleted-count", "Deleted items"]]) {
    const stat = e("div", "", "stat", { "data-stat": id });
    stat.append(e("dt", t(label)), node("dd", id, "—")); stats.append(stat);
  }
  overview.append(welcome, stats);
  const arrangeBar = node('section', 'arrange-bar', '', 'dashboard-arrange-bar', { 'aria-label': t('Rearrange cards') }); arrangeBar.hidden = true;
  const arrangeCopy = e('div'); arrangeCopy.append(e('strong', t('Rearrange cards')),
    node('p', 'arrange-instructions', t('Drag cards to rearrange them. Use arrow keys when a drag handle is focused.')));
  const arrangeActions = e('div', '', 'arrange-actions'); arrangeActions.append(action('save-order', 'Save order'), action('cancel-order', 'Cancel'));
  arrangeBar.append(arrangeCopy, arrangeActions, node('span', 'arrange-status', '', 'sr-only', { role: 'status', 'aria-live': 'polite' }));
  const cards = node("div", "cards", "", "dashboard-cards", { "aria-label": t("Saved cards") });
  cards.hidden = true;
  const add = action("add-card", "", { title: t("Add card"), "aria-label": t("Add card") });
  add.className = "add-card-tile"; add.disabled = true; add.append(createIcon("add")); cards.append(add);
  const picker = modal("card-picker", "card-picker-title", "Add card", "close-card-picker", "Close card picker");
  const choices = e("div", "", "card-choices");
  for (const [id, title, copy] of [["choose-summary", "Summary card", "Count items or calculate totals from your fields."], ["choose-recent", "Recent items", "Your five newest items across all collections."]]) {
    const choice = action(id, "", { "aria-label": t(title) });
    choice.append(e("strong", t(title)), node("span", `${id}-description`, t(copy))); choices.append(choice);
    if (id === "choose-summary") {
      const unavailable = node("p", "summary-unavailable", t("Create a collection before adding a summary card."), "help");
      unavailable.hidden = true; choices.append(unavailable);
    }
  }
  picker.append(choices);
  const details = modal("details-dialog", "details-title", "Card details", "close-details", "Close card details");
  const footer = e("footer", "", "dialog-footer"); footer.append(action("dismiss-details", "Close"));
  details.append(node("div", "details-body"), footer);

  const editor = node("dialog", "editor", "", "dashboard-dialog dashboard-editor", { "aria-labelledby": "dashboard-editor-heading" });
  const form = node("form", "card-form");
  const header = e("header", "", "dialog-header"), titles = e("div");
  titles.append(node("h2", "editor-heading", t("Add summary card")), e("p", t("Choose what to calculate and where the values come from.")));
  const close = action("close-editor", "", { "aria-label": t("Close card editor") }); close.append(createIcon("close")); header.append(titles, close);
  const layout = node("div", "editor-layout", "", "editor-layout"), fields = e("div", "", "editor-fields");
  fields.append(labeled(t("Card name"), node("input", "card-title", "", "", { required: "", maxlength: "200", autocomplete: "off", placeholder: t("e.g. Total spent") })));
  refs.calculation = createChoiceControl("What would you like to calculate?", [["sum", "Total (sum)"], ["count", "Number of items"], ["average", "Average"], ["minimum", "Lowest value"], ["maximum", "Highest value"]], { className: "calculation-choices" });
  fields.append(refs.calculation.element);
  const presentation = e("div", "", "dashboard-presentation-row");
  for (const [id, label, options, wrapperId] of [
    ["group-by", "Break down by", [["collection", "Collection"], ["field", "A category field"]], "grouping-controls"],
    ["display-mode", "Display", [["auto", "Automatic"], ["number", "Number only"], ["ring", "Ring"]], "display-controls"]
  ]) {
    refs[id] = createChoiceControl(label, options); refs[wrapperId] = refs[id].element; presentation.append(refs[wrapperId]);
  }
  fields.append(presentation);
  const sources = e("section", "", "dashboard-scope", { "aria-labelledby": "dashboard-sources-heading" });
  const scopeHeading = e("div", "", "dashboard-scope-heading");
  const deleted = e("label", "", "check include-deleted-control");
  deleted.append(node("input", "include-deleted", "", "", { type: "checkbox" }), e("span", t("Include deleted items")));
  scopeHeading.append(node("h3", "sources-heading", t("Collections and fields")), deleted);
  sources.append(scopeHeading, node("p", "source-help", "", "help"), node("div", "sources")); fields.append(sources);
  const units = node("div", "unit-controls", "", "field");
  refs.unit = createChoiceControl("Unit", [["", "No unit"], ["¥", "¥ — Yen", "¥"], ["$", "$ — Dollar", "$"], ["NTD", "NTD — Taiwan dollar", "NTD"], ["custom", "Custom..."]], { className: "unit-choices" });
  const customChoice = refs.unit.options.find(option => option.value === "custom").element;
  const customCell = e("div", "", "dashboard-custom-unit"); customChoice.replaceWith(customCell); customCell.append(customChoice);
  customCell.append(node("input", "custom-unit", "", "", {
    "aria-label": t("Custom unit"), maxlength: "32", placeholder: t("e.g. points, 冊, hours"), autocomplete: "off"
  }));
  refs["unit-position"] = createChoiceControl("Unit position", [["prefix", "Before the number"], ["suffix", "After the number"]]);
  refs["unit-position-label"] = refs["unit-position"].element;
  units.append(refs.unit.element, refs["unit-position-label"]); fields.append(units);
  const error = node("div", "editor-error", "", "error-box", { role: "alert" }); error.hidden = true; fields.append(error);
  const preview = e("aside", "", "preview-pane", { "aria-label": t("Card preview") }); preview.append(e("h3", t("Live preview")));
  const card = e("div", "", "preview-card"); card.append(node("div", "preview-title", t("Your card")), node("div", "preview-value", "—"));
  const explanation = node("details", "preview-details"); explanation.append(e("summary", t("How this is calculated")), node("div", "preview-description"), node("p", "preview-coverage", "", "help"));
  preview.append(card, node("p", "preview-guidance"), explanation); layout.append(fields, preview);
  const editorFooter = e("footer", "", "dialog-footer");
  const save = action("save-card", "Save card", { type: "submit" }); save.className = "primary"; save.disabled = true;
  editorFooter.append(action("cancel-editor", "Cancel"), save); form.append(header, layout, editorFooter); editor.append(form);
  root.append(status, notice, overview, arrangeBar, cards, picker, details, editor);
  return { element: root, refs };
}
