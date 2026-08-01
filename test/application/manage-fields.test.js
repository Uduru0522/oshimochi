import assert from "node:assert/strict";
import test from "node:test";

import {
  FIELD_CHANGE_KINDS,
  createFieldManagementOperations
} from "../../src/application/fields/manage-fields.js";
import { createBuiltInFieldDefinitions } from "../../src/data/models/built-in-fields.js";
import { createFieldDefinitionRecord } from "../../src/data/models/field-definition.js";

const FIXED_TIME = "2026-07-20T00:00:00.000Z";
const NEXT_TIME = "2026-07-21T00:00:00.000Z";

function createFixtureFields() {
  return [
    ...createBuiltInFieldDefinitions({
      goodsTypeId: "figures",
      generateId: (key) => `built-in-${key}`,
      now: () => FIXED_TIME
    }),
    createFieldDefinitionRecord(
      {
        id: "manufacturer",
        goodsTypeId: "figures",
        key: "manufacturer",
        displayName: "Manufacturer",
        dataType: "text",
        isRequired: true,
        position: 3
      },
      { now: () => FIXED_TIME }
    ),
    createFieldDefinitionRecord(
      {
        id: "scale",
        goodsTypeId: "figures",
        key: "scale",
        displayName: "Scale",
        dataType: "text",
        position: 4
      },
      { now: () => FIXED_TIME }
    )
  ];
}

function createHarness() {
  const fields = createFixtureFields();
  const writes = [];
  let id = 0;
  const operations = createFieldManagementOperations({
    storage: {
      async listFieldDefinitions(goodsTypeId, { includeDeleted = false } = {}) {
        return fields.filter(
          (field) =>
            field.goodsTypeId === goodsTypeId && (includeDeleted || !field.isDeleted)
        );
      },
      async saveFieldDefinitions(changeSet) {
        writes.push(changeSet);
        changeSet.fieldDefinitions.forEach((changedField) => {
          const index = fields.findIndex(({ id: fieldId }) => fieldId === changedField.id);

          if (index === -1) {
            fields.push(changedField);
          } else {
            fields[index] = changedField;
          }
        });
      }
    },
    generateId: () => `generated-${++id}`,
    now: () => NEXT_TIME
  });

  return { fields, operations, writes };
}

test("field management adds a selection field with stable options", async () => {
  const { operations, writes } = createHarness();

  const result = await operations.applyChanges({
    goodsTypeId: "figures",
    changes: [
      {
        kind: FIELD_CHANGE_KINDS.add,
        draftId: "draft-status",
        displayName: "Release status",
        dataType: "select",
        isRequired: false,
        optionLabels: ["Preordered", "Owned"]
      }
    ]
  });
  const added = result.find(({ key }) => key === "release_status");

  assert.equal(writes.length, 1);
  assert.equal(added.position, 5);
  assert.deepEqual(
    added.options.choices.map(({ id, label }) => ({ id, label })),
    [
      { id: "generated-2", label: "Preordered" },
      { id: "generated-3", label: "Owned" }
    ]
  );
});

test("field management adds a required two-option field with custom labels", async () => {
  const { operations } = createHarness();

  const result = await operations.applyChanges({
    goodsTypeId: "figures",
    changes: [
      {
        kind: FIELD_CHANGE_KINDS.add,
        draftId: "draft-censorship",
        displayName: "Censorship",
        dataType: "boolean",
        falseLabel: "Uncensored",
        trueLabel: "Censored",
        isRequired: true
      }
    ]
  });
  const added = result.find(({ key }) => key === "censorship");

  assert.equal(added.isRequired, true);
  assert.deepEqual(added.options, {
    falseLabel: "Uncensored",
    trueLabel: "Censored"
  });
});

test("field management upgrades legacy optional two-option fields to required", async () => {
  const { fields, operations } = createHarness();
  fields.push(
    createFieldDefinitionRecord(
      {
        id: "legacy-toggle",
        goodsTypeId: "figures",
        key: "legacy_toggle",
        displayName: "Legacy toggle",
        dataType: "boolean",
        isRequired: false,
        options: null,
        position: 5
      },
      { now: () => FIXED_TIME }
    )
  );

  const result = await operations.applyChanges({
    goodsTypeId: "figures",
    changes: [
      {
        kind: FIELD_CHANGE_KINDS.update,
        fieldId: "legacy-toggle",
        isRequired: true
      }
    ]
  });

  assert.equal(result.find(({ id }) => id === "legacy-toggle").isRequired, true);
});

