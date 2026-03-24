import { Router } from "express";
const router = Router();

import { createTenant,getTenantById,getTenants,updateTenant,deleteTenant } from "../controllers/tenantController";
import { authorize } from "../middlewares/authorizePermissions";
import { PERMISSIONS } from "../utils/permissions";

router.post("/", authorize(PERMISSIONS.TENANT.READ_ONE),createTenant);
router.get("/", authorize(PERMISSIONS.TENANT.READ_ALL),getTenants);
router.get("/:id", authorize(PERMISSIONS.TENANT.READ_ONE),getTenantById);
router.put("/:id", authorize(PERMISSIONS.TENANT.UPDATE),updateTenant);
router.delete("/:id",authorize(PERMISSIONS.TENANT.DELETE),deleteTenant);

export default router;