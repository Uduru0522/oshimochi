import { createFieldDefinitionRecord } from "../../data/models/field-definition.js";
import { RECORD_SCOPES } from "../../data/models/record-lifecycle.js";
import {
  appendSelectOptions,
  assertCustomFieldType,
  createBooleanOptions,
  createSelectOptions,
  createUniqueFieldKey,
  updateSelectOptions
} from "./field-configuration.js";

export const FIELD_CHANGE_KINDS = Object.freeze({
  add: "add",
  delete: "delete",
  update: "update"
});

function defaultIdGenerator() {
  return globalThis.crypto.randomUUID();
}

function requireNonEmptyString(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${fieldName} must be a non-empty string.`);
  }

  return value.trim();
}

function normalizeLabel(value) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function sortFields(fields) {
  return fields.sort(
    (left, right) => left.position - right.position || left.createdAt.localeCompare(right.createdAt)
  );
}

function assertUniqueChangeTargets(changes) {
  const targets = changes.map((change) =>
    change.kind === FIELD_CHANGE_KINDS.add
      ? `draft:${requireNonEmptyString(change.draftId, "draftId")}`
      : `field:${requireNonEmptyString(change.fieldId, "fieldId")}`
  );

  if (new Set(targets).size !== targets.length) {
    throw new TypeError("Only one staged change is allowed per field.");
  }
}

export function createFieldManagementOperations({
  storage,
  generateId = defaultIdGenerator,
  now = () => new Date().toISOString()
}) {
  if (
    typeof storage?.listFieldDefinitions !== "function" ||
    typeof storage?.saveFieldDefinitions !== "function"
  ) {
    throw new TypeError("Field management requires field-definition storage.");
  }

  async function listFields(goodsTypeId) {
    return storage.listFieldDefinitions(requireNonEmptyString(goodsTypeId, "goodsTypeId"));
  }

  async function applyChanges({ goodsTypeId, changes }) {
    const canonicalGoodsTypeId = requireNonEmptyString(goodsTypeId, "goodsTypeId");

    if (!Array.isArray(changes) || changes.length === 0) {
      throw new TypeError("At least one staged field change is required.");
    }

    assertUniqueChangeTargets(changes);

    const timestamp = now();
    const allCurrentFields = await storage.listFieldDefinitions(canonicalGoodsTypeId, {
      scope: RECORD_SCOPES.all
    });
    const currentFields = allCurrentFields.filter(({ isDeleted }) => !isDeleted);
    const currentById = new Map(allCurrentFields.map((field) => [field.id, field]));
    const resultingById = new Map(currentById);
    const existingKeys = new Set(allCurrentFields.map(({ key }) => key));
    const touchedIds = new Set();
    const requestedPositions = [];

    for (const change of changes) {
      if (change.kind === FIELD_CHANGE_KINDS.add) {
        const displayName = requireNonEmptyString(change.displayName, "displayName");
        const dataType = assertCustomFieldType(change.dataType);

        const id = generateId();
        const record = createFieldDefinitionRecord(
          {
            id,
            goodsTypeId: canonicalGoodsTypeId,
            key: createUniqueFieldKey(displayName, existingKeys),
            displayName,
            dataType,
            isRequired: dataType === "boolean" ? true : (change.isRequired ?? false),
            position: Number.MAX_SAFE_INTEGER,
            options: dataType === "select"
              ? createSelectOptions(change.optionLabels, generateId)
              : dataType === "boolean"
                ? createBooleanOptions(change.falseLabel, change.trueLabel)
                : null
          },
          { now: () => timestamp }
        );

        resultingById.set(id, record);
        touchedIds.add(id);

        if (change.position !== undefined) {
          if (!Number.isSafeInteger(change.position)) {
            throw new TypeError("Field position must be an integer.");
          }

          requestedPositions.push({ fieldId: id, position: change.position });
        }

        continue;
      }

      if (![FIELD_CHANGE_KINDS.update, FIELD_CHANGE_KINDS.delete].includes(change.kind)) {
        throw new TypeError(`Unsupported field change kind: ${change.kind}.`);
      }

      const current = currentById.get(change.fieldId);

      if (!current || current.isDeleted) {
        throw new TypeError("The staged field no longer exists.");
      }

      if (current.isBuiltIn) {
        throw new TypeError("Built-in fields cannot be changed or deleted.");
      }

      if (change.kind === FIELD_CHANGE_KINDS.delete) {
        resultingById.set(
          current.id,
          createFieldDefinitionRecord({
            ...current,
            isDeleted: true,
            deletedAt: timestamp,
            updatedAt: timestamp
          })
        );
        touchedIds.add(current.id);
        continue;
      }

      const nextRequired = change.isRequired ?? current.isRequired;

      if (!current.isRequired && nextRequired && current.dataType !== "boolean") {
        throw new TypeError("Making an existing optional field required is deferred.");
      }

      const updated = createFieldDefinitionRecord({
        ...current,
        displayName: change.displayName ?? current.displayName,
        isRequired: nextRequired,
        options: current.dataType === "select" && change.selectOptions
          ? updateSelectOptions(
            current.options,
            change.selectOptions,
            change.addOptionLabels,
            generateId
          )
          : change.addOptionLabels
            ? appendSelectOptions(current.options, change.addOptionLabels, generateId)
          : current.dataType === "boolean" && change.booleanOptions
            ? createBooleanOptions(
              change.booleanOptions.falseLabel,
              change.booleanOptions.trueLabel
            )
            : current.options,
        updatedAt: timestamp
      });

      resultingById.set(current.id, updated);
      touchedIds.add(current.id);

      if (change.position !== undefined) {
        if (!Number.isSafeInteger(change.position)) {
          throw new TypeError("Field position must be an integer.");
        }

        requestedPositions.push({ fieldId: current.id, position: change.position });
      }
    }

    const activeFields = sortFields(
      [...resultingById.values()].filter(({ isDeleted }) => !isDeleted)
    );
    const builtInCount = activeFields.filter(({ isBuiltIn }) => isBuiltIn).length;

    requestedPositions.forEach(({ fieldId, position }) => {
      const currentIndex = activeFields.findIndex(({ id }) => id === fieldId);
      const [field] = activeFields.splice(currentIndex, 1);
      const targetIndex = Math.max(builtInCount, Math.min(position, activeFields.length));
      activeFields.splice(targetIndex, 0, field);
    });

    activeFields.forEach((field, position) => {
      if (field.position === position) {
        return;
      }

      resultingById.set(
        field.id,
        createFieldDefinitionRecord({ ...field, position, updatedAt: timestamp })
      );
      touchedIds.add(field.id);
    });

    const normalizedNames = activeFields.map(({ id }) => ({
      id,
      name: normalizeLabel(resultingById.get(id).displayName)
    }));

    if (new Set(normalizedNames.map(({ name }) => name)).size !== normalizedNames.length) {
      throw new TypeError("Active field display names must be unique.");
    }

    const recordsToSave = [...touchedIds].map((id) => resultingById.get(id));
    await storage.saveFieldDefinitions({
      goodsTypeId: canonicalGoodsTypeId,
      fieldDefinitions: recordsToSave
    });

    return sortFields([...resultingById.values()].filter(({ isDeleted }) => !isDeleted));
  }

  return { applyChanges, listFields };
}
