import { Router } from "express";
import { cancelQuotation, getVendorRFQs, submitQuotation } from "../../controllers/vendor/quotationController";
import { createUploader } from "../../middlewares/upload";
const router = Router();

const upload= createUploader()

router.post("/submit/:rfqId",upload.single("file") ,submitQuotation);
router.get("/",  getVendorRFQs);
router.delete("/cancel",cancelQuotation)

export default router;