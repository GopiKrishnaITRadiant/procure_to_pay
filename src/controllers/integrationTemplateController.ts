import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiErrors";
import { integrationModel } from "../models/integrationModel";
import { IntegrationTemplateModel } from "../models/integrationTemplateModel";
import { sendResponse } from "../utils/sendResponse";
import { Types } from "mongoose";

export const createIntegrationTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {

    const {
      integrationId,
      name,
      version,
      protocol,
      odataVersion,
      resources,
      fieldMappings
    } = req.body;

    if (!integrationId || !name || !version || !protocol) {
      throw new ApiError(400, "Missing required fields", "VALIDATION_ERROR");
    }

    const integration = await integrationModel.findById(integrationId);

    if (!integration) {
      throw new ApiError(404, "Integration not found", "NOT_FOUND");
    }

    if (integration.mode !== "TEMPLATE_BASED") {
      throw new ApiError(
        400,
        "Templates are only allowed for TEMPLATE_BASED integrations",
        "INVALID_INTEGRATION_TYPE"
      );
    }

    if (protocol === "odata" && !odataVersion) {
      throw new ApiError(
        400,
        "odataVersion is required for OData protocol",
        "VALIDATION_ERROR"
      );
    }

    if (protocol === "rest" && odataVersion) {
      throw new ApiError(
        400,
        "odataVersion should not be provided for REST protocol",
        "VALIDATION_ERROR"
      );
    }

    const existingTemplate = await IntegrationTemplateModel.findOne({
      integrationId,
      version,
      protocol
    });

    if (existingTemplate) {
      throw new ApiError(400, "Template already exists", "DUPLICATE_ERROR");
    }

    const template = await IntegrationTemplateModel.create({
      integrationId,
      name,
      version,
      protocol,
      odataVersion,
      resources,
      fieldMappings
    });

    sendResponse({
      res,
      statusCode: 201,
      message: "Integration template created",
      data: template
    });

  } catch (error) {
    next(error);
  }
};

export const updateIntegrationTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { templateId } = req.params;

    const { name, version, protocol, odataVersion, resources, fieldMappings } =
      req.body;

    const template = await IntegrationTemplateModel.findById(templateId);

    if (!template) {
      throw new ApiError(404, "Integration template not found", "NOT_FOUND");
    }

    const integration = await integrationModel.findById(template.integrationId);

    if (!integration) {
      throw new ApiError(404, "Integration not found", "NOT_FOUND");
    }

    if (integration.mode !== "TEMPLATE_BASED") {
      throw new ApiError(
        400,
        "Templates are only allowed for TEMPLATE_BASED integrations",
        "INVALID_INTEGRATION_TYPE"
      );
    }

    // Only validate and update protocol if provided
    if (protocol !== undefined) {
      if (protocol === "odata" && odataVersion === undefined && template.odataVersion === undefined) {
        throw new ApiError(
          400,
          "odataVersion is required for OData protocol",
          "VALIDATION_ERROR"
        );
      }

      if (protocol === "rest" && odataVersion !== undefined) {
        throw new ApiError(
          400,
          "odataVersion should not be provided for REST protocol",
          "VALIDATION_ERROR"
        );
      }

      template.protocol = protocol;

      // Adjust odataVersion only if protocol is changing
      if (protocol === "rest") {
        template.odataVersion = undefined;
      } else if (odataVersion !== undefined) {
        template.odataVersion = odataVersion;
      }
    } else if (odataVersion !== undefined) {
      // Update odataVersion only if explicitly provided
      template.odataVersion = odataVersion;
    }

    // Only update version if provided
    if (version !== undefined) {
      const duplicate = await IntegrationTemplateModel.findOne({
        integrationId: template.integrationId,
        version,
        protocol: template.protocol,
        _id: { $ne: template._id },
      });

      if (duplicate) {
        throw new ApiError(
          400,
          "Template with same version and protocol already exists",
          "DUPLICATE_ERROR"
        );
      }

      template.version = version;
    }

    // Update other fields if provided
    if (name !== undefined) template.name = name;
    if (resources !== undefined) template.resources = resources;
    if (fieldMappings !== undefined) template.fieldMappings = fieldMappings;

    await template.save();

    return sendResponse({
      res,
      statusCode: 200,
      message: "Integration template updated successfully",
      data: template,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllIntegrationTemplates = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      page = "1",
      limit = "10",
      sortBy = "createdAt",
      order = "desc",
      protocol,
      version
    } = req.query;

    const pageNumber = Math.max(parseInt(page as string, 10), 1);
    const limitNumber = Math.max(parseInt(limit as string, 10), 1);
    const skip = (pageNumber - 1) * limitNumber;

    const filters: Record<string, unknown> = {};

    if (protocol) filters.protocol = protocol;
    if (version) filters.version = version;

    const [templates, total] = await Promise.all([
      IntegrationTemplateModel.find(filters)
        .sort({ [sortBy as string]: order === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean(),
      IntegrationTemplateModel.countDocuments(filters)
    ]);

    return sendResponse({
      res,
      statusCode: 200,
      message: "Integration templates fetched successfully",
      data: templates,
      meta: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber)
      }
    });

  } catch (error) {
    next(error);
  }
};