import { Router } from "express";
import { createTenantIntegration, getTenantIntegration, removeTenantIntegration, updateTenantIntegration } from "../../controllers/tenant/tenantIntegrationController";
import { authorize } from "../../middlewares/authorizePermissions";
import { PERMISSIONS } from "../../utils/permissions";
import { planMiddleware } from "../../middlewares/planMiddleware";
import { featureMiddleware } from "../../middlewares/featureMiddleware";
const routes=Router()

routes.post("/",authorize(PERMISSIONS.TENANT_INTEGRATION.CREATE),planMiddleware,createTenantIntegration)
routes.put('/:tenantIntegrationId',authorize(PERMISSIONS.TENANT_INTEGRATION.UPDATE),planMiddleware,updateTenantIntegration)
routes.get('/',authorize(PERMISSIONS.TENANT_INTEGRATION.READ),planMiddleware,featureMiddleware("sapIntegration"),getTenantIntegration)
routes.delete('/',authorize(PERMISSIONS.TENANT_INTEGRATION.DELETE),planMiddleware,featureMiddleware('sapIntegration'),removeTenantIntegration)

export default routes