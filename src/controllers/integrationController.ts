import { NextFunction, Request, Response } from "express";
import { integrationModel } from "../models/integrationModel";
import { sendResponse } from "../utils/sendResponse";
import { ApiError } from "../utils/apiErrors";

export const createIntegrationType = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let {
      name,
      code,
      mode,
      description,
      isActive = true,
      capabilities = {},
      supportedProtocols = [],
      supportedEnvironments = ["prod"],
      credentialSchema
    } = req.body;

    if (!name || !code || !mode) {
      throw new ApiError(
        400,
        "Name, code and mode are required",
        "VALIDATION_ERROR"
      );
    }

    code = code.toUpperCase();

    const existing = await integrationModel.findOne({ code });
    if (existing) {
      throw new ApiError(
        400,
        `Integration with code ${code} already exists`,
        "DUPLICATE_ERROR"
      );
    }

    if (!["TEMPLATE_BASED", "SDK_BASED"].includes(mode)) {
      throw new ApiError(400, "Invalid integration mode", "VALIDATION_ERROR");
    }

    if (credentialSchema && typeof credentialSchema !== "object") {
      throw new ApiError(
        400,
        "credentialSchema must be an object",
        "VALIDATION_ERROR"
      );
    }

    const finalCapabilities = {
      supportsWebhook: capabilities?.supportsWebhook ?? false,
      supportsPolling: capabilities?.supportsPolling ?? true,
      supportsOAuth: capabilities?.supportsOAuth ?? false
    };

    const integrationDoc = await integrationModel.create({
      name,
      code,
      mode,
      description,
      isActive,
      capabilities: finalCapabilities,
      supportedProtocols,
      supportedEnvironments,
      credentialSchema: credentialSchema ?? null
    });

    sendResponse({
      res,
      statusCode: 201,
      message: "Integration created successfully",
      data: integrationDoc
    });

  } catch (error) {
    next(error);
  }
};

export const updateIntegration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { integrationId } = req.params;

    let {
      name,
      code,
      description,
      supportedEnvironments,
      supportedProtocols,
      isActive,
      capabilities,
      credentialSchema
    } = req.body;

    const integrationDoc = await integrationModel.findById(integrationId);

    if (!integrationDoc) {
      throw new ApiError(404, "Integration not found", "NOT_FOUND");
    }

    if (code) {
      code = code.toUpperCase();

      if (code !== integrationDoc.code) {
        const exists = await integrationModel.findOne({ code });

        if (exists) {
          throw new ApiError(
            400,
            `Integration with code ${code} already exists`,
            "DUPLICATE_ERROR"
          );
        }

        integrationDoc.code = code;
      }
    }

    if (req.body.mode && req.body.mode !== integrationDoc.mode) {
      throw new ApiError(
        400,
        "Integration mode cannot be changed once created",
        "VALIDATION_ERROR"
      );
    }

    if (credentialSchema !== undefined) {
      if (credentialSchema && typeof credentialSchema !== "object") {
        throw new ApiError(
          400,
          "credentialSchema must be an object",
          "VALIDATION_ERROR"
        );
      }

      integrationDoc.credentialSchema = credentialSchema;
    }

    if (capabilities) {
      integrationDoc.capabilities = {
        ...integrationDoc.capabilities,
        ...capabilities
      };
    }

    if (name !== undefined) integrationDoc.name = name;
    if (description !== undefined) integrationDoc.description = description;
    if (supportedEnvironments !== undefined)
      integrationDoc.supportedEnvironments = supportedEnvironments;
    if (supportedProtocols !== undefined)
      integrationDoc.supportedProtocols = supportedProtocols;
    if (typeof isActive === "boolean")
      integrationDoc.isActive = isActive;

    await integrationDoc.save();

    sendResponse({
      res,
      statusCode: 200,
      message: "Integration updated successfully",
      data: integrationDoc
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