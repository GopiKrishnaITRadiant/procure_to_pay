import { getDocument, getDocumentsByVendor, uploadDocument } from "../../controllers/tenant/documentController";
import { Router } from "express";
import multer from "multer"
const routes = Router();

const allowedTypes = [
  "image/png",
  "image/jpeg",
  "application/pdf",
  "text/plain"
];

const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PNG, JPEG, PDF, and TXT files are allowed"));
    }
  }
});

routes.post("/upload/:tenantIntegrationId",upload.array("images"),uploadDocument)
routes.get("/all",getDocumentsByVendor)
routes.get("/:documentId",getDocument)

export default routes