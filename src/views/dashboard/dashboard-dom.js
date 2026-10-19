import { createElement } from "../../shared/dom.js";
import { translate } from "../../localization/translate.js";

export const t = translate;
export function element(tag, text = "", className = "", attributes = {}) {
  return createElement(tag, { textContent: text, className, attributes });
}
export function labeled(text, control) {
  const label = element("label"); label.append(element("span", text, "label-text"), control); return label;
}
export function select(options, attributes = {}) {
  const node = element("select", "", "", attributes);
  for (const [value, label] of options) node.append(new Option(t(label), value));
  return node;
}
