import { Router } from "express";
import { getKYCDocumentsByVendor, submitKYC, uploadKycDocument } from "../../controllers/vendor/vendorKycController";
import { createUploader } from "../../middlewares/upload";
const router = Router();

const upload = createUploader()

router.post("/kyc-upload/:tenantIntegrationId",upload.array("files"),uploadKycDocument)
router.post("/submit-kyc",submitKYC)
router.get("/all",getKYCDocumentsByVendor)

export default router