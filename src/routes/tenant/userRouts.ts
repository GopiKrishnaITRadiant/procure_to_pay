import { Router } from "express";
import { addUser, getAllusers, getUserById, removeUser, updateUser } from "../../controllers/tenant/userController";
import { authorize } from "../../middlewares/authorizePermissions";
import { PERMISSIONS } from "../../utils/permissions";
const routes=Router()

routes.post("/",authorize(PERMISSIONS.TENANT_USER.UPDATE),addUser)
routes.get('/:userId',authorize(PERMISSIONS.TENANT_USER.READ),getUserById)
routes.get('/',authorize(PERMISSIONS.TENANT_USER.READ_ALL),getAllusers)
routes.put('/:userId',authorize(PERMISSIONS.TENANT_USER.UPDATE),updateUser)
routes.delete('/',authorize(PERMISSIONS.TENANT_USER.DELETE),removeUser)

export default routes