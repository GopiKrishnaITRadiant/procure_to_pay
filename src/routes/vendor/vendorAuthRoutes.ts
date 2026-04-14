import { Router } from "express";
import { loginVendor, registerVendor, verifyVendorEmail } from "../../controllers/vendor/vendorAuthController";
const routes = Router();

routes.post("/",registerVendor)
routes.post("/",verifyVendorEmail)
routes.post("/login",loginVendor)

export default routes
