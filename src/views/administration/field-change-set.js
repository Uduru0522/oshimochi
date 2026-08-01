import { FIELD_CHANGE_KINDS } from "../../application/fields/manage-fields.js";

function clone(value) {
  return structuredClone(value);
}

export function createFieldChangeSet(fields) {
  const baseFields = clone(fields);
  const baseById = new Map(baseFields.map((field) => [field.id, field]));
  const changes = new Map();
  let customOrder = baseFields
    .filter(({ isBuiltIn, isDeleted }) => !isBuiltIn && !isDeleted)
    .map(({ id }) => id);

  function requireCustomField(fieldId) {
    const field = baseById.get(fieldId);

    if (!field || field.isDeleted || field.isBuiltIn) {
      throw new TypeError("Only active custom fields can be staged.");
    }

    return field;
  }

  function stageAdd(draft) {
    if (!draft?.draftId || changes.has(draft.draftId)) {
      throw new TypeError("A new field requires a unique draft ID.");
    }

    changes.set(draft.draftId, {
      ...clone(draft),
      kind: FIELD_CHANGE_KINDS.add
    });
    customOrder.push(draft.draftId);
  }

  function stageUpdate(fieldId, values) {
    const field = requireCustomField(fieldId);
    const currentChange = changes.get(fieldId);

    if (currentChange?.kind === FIELD_CHANGE_KINDS.delete) {
      throw new TypeError("Restore the staged deletion before editing this field.");
    }

    const mergedValues = { ...(currentChange ?? {}), ...clone(values) };
    const nextChange = { fieldId, kind: FIELD_CHANGE_KINDS.update };

    if (
      mergedValues.displayName !== undefined &&
      mergedValues.displayName !== field.displayName
    ) {
      nextChange.displayName = mergedValues.displayName;
    }
    if (
      mergedValues.isRequired !== undefined &&
      mergedValues.isRequired !== field.isRequired
    ) {
      nextChange.isRequired = mergedValues.isRequired;
    }
    if (mergedValues.addOptionLabels?.length) {
      nextChange.addOptionLabels = clone(mergedValues.addOptionLabels);
    }
    if (
      mergedValues.selectOptions &&
      mergedValues.selectOptions.some(({ id, label }, index) => {
        const original = field.options?.choices?.[index];
        return original?.id !== id || original.label !== label;
      })
    ) {
      nextChange.selectOptions = clone(mergedValues.selectOptions);
    }
    if (
      mergedValues.booleanOptions &&
      (mergedValues.booleanOptions.falseLabel !== field.options?.falseLabel ||
        mergedValues.booleanOptions.trueLabel !== field.options?.trueLabel)
    ) {
      nextChange.booleanOptions = clone(mergedValues.booleanOptions);
    }

    if (Object.keys(nextChange).length === 2) {
      changes.delete(fieldId);
      return;
    }

    changes.set(fieldId, nextChange);
  }

  function stageDelete(fieldId) {
    requireCustomField(fieldId);
    changes.set(fieldId, { fieldId, kind: FIELD_CHANGE_KINDS.delete });
    customOrder = customOrder.filter((id) => id !== fieldId);
  }

  function updateDraft(draftId, values) {
    const draft = changes.get(draftId);

    if (draft?.kind !== FIELD_CHANGE_KINDS.add) {
      throw new TypeError("The staged field draft does not exist.");
    }

    changes.set(draftId, { ...draft, ...clone(values), draftId });
  }

  function removeDraft(draftId) {
    const draft = changes.get(draftId);

    if (draft?.kind !== FIELD_CHANGE_KINDS.add) {
      throw new TypeError("The staged field draft does not exist.");
    }

    changes.delete(draftId);
    customOrder = customOrder.filter((id) => id !== draftId);
  }

  function move(fieldId, direction) {
    const currentIndex = customOrder.indexOf(fieldId);
    const targetIndex = currentIndex + direction;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= customOrder.length) {
      return false;
    }

    [customOrder[currentIndex], customOrder[targetIndex]] = [
      customOrder[targetIndex],
      customOrder[currentIndex]
    ];
    return true;
  }

  function getChanges() {
    const builtInCount = baseFields.filter(({ isBuiltIn, isDeleted }) => isBuiltIn && !isDeleted).length;
    const stagedChanges = new Map([...changes].map(([id, change]) => [id, clone(change)]));

    customOrder.forEach((fieldId, index) => {
      const position = builtInCount + index;
      const existingChange = stagedChanges.get(fieldId);

      if (existingChange?.kind === FIELD_CHANGE_KINDS.add) {
        existingChange.position = position;
        return;
      }

      const baseField = baseById.get(fieldId);

      if (baseField && baseField.position !== position) {
        stagedChanges.set(fieldId, {
          ...(existingChange ?? { fieldId, kind: FIELD_CHANGE_KINDS.update }),
          position
        });
      }
    });

    return [...stagedChanges.values()];
  }

  function getPreviewFields() {
    const builtIns = baseFields
      .filter(({ isBuiltIn, isDeleted }) => isBuiltIn && !isDeleted)
      .map((field) => ({ ...clone(field), stagedKind: null }));
    const customFields = customOrder.map((fieldId, index) => {
      const change = changes.get(fieldId);

      if (change?.kind === FIELD_CHANGE_KINDS.add) {
        return {
          id: change.draftId,
          displayName: change.displayName,
          dataType: change.dataType,
          isBuiltIn: false,
          isRequired: change.isRequired,
          options: change.dataType === "select"
            ? { choices: change.optionLabels.map((label) => ({ label })) }
            : change.dataType === "boolean"
              ? {
                falseLabel: change.falseLabel,
                trueLabel: change.trueLabel
              }
              : null,
          position: builtIns.length + index,
          stagedKind: FIELD_CHANGE_KINDS.add
        };
      }

      const field = baseById.get(fieldId);
      const update = change?.kind === FIELD_CHANGE_KINDS.update ? clone(change) : {};
      const nextPosition = builtIns.length + index;
      const isReordered = field.position !== nextPosition;
      return {
        ...clone(field),
        ...update,
        ...(update.selectOptions
          ? { options: { choices: clone(update.selectOptions) } }
          : {}),
        ...(update.booleanOptions ? { options: clone(update.booleanOptions) } : {}),
        originalIsRequired: field.isRequired,
        position: nextPosition,
        stagedKind: change?.kind ?? (isReordered ? FIELD_CHANGE_KINDS.update : null)
      };
    });

    const deleted = [...changes.values()]
      .filter(({ kind }) => kind === FIELD_CHANGE_KINDS.delete)
      .map(({ fieldId }) => ({
        ...clone(baseById.get(fieldId)),
        stagedKind: FIELD_CHANGE_KINDS.delete
      }));

    return [...builtIns, ...customFields, ...deleted];
  }

  function reset() {
    changes.clear();
    customOrder = baseFields
      .filter(({ isBuiltIn, isDeleted }) => !isBuiltIn && !isDeleted)
      .map(({ id }) => id);
  }

  return {
    get changeCount() {
      return getChanges().length;
    },
    getChanges,
    getPreviewFields,
    move,
    removeDraft,
    reset,
    stageAdd,
    stageDelete,
    stageUpdate,
    updateDraft
  };
}
