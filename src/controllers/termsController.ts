import { Request,NextFunction, Response } from "express";
import { ITerms, termsModel } from "../models/termsModel";
import { ApiError } from "../utils/apiErrors";
import { sendResponse } from "../utils/sendResponse";
import { Types } from "mongoose";

export const createTerms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, version, type, content, effectiveFrom } = req.body;

    const userId = req.user?.userId;
    const userTenantId = req.user?.tenantId;
    if(!req.user?.userType||(req.user?.userType==="TENANT"&&!userTenantId)){
        return new ApiError(403,"You don't have permission to create terms","PermissionError")
    }

    const userType = req.user.userType;

    let finalTenantId: Types.ObjectId | null = null;

    if (type === "PLATFORM") {
      if (userType !== "PLATFORM") {
        return next(new ApiError(403, "Only super admin can create platform terms", "PermissionError"));
      }
    } else {
      finalTenantId = new Types.ObjectId(userTenantId);
    }

    const existing = await termsModel.findOne({
      type,
      tenantId: finalTenantId,
      version,
    });

    if (existing) {
      return next(new ApiError(409, "Terms version already exists", "ConflictError"));
    }

    const newTerms = await termsModel.create({
      title,
      version,
      type,
      content,
      effectiveFrom,
      tenantId: finalTenantId,
      createdBy: new Types.ObjectId(userId),
      isActive: false,
    });

    sendResponse({
      res,
      statusCode: 201,
      message: "Terms created",
      data: newTerms,
    });
  } catch (err) {
    next(err);
  }
};

export const activateTerms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const userId = req.user?.userId;
    const userTenantId = req.user?.tenantId;
    const userType = req.user?.userType;

    const terms = await termsModel.findById(id);

    if (!terms) {
      return next(new ApiError(404, "Terms not found", "NotFoundError"));
    }

    if (terms.type === "PLATFORM") {
      if (userType !== "PLATFORM") {
        return next(new ApiError(403, "Only super admin can activate platform terms", "PermissionError"));
      }
    } else {
      if (terms.tenantId?.toString() !== userTenantId) {
        return next(new ApiError(403, "Access denied for this tenant", "PermissionError"));
      }
    }

    await termsModel.updateMany(
      {
        type: terms.type,
        tenantId: terms.tenantId,
        isActive: true,
      },
      { isActive: false }
    );

    terms.isActive = true;
    terms.updatedBy = new Types.ObjectId(userId)

    await terms.save();

    sendResponse({
      res,
      statusCode: 200,
      message: "Terms activated",
      data: terms,
    });
  } catch (err) {
    next(err);
  }
};

export const getActiveTerms = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userTenantId = req.user?.tenantId;
    const userType = req.user?.userType;

    let terms = null;

    if (userType === "TENANT") {
      if (!userTenantId) {
        return next(
          new ApiError(400, "Tenant context missing", "ValidationError")
        );
      }

      terms = await termsModel.findOne({
        type: "TENANT",
        tenantId: new Types.ObjectId(userTenantId),
        isActive: true,
      });
    }

    if (!terms) {
      terms = await termsModel.findOne({
        type: "PLATFORM",
        tenantId: null,
        isActive: true,
      });
    }

    if (!terms) {
      return next(
        new ApiError(404, "No active terms found", "NotFoundError")
      );
    }

    sendResponse({
      res,
      statusCode: 200,
      message: "Active terms fetched",
      data: terms,
    });
  } catch (err) {
    next(err);
  }
};

export const deactivateTerms = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const userId = req.user?.userId;
    const userTenantId = req.user?.tenantId;
    const userType = req.user?.userType;

    const terms = await termsModel.findById(id);

    if (!terms) {
      return next(new ApiError(404, "Terms not found", "NotFoundError"));
    }

    if (terms.type === "PLATFORM") {
      if (userType !== "PLATFORM") {
        return next(
          new ApiError(
            403,
            "Only super admin can deactivate platform terms",
            "PermissionError"
          )
        );
      }
    } else {
      if (terms.tenantId?.toString() !== userTenantId) {
        return next(
          new ApiError(
            403,
            "You cannot deactivate terms of another tenant",
            "PermissionError"
          )
        );
      }
    }

    // ❌ Already inactive
    if (!terms.isActive) {
      return next(
        new ApiError(400, "Terms already inactive", "ValidationError")
      );
    }

    // 🔒 Prevent no-active-terms state
    const activeCount = await termsModel.countDocuments({
      type: terms.type,
      tenantId: terms.tenantId,
      isActive: true,
    });

    if (activeCount <= 1) {
      return next(
        new ApiError(
          400,
          "Cannot deactivate the only active terms. Activate another version first.",
          "ValidationError"
        )
      );
    }

    // ✅ Deactivate
    terms.isActive = false;
    terms.updatedBy = new Types.ObjectId(userId);
    await terms.save();

    sendResponse({
      res,
      statusCode: 200,
      message: "Terms deactivated successfully",
      data: terms,
    });
  } catch (error) {
    next(error);
  }
};