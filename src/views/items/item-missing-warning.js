import { createElement } from "../../shared/dom.js";
import { translate } from "../../localization/translate.js";

export function formatMissingFields(fields, visibleCount = fields.length) {
  const visibleNames = fields
    .slice(0, visibleCount)
    .map(({ displayName }) => displayName)
    .join(", ");
  const hiddenCount = fields.length - visibleCount;
  return translate("Missing value at field(s):{names}{remainder}.", {
    names: visibleNames ? ` ${visibleNames}` : "",
    remainder: hiddenCount > 0
      ? ` ${translate("+{count} more", { count: hiddenCount })}`
      : ""
  });
}

export function formatMissingFieldCount(fields) {
  return translate("{count} Missing field(s)", { count: fields.length });
}

export function createMissingFieldsWarning(fields, title, itemName) {
  const fullMessage = formatMissingFields(fields);
  const element = createElement("span", {
    attributes: {
      "aria-label": fullMessage,
      title: fullMessage
    },
    className: "item-missing-warning",
    textContent: fullMessage
  });

  function updateLayout() {
    if (!title.isConnected || title.clientWidth === 0) {
      return;
    }

    const nameWidth = Math.min(itemName.scrollWidth, title.clientWidth * 0.45);
    const availableWidth = Math.max(130, title.clientWidth - nameWidth - 8);
    element.style.maxWidth = `${availableWidth}px`;

    for (let visibleCount = fields.length; visibleCount >= 0; visibleCount -= 1) {
      element.textContent = visibleCount === 0
        ? formatMissingFieldCount(fields)
        : formatMissingFields(fields, visibleCount);

      if (element.scrollWidth <= availableWidth || visibleCount === 0) {
        break;
      }
    }
  }

  return { element, updateLayout };
}
