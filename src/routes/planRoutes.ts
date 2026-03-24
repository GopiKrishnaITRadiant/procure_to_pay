import { Router } from "express";
const router = Router();

import {
  createPlan,
  getPlans,
  getPlanById,
  updatePlan,
  deletePlan,
} from "../controllers/planController";
import { authorize } from "../middlewares/authorizePermissions";
import { PERMISSIONS } from "../utils/permissions";

router.post(
  "/",
  authorize(PERMISSIONS.PLAN.CREATE),
  createPlan,
);
router.get("/", authorize(PERMISSIONS.PLAN.READ_ALL), getPlans);
router.get(
  "/:id",
  authorize(PERMISSIONS.PLAN.READ_ONE),
  getPlanById,
);
router.put(
  "/:id",
  authorize(PERMISSIONS.PLAN.UPDATE),
  updatePlan,
);
router.delete(
  "/:id",
  authorize(PERMISSIONS.PLAN.DELETE),
  deletePlan,
);

export default router;
