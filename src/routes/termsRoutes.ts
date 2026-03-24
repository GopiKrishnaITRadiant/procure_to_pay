import { Router } from "express";
import { activateTerms, createTerms, deactivateTerms, getActiveTerms } from "../controllers/termsController";
import { authorize } from "../middlewares/authorizePermissions";
import { PERMISSIONS } from "../utils/permissions";
const routes=Router()

routes.post('/',authorize(PERMISSIONS.TERMS.CREATE),createTerms)
routes.get("/",getActiveTerms)
routes.patch('/:id',authorize(PERMISSIONS.TERMS.ACTIVE),activateTerms)
routes.delete('/:id',authorize(PERMISSIONS.TERMS.INACTIVE),deactivateTerms)

export default routes