import { Router } from "express";
const router = Router();

import { createUpdateUOM, getAllTenantUOMs,bulkUpdateUOMs } from "../controllers/uomController";
import { authorize } from "../middlewares/authorizePermissions";
import { PERMISSIONS } from "../utils/permissions";

router.post("/", createUpdateUOM);
router.get("/",  getAllTenantUOMs);
router.put("/",bulkUpdateUOMs);

export default router;