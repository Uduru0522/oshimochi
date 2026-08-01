import assert from "node:assert/strict";
import test from "node:test";

import { createFieldChangeSet } from "../../src/views/administration/field-change-set.js";

const FIELDS = [
  { id: "id", displayName: "ID", isBuiltIn: true, isDeleted: false, position: 0 },
  { id: "name", displayName: "Name", isBuiltIn: true, isDeleted: false, position: 1 },
  { id: "maker", displayName: "Maker", dataType: "text", isBuiltIn: false, isDeleted: false, isRequired: true, position: 2 },
  { id: "scale", displayName: "Scale", dataType: "text", isBuiltIn: false, isDeleted: false, isRequired: false, position: 3 }
];

test("field change set merges edits and ordering into one change per field", () => {
  const changeSet = createFieldChangeSet(FIELDS);

  changeSet.stageUpdate("scale", { displayName: "Figure scale" });
  changeSet.stageUpdate("scale", { isRequired: false });
  changeSet.move("scale", -1);

  assert.deepEqual(changeSet.getChanges(), [
    {
      fieldId: "scale",
      kind: "update",
      displayName: "Figure scale",
      position: 2
    },
    { fieldId: "maker", kind: "update", position: 3 }
  ]);
});

test("field change set highlights every field affected only by reordering", () => {
  const changeSet = createFieldChangeSet(FIELDS);

  changeSet.move("scale", -1);

  assert.deepEqual(
    changeSet.getPreviewFields()
      .filter(({ isBuiltIn }) => !isBuiltIn)
      .map(({ id, stagedKind }) => ({ id, stagedKind })),
    [
      { id: "scale", stagedKind: "update" },
      { id: "maker", stagedKind: "update" }
    ]
  );

  changeSet.move("scale", 1);
  assert.deepEqual(
    changeSet.getPreviewFields()
      .filter(({ isBuiltIn }) => !isBuiltIn)
      .map(({ stagedKind }) => stagedKind),
    [null, null]
  );
});

test("field change set keeps new drafts local and removable", () => {
  const changeSet = createFieldChangeSet(FIELDS);

  changeSet.stageAdd({
    draftId: "draft-one",
    displayName: "Release date",
    dataType: "date",
    isRequired: false,
    optionLabels: []
  });
  assert.equal(changeSet.getPreviewFields().at(-1).stagedKind, "add");
  assert.equal(changeSet.getChanges().at(-1).position, 4);

  changeSet.removeDraft("draft-one");
  assert.equal(changeSet.changeCount, 0);
});

test("field change set previews soft deletion and resets without changing source", () => {
  const changeSet = createFieldChangeSet(FIELDS);

  changeSet.stageDelete("maker");
  assert.equal(changeSet.getPreviewFields().at(-1).stagedKind, "delete");
  assert.equal(FIELDS[2].isDeleted, false);

  changeSet.reset();
  assert.equal(changeSet.changeCount, 0);
  assert.deepEqual(changeSet.getPreviewFields().map(({ id }) => id), [
    "id",
    "name",
    "maker",
    "scale"
  ]);
});

test("field change set removes an edit when values return to their base state", () => {
  const changeSet = createFieldChangeSet(FIELDS);

  changeSet.stageUpdate("maker", { displayName: "Producer" });
  assert.equal(changeSet.changeCount, 1);

  changeSet.stageUpdate("maker", {
    displayName: "Maker",
    isRequired: true,
    dataType: "text"
  });
  assert.equal(changeSet.changeCount, 0);
});

test("field change set previews two-option label edits", () => {
  const fields = [
    ...FIELDS,
    {
      id: "censored",
      displayName: "Censorship",
      dataType: "boolean",
      isBuiltIn: false,
      isDeleted: false,
      isRequired: false,
      options: { falseLabel: "No", trueLabel: "Yes" },
      position: 4
    }
  ];
  const changeSet = createFieldChangeSet(fields);

  changeSet.stageUpdate("censored", {
    booleanOptions: { falseLabel: "Uncensored", trueLabel: "Censored" }
  });

  assert.deepEqual(changeSet.getChanges()[0].booleanOptions, {
    falseLabel: "Uncensored",
    trueLabel: "Censored"
  });
  assert.deepEqual(changeSet.getPreviewFields().at(-1).options, {
    falseLabel: "Uncensored",
    trueLabel: "Censored"
  });
});

test("field change set stages and previews selection option label edits", () => {
  const fields = [
    ...FIELDS,
    {
      id: "condition",
      displayName: "Condition",
      dataType: "select",
      isBuiltIn: false,
      isDeleted: false,
      isRequired: false,
      options: {
        choices: [
          { id: "new", label: "New" },
          { id: "used", label: "Used" }
        ]
      },
      position: 4
    }
  ];
  const changeSet = createFieldChangeSet(fields);
  const selectOptions = [
    { id: "new", label: "Unopened" },
    { id: "used", label: "Displayed" }
  ];

  changeSet.stageUpdate("condition", { selectOptions });

  assert.deepEqual(changeSet.getChanges()[0].selectOptions, selectOptions);
  assert.deepEqual(changeSet.getPreviewFields().at(-1).options.choices, selectOptions);
});
