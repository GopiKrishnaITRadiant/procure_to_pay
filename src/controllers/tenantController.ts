import { NextFunction, Request, Response } from "express";
import tenantModel from "../models/tenantModel";
import generateCompanyCode from "../utils/codeGenerator";
import { ApiError } from "../utils/apiErrors";
import { sendResponse } from "../utils/sendResponse";
import { getTenantConnection } from "../core/tenantConnection";
import { ITenant } from "../types/tenantTypes";
import bcrypt from "bcrypt";
import { tenantSubscriptionModel } from "../models/tenantSubscriptionModel";
import subscriptionModel from "../models/planModel";
import { ENV } from "../config/env";
import { Types } from "mongoose";
import { integrationModel } from "../models/integrationModel";
import defaultRoles, {
  defaultApprovalLimits,
  defaultCategories,
  defaultMaterials,
} from "../utils/constants";
import { IntegrationTemplateModel } from "../models/integrationTemplateModel";
import { getCurrnecyByCountry } from "../services/currencyService";

export const createTenant = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      name,
      legalName,
      domain,
      orgEmail,
      address,
      plan = "FREE",
      phone,
      procurementMode,
    } = req.body;

    if (
      !name ||
      !legalName ||
      !domain ||
      !orgEmail ||
      !address?.street ||
      !address?.city ||
      !address?.country||
      !procurementMode
    ) {
      throw new ApiError(400, "Required fields missing", "VALIDATION_ERROR");
    }

    const normalizedDomain = domain.toLowerCase().trim();

    let tenant = await tenantModel.findOne({ domain: normalizedDomain });

    if (tenant?.status === "active") {
      return sendResponse({
        res,
        statusCode: 200,
        message: "Tenant already exists",
        data: tenant,
      });
    }

    if (!tenant) {
      let companyCode = "";
      let attempts = 0;

      while (attempts < 5) {
        companyCode = generateCompanyCode(name);
        const exists = await tenantModel.findOne({ companyCode });
        if (!exists) break;
        attempts++;
      }

      if (attempts === 5) {
        throw new ApiError(
          500,
          "Failed to generate unique company code",
          "INTERNAL_ERROR",
        );
      }

      const dbName = `p2p_tenant_${companyCode}`;

      let finalProcurementMode = procurementMode || "HYBRID";

      let sapEnabled = false;

      if (finalProcurementMode === "SAP") {
        sapEnabled = true;
      } else if (finalProcurementMode === "INTERNAL") {
        sapEnabled = false;
      } else if (finalProcurementMode === "HYBRID") {
        sapEnabled = false; // user can enable later via integrations
      }

      const currnecyDoc=await getCurrnecyByCountry(address.country);
      if(!currnecyDoc){
        throw new ApiError(500, "Currency not found", "NOT_FOUND");
      }

      try {
        tenant = await tenantModel.create({
          name,
          legalName,
          domain: normalizedDomain,
          orgEmail,
          companyCode,
          dbName,
          address,
          baseCurrency:currnecyDoc.code,

          phone: {
            countryCode: phone?.countryCode,
            number: phone?.number,
          },

          procurementMode: finalProcurementMode,

          features: {
            poModule: true,
            rfq: true,
            contract: false,
            vendorPortal: false,
          },

          integrations: {
            sap: {
              enabled: sapEnabled,
            },
          },

          limits: {
            maxUsers: 10,
            maxVendors: 50,
            maxStorageMB: 500,
          },
          status: "provisioning",
          createdBy: new Types.ObjectId(req.user?.userId),
        });
      } catch (error: any) {
        if (error.code === 11000) {
          tenant = await tenantModel.findOne({ domain: normalizedDomain });
          if (!tenant) {
            throw new ApiError(
              500,
              "Tenant creation conflict",
              "INTERNAL_ERROR",
            );
          }
        } else {
          throw error;
        }
      }
    }

    if (tenant.status !== "active") {
      try {
        const connection = await getTenantConnection(tenant.companyCode);

        const Role = connection.model("Role");
        const User = connection.model("User");
        const TenantAmountLimit = connection.model("TenantAmountLimit");
        const TenantIntegrations = connection.model("TenantIntegration");
        const Category = connection.model("Category");
        const Material = connection.model("Material");

        await Role.insertMany(defaultRoles, { ordered: false });

        const roles = await Role.find();

        const roleMap = roles.reduce(
          (acc, role) => {
            acc[role.name] = role._id;
            return acc;
          },
          {} as Record<string, Types.ObjectId>,
        );

        const approvalDocs = defaultApprovalLimits.map((limit) => ({
          roleId: roleMap[limit.role],
          minAmount: limit.minAmount,
          maxAmount: limit.maxAmount,
          tenantId: tenant._id,
          level: limit.level,
          approvalsRequired: limit.approvalsRequired,
        }));

        // const integrations = await integrationModel.find({
        //   isActive: true,
        // });

        // const tenantIntegrations: any[] = [];

        // for (const integration of integrations) {
        //   if (integration.mode === "TEMPLATE_BASED") {
        //     const templates = await IntegrationTemplateModel.find({
        //       integrationId: integration._id,
        //       isActive: true,
        //     });

        //     for (const template of templates) {
        //       tenantIntegrations.push({
        //         tenantId: tenant._id,
        //         name: `${integration.name} - ${template.protocol}`,
        //         integrationId: integration._id,
        //         templateId: template._id,
        //         environment: "prod",
        //         baseUrl: "",
        //         credentials: {},
        //         resourceOverrides: {},
        //         isEnabled: false,
        //       });
        //     }
        //   } else if (integration.mode === "SDK_BASED") {
        //     tenantIntegrations.push({
        //       tenantId: tenant._id,
        //       name: integration.name,
        //       integrationId: integration._id,
        //       environment: "prod",
        //       credentials: {},
        //       isEnabled: false,
        //     });
        //   }
        // }

        // if (tenantIntegrations.length) {
        //   await TenantIntegrations.insertMany(tenantIntegrations);
        // }

        await TenantAmountLimit.insertMany(approvalDocs);

        const adminRole = await Role.findOne({ name: "Admin" });

        if (!adminRole) {
          throw new ApiError(500, "Admin role not created", "ROLE_ERROR");
        }

        const hashedPassword = await bcrypt.hash("Admin@123", 10);

        await User.updateOne(
          { email: orgEmail },
          {
            $setOnInsert: {
              displayName: "Admin",
              email: orgEmail.toLowerCase(),
              password: hashedPassword,
              role: adminRole._id,
              isActive: true,
              tenantId: tenant._id,
            },
          },
          { upsert: true },
        );

        // CATEGORY + MATERIAL SEEDING
        const categoryDocs = defaultCategories.map((cat) => ({
          ...cat,
          tenantId: tenant._id,
          createdBy: req.user?.userId,
        }));

        const categories = await Category.insertMany(categoryDocs);

        const categoryMap = categories.reduce(
          (acc, cat) => {
            acc[cat.name] = cat._id;
            return acc;
          },
          {} as Record<string, Types.ObjectId>,
        );

        const materialDocs = defaultMaterials.map((mat) => {
          const categoryId = categoryMap[mat.category];

          if (!categoryId) {
            throw new Error(`Category not found: ${mat.category}`);
          }

          return {
            tenantId: tenant._id,
            materialCode: mat.materialCode,
            description: mat.description,
            unitOfMeasure: mat.unitOfMeasure,
            price: mat.price,
            currency: mat.currency,
            isActive: mat.isActive,
            categoryId,
          };
        });

        await Material.insertMany(materialDocs);

        const selectedPlan = await subscriptionModel.findOne({
          planCode: "FREE",
          isActive: true,
        });

        if (!selectedPlan) {
          throw new ApiError(400, "Invalid subscription plan", "PLAN_ERROR");
        }

        const startDate = new Date();
        const endDate = new Date(startDate);

        if (!selectedPlan.trialDays || selectedPlan.trialDays <= 0) {
          throw new ApiError(
            500,
            "Trial plan must have trialDays configured",
            "CONFIG_ERROR",
          );
        }

        endDate.setDate(endDate.getDate() + selectedPlan.trialDays);

        await tenantSubscriptionModel.create({
          tenantId: tenant._id,
          planCode: plan,
          planId: selectedPlan._id,
          startDate,
          trialEndDate: endDate,
          status: "trialing",
          autoRenew: false,
        });

        tenant.limits = selectedPlan.limits;

        tenant.status = "active";
        tenant.activatedAt = new Date();

        await tenant.save();
      } catch (provisionError) {
        tenant.status = "failed";
        await tenant.save();
        throw provisionError;
      }
    }

    const finalTenant = await tenantModel.findById(tenant._id);

    return sendResponse({
      res,
      statusCode: 201,
      message: "Tenant provisioned successfully",
      data: finalTenant,
    });
  } catch (error) {
    next(error);
  }
};

