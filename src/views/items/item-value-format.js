import { translate } from "../../localization/translate.js";

export function formatItemFieldValue(field, value) {
  if (value === undefined) {
    return translate("Not set");
  }

  if (field.dataType === "boolean") {
    return value ? field.options.trueLabel : field.options.falseLabel;
  }

  if (field.dataType === "select") {
    return field.options.choices.find(({ id }) => id === value)?.label
      ?? translate("Unknown option");
  }

  return String(value);
}
