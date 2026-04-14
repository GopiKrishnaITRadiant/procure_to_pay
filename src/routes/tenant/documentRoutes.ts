import { getDocument, uploadGeneralDocument } from "../../controllers/tenant/documentController";
import { Router } from "express";
import { createUploader } from "../../middlewares/upload";
const routes = Router();

const upload = createUploader({
  maxSizeMB: 2,
  allowedTypes: ["application/pdf"]
});

routes.post("/general-upload",upload.array("images"),uploadGeneralDocument)
routes.get("/:documentId",getDocument)

export default routes