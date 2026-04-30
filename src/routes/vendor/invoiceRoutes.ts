import { Router } from "express";
const router = Router();

import { createInvoice, getInvoiceDocumentById, approveInvoice } from "../../controllers/vendor/invoiceController";

router.post("/", createInvoice);
router.post("/approve/:invoiceId", approveInvoice);
router.get("/:invoiceId", getInvoiceDocumentById);

export default router;