import { Router } from "express";
import { createIntegrationTemplate, getAllIntegrationTemplates, updateIntegrationTemplate } from "../controllers/integrationTemplateController";
const router=Router()

router.post("/",createIntegrationTemplate)
router.put("/:templateId",updateIntegrationTemplate)
router.get('/',getAllIntegrationTemplates)

export default router