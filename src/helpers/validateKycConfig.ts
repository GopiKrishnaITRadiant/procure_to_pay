import { ApiError } from "../utils/apiErrors";

export const validateDocuments = (documents: any[]) => {
  const docCodes = new Set();

  for (const doc of documents || []) {
    if (!doc.code || !doc.label || !doc.category || !doc.type) {
      throw new ApiError(400, "Invalid document structure", "VALIDATION_ERROR");
    }

    if (docCodes.has(doc.code)) {
      throw new ApiError(400, `Duplicate document code: ${doc.code}`, "VALIDATION_ERROR");
    }

    docCodes.add(doc.code);
  }
};

export const validateFields = (fields: any[]) => {
  const fieldKeys = new Set();

  for (const field of fields || []) {
    if (!field.key || !field.label) {
      throw new ApiError(400, "Invalid field structure", "VALIDATION_ERROR");
    }

    if (fieldKeys.has(field.key)) {
      throw new ApiError(400, `Duplicate field key: ${field.key}`, "VALIDATION_ERROR");
    }

    fieldKeys.add(field.key);
  }
};