test("field management applies edits, order changes, and soft deletion together", async () => {
  const { operations, writes } = createHarness();

  const result = await operations.applyChanges({
    goodsTypeId: "figures",
    changes: [
      {
        kind: FIELD_CHANGE_KINDS.update,
        fieldId: "scale",
        displayName: "Figure scale",
        position: 3
      },
      {
        kind: FIELD_CHANGE_KINDS.delete,
        fieldId: "manufacturer"
      }
    ]
  });

  assert.deepEqual(result.map(({ displayName }) => displayName), [
    "ID",
    "Name",
    "Image",
    "Figure scale"
  ]);
  assert.equal(
    writes[0].fieldDefinitions.find(({ id }) => id === "manufacturer").deletedAt,
    NEXT_TIME
  );
  assert.equal(result.at(-1).updatedAt, NEXT_TIME);
});

test("field management protects built-ins and deferred required changes", async () => {
  const { operations, writes } = createHarness();

  await assert.rejects(
    operations.applyChanges({
      goodsTypeId: "figures",
      changes: [{ kind: FIELD_CHANGE_KINDS.delete, fieldId: "built-in-name" }]
    }),
    /Built-in fields/
  );
  await assert.rejects(
    operations.applyChanges({
      goodsTypeId: "figures",
      changes: [
        { kind: FIELD_CHANGE_KINDS.update, fieldId: "scale", isRequired: true }
      ]
    }),
    /deferred/
  );
  assert.equal(writes.length, 0);
});

test("field management rejects multiple staged changes for one field", async () => {
  const { operations } = createHarness();

  await assert.rejects(
    operations.applyChanges({
      goodsTypeId: "figures",
      changes: [
        { kind: FIELD_CHANGE_KINDS.update, fieldId: "scale", displayName: "Size" },
        { kind: FIELD_CHANGE_KINDS.delete, fieldId: "scale" }
      ]
    }),
    /one staged change/
  );
});

test("field management renames selection options without changing their IDs", async () => {
  const { fields, operations } = createHarness();
  fields.push(
    createFieldDefinitionRecord(
      {
        id: "condition",
        goodsTypeId: "figures",
        key: "condition",
        displayName: "Condition",
        dataType: "select",
        options: {
          choices: [
            { id: "condition-new", label: "New" },
            { id: "condition-used", label: "Used" }
          ]
        },
        position: 5
      },
      { now: () => FIXED_TIME }
    )
  );

  const result = await operations.applyChanges({
    goodsTypeId: "figures",
    changes: [
      {
        kind: FIELD_CHANGE_KINDS.update,
        fieldId: "condition",
        selectOptions: [
          { id: "condition-new", label: "Unopened" },
          { id: "condition-used", label: "Displayed" }
        ],
        addOptionLabels: ["Damaged"]
      }
    ]
  });

  assert.deepEqual(result.find(({ id }) => id === "condition").options.choices, [
    { id: "condition-new", label: "Unopened" },
    { id: "condition-used", label: "Displayed" },
    { id: "generated-1", label: "Damaged" }
  ]);
});

test("field management does not allow selection options to be removed while editing", async () => {
  const { fields, operations } = createHarness();
  fields.push(
    createFieldDefinitionRecord(
      {
        id: "condition",
        goodsTypeId: "figures",
        key: "condition",
        displayName: "Condition",
        dataType: "select",
        options: {
          choices: [
            { id: "condition-new", label: "New" },
            { id: "condition-used", label: "Used" }
          ]
        },
        position: 5
      },
      { now: () => FIXED_TIME }
    )
  );

  await assert.rejects(
    operations.applyChanges({
      goodsTypeId: "figures",
      changes: [
        {
          kind: FIELD_CHANGE_KINDS.update,
          fieldId: "condition",
          selectOptions: [{ id: "condition-new", label: "Unopened" }]
        }
      ]
    }),
    /cannot be removed or replaced/
  );
});
