import { Router } from "express";

const router = Router();

import { createTenantExchangeRate,getAllTenantExchangeRates,getTenantExchangeRateById } from "../../controllers/tenant/tenantExchangeRateController";

router.post("/", createTenantExchangeRate);
router.get("/", getAllTenantExchangeRates);
router.get("/:tenantExchangeRateId", getTenantExchangeRateById);

export default router;