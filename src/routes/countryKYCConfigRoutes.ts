import { Router } from "express";
const router = Router();

import {
  createCountryKYCConfig,
  getAllCountryKYCConfigs,
  getOneCountryKYCConfig,
  updateCountryKYCConfig,
} from "../controllers/countryKYCConfigController";

router.post("/",createCountryKYCConfig);
router.put("/:countryKYCConfigId", updateCountryKYCConfig);
router.get("/:countryKYCConfigId", getOneCountryKYCConfig);
router.get("/", getAllCountryKYCConfigs);

export default router;
