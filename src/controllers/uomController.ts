import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiErrors";
import { sendResponse } from "../utils/sendResponse";
import { UOMModel } from "../models/uomModel";

//create/update
export const upsertTenantUOM = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found");
    }

    const { user, body } = req as any;
    const tenantId = user.tenantId;

    const { allowedUoms = [], customUoms = [] } = body;

    const TenantUOM = req.tenantConnection.model("TenantUOM");
    const UOM = req.tenantConnection.model("UOM"); // global master

    const normalizedAllowed = [
      ...new Set(allowedUoms.map((u: string) => u.toUpperCase())),
    ];

    //Validate allowed UOMs exist in master
    const existingUOMs = await UOM.find({
      code: { $in: normalizedAllowed },
      isActive: true,
    }).lean();

    if (existingUOMs.length !== normalizedAllowed.length) {
      throw new ApiError(400, "Invalid UOM in allowedUoms");
    }

    //Validate custom UOMs
    const normalizedCustom = customUoms.map((u: any) => ({
      code: u.code.toUpperCase(),
      name: u.name,
      category: u.category,
      precision: u.precision ?? 0,
      isActive: true,
    }));

    const customCodes = normalizedCustom.map((u: any) => u.code);

    if (new Set(customCodes).size !== customCodes.length) {
      throw new ApiError(400, "Duplicate custom UOM codes");
    }

    //Prevent clash with global UOM
    const clash = await UOM.findOne({
      code: { $in: customCodes },
    });

    if (clash) {
      throw new ApiError(
        400,
        `Custom UOM conflicts with global UOM: ${clash.code}`
      );
    }

    //UPSERT (industry best)
    const doc = await TenantUOM.findOneAndUpdate(
      { tenantId },
      {
        allowedUoms: normalizedAllowed,
        customUoms: normalizedCustom,
      },
      { new: true, upsert: true }
    );

    return sendResponse({
      res,
      statusCode: 200,
      message: "Tenant UOM saved successfully",
      data: doc,
    });
  } catch (error) {
    next(error);
  }
};

export const getTenantUOM = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found");
    }

    const { user } = req as any;
    const tenantId = user.tenantId;

    const TenantUOM = req.tenantConnection.model("TenantUOM");

    const doc = await TenantUOM.findOne({ tenantId }).lean();

    if (!doc) {
      throw new ApiError(404, "Tenant UOM not configured");
    }

    return sendResponse({
      res,
      statusCode: 200,
      message: "Tenant UOM fetched",
      data: doc,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAllowedUOMs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found");
    }

    const { user, body } = req as any;
    const tenantId = user.tenantId;

    const { allowedUoms } = body;

    if (!Array.isArray(allowedUoms) || allowedUoms.length === 0) {
      throw new ApiError(400, "allowedUoms required");
    }

    const TenantUOM = req.tenantConnection.model("TenantUOM");
    const UOM = req.tenantConnection.model("UOM");

    const normalized = [
      ...new Set(allowedUoms.map((u: string) => u.toUpperCase())),
    ];

    // ✅ Validate against master
    const valid = await UOM.find({
      code: { $in: normalized },
      isActive: true,
    });

    if (valid.length !== normalized.length) {
      throw new ApiError(400, "Invalid UOM provided");
    }

    const doc = await TenantUOM.findOneAndUpdate(
      { tenantId },
      { $set: { allowedUoms: normalized } },
      { new: true }
    );

    if (!doc) {
      throw new ApiError(404, "Tenant UOM not found");
    }

    return sendResponse({
      res,
      statusCode: 200,
      message: "Allowed UOMs updated",
      data: doc,
    });
  } catch (error) {
    next(error);
  }
};