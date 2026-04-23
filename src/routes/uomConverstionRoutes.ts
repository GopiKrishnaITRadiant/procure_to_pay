import { Router } from "express";
const router=Router()

import { createUOMConversion, getUOMConversions,getUOMConversionById,updateUOMConversion } from "../controllers/uomConverstionController";

router.post("/",createUOMConversion)
router.get("/",getUOMConversions)
router.get("/:uomConverstionId",getUOMConversionById)
router.put("/:uomConverstionId",updateUOMConversion)

export default router