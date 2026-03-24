import { NextFunction, Request, Response } from "express";
import { integrationModel } from "../models/integrationModel";
import { sendResponse } from "../utils/sendResponse";
import { ApiError } from "../utils/apiErrors";


const VALID_CODES = ["SAP", "AZURE_AD", "S3", "STRIPE", "EMAIL_PROVIDER"] as const;
const VALID_CATEGORIES = ["ERP", "AUTH", "PAYMENT", "STORAGE", "COMMUNICATION"] as const;


export const createIntegrationType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let { name, code, category, description, isActive = true, supportedEnvironments = ["prod"] } = req.body;

    if (!name || !code || !category) {
      throw new ApiError(400, "Name, code, and category are required", "VALIDATION_ERROR");
    }

    code = code.toUpperCase();
    category = category.toUpperCase();

    if (!VALID_CODES.includes(code as typeof VALID_CODES[number])) {
      throw new ApiError(
        400,
        `Code must be one of ${VALID_CODES.join(", ")}`,
        "VALIDATION_ERROR"
      );
    }

    if (!VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
      throw new ApiError(
        400,
        `Category must be one of ${VALID_CATEGORIES.join(", ")}`,
        "VALIDATION_ERROR"
      );
    }

    const existing = await integrationModel.findOne({ code });
    if (existing) {
      throw new ApiError(400, `Integration with code ${code} already exists`, "DUPLICATE_ERROR");
    }

    const integrationDoc = await integrationModel.create({
      name,
      code,
      category,
      description,
      isActive,
      supportedEnvironments,
    });

    sendResponse({
      res,
      statusCode: 201,
      message: "Integration type created successfully",
      data: integrationDoc,
    });
  } catch (error) {
    next(error);
  }
};

export const updateIntegration = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { integrationId } = req.params;
    let { name, code, category, description, supportedEnvironments, isActive } = req.body;

    const integrationDoc = await integrationModel.findById(integrationId);
    if (!integrationDoc) {
      throw new ApiError(404, "Integration not found", "NOT_FOUND");
    }

    if (code) {
      code = code.toUpperCase();
      if (!VALID_CODES.includes(code as typeof VALID_CODES[number])) {
        throw new ApiError(
          400,
          `Code must be one of ${VALID_CODES.join(", ")}`,
          "VALIDATION_ERROR"
        );
      }
      if (code !== integrationDoc.code) {
        const exists = await integrationModel.findOne({ code });
        if (exists) {
          throw new ApiError(400, `Integration with code ${code} already exists`, "DUPLICATE_ERROR");
        }
      }
    }

    if (category) {
      category = category.toUpperCase();
      if (!VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
        throw new ApiError(
          400,
          `Category must be one of ${VALID_CATEGORIES.join(", ")}`,
          "VALIDATION_ERROR"
        );
      }
    }

    integrationDoc.name = name ?? integrationDoc.name;
    integrationDoc.code = code ?? integrationDoc.code;
    integrationDoc.category = category ?? integrationDoc.category;
    integrationDoc.description = description ?? integrationDoc.description;
    integrationDoc.supportedEnvironments = supportedEnvironments ?? integrationDoc.supportedEnvironments;
    if (typeof isActive === "boolean") integrationDoc.isActive = isActive;

    await integrationDoc.save();

    sendResponse({
      res,
      statusCode: 200,
      message: "Integration updated successfully",
      data: integrationDoc,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllIntegrations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = "1", limit = "20", sortBy = "createdAt", sortOrder = "desc", isActive } = req.query;

    const pageNumber = parseInt(page as string, 10) || 1;
    const limitNumber = parseInt(limit as string, 10) || 20;

    const query: Record<string, any> = {};
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    const total = await integrationModel.countDocuments(query);

    const integrations = await integrationModel
      .find(query)
      .sort({ [sortBy as string]: sortOrder === "asc" ? 1 : -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .lean();

    sendResponse({
      res,
      statusCode: 200,
      message: "Integrations fetched successfully",
      data: integrations,
      meta: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Error fetching integrations:", error);
    next(new ApiError(500, "Failed to fetch integrations", "INTERNAL_ERROR"));
  }
};

export const removeIntegration = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { integrationId } = req.params;

    const integrationDoc = await integrationModel.findById(integrationId);
    if (!integrationDoc) {
      throw new ApiError(404, "Integration not found", "NOT_FOUND");
    }

    if (!integrationDoc.isActive) {
      throw new ApiError(400, "Integration is already removed", "ALREADY_REMOVED");
    }

    integrationDoc.isActive = false;
    await integrationDoc.save();

    sendResponse({
      res,
      statusCode: 200,
      message: "Integration removed successfully",
      data: integrationDoc,
    });
  } catch (error) {
    next(error);
  }
};