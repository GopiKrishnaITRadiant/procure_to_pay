import { Router } from "express";
const router = Router();

import {  getRoleById, createOrUpdateRole, removeRole, getAllRoles } from "../../controllers/tenant/roleController";
import { planMiddleware } from "../../middlewares/planMiddleware";
import { featureMiddleware } from "../../middlewares/featureMiddleware";
import { authorize } from "../../middlewares/authorizePermissions";
import { PERMISSIONS } from "../../utils/permissions";

router.post("/",authorize(PERMISSIONS.ROLE.CREATE),planMiddleware,featureMiddleware('sapIntegration'),createOrUpdateRole);
router.get('/',authorize(PERMISSIONS.ROLE.READ_ALL),getAllRoles)
router.get("/:roleId",authorize(PERMISSIONS.ROLE.READ),getRoleById);
router.delete("/:roleId",authorize(PERMISSIONS.ROLE.DELETE),planMiddleware,removeRole);

export default router;