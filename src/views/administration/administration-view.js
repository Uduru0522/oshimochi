import { createElement } from "../../shared/dom.js";
import { translate } from "../../localization/translate.js";
import { createSchemaTable, createSettingsSection } from "../../shared/ui-components.js";
import { createGoodsTypeCreator } from "./goods-type-creator.js";
import { createFieldManager } from "./field-manager.js";
import { createLocalDataReset } from "./local-data-reset.js";

function getGoodsTypeColumns() {
  return [
    { key: "id", label: translate("ID") },
    { key: "displayName", label: translate("Display name") },
    { key: "description", label: translate("Description") }
  ];
}

export function renderAdministrationView({
  createGoodsType,
  fieldManagement,
  goodsTypes,
  mutationController,
  onGoodsTypeCreated,
  onLocalDataReset,
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
    createLocalDataReset({
      mutationController,
      onReset: onLocalDataReset,
      resetLocalData
    })
  );

  return article;
}
