import { Router } from "express";
const router = Router();

import { createCurrency, getAllCurrencies } from "../controllers/currencyController";

router.post("/", createCurrency);
router.get("/", getAllCurrencies);

export default router;