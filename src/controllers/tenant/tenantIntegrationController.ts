import { Request, Response, NextFunction } from "express";
import { sendResponse } from "../../utils/sendResponse";
import { ApiError } from "../../utils/apiErrors";
import mongoose from "mongoose";
import {
  EnvironmentType,
  IntegrationCode,
  ITenantIntegration,
} from "../../types/tenantIntegrationTypes";
import { sanitizeCredentials } from "../../utils/sanitizeCredentials";
import { ENV } from "../../config/env";
import { integrationModel } from "../../models/integrationModel";
import { IntegrationTemplateModel } from "../../models/integrationTemplateModel";
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

    const TenantIntegration =
      req.tenantConnection.model("TenantIntegration");

    const {
      integrationId,
      templateId,
      environment = "prod",
      baseUrl,
      credentials,
      enabledResources,
      resourceOverrides,
      isEnabled = true,
      name
    } = req.body;

    if (!integrationId || !credentials) {
      throw new ApiError(400, "Missing required fields", "VALIDATION_ERROR");
    }

    const integrationDoc = await integrationModel.findById(integrationId);

    if (!integrationDoc || !integrationDoc.isActive) {
      throw new ApiError(404, "Integration not found");
    }

    let template: any = null;
    let templateResources: string[] = [];

    if (integrationDoc.mode === "TEMPLATE_BASED") {
      if (!templateId) {
        throw new ApiError(400, "templateId is required");
      }

      if (!baseUrl) {
        throw new ApiError(400, "baseUrl is required");
      }

      template = await IntegrationTemplateModel.findById(templateId);

      if (!template || !template.isActive) {
        throw new ApiError(404, "Template not found");
      }

      if (template.integrationId.toString() !== integrationId) {
        throw new ApiError(400, "Invalid template for integration");
      }

      templateResources = Array.from(template.resources.keys());
    }

    if (integrationDoc.mode === "SDK_BASED" && templateId) {
      throw new ApiError(400, "templateId not allowed for SDK integrations");
    }

    const sanitizedCredentials = sanitizeCredentials(
      integrationDoc.credentialSchema,
      credentials
    );

    const existing = await TenantIntegration.findOne({
      tenantId: req.user?.tenantId,
      integrationId,
      environment
    });

    if (existing) {
      throw new ApiError(400, "Integration already exists", "DUPLICATE_ERROR");
    }

    let validEnabledResources: string[] = [];

    if (templateResources.length) {
      if (enabledResources?.length) {
        validEnabledResources = enabledResources.filter((r: string) =>
          templateResources.includes(r)
        );

        if (!validEnabledResources.length) {
          throw new ApiError(400, "No valid resources provided");
        }
      } else {
        // default → all resources
        validEnabledResources = templateResources;
      }
    }

    const integration = await TenantIntegration.create({
      name,
      tenantId: req.user?.tenantId,
      integrationId,
      templateId,
      environment,
      baseUrl,
      credentials: sanitizedCredentials,
      resourceOverrides,
      enabledResources: validEnabledResources,
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
  try {
    const { tenantIntegrationId } = req.params;

    if (!req.tenantConnection) {
      throw new ApiError(404, "Tenant connection not found");
    }

    const TenantIntegration =
      req.tenantConnection.model("TenantIntegration");

    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new ApiError(401, "Unauthorized");
    }

    const tenantIntegration = await TenantIntegration.findOne({
      _id: tenantIntegrationId,
      tenantId
    });

    if (!tenantIntegration) {
      throw new ApiError(404, "Tenant integration not found");
    }

    const {
      integrationId,
      templateId,
      environment,
      baseUrl,
      credentials,
      resourceOverrides,
      isEnabled,
      enabledResources,
      name
    } = req.body;

    let integrationDoc = await integrationModel.findById(
      integrationId || tenantIntegration.integrationId
    );

    if (!integrationDoc || !integrationDoc.isActive) {
      throw new ApiError(404, "Integration not found");
    }

    if (integrationId) {
      tenantIntegration.integrationId = integrationId;
    }

    let template: any = null;
    let templateResources: string[] = [];

    if (integrationDoc.mode === "TEMPLATE_BASED") {
      const finalTemplateId = templateId || tenantIntegration.templateId;

      template = await IntegrationTemplateModel.findById(finalTemplateId);

      if (!template || !template.isActive) {
        throw new ApiError(404, "Template not found");
      }

      if (template.integrationId.toString() !== integrationDoc._id.toString()) {
        throw new ApiError(400, "Invalid template for integration");
      }

      templateResources = Array.from(template.resources.keys());

      if (templateId) {
        tenantIntegration.templateId = templateId;
      }

      if (baseUrl !== undefined) {
        tenantIntegration.baseUrl = baseUrl;
      }

      if (!tenantIntegration.baseUrl) {
        throw new ApiError(400, "baseUrl is required");
      }
    }

    if (integrationDoc.mode === "SDK_BASED" && templateId) {
      throw new ApiError(400, "templateId not allowed for SDK integrations");
    }

    if (credentials) {
      const sanitizedCredentials = sanitizeCredentials(
        integrationDoc.credentialSchema,
        credentials
      );

      tenantIntegration.credentials = {
        ...tenantIntegration.credentials,
        ...sanitizedCredentials
      };
    }

    if (enabledResources !== undefined && templateResources.length) {
      const validEnabledResources = enabledResources.filter((r: string) =>
        templateResources.includes(r)
      );

      if (!validEnabledResources.length) {
        throw new ApiError(400, "No valid resources provided");
      }

      tenantIntegration.enabledResources = validEnabledResources;
    }

    if (name !== undefined) tenantIntegration.name = name;
    if (environment !== undefined) tenantIntegration.environment = environment;
    if (resourceOverrides !== undefined)
      tenantIntegration.resourceOverrides = resourceOverrides;
    if (typeof isEnabled === "boolean")
      tenantIntegration.isEnabled = isEnabled;

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

export const updateIntegrationResources = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tenantIntegrationId } = req.params;
    const { enabledResources } = req.body;

    if (!req.tenantConnection) {
      throw new ApiError(404, "Tenant connection not found");
    }

    const TenantIntegration =
      req.tenantConnection.model("TenantIntegration");

    const tenantIntegration = await TenantIntegration.findOne({
      _id: tenantIntegrationId,
      tenantId: req.user?.tenantId
    });

    if (!tenantIntegration) {
      throw new ApiError(404, "Integration not found");
    }

    const template = await IntegrationTemplateModel.findById(
      tenantIntegration.templateId
    );

    if (!template) {
      throw new ApiError(404, "Template not found");
    }

    const templateResources = Array.from(template.resources.keys());

    // ✅ validate
    const validEnabledResources = enabledResources.filter((r: string) =>
      templateResources.includes(r)
    );

    if (!validEnabledResources.length) {
      throw new ApiError(400, "No valid resources provided");
    }

    tenantIntegration.enabledResources = validEnabledResources;

    await tenantIntegration.save();

    return sendResponse({
      res,
      statusCode: 200,
      message: "Resources updated successfully",
      data: tenantIntegration
    });

  } catch (err) {
    next(err);
  }
};

