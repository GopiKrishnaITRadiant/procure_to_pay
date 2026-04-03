import { Router } from "express";
import { loginVendor, registerVendor, verifyVendorEmail } from "../../controllers/tenant/vendorAuthController";
const routes = Router();

routes.post("/",registerVendor)
routes.post("/",verifyVendorEmail)
routes.post("/",loginVendor)

export default routes
