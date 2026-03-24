import { Router } from "express";
import { createIntegrationType, getAllIntegrations, removeIntegration, updateIntegration } from "../controllers/integrationController";
const routes=Router()

routes.post('/',createIntegrationType)
routes.put('/:integrationId',updateIntegration)
routes.get('/',getAllIntegrations)
routes.delete('/:integrationId',removeIntegration)

export default routes