export const getTenants = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { page = 1, limit = 10, search = "" } = req.query;

  try {
    const pageNumber = Math.max(1, parseInt(page as string, 10));
    const limitNumber = Math.min(
      Math.max(1, parseInt(limit as string, 10)),
      100,
    );

    const query: any = { isActive: true };
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const totalRecords = await tenantModel.countDocuments(query);

    const tenants = await tenantModel
      .find(query)
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    const totalPages = Math.ceil(totalRecords / limitNumber);

    return sendResponse({
      res,
      statusCode: 200,
      message: "Tenants retrieved successfully",
      data: tenants,
      meta: {
        totalRecords,
        totalPages,
        currentPage: pageNumber,
        pageSize: limitNumber,
      },
    });
  } catch (error: any) {
    next(error);
  }
};

export const getTenantById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { id } = req.params;

  try {
    const tenant = await tenantModel.findById(id);
    if (!tenant) {
      throw new ApiError(404, "Tenant not found", "NOT_FOUND");
    }
    return sendResponse({
      res,
      statusCode: 200,
      message: "Tenant retrieved successfully",
      data: tenant,
    });
  } catch (error: any) {
    next(error);
  }
};

export const updateTenant = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { id } = req.params;
  const { name, domain } = req.body;

  try {
    const tenant = await tenantModel.findById(id);
    if (!tenant) {
      throw new ApiError(404, "Tenant not found", "NOT_FOUND");
    }

    if (tenant.domain !== domain) {
      const existingTenant = await tenantModel.findOne({ domain });
      if (existingTenant) {
        throw new ApiError(
          400,
          "Tenant with this domain already exists",
          "VALIDATION_ERROR",
        );
      }
    }

    let companyCode = tenant.companyCode;
    if (tenant.name !== name) {
      companyCode = generateCompanyCode(name);
      const codeExists = await tenantModel.findOne({ companyCode });
      if (codeExists) {
        return res.status(500).json({
          message: "Failed to generate unique company code",
        });
      }
    }

    tenant.name = name;
    tenant.domain = domain;
    tenant.companyCode = companyCode;

    await tenant.save();
    return sendResponse({
      res,
      statusCode: 200,
      message: "Tenant updated successfully",
      data: tenant,
    });
  } catch (error: any) {
    next(error);
  }
};

export const deleteTenant = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { id } = req.params;
  try {
    const tenant = await tenantModel.findById(id);
    if (!tenant) {
      throw new ApiError(404, "Tenant not found", "NOT_FOUND");
    }

    tenant.isSuspended = false;
    await tenant.save();

    return sendResponse({
      res,
      statusCode: 200,
      message: "Tenant successfully deleted",
    });
  } catch (error: any) {
    next(error);
  }
};
