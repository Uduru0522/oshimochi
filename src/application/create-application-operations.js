import { createBackupOperations } from "./backups/manage-backups.js";
import { createDashboardOperations } from "./dashboard/read-card.js";
import { createResetLocalDataOperation } from "./data/reset-local-data.js";
import { createFieldManagementOperations } from "./fields/manage-fields.js";
import { createGoodsTypeCreationOperation } from "./goods-types/create-goods-type.js";
import { createItemManagementOperations } from "./items/manage-items.js";

export function createApplicationOperations({ storage }) {
  return Object.freeze({
    backups: createBackupOperations({ storage }),
    dashboard: createDashboardOperations({ storage }),
    fields: createFieldManagementOperations({ storage }),
    goodsTypes: Object.freeze({
      create: createGoodsTypeCreationOperation({ storage })
    }),
    items: createItemManagementOperations({ storage }),
    localData: Object.freeze({
      reset: createResetLocalDataOperation({ storage })
    })
  });
}