export const toggleSingleResource = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { tenantIntegrationId, resource } = req.params;
    const { enabled } = req.body;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found");
    }

    const TenantIntegration =
      req.tenantConnection.model("TenantIntegration");

    const integration = await TenantIntegration.findOne({
      _id: tenantIntegrationId,
      tenantId: req.user?.tenantId
    });

    if (!integration) {
      throw new ApiError(404, "Integration not found");
    }

    const template = await IntegrationTemplateModel.findById(
      integration.templateId
    );

    if (!template) {
      throw new ApiError(404, "Template not found");
    }

    const templateResources = Array.from(template.resources.keys());

    if (!templateResources.includes(resource as string)) {
      throw new ApiError(400, "Invalid resource");
    }

    let enabledResources = integration.enabledResources || [];

    if (enabled) {
      if (!enabledResources.includes(resource)) {
        enabledResources.push(resource);
      }
    } else {
      enabledResources = enabledResources.filter((r:string) => r !== resource);
    }

    integration.enabledResources = enabledResources;

    await integration.save();

    return sendResponse({
      res,
      statusCode: 200,
      message: `Resource ${enabled ? "enabled" : "disabled"}`,
      data: integration
    });

  } catch (err) {
    next(err);
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

    const templateIds = [
      ...new Set(
        tenantIntegrations
          .map((i: any) => i.templateId)
          .filter(Boolean)
          .map((id: any) => id.toString())
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

    const integrationTemplates = await IntegrationTemplateModel.find({
      _id: { $in: templateIds },
    }).lean();

    const templateMap = new Map(
      integrationTemplates.map((t: any) => [
        t._id.toString(),
        t,
      ])
    );

    const result = tenantIntegrations.map((item: any) => {
      const master = integrationMap.get(
        item.integrationId?.toString()
      );

      const template = item.templateId
        ? templateMap.get(item.templateId.toString())
        : null;

      if (item.credentials) {
        delete item.credentials.password;
        delete item.credentials.clientSecret;
        delete item.credentials.secretAccessKey;
        delete item.credentials.apiKey;
      }

      return {
        ...item,
        integration: master || null,
        template: template || null,
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
      type: type as IntegrationCode,
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
