import { Router } from "express";
import {  createRequisition, getAllRequisition, submitRequisition, updateRequisition,approveRequisition, rejectRequisition } from "../../controllers/tenant/requisitionController";
import { authorize } from "../../middlewares/authorizePermissions";
import { PERMISSIONS } from "../../utils/permissions";
const routes=Router()

routes.post("/",createRequisition)
routes.post("/submit/:requisitionId",submitRequisition)
routes.post("/approve/:requisitionId",authorize(PERMISSIONS.PURCHASE_REQUEST.APPROVE),approveRequisition)
routes.put("/:requisitionId",updateRequisition)
routes.get("/",getAllRequisition)
routes.post("/reject/:requisitionId",authorize(PERMISSIONS.PURCHASE_REQUEST.REJECT),rejectRequisition)

export default routes