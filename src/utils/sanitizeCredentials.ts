import { encrypt } from "./cryptoUtil";

export const sanitizeCredentials = (
  schema: any,
  credentials: any
) => {
  const sanitized: any = {};

  for (const key in schema) {
    const field = schema[key];
    const value = credentials[key];

    const isRequired =
      typeof field.required === "function"
        ? field.required(credentials)
        : field.required;

    if (isRequired && (value === undefined || value === null)) {
      throw new Error(`${key} is required`);
    }

    if (value !== undefined) {
      sanitized[key] = field.sensitive ? encrypt(value) : value;
    }
  }

  return sanitized;
};