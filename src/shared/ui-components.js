import { createElement } from "./dom.js";
import { bindDragScroll } from "./drag-scroll.js";

export function createRequiredMark(requiredLabel = "Required") {
  return createElement("span", {
    attributes: { "aria-label": requiredLabel },
    className: "required-mark",
    textContent: "*"
  });
}

export function createMetaList(items) {
  const list = createElement("dl", { className: "meta-list" });

  items.forEach(({ label, value }) => {
    list.append(
      createElement("dt", { textContent: label }),
      createElement("dd", { textContent: value })
    );
  });

  return list;
}

export function createSchemaTable({ columns, rows }) {
  const tableWrap = createElement("div", { className: "schema-table-wrap" });
  const table = createElement("table", { className: "schema-table" });
  const thead = createElement("thead");
  const tbody = createElement("tbody");
  const headerRow = createElement("tr");

  columns.forEach((column) => {
    headerRow.append(createElement("th", { textContent: column.label }));
  });

  rows.forEach((row) => {
    const tableRow = createElement("tr");

    columns.forEach((column) => {
      tableRow.append(createElement("td", { textContent: row[column.key] }));
    });

    tbody.append(tableRow);
  });

  thead.append(headerRow);
  table.append(thead, tbody);
  tableWrap.append(table);
  bindDragScroll(tableWrap, { axis: "x" });

  return tableWrap;
}

export function createSettingsSection({ description, title }) {
  const details = createElement("details", {
    attributes: { open: "" },
    className: "settings-section"
  });
  const summary = createElement("summary", { className: "settings-section-header" });
  const copy = createElement("div");
  const heading = createElement("h3", { textContent: title });
  const paragraph = createElement("p", { textContent: description });

  copy.append(heading, paragraph);
  summary.append(copy);
  details.append(summary);

  return details;
}

export function createSwitchSetting({ checked, description, id, label, onChange }) {
  const row = createElement("label", {
    attributes: { for: id },
    className: "setting-row"
  });
  const copy = createElement("span");
  const title = createElement("strong", { textContent: label });
  const helper = createElement("small", { textContent: description });
  const input = createElement("input", {
    attributes: {
      id,
      type: "checkbox"
    },
    className: "switch-input"
  });

  input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked));

  copy.append(title, helper);
  row.append(copy, input);

  return row;
}
