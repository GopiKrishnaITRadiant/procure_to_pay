import { Router } from "express";
import { getAllTenantAmountLimit, removeTenantAmountLimit, tenantAmountLimitCreateOrUpdate } from "../../controllers/tenant/tenantAmoutLimitController";
import { PERMISSIONS } from "../../utils/permissions";
import { authorize } from "../../middlewares/authorizePermissions";
const routes=Router()

routes.put('/:tenantId/:roleId',authorize(PERMISSIONS.AMOUNT_LIMIT.CREATE_UPDATE),tenantAmountLimitCreateOrUpdate)
routes.get('/',authorize(PERMISSIONS.AMOUNT_LIMIT.READ_ALL),getAllTenantAmountLimit)
routes.delete("/:limitId",authorize(PERMISSIONS.AMOUNT_LIMIT.DELETE),removeTenantAmountLimit)

export default routes