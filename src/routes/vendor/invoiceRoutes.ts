import { Router } from "express";
const router = Router();

import { createInvoice } from "../../controllers/vendor/invoiceController";

router.post("/", createInvoice);
// router.get("/", getVendorInvoices);

export default router;