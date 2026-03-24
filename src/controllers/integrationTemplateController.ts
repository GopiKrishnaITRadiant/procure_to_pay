import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiErrors";
import { integrationModel } from "../models/integrationModel";
import { IntegrationTemplate } from "../models/integrationTemplateModel";
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

    const existingTemplate = await IntegrationTemplate.findOne({
      integrationId,
      version,
      protocol
    });

    if (existingTemplate) {
      throw new ApiError(400, "Template already exists", "DUPLICATE_ERROR");
    }

    const template = await IntegrationTemplate.create({
      integrationId,
      name,
      version,
      protocol,
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

    if (!templateId) {
      throw new ApiError(400, "Valid templateId is required", "VALIDATION_ERROR");
    }

    const {
      name,
      version,
      protocol,
      resources,
      fieldMappings
    } = req.body;

    const template = await IntegrationTemplate.findById(templateId);

    if (!template) {
      throw new ApiError(404, "Integration template not found", "NOT_FOUND");
    }

    // check duplicate only if version or protocol changed
    if (
      (version && version !== template.version) ||
      (protocol && protocol !== template.protocol)
    ) {

      const duplicate = await IntegrationTemplate.findOne({
        integrationId: template.integrationId,
        version: version ?? template.version,
        protocol: protocol ?? template.protocol,
        _id: { $ne: new Types.ObjectId(templateId as string) }
      });

      if (duplicate) {
        throw new ApiError(
          400,
          "Template with same version and protocol already exists",
          "DUPLICATE_ERROR"
        );
      }
    }

    if (name !== undefined) template.name = name;
    if (version !== undefined) template.version = version;
    if (protocol !== undefined) template.protocol = protocol;
    if (resources !== undefined) template.resources = resources;
    if (fieldMappings !== undefined) template.fieldMappings = fieldMappings;

    await template.save();

    return sendResponse({
      res,
      statusCode: 200,
      message: "Integration template updated successfully",
      data: template
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
      IntegrationTemplate.find(filters)
        .sort({ [sortBy as string]: order === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limitNumber)
        .lean(),
      IntegrationTemplate.countDocuments(filters)
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