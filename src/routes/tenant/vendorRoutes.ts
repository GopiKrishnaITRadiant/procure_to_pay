import { Router } from "express";
import { createVendorByAdmin, getAllVendors, getOneVendor, removeVendor, updateVendor } from "../../controllers/tenant/vendorController";
const routes=Router()

routes.post("/",createVendorByAdmin)
routes.put("/:vendorId",updateVendor)
routes.get("/:vendorId",getOneVendor)
routes.get("/",getAllVendors)
routes.delete("/",removeVendor)

export default routes