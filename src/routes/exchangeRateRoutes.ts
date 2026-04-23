import { Router } from "express";

const router = Router();

import { getAllExchangeRates, getExchangeRateById } from "../controllers/exchangeRateController";

// router.post("/", createExchangeRate);
router.get("/", getAllExchangeRates);
router.get("/:exchangeRateId", getExchangeRateById);

export default router;