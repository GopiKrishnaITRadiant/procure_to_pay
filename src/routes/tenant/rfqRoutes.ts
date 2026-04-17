import { Router } from "express";
const router = Router();

import { createRFQ, getRFQDetails, sendRFQ,  cancelRFQ, getRFQComparison } from "../../controllers/tenant/rfqController";
import { authorize } from "../../middlewares/authorizePermissions";
import { PERMISSIONS } from "../../utils/permissions";
import { createUploader } from "../../middlewares/upload";

router.post("/",  createRFQ);
router.put("/send/:rfqId",  sendRFQ);
router.get("/compare/:rfqId",  getRFQComparison);
router.get("/:id",  getRFQDetails);
router.delete("/:id",cancelRFQ);

export default router;