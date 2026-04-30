import { Router } from "express";
const router = Router();

import { approveGoodsReceipt, createGoodsReceipt, getGoodsReceiptById, rejectGoodsReceipt, sendGoodsReciept } from "../../controllers/tenant/goodsReceiptController";
import { authorize } from "../../middlewares/authorizePermissions";
import { PERMISSIONS } from "../../utils/permissions";

router.post("/", createGoodsReceipt);
router.post("/approve/:goodsReceiptId",approveGoodsReceipt)
router.post("/reject/:goodsReceiptId",rejectGoodsReceipt)
router.get("/",  sendGoodsReciept);
router.get("/:goodsReceiptId", getGoodsReceiptById);

export default router;