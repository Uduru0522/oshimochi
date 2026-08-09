import { CUSTOM_FIELD_TYPES } from "../../application/fields/field-configuration.js";
import { FIELD_CHANGE_KINDS } from "../../application/fields/manage-fields.js";
import { translate } from "../../localization/translate.js";
import { createActionButton } from "../../shared/action-button.js";
import { createElement } from "../../shared/dom.js";
import { createSchemaTable } from "../../shared/ui-components.js";

function getReviewColumns() {
  return [
    { key: "action", label: translate("Change") },
    { key: "field", label: translate("Field") },
    { key: "details", label: translate("Details") }
  ];
}

const TYPE_LABELS = new Map(CUSTOM_FIELD_TYPES.map(({ label, value }) => [value, label]));

function describeChange(change, fieldsById) {
  const field = fieldsById.get(change.fieldId);

  if (change.kind === FIELD_CHANGE_KINDS.add) {
    const binaryDetails = change.dataType === "boolean"
      ? `: ${change.falseLabel} / ${change.trueLabel}`
      : "";
    return {
      action: translate("Add"),
      field: change.displayName,
      details: `${translate(TYPE_LABELS.get(change.dataType))}${binaryDetails}${change.isRequired ? `, ${translate("required")}` : ""}`
    };
  }

  if (change.kind === FIELD_CHANGE_KINDS.delete) {
    return {
      action: translate("Remove"),
      field: field?.displayName ?? change.fieldId,
      details: translate("Soft deletion")
    };
  }

  const details = [];

  if (change.displayName && change.displayName !== field?.displayName) {
    details.push(translate("Rename to {name}", { name: change.displayName }));
  }
  if (change.isRequired === false && field?.isRequired) {
    details.push(translate("Make optional"));
  }
  if (change.addOptionLabels?.length) {
    details.push(translate("Add {count} options", {
      count: change.addOptionLabels.length
    }));
  }
  if (change.selectOptions) {
    const previousLabels = new Map(
      (field?.options?.choices ?? []).map(({ id, label }) => [id, label])
    );
    const renameCount = change.selectOptions.filter(
      ({ id, label }) => previousLabels.get(id) !== label
    ).length;

    if (renameCount > 0) {
      details.push(translate("Rename {count} option(s)", { count: renameCount }));
    }
  }
  if (change.booleanOptions) {
    details.push(
      translate("Change options to {first} / {second}", {
        first: change.booleanOptions.falseLabel,
        second: change.booleanOptions.trueLabel
      })
    );
  }
  if (change.position !== undefined && change.position !== field?.position) {
    details.push(translate("Reorder"));
  }

  return {
    action: translate("Modify"),
    field: field?.displayName ?? change.fieldId,
    details: details.join(", ") || translate("Metadata update")
  };
}

export function createFieldChangeReview({
  baseFields,
  changes,
  fieldManagement,
  goodsTypeId,
  mutationController,
  onApplied,
  onBack
}) {
  const review = createElement("div", { className: "field-change-review" });
  const fieldsById = new Map(baseFields.map((field) => [field.id, field]));
  const status = createElement("div", {
    attributes: { "aria-live": "polite" },
    className: "creation-status"
  });
  const actions = createElement("div", { className: "form-actions" });
  const backButton = createActionButton(translate("Back"));
  const applyButton = createActionButton(translate("Apply staged changes"), {
    className: "primary-action"
  });
  const heading = createElement("div", { className: "form-heading" });

  heading.append(
    createElement("h3", { textContent: translate("Review field changes") }),
    createElement("p", {
      textContent: translate(
        "All listed changes will be written together to this browser."
      )
    })
  );
  review.append(
    heading,
    createSchemaTable({
      columns: getReviewColumns(),
      rows: changes.map((change) => describeChange(change, fieldsById))
    })
  );
  backButton.addEventListener("click", onBack);
  applyButton.addEventListener("click", async () => {
    let wasSaved = false;

    backButton.disabled = true;
    applyButton.disabled = true;
    applyButton.textContent = translate("Applying...");
    review.setAttribute("aria-busy", "true");
    status.replaceChildren(
      createElement("progress", { className: "creation-progress" }),
      createElement("span", { textContent: translate("Saving field changes...") })
    );

    try {
      await mutationController.run(async () => {
        await fieldManagement.applyChanges({ goodsTypeId, changes });
        wasSaved = true;
        await onApplied();
      });
    } catch (error) {
      console.error("Field changes could not be applied:", error);
      review.removeAttribute("aria-busy");

      if (wasSaved) {
        const reloadButton = createActionButton(translate("Reload application"), {
          className: "primary-action"
        });
        reloadButton.addEventListener("click", () => window.location.reload());
        applyButton.replaceWith(reloadButton);
      } else {
        backButton.disabled = false;
        applyButton.disabled = false;
        applyButton.textContent = translate("Try again");
      }

      status.replaceChildren(
        createElement("p", {
          className: "form-error",
          textContent: wasSaved
            ? translate("The changes were saved, but the screen could not refresh. Reload the application to continue.")
            : translate("The staged changes could not be applied. They remain available for review or editing.")
        })
      );
    }
  });
  actions.append(backButton, applyButton);
  review.append(status, actions);

  return review;
}
