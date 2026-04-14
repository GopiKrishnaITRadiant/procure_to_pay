import { Router } from "express";
import { approveRegisteredVendor, rejectVendor, verifyDocument } from "../../controllers/tenant/tenantAdminController";
import { authorize } from "../../middlewares/authorizePermissions";
import { PERMISSIONS } from "../../utils/permissions";
const routes = Router();

routes.post("/approve",authorize(PERMISSIONS.TENANT_ADMIN.ACCESS_ALL),approveRegisteredVendor)
routes.post("/reject",authorize(PERMISSIONS.TENANT_ADMIN.ACCESS_ALL),rejectVendor)
routes.post("/approve-kyc",verifyDocument)

export default routes