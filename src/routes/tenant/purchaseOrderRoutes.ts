import {Router} from "express"

const router = Router()

import { createDirectPurchaseOrder, createRFQPurchaseOrder } from "../../controllers/tenant/purchaseOrderController";
import { authorize } from "../../middlewares/authorizePermissions";
import { PERMISSIONS } from "../../utils/permissions";

router.post("/direct",createDirectPurchaseOrder)
router.post("/:rfqId/rfq",createRFQPurchaseOrder)
// router.get("/:id",getPurchaseOrderById)
// router.put("/:id",updatePurchaseOrder)

export default router