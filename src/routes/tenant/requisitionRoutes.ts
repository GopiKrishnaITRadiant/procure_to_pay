import { Router } from "express";
import {  createRequisition, getAllRequisition, submitRequisition, updateRequisition } from "../../controllers/tenant/requisitionController";
const routes=Router()

routes.post("/",createRequisition)
routes.post("/submit/:requisitionId",submitRequisition)
// routes.post("/approve/:requisitionId",approveRequisition)
routes.put("/:requisitionId",updateRequisition)
routes.get("/",getAllRequisition)

export default routes