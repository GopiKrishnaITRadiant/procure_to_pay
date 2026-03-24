import { Router } from "express";
import { activateDeactivateSupportAdmin, createSupportAdmin, loginPlatformUser } from "../controllers/platformUserController";
import { authenticate } from "../middlewares/authenticate";
const routes=Router()

routes.post('/login',loginPlatformUser)
routes.post("/support",authenticate,createSupportAdmin)
routes.delete("/:id",authenticate,activateDeactivateSupportAdmin)

export default routes