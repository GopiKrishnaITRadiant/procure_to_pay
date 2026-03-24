import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../../utils/sendResponse";
import { ApiError } from "../../utils/apiErrors";
import mongoose from "mongoose";
import {
  EnvironmentType,
  IntegrationType,
  ITenantIntegration,
} from "../../types/tenantIntegrationTypes";
import { sanitizeCredentials } from "../../services/integrationService";
import { ENV } from "../../config/env";
import { integrationModel } from "../../models/integrationModel";
import { IntegrationTemplate } from "../../models/integrationTemplateModel";
import { decrypt } from "../../utils/cryptoUtil";


export const createTenantIntegration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {

    if (!req.tenantConnection) {
      throw new ApiError(404, "Tenant connection not found");
    }

    const TenantIntegration = req.tenantConnection.model("TenantIntegration");

    const {
      integrationId,
      templateId,
      environment = "prod",
      baseUrl,
      credentials,
      resourceOverrides,
      isEnabled = true
    } = req.body;

    if (!integrationId || !templateId || !baseUrl || !credentials) {
      throw new ApiError(400, "Missing required fields", "VALIDATION_ERROR");
    }

    const integrationDoc = await integrationModel.findById(integrationId);

    if (!integrationDoc || !integrationDoc.isActive) {
      throw new ApiError(404, "Integration not found");
    }

    const template = await IntegrationTemplate.findById(templateId);

    if (!template || !template.isActive) {
      throw new ApiError(404, "Template not found");
    }

    const sanitizedCredentials = sanitizeCredentials(
      integrationDoc.code,
      credentials
    );

    const existing = await TenantIntegration.findOne({
      tenantId:req.user?.tenantId,
      integrationId,
      environment
    });

    if (existing) {
      throw new ApiError(
        400,
        "Tenant integration already exists",
        "DUPLICATE_ERROR"
      );
    }

    const integration = await TenantIntegration.create({
      tenantId:req.user?.tenantId,
      integrationId,
      templateId,
      environment,
      integrationCode:integrationDoc.code,
      baseUrl,
      credentials: sanitizedCredentials,
      resourceOverrides,
      isEnabled
    });

    return sendResponse({
      res,
      statusCode: 201,
      message: "Tenant integration created successfully",
      data: integration
    });

  } catch (error) {
    next(error);
  }
};

export const updateTenantIntegration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { tenantIntegrationId } = req.params;
  const {
    integrationId,
    templateId,
    environment,
    baseUrl,
    credentials,
    resourceOverrides,
    isEnabled
  } = req.body;

  try {
    if (!req.tenantConnection) {
      throw new ApiError(404, "Tenant connection not found", "NOT_FOUND");
    }

    const TenantIntegration = req.tenantConnection.model("TenantIntegration");

    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new ApiError(401, "Tenant not identified", "UNAUTHORIZED");
    }

    const tenantIntegration = await TenantIntegration.findOne({
      _id: tenantIntegrationId,
      tenantId
    });

    if (!tenantIntegration) {
      throw new ApiError(
        404,
        "Tenant integration not found",
        "NOT_FOUND"
      );
    }

    let sanitizedCredentials;
    if (integrationId) {
      const integrationDoc = await integrationModel.findById(integrationId);
      if (!integrationDoc) {
        throw new ApiError(404, "Integration not found", "NOT_FOUND");
      }

      if (credentials) {
        sanitizedCredentials = sanitizeCredentials(
          integrationDoc.code,
          credentials
        );
      }

      tenantIntegration.integrationId = integrationId;
    }

    if (templateId) {
      const template = await IntegrationTemplate.findById(templateId);
      if (!template || !template.isActive) {
        throw new ApiError(404, "Template not found", "NOT_FOUND");
      }
      tenantIntegration.templateId = templateId;
    }

    if (environment) tenantIntegration.environment = environment;
    if (baseUrl) tenantIntegration.baseUrl = baseUrl;
    if (resourceOverrides) tenantIntegration.resourceOverrides = resourceOverrides;
    if (sanitizedCredentials) tenantIntegration.credentials = sanitizedCredentials;
    if (typeof isEnabled === "boolean") tenantIntegration.isEnabled = isEnabled;

    await tenantIntegration.save();

    return sendResponse({
      res,
      statusCode: 200,
      message: "Tenant integration updated successfully",
      data: tenantIntegration
    });

  } catch (error) {
    next(error);
  }
};

export const getTenantIntegration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found");
    }

    if (!req.user?.tenantId) {
      throw new ApiError(401, "Tenant not identified");
    }

    const TenantIntegration =
      req.tenantConnection.model('TenantIntegration')

    const tenantId = req.user.tenantId;

    const { environment } = req.query;

    const query: any = { tenantId };

    if (environment) {
      query.environment = environment;
    }

    const tenantIntegrations = await TenantIntegration.find(query).lean();

    if (!tenantIntegrations.length) {
      return sendResponse({
        res,
        statusCode: 200,
        message: "No integrations found",
        data: [],
      });
    }

    const ids = [
      ...new Set(
        tenantIntegrations.map((i: any) =>
          i.integrationId.toString()
        )
      ),
    ];

    const masterIntegrations = await integrationModel.find({
      _id: { $in: ids },
    })
      .select("name code category description")
      .lean();

    const integrationMap = new Map(
      masterIntegrations.map((i: any) => [
        i._id.toString(),
        i,
      ])
    );

    const result = tenantIntegrations.map((item: any) => {
      const master = integrationMap.get(
        item.integrationId.toString()
      );

      if (item.credentials) {
        delete item.credentials.password;
        delete item.credentials.clientSecret;
        delete item.credentials.secretAccessKey;
        delete item.credentials.apiKey;
      }

      return {
        ...item,
        integration: master || null,
      };
    });

    return sendResponse({
      res,
      statusCode: 200,
      message: "Tenant integrations fetched",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getSAPIntegration = async (
  tenantConnection: any,
  tenantId: string,
  environment: string = "prod"
) => {

  const TenantIntegration = tenantConnection.models.TenantIntegration;

  const integration = await TenantIntegration.findOne({
    tenantId,
    environment
  })
    .populate("templateId")
    .lean();

  if (!integration) {
    throw new Error("SAP integration not configured");
  }

  return {
    baseUrl: integration.baseUrl,
    username: integration.credentials.username,
    password: decrypt(integration.credentials.password),
    template: integration.templateId,
    resourceOverrides: integration.resourceOverrides
  };
};

export const removeTenantIntegration = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(404, "Tenant connection not found");
    }
    const tenantIntegrationModel =
      req.tenantConnection.model("TenantIntegration");

    const tenantId = req.user?.tenantId;
    const { type } = req.params;

    if (!tenantId) {
      throw new ApiError(400, "Tenant ID is required");
    }

    const filter = {
      tenantId: new mongoose.Types.ObjectId(tenantId),
      type: type as IntegrationType,
      environment: ENV.NODE_ENV as EnvironmentType,
      isEnabled: true,
    };

    const integration = await tenantIntegrationModel.findOneAndUpdate(
      filter,
      { $set: { isEnabled: false } },
      { returnDocument:"after" },
    );

    if (!integration) {
      throw new ApiError(
        404,
        "Integration not found or already disabled",
        "NOT_FOUND",
      );
    }

    return sendResponse({
      res,
      statusCode: 200,
      message: "Integration disabled successfully",
      data: integration,
    });
  } catch (error) {
    next(error);
  }
};
