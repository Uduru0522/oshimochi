import { createElement } from "../../shared/dom.js";
import { translate } from "../../localization/translate.js";
import { createItemDisplayValue } from "./item-display-value.js";
import { getItemDisplayData } from "./item-display-model.js";
import { selectItemCardFields } from "./item-card-context.js";
import { formatMissingFields } from "./item-missing-warning.js";

let popoverSequence = 0;

function createCardValues(fieldValues) {
  const values = createElement("dl", { className: "item-card-values" });

  fieldValues.forEach(({ field, value }) => {
    const description = createElement("dd");
    description.append(createItemDisplayValue(field, value));
    values.append(
      createElement("dt", {
        attributes: { title: field.displayName },
        textContent: field.displayName
      }),
      description
    );
  });
  return values;
}

function createFilteredFieldsDisclosure(item, fieldValues) {
  const popoverId = `itemCardFilters${++popoverSequence}`;
  const fieldLabel = translate(fieldValues.length === 1 ? "field" : "fields");
  const button = createElement("button", {
    attributes: {
      "aria-label": translate("Show {count} more filtered {fields} for {name}", {
        count: fieldValues.length,
        fields: fieldLabel,
        name: item.name
      }),
      popovertarget: popoverId,
      title: fieldValues.map(({ field }) => field.displayName).join(", "),
      type: "button"
    },
    className: "item-card-more",
    textContent: translate("+{count} filtered {fields}", {
      count: fieldValues.length,
      fields: fieldLabel
    })
  });
  const popover = createElement("div", {
    attributes: { id: popoverId, popover: "auto" },
    className: "item-card-filter-popover"
  });

  popover.append(
    createElement("h5", {
      textContent: translate("Filtered values for {name}", { name: item.name })
    }),
    createCardValues(fieldValues)
  );
  return [button, popover];
}

export function createItemCardContent(item, fields, queryContext) {
  const { missingRequiredFields } = getItemDisplayData(item, fields);
  const {
    hiddenFilteredFieldValues,
    hiddenOtherFieldCount,
    visibleFieldValues
  } = selectItemCardFields(item, fields, queryContext);
  const heading = createElement("h4", {
    attributes: { title: item.name },
    textContent: item.name
  });
  const content = [heading];

  if (missingRequiredFields.length > 0) {
    const message = formatMissingFields(missingRequiredFields);
    content.push(createElement("span", {
      attributes: { title: message },
      className: "item-card-warning",
      textContent: translate("{count} missing field(s)", {
        count: missingRequiredFields.length
      })
    }));
  }
  if (visibleFieldValues.length > 0) {
    content.push(createCardValues(visibleFieldValues));
  }
  if (hiddenFilteredFieldValues.length > 0) {
    content.push(...createFilteredFieldsDisclosure(item, hiddenFilteredFieldValues));
  } else if (hiddenOtherFieldCount > 0) {
    content.push(createElement("p", {
      className: "item-card-more",
      textContent: translate("+{count} more {fields}", {
        count: hiddenOtherFieldCount,
        fields: translate(hiddenOtherFieldCount === 1 ? "field" : "fields")
      })
    }));
  }

  return content;
}
