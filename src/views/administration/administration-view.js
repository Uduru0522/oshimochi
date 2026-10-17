import { createElement } from "../../shared/dom.js";
import { translate } from "../../localization/translate.js";
import { createSchemaTable, createSettingsSection } from "../../shared/ui-components.js";
import { createGoodsTypeCreator } from "./goods-type-creator.js";
import { createFieldManager } from "./field-manager.js";
import { createLocalDataReset } from "./local-data-reset.js";
import { createDataPortability } from "./data-portability.js";

function getGoodsTypeColumns() {
  return [
    { key: "id", label: translate("ID") },
    { key: "displayName", label: translate("Display name") },
    { key: "description", label: translate("Description") }
  ];
}

export function renderAdministrationView({
  backupFileService,
  backupOperations,
  backupProviders,
  createGoodsType,
  fieldManagement,
  goodsTypes,
  mutationController,
  onGoodsTypeCreated,
  onLocalDataReset,
  onLocalDataRestored,
  resetLocalData
}) {
  const article = createElement("article", {
    className: "settings-view administration-view"
  });
  const schemaSection = createSettingsSection({
    title: translate("Goods type registry"),
    description: translate(
      "Goods types organize items and define the custom fields shown in forms and detail views."
    )
  });
  const dataPortability = createDataPortability({
    backupFileService,
    backupOperations,
    backupProviders,
    mutationController,
    onRestored: onLocalDataRestored
  });

  if (goodsTypes.length > 0) {
    schemaSection.append(
      createSchemaTable({ columns: getGoodsTypeColumns(), rows: goodsTypes })
    );
  } else {
    schemaSection.append(
      createElement("p", {
        className: "empty-note",
        textContent: translate(
          "No goods types are saved yet. Create the first collection above."
        )
      })
    );
  }

  article.append(
    createGoodsTypeCreator({
      createGoodsType,
      goodsTypes,
      mutationController,
      onCreated: onGoodsTypeCreated
    }),
    createFieldManager({ fieldManagement, goodsTypes, mutationController }),
    schemaSection,
    dataPortability.element,
    createLocalDataReset({
      mutationController,
      onReset: onLocalDataReset,
      resetLocalData
    })
  );

  return {
    content: article,
    destroy: dataPortability.destroy
  };
}
