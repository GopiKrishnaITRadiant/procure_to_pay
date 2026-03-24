import { Router } from "express";

const router = Router();

import { createTenantSubscription, getTenantSubscriptions, updateTenantSubscription, deleteTenantSubscription } from "../controllers/tenantSubscriptionController";

router.post("/", createTenantSubscription);
router.get("/", getTenantSubscriptions);
router.put("/:id", updateTenantSubscription);
router.delete("/:id", deleteTenantSubscription);

export default router;