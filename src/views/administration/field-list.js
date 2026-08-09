import { CUSTOM_FIELD_TYPES } from "../../application/fields/field-configuration.js";
import { FIELD_CHANGE_KINDS } from "../../application/fields/manage-fields.js";
import { translate } from "../../localization/translate.js";
import { createElement } from "../../shared/dom.js";
import { createIcon } from "../../shared/icons.js";

const TYPE_LABELS = new Map(CUSTOM_FIELD_TYPES.map(({ label, value }) => [value, label]));
TYPE_LABELS.set("image", "Image");

function createToolButton(iconName, label, onClick, { disabled = false } = {}) {
  const button = createElement("button", {
    attributes: {
      "aria-label": label,
      title: label,
      type: "button"
    },
    className: "field-tool-button"
  });

  button.disabled = disabled;
  button.append(createIcon(iconName));
  button.addEventListener("click", onClick);
  return button;
}

function createExpansionController(shell, expansion, content, getToggleButton) {
  function setOpen(isOpen) {
    shell.toggleAttribute("data-expanded", isOpen);
    expansion.setAttribute("aria-hidden", String(!isOpen));
    content.inert = !isOpen;
    getToggleButton()?.setAttribute("aria-expanded", String(isOpen));
  }

  return {
    close() {
      setOpen(false);
    },
    get isOpen() {
      return shell.hasAttribute("data-expanded");
    },
    open(panel) {
      content.replaceChildren(panel);
      setOpen(true);
    }
  };
}

export function createFieldList({ fields, onEdit, onMove, onRemove }) {
  const list = createElement("div", { className: "field-list" });
  let activeExpansion = null;
  const activeCustomFields = fields.filter(
    ({ isBuiltIn, stagedKind }) => !isBuiltIn && stagedKind !== FIELD_CHANGE_KINDS.delete
  );

  fields.forEach((field) => {
    const shell = createElement("div", {
      className: `field-row-shell${field.stagedKind ? ` is-${field.stagedKind}` : ""}`
    });
    const row = createElement("div", { className: "field-row" });
    const name = createElement("div", { className: "field-row-name" });
    const type = createElement("span", {
      className: "field-type-label",
      textContent: translate(TYPE_LABELS.get(field.dataType) ?? field.dataType)
    });
    const metadata = createElement("div", { className: "field-row-metadata" });
    const actions = createElement("div", { className: "field-row-actions" });
    const expansion = createElement("div", {
      attributes: { "aria-hidden": "true" },
      className: "field-row-expansion"
    });
    const expansionContent = createElement("div", {
      className: "field-row-expansion-content"
    });
    let editButton = null;
    const expansionController = createExpansionController(
      shell,
      expansion,
      expansionContent,
      () => editButton
    );

    expansionContent.inert = true;
    expansion.append(expansionContent);
    name.append(createElement("strong", { textContent: field.displayName }));
    metadata.append(
      createElement("span", {
        textContent: translate(field.isRequired ? "Required" : "Optional")
      })
    );

    if (field.stagedKind) {
      metadata.append(
        createElement("span", {
          className: "field-stage-badge",
          textContent: translate(field.stagedKind === FIELD_CHANGE_KINDS.delete
            ? "Staged removal"
            : field.stagedKind === FIELD_CHANGE_KINDS.add
              ? "Staged addition"
              : "Staged edit")
        })
      );
    }

    if (field.isBuiltIn) {
      actions.append(
        createToolButton("lock", translate("Protected field"), () => {}, {
          disabled: true
        })
      );
    } else if (field.stagedKind === FIELD_CHANGE_KINDS.delete) {
      actions.append(
        createElement("span", {
          className: "field-removal-note",
          textContent: translate("Applied after review")
        })
      );
    } else {
      const orderIndex = activeCustomFields.findIndex(({ id }) => id === field.id);

      actions.append(
        createToolButton(
          "moveUp",
          translate("Move field up"),
          () => onMove(field, -1),
          { disabled: orderIndex === 0 }
        ),
        createToolButton(
          "moveDown",
          translate("Move field down"),
          () => onMove(field, 1),
          { disabled: orderIndex === activeCustomFields.length - 1 }
        ),
        editButton = createToolButton("edit", translate("Edit field"), () => {
          if (expansionController.isOpen) {
            expansionController.close();
            activeExpansion = null;
            return;
          }

          activeExpansion?.close();
          activeExpansion = expansionController;
          onEdit(field, expansionController);
        }),
        createToolButton(
          "delete",
          field.stagedKind === FIELD_CHANGE_KINDS.add
            ? translate("Remove staged field")
            : translate("Remove field"),
          () => {
            activeExpansion?.close();
            activeExpansion = expansionController;
            onRemove(field, expansionController);
          }
        )
      );
      editButton.setAttribute("aria-expanded", "false");
    }

    row.append(name, type, metadata, actions);
    shell.append(row, expansion);
    list.append(shell);
  });

  return list;
}
