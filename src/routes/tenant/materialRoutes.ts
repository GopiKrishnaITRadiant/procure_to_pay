import { Router } from "express";
import { createMaterial, getAllMaterials, getOneMaterial, removeMaterial, updateMaterial } from "../../controllers/tenant/materialController";
const routes=Router()

routes.post("/",createMaterial)
routes.put("/",updateMaterial)
routes.get("/:materialId",getOneMaterial)
routes.get("/",getAllMaterials)
routes.delete("/:materialId",removeMaterial)

export default routes