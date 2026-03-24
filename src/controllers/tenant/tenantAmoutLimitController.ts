import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../utils/apiErrors";
import { sendResponse } from "../../utils/sendResponse";

export const tenantAmountLimitCreateOrUpdate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { tenantId, roleId } = req.params;
    const { minAmount, maxAmount, level, priority, isActive } = req.body;

    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    if (!tenantId || !roleId) {
      throw new ApiError(
        400,
        "tenantId and roleId are required",
        "VALIDATION_ERROR",
      );
    }

    if (minAmount === undefined || maxAmount === undefined) {
      throw new ApiError(
        400,
        "minAmount and maxAmount are required",
        "VALIDATION_ERROR",
      );
    }

    if (minAmount > maxAmount) {
      throw new ApiError(
        400,
        "minAmount cannot be greater than maxAmount",
        "VALIDATION_ERROR",
      );
    }

    const TenantAmountLimit = req.tenantConnection.model("TenantAmountLimit");

    const tenantAmountLimit = await TenantAmountLimit.findOneAndUpdate(
      { tenantId, roleId },
      {
        $set: {
          minAmount,
          maxAmount,
          level,
          priority,
          isActive
        },
      },
      {
        new: true,
        upsert: true,
      },
    );

    return sendResponse({
      res,
      statusCode: 200,
      message: "Tenant amount limit saved successfully",
      data: tenantAmountLimit,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllTenantAmountLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const TenantAmountLimit = req.tenantConnection.model("TenantAmountLimit");

    const { amount } = req.query;

    const query: any = { isActive: true };

    if (amount !== undefined) {
      const numericAmount = Number(amount);

      if (!Number.isFinite(numericAmount)) {
        throw new ApiError(400, "Invalid amount", "VALIDATION_ERROR");
      }

      query.minAmount = { $lte: numericAmount };
      query.maxAmount = { $gte: numericAmount };
    }

    const limits = await TenantAmountLimit.find(query)
      .populate("roleId", "name")
      .select("roleId minAmount maxAmount level priority")
      .sort({ level: 1 });

    return sendResponse({
      res,
      statusCode: 200,
      message: "Tenant amount limits fetched successfully",
      data: limits,
    });
  } catch (error) {
    next(error);
  }
};

export const removeTenantAmountLimit = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { limitId } = req.params;
  try {
    if (!req.tenantConnection) {
      throw new ApiError(500, "Tenant connection not found", "INTERNAL_ERROR");
    }

    const TenantAmountLimit = req.tenantConnection.model("TenantAmountLimit");

    const updatedLimit = await TenantAmountLimit.findByIdAndUpdate(
      limitId,
      { isActive: false },
      { returnDocument: "after" },
    );

    if (!updatedLimit) {
      throw new ApiError(404, "Tenant amount limit not found", "NOT_FOUND");
    }

    sendResponse({
      res,
      statusCode: 200,
      message: "Tenant amount limit marked as inactive",
      data: updatedLimit,
    });
  } catch (error) {
    next(error);
  }
};
