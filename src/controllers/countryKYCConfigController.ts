import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiErrors";
import { sendResponse } from "../utils/sendResponse";
import { validateDocuments, validateFields } from "../helpers/validateKycConfig";

export const createCountryKYCConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { country, taxIdLabel, taxIdType, bankRequired, documents, fields } = req.body;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const tenantId = req.user?.tenantId;

    if (!country || !taxIdLabel || !taxIdType) {
      throw new ApiError(400, "Missing required fields", "VALIDATION_ERROR");
    }

    const Model = req.tenantConnection.model("CountryKYCConfig");

    const normalizedCountry = country.toUpperCase();

    const existing = await Model.findOne({
      tenantId,
      country: normalizedCountry,
      isActive: true,
    });

    if (existing) {
      throw new ApiError(400, "Active config already exists", "DUPLICATE");
    }

    validateDocuments(documents);
    validateFields(fields);

    const config = await Model.create({
      tenantId,
      country: normalizedCountry,
      version: 1,
      isActive: true,
      taxIdLabel,
      taxIdType,
      bankRequired,
      documents,
      fields,
    });

    sendResponse({
      res,
      statusCode: 201,
      message: "Country KYC config created",
      data: config,
    });

  } catch (err) {
    next(err);
  }
};

export const updateCountryKYCConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { configId } = req.params;
    const { taxIdLabel, taxIdType, bankRequired, documents, fields } = req.body;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const Model = req.tenantConnection.model("CountryKYCConfig");

    const existing = await Model.findById(configId);

    if (!existing) {
      throw new ApiError(404, "Config not found", "NOT_FOUND");
    }

    validateDocuments(documents || existing.documents);
    validateFields(fields || existing.fields);

    await Model.findByIdAndUpdate(configId, { isActive: false });

    const newConfig = await Model.create({
      tenantId: existing.tenantId,
      country: existing.country,
      version: existing.version + 1,
      isActive: true,

      taxIdLabel: taxIdLabel ?? existing.taxIdLabel,
      taxIdType: taxIdType ?? existing.taxIdType,
      bankRequired: bankRequired ?? existing.bankRequired,
      documents: documents ?? existing.documents,
      fields: fields ?? existing.fields,
    });

    sendResponse({
      res,
      statusCode: 200,
      message: "Country KYC config updated (new version created)",
      data: newConfig,
    });

  } catch (err) {
    next(err);
  }
};

export const getOneCountryKYCConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { country } = req.params;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const tenantId = req.user?.tenantId;

    const Model = req.tenantConnection.model("CountryKYCConfig");

    const config = await Model.findOne({
      tenantId,
      country: (country as string).toUpperCase(),
      isActive: true,
    }).sort({ version: -1 });

    if (!config) {
      throw new ApiError(404, "Config not found", "NOT_FOUND");
    }

    sendResponse({
      res,
      statusCode: 200,
      message: "Config fetched",
      data: config,
    });

  } catch (err) {
    next(err);
  }
};

export const getAllCountryKYCConfigs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const tenantId = req.user?.tenantId;

    const Model = req.tenantConnection.model("CountryKYCConfig");

    const configs = await Model.find({
      tenantId,
      isActive: true,
    }).sort({ country: 1 });

    sendResponse({
      res,
      statusCode: 200,
      message: "Configs fetched successfully",
      data: configs,
    });

  } catch (err) {
    next(err);
  }
};

export const deactivateCountryKYCConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { configId } = req.params;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const tenantId = req.user?.tenantId;

    const Model = req.tenantConnection.model("CountryKYCConfig");

    const config = await Model.findOne({
      _id: configId,
      tenantId,
      isActive: true,
    });

    if (!config) {
      throw new ApiError(404, "Active config not found", "NOT_FOUND");
    }

    await Model.findByIdAndUpdate(configId, {
      isActive: false,
    });

    sendResponse({
      res,
      statusCode: 200,
      message: "KYC config deactivated successfully",
    });

  } catch (err) {
    next(err);
  }
};