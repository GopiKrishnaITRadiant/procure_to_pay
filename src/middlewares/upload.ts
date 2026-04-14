import multer from "multer";

export const createUploader = (options?: {
  maxSizeMB?: number;
  allowedTypes?: string[];
}) => {
  const {
    maxSizeMB = 5,
    allowedTypes = [
      "image/png",
      "image/jpeg",
      "application/pdf",
      "text/plain"
    ]
  } = options || {};

  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: maxSizeMB * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type"));
      }
    }
  });
};