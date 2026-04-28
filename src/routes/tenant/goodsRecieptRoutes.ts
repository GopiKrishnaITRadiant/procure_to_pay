import { Router } from "express";
const router = Router();

import { createGoodsReciept, getGoodsRecieptById, sendGoodsReciept } from "../../controllers/tenant/goodsRecieptController";
import { authorize } from "../../middlewares/authorizePermissions";
import { PERMISSIONS } from "../../utils/permissions";

router.post("/", createGoodsReciept);
router.get("/",  sendGoodsReciept);
router.get("/:id", getGoodsRecieptById);

export default router;