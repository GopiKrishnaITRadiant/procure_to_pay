import { Router } from "express";
import { createCategory, getAllCategories, removeCategory, updateCategory } from "../../controllers/tenant/categoryController";
const routes=Router()

routes.post("/",createCategory)
routes.put("/:id",updateCategory)
routes.get("/",getAllCategories)
routes.delete("/:id",removeCategory)

export default routes