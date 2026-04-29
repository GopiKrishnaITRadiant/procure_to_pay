import { Router } from "express";
const router = Router();

import { createInvoice, getInvoiceDocumentById } from "../../controllers/vendor/invoiceController";

router.post("/", createInvoice);
router.get("/:invoiceId", getInvoiceDocumentById);

export default